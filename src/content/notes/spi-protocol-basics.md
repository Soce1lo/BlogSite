---
title: SPI 协议基础
description: 面向嵌入式工程师的 SPI 物理层、CPOL/CPHA、Linux spidev、学习路径与调试方法。
pubDate: '2026-07-23'
updatedDate: '2026-07-26'
draft: false
category: Embedded Systems
tags:
  - spi
  - embedded
  - protocol
visibility: public
sourceVaultPath: 10-Notes/SPI 协议基础.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: learned
topic: SPI
---
# SPI 协议基础

> **结论**
>
> SPI 是主机提供时钟、以片选线选择从设备的同步串行接口。标准四线 SPI 通过 SCK、MOSI、MISO 和 CS/NSS 完成全双工移位传输；它没有设备地址和 ACK/NACK，能否正确通信主要依赖片选、时钟模式、位序、速率和器件事务格式完全匹配。

这是一份面向实践的基础笔记。具体设备模式、最高频率、命令格式、片选约束和电气时序仍必须以器件 datasheet 与实测波形为准。

## 与 I2C 的定位差异

| 特性 | SPI | I2C |
| --- | --- | --- |
| 信号线 | 标准四线；增加从机通常还要增加片选线 | 两线共享总线 |
| 寻址 | CS/NSS 硬件片选 | 7 bit 或 10 bit 地址 |
| 传输 | 标准 SPI 全双工 | 共享 SDA，收发分时 |
| 时钟 | 没有统一速率档位，由主从设备和板级条件决定 | 有 100 kbit/s、400 kbit/s 等模式 |
| 应答 | 无 ACK/NACK | 每字节后有 ACK/NACK |
| 常见场景 | Flash、ADC、显示屏、高速传感器 | EEPROM、RTC、低速传感器、PMIC |

SPI 用更多信号线换取简单协议和较高吞吐量；I2C 用地址和共享总线降低引脚数量。选择时不应只比较标称频率，还要考虑引脚数量、设备规模、错误检测、线长和软件复杂度。

## 物理层与事务边界

- CS/NSS：选择目标从设备，常见为低有效。一次事务通常从片选有效开始，以片选释放结束。
- SCK：由主机产生，空闲电平和采样边沿由 CPOL/CPHA 决定。
- MOSI：主机输出、从机输入。
- MISO：主机输入、从机输出。

多个从机可以共享 SCK、MOSI 和 MISO，但每个从机通常需要独立片选线。只有被选中的从机可以驱动 MISO，未选中设备必须释放该信号，否则会发生总线争用。

标准 SPI 的发送与接收同时发生：每个时钟都在两端移位。应用只关心单向数据时，另一方向通常发送 dummy 字节或丢弃接收数据。SPI 本身不规定寄存器地址、命令字、包长、校验或重试，这些都由具体器件定义。

## CPOL、CPHA 与四种模式

- CPOL 决定 SCK 空闲电平：`0` 为低，`1` 为高。
- CPHA 决定在哪一个边沿采样：`0` 在第一个边沿，`1` 在第二个边沿。

| 模式 | CPOL | CPHA | SCK 空闲电平 | 采样边沿 | 数据改变边沿 |
| --- | --- | --- | --- | --- | --- |
| Mode 0 | 0 | 0 | 低 | 上升沿 | 下降沿 |
| Mode 1 | 0 | 1 | 低 | 下降沿 | 上升沿 |
| Mode 2 | 1 | 0 | 高 | 下降沿 | 上升沿 |
| Mode 3 | 1 | 1 | 高 | 上升沿 | 下降沿 |

模式不能凭经验选择。应从器件 datasheet 的时序图确认空闲电平、数据建立时间和采样边沿，再用逻辑分析仪核对实际波形。不同文档对“leading/trailing edge”或相位的表述可能不同，最终以波形含义为准。

## 位序、字宽与片选

- 位序常见为 MSB first，也有器件使用 LSB first。
- 字宽常见为 8 bit 或 16 bit，但控制器和器件也可能支持其他长度。
- 有些器件要求一次命令和数据期间 CS 始终有效；另一些器件用 CS 上升沿提交命令。
- 多段传输是否保持片选、字节之间是否允许间隙，都必须结合控制器能力和器件时序确认。
- SPI 没有 ACK。读回全 `0x00`、全 `0xFF` 或重复旧数据不代表总线层给出了明确错误，需要从波形、状态寄存器或上层校验判断。

## 扩展 SPI

