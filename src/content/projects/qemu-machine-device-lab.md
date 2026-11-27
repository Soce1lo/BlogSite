---
title: QEMU 设备模型实验
description: 在 Mac 上用 MPS2 AN385 跑裸机固件，从 QEMU 的机器模型和双终端串口实验入手，追踪一次寄存器写入如何到达模拟设备。
pubDate: '2026-11-27'
updatedDate: '2026-11-27'
draft: false
category: 嵌入式系统
tags:
  - qemu
  - virtualization
visibility: public
sourceVaultPath: 60-Publish/Blog/虚拟化/QEMU 设备模型实验.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: built
topic: 嵌入式与系统实验
---
# QEMU 设备模型实验

我在一个终端输入 `cont`，另一个终端随即印出 `uart0: hello`。前一个窗口控制 QEMU，后一个窗口接收裸机固件通过模拟串口发出的字符。Cortex-M3 执行一条写入指令时，QEMU 怎么判断这个地址对应普通内存还是设备寄存器？我从第一次串口输出开始追这条路径。

我用 Mac 上的 QEMU 模拟 Arm MPS2 AN385，以单核 Cortex-M3 和一份最小裸机固件开始。项目的目标是跟清楚一次访存的去向，独立实现一个带寄存器、复位行为和中断的简单虚拟设备，再用调试器、设备测试和 guest 程序验证它。2026 年 11 月 27 日，我完成了机器查询和双终端串口这两步。固件、构建脚本和早期自动验证由 AI 先准备，我随后亲手查询、构建、接上伪终端并放行固件。

## 从查询结果画出机器地图

我在 CPU 列表里看到了 `cortex-m4`，在加速器列表里看到了 `tcg`。CPU 列表说明当前 QEMU 程序认识哪些处理器型号，板卡能搭配哪种 CPU 还要看机器模型。`-machine mps2-an385` 选定板卡及其内存与外设映射，`-cpu cortex-m3 -smp 1` 指定一个 guest Cortex-M3 核。TCG 则负责在运行时把 guest 指令翻译成宿主能执行的机器码。这里的 host 是运行 QEMU 进程的 Mac，guest 是运行在模拟板上的裸机固件。 [QEMU 的 Arm MPS2 板卡说明](https://www.qemu.org/docs/master/system/arm/mps2.html) · [TCG 动态翻译说明](https://www.qemu.org/docs/master/devel/tcg.html)

装有 `qemu-system-arm` 就可以直接查本机版本和可用选项，这些命令无需固件。 [QEMU 命令行手册](https://www.qemu.org/docs/master/system/qemu-manpage.html) · [加速器列表实现](https://github.com/qemu/qemu/blob/master/system/vl.c#L3254-L3279)

```sh
qemu-system-arm -version
qemu-system-arm -machine help
qemu-system-arm -cpu help
qemu-system-arm -accel help
```

## 在一个终端放行，在另一个终端收串口

我先把已有的 C 固件和复位汇编编译、链接成裸机 ELF。启动时用 `-kernel` 加载 ELF，`-S` 让虚拟 CPU 暂停，`-monitor stdio` 把第一个终端留给 QEMU 控制台，`-serial pty` 把虚拟串口接到宿主的伪终端（PTY）。`-display none` 关闭图形输出，串口仍可以工作。 [QEMU 命令行手册](https://www.qemu.org/docs/master/system/qemu-manpage.html) · [QEMU 的 PTY 后端实现](https://github.com/qemu/qemu/blob/master/chardev/char-pty.c)

我在第二个终端用 `screen` 打开 QEMU 当次报告的 PTY 路径，再回到第一个终端输入 `cont`。第二个终端出现了启动自检和串口问候，下面摘录其中两行。 [QEMU 控制台命令](https://www.qemu.org/docs/master/system/monitor.html)

```text
startup: .data/.bss OK
uart0: hello
```

再输一次 `cont`，串口没有新文字。固件发完字符后进入 `wfi` 等待循环，继续运行不会重新进入 `main`。我输入 `quit` 结束 QEMU，第二个终端的串口会话也随之断开。

按固件和板卡模型的代码，发送函数逐字节写入 UART0 的 `DATA` 寄存器，guest 看到的地址是 `0x40004000`。QEMU 的板卡模型把这段地址映射给 CMSDK UART，虚拟串口再通过 PTY 把字符送到宿主终端。 [QEMU 的 MPS2 板卡实现](https://github.com/qemu/qemu/blob/master/hw/arm/mps2.c) · [CMSDK UART 实现](https://github.com/qemu/qemu/blob/master/hw/char/cmsdk-apb-uart.c)

早期准备的自动检查把串口接到 QEMU 的标准输出，由宿主脚本收集输出并与预期字节比较，再判定是否通过。这轮我亲手验证的是 PTY 路径。

## 接下来用断点验证什么

`startup: .data/.bss OK` 表明 `main` 读到了预期的初始值。下一步我会用 guest GDB 从复位入口开始单步，亲眼看到 `.data` 被搬入 RAM 和 `.bss` 被清零，再对照一次普通 RAM 写入和一次 UART0 写入。之后在宿主 QEMU 进程里跟进设备回调，把寄存器写入和终端收到字符之间的路径补齐。目前走通了现成串口设备的输出，源码调试、自建设备、中断验证和 qtest 都还在后续计划中。
