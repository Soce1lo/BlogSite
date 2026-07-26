---
title: I2C 协议基础
description: 面向嵌入式工程师的 I2C 物理层、事务格式、实现选择、学习路径与调试方法。
pubDate: '2026-07-21'
updatedDate: '2026-07-26'
draft: false
category: Embedded Systems
tags:
  - i2c
  - embedded
  - protocol
visibility: public
sourceVaultPath: 10-Notes/I2C 协议基础.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: learned
topic: I2C
---
# I2C 协议基础

> **结论**
>
> I2C 是面向板内芯片间通信的同步串行总线。主机通过 SCL 提供时钟，通过双向 SDA 传输地址、方向、数据和应答；多个设备可以共享同一组 SCL/SDA，由从设备地址区分。

这是一份面向实践的基础笔记。具体板卡引脚、器件地址、上拉参数和异常恢复效果仍应以 datasheet、原理图和实测波形为准。

## 物理层

- SCL 是时钟线，SDA 是双向数据线。
- 总线空闲时两根线均为高电平。设备通常只主动拉低线路，释放后由上拉电阻把线路拉高。
- 多个从设备共享总线；常用 7 bit 地址区分设备，也存在 10 bit 地址。
- 常见速率包括 100 kbit/s、400 kbit/s、1 Mbit/s 和 3.4 Mbit/s。能否稳定运行还取决于器件能力、上拉阻值、线长和总线电容。
- 线越长、设备越多、总线电容越大，上升沿越慢，高速通信越容易失败。

硬件检查时至少确认：

- SCL/SDA 引脚复用是否正确，输出类型是否为开漏或复用开漏。
- 板上是否已有上拉电阻，阻值是否适合目标速率与总线电容。
- 主从设备是否共地，IO 电平是否兼容，是否需要电平转换。
- 地址选择引脚、复位引脚和供电时序是否符合器件要求。

## 协议层

### 起始、停止与数据有效性

- START：SCL 为高时，SDA 从高变低。
- STOP：SCL 为高时，SDA 从低变高。
- SCL 为高时 SDA 必须保持稳定；发送端通常在 SCL 为低时准备下一位。
- 每个数据字节是 8 bit，随后用第 9 个时钟传递 ACK/NACK。

### 地址与方向

常见的 7 bit 地址之后紧跟 1 bit 方向位：

- `0`：主机写从机。
- `1`：主机读从机。

工程中必须分清 datasheet 给出的 7 bit 地址、左移后的地址字节，以及驱动 API 实际要求的表示形式。地址阶段 NACK 时，地址表示错误应作为首要排查项之一。

### ACK 与 NACK

- ACK：接收端在第 9 个时钟拉低 SDA，表示已接收。
- NACK：接收端释放 SDA，表示不应继续当前传输或未能接收。
- 主机读取最后一个字节后通常发送 NACK，再发送 STOP，通知从机结束输出。

## 常见事务格式

### 主机写从机

```text
START -> SLA+W -> ACK -> DATA0 -> ACK -> DATA1 -> ACK -> ... -> STOP
```

适合写控制寄存器、EEPROM 数据或传感器配置。

### 主机读从机

```text
START -> SLA+R -> ACK -> DATA0 <- ACK -> DATA1 <- NACK -> STOP
```

适合从已经设置好内部地址指针的设备中顺序读取数据。

### 复合事务

```text
START -> SLA+W -> ACK -> REG/MEM_ADDR -> ACK
RESTART -> SLA+R -> ACK -> DATA <- NACK -> STOP
```

复合事务先写入寄存器或存储器内部地址，再通过重复起始切换到读方向。EEPROM、RTC、IMU 和许多传感器都采用这种模型。`SLA` 是总线设备地址，`REG/MEM_ADDR` 是从设备内部地址，两者不能混淆。

## 软件 I2C 与硬件 I2C

| 实现 | 优点 | 代价与风险 |
| --- | --- | --- |
| GPIO 软件模拟 | 时序可见、易移植，便于学习协议和实现主动恢复 | 占用 CPU，时序受延时、中断和调度影响 |
| MCU 硬件外设 | 效率高，可结合中断和 DMA | 状态机更复杂，超时和异常恢复必须单独设计 |

无论选择哪种实现，都不应无限等待状态标志。每一步都应有超时，并把地址 NACK、数据 NACK、仲裁丢失和总线错误映射为可诊断的错误状态。

## 学习与验证路径

1. 先理解上拉、开漏和“释放总线”，能解释为什么 I2C 不能按普通推挽 GPIO 使用。
2. 识别 START、STOP、8 bit 数据和第 9 个 ACK/NACK，能够在逻辑分析仪波形上逐项标出。
3. 掌握寄存器设备的复合读事务，分清设备地址与内部地址。
4. 用 EEPROM 完成第一次上板验证：写入、等待写周期、读回并比较。
5. 主动制造地址错误、上拉异常和写周期未完成，观察 NACK、波形和读回结果。
6. 最后比较软件 I2C 与硬件 I2C 的 CPU 占用、错误处理和总线恢复能力。

EEPROM 适合作为第一个实验对象：数据写入和读回容易验证，写周期、ACK polling、页写边界和随机读又能覆盖大量真实工程问题。

## 调试清单

按以下顺序缩小问题范围：

1. 确认供电、共地、SCL/SDA 接线和上拉电阻。
2. 确认 7 bit/8 bit 地址表示以及地址选择引脚。
3. 用逻辑分析仪检查 START、地址字节、方向位、ACK/NACK、RESTART 和 STOP。
4. 地址阶段 NACK 时检查接线、电源、地址、复位状态和器件是否忙。
5. EEPROM 写后读失败时检查写周期、ACK polling、页边界和内部地址宽度。
6. 低速正常而高速失败时检查上升沿、上拉阻值、线长和总线电容。
7. SDA 持续为低时检查从机是否挂死；常见恢复方式是释放 SDA、手动输出若干 SCL 脉冲、生成 STOP，再重新初始化控制器。
8. 波形正确但数据错误时检查字节序、寄存器地址宽度和读写事务组合。

## 来源与证据边界

- [野火：I2C 读写 EEPROM](https://doc.embedfire.com/mcu/stm32/f103zhinanzhe/std/zh/latest/book/I2C.html)：本页协议层、STM32 实现和 EEPROM 实验的主要公开依据。
- [正点原子资料下载中心](http://www.openedv.com/docs/index.html)：用于定位板卡资料、配套例程、原理图和课程入口，不作为本页协议细节的直接依据。
- [正点原子 STM32F103 Mini V4 资料页](http://www.openedv.com/docs/boards/stm32/zdyz_stm32f103_miniV4.html)：板卡资料入口；具体引脚和器件信息仍应以实际使用的板卡资料为准。

## 相关笔记

- [SPI 协议基础](../spi-protocol-basics/)：从寻址、信号线、吞吐量、应答机制和调试方法对比两种常见板级串行总线。