| 形式 | 数据线 | 方向 | 常见用途 |
| --- | --- | --- | --- |
| Single SPI | MOSI + MISO | 全双工 | 经典 SPI 外设 |
| Dual SPI | 2 根双向数据线 | 半双工 | 提升串行 Flash 吞吐量 |
| Quad SPI | 4 根双向数据线 | 半双工 | QSPI NOR Flash、XIP |
| Octal SPI | 8 根双向数据线 | 半双工 | 高带宽 Flash 或 RAM |

SDR 每个时钟周期传输一次数据，DDR 在两个边沿都传输数据。多线与 DDR 会提高带宽，也会显著提高引脚复用、信号完整性和控制器配置的复杂度。

## Linux spidev 最小路径

Linux 用户空间可以通过 spidev 操作适合通用用户态访问的 SPI 设备：

1. 打开 `/dev/spidevB.C`。
2. 通过 `ioctl` 设置 mode、bits per word 和 max speed，并读回确认实际配置。
3. 填充 `struct spi_ioc_transfer`。
4. 调用 `SPI_IOC_MESSAGE(n)` 执行一个或多个传输段。

```c
struct spi_ioc_transfer tr = {
    .tx_buf = (unsigned long)tx,
    .rx_buf = (unsigned long)rx,
    .len = len,
    .speed_hz = speed,
    .bits_per_word = bits,
};

int ret = ioctl(fd, SPI_IOC_MESSAGE(1), &tr);
```

`tx_buf` 和 `rx_buf` 在 UAPI 中使用 `__u64` 保存用户空间地址。只接收时可以让控制器发送 dummy 数据；只发送时可以丢弃接收数据，具体用法应以当前内核的 spidev 文档和控制器驱动为准。设备树也不应笼统写成 `compatible = "spidev"`，应使用真实设备绑定或受支持的显式绑定方式。

spidev 适合原型验证和简单设备访问。需要中断、内核子系统集成、严格实时性或稳定产品接口时，应评估专用内核驱动。

## 学习与验证路径

1. 画出 CS/SCK/MOSI/MISO，解释片选寻址和全双工移位。
2. 从 datasheet 时序图判断 CPOL、CPHA、位序和最高 SCK，而不是背诵模式号。
3. 用低速完成 MOSI-MISO 回环，先验证控制器、引脚复用和基本传输。
4. 驱动一个真实设备，记录命令格式、读写方向、dummy 字节和片选约束。
5. 在 Linux 上用 `spidev_test` 或最小程序核对 mode、bits 和 speed 的设置与读回值。
6. 用逻辑分析仪把配置与实际 SCK 空闲电平、采样边沿、CS 范围和数据内容对应起来。
7. 需要进一步深入时，再阅读 SPI Core、spidev 和具体 controller driver 的消息与传输模型。

## 调试清单

按以下顺序排查：

1. 确认供电、共地、MOSI/MISO/SCK/CS 接线和 IO 电平。
2. 确认目标从机的 CS 确实在正确时间有效，未选中从机没有驱动 MISO。
3. 将速率降到较低值，再确认 CPOL/CPHA 和位序。
4. 对照 datasheet 检查命令字、地址宽度、dummy 周期和事务期间的片选要求。
5. 检查引脚复用、设备树、控制器驱动和 `/dev/spidev*` 节点。
6. 用逻辑分析仪观察 SCK 空闲电平、采样边沿、CS 边界和 MOSI/MISO 内容。
7. 数字时序正确但高速不稳定时，用示波器检查过冲、振铃、串扰、地弹和建立/保持时间。
8. 需要可靠通信时，在器件协议允许的情况下增加状态读取、长度检查、CRC、重试和超时。

## 来源与证据边界

- [野火：i.MX6 SPI 通信](https://doc.embedfire.com/linux/imx6/base/zh/latest/linux_app/spi_bus.html)：协议入门、i.MX6ULL spidev 和板上实验的主要教程来源；板卡相关配置不应直接泛化到其他平台。
- [Linux Kernel：SPI userspace API](https://docs.kernel.org/spi/spidev.html)：spidev 用户空间接口的权威说明。
- [Linux Kernel：SPI Summary](https://www.kernel.org/doc/html/latest/spi/spi-summary.html)：SPI 模式、传输和片选语义参考。
- [Linux Kernel：SPI driver API](https://docs.kernel.org/driver-api/spi.html)：内核侧 controller、device、message 和 transfer 模型参考。
- [Analog Devices AN-1248：SPI Interface](https://www.analog.com/en/resources/app-notes/an-1248.html)：建立/保持时间、驱动与信号完整性的电气层参考。

## 相关笔记

- [I2C 协议基础](../i2c-protocol-basics/)：对比地址总线、ACK/NACK、引脚数量和异常诊断方式。
