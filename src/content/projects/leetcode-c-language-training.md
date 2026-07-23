---
title: LeetCode C 语言训练计划
description: 一条以最多 3 道当前题为工作集的 C11 长期训练主线：不追每周题数，重视独立思考、内存所有权、官方样例与真实验证。
pubDate: '2026-07-17'
updatedDate: '2026-07-23'
draft: false
category: Programming
tags:
  - leetcode
  - c
  - 算法
  - 数据结构
visibility: public
sourceVaultPath: 60-Publish/LeetCode C 语言训练计划.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: built
series: C 语言学习实践
seriesOrder: 10
topic: Algorithms
---
# LeetCode C 语言训练计划

## 项目定位

这是当前 C 学习的主线，优先级高于 [C 语言设计模式学习计划](/projects/c-design-patterns-learning/)。它不追求周题数或短期刷完一张大题单，而是借算法题持续训练数组边界、指针语义、动态内存、资源所有权、结构体建模和函数接口。

同一道算法题，用高级语言写对和用 C 写稳，关注点并不完全相同。算法思路之外，C 实现还必须回答这些问题：

- 返回值由谁分配、由谁释放；
- 输出长度和二维数组列数怎样传递；
- 比较器是否可能溢出，指针层级是否正确；
- 提前返回、分配失败和异常路径是否泄漏资源；
- 本地样例通过后，是否还经得住 Sanitizer 和在线判题。

因此，这个项目把“算法理解”“C 实现”和“验证结果”分开记录。只有三者都清楚，一道题才算真正进入可复习状态。

## 现在只做

同时最多保留 3 道当前题。完成一题后，再从第一阶段或后续专题中补一题；没有完成时保留明确停点，不为了制造进度继续开新题。

当前工作集：

- [26. 删除有序数组中的重复项](https://leetcode.cn/problems/remove-duplicates-from-sorted-array/)；
- [88. 合并两个有序数组](https://leetcode.cn/problems/merge-sorted-array/)；
- [217. 存在重复元素](https://leetcode.cn/problems/contains-duplicate/)。

只有 30 分钟时，用 5 分钟重新说明输入、输出和边界，20 分钟独立思考或实现，最后 5 分钟记录收获和下次停点。有 60 分钟时，再加入调试、官方 Examples 和验证结果。时间到了可以停，留下可继续的上下文比临时赶完更重要。

## 第一阶段：先把 C 的地基打稳

第一阶段不是按算法专题铺开，而是先集中练习最容易在 C 中出问题的表达方式。

| 顺序 | 题目 | 主要训练点 | 当前状态 |
| ---: | --- | --- | --- |
| 1 | [26. 删除有序数组中的重复项](https://leetcode.cn/problems/remove-duplicates-from-sorted-array/) | 原地数组、快慢指针 | 当前题 |
| 2 | [88. 合并两个有序数组](https://leetcode.cn/problems/merge-sorted-array/) | 逆向写入、数组边界 | 当前题 |
| 3 | [217. 存在重复元素](https://leetcode.cn/problems/contains-duplicate/) | `qsort`、相邻扫描 | 当前题 |
| 4 | [1365. 有多少小于当前数字的数字](https://leetcode.cn/problems/how-many-numbers-are-smaller-than-the-current-number/) | 结构体、原始下标 | 待开始 |
| 5 | [1200. 最小绝对差](https://leetcode.cn/problems/minimum-absolute-difference/) | 二维返回值、动态内存 | 待开始 |
| 6 | [349. 两个数组的交集](https://leetcode.cn/problems/intersection-of-two-arrays/) | `uthash` 集合 | 待开始 |
| 7 | [350. 两个数组的交集 II](https://leetcode.cn/problems/intersection-of-two-arrays-ii/) | `uthash` 计数表 | 待开始 |
| 8 | [1. 两数之和](https://leetcode.cn/problems/two-sum/) | `uthash` 映射、提前返回 | 待开始 |
| 9 | [1636. 按照频率将数组升序排序](https://leetcode.cn/problems/sort-array-by-increasing-frequency/) | 哈希统计、双排序键 | 待开始 |
| 10 | [56. 合并区间](https://leetcode.cn/problems/merge-intervals/) | 指针数组排序、区间合并 | 待开始 |

这一阶段尤其关注三类 `qsort` 场景：整数数组、结构体数组和指针数组；以及三类哈希场景：集合、计数表和值到信息的映射。

## 后续路线

第一阶段完成后，继续按数组 → 链表 → 哈希表 → 字符串 → 双指针 → 栈与队列 → 二叉树 → 回溯 → 贪心 → 动态规划 → 单调栈 → 图论推进。

这里只维护专题顺序，不提前生成几十周日历。每次只从下一个专题挑选 1–3 道题进入当前工作集，难题可以拆成多个学习时段，不用题量弥补理解上的停顿。

## 每道题的学习闭环

1. 用自己的话说明输入、输出、关键边界和算法不变量；
2. 用 C11 完成可提交函数，明确返回值、长度与内存所有权；
3. 只用题面官方 Examples 做本地测试，不把自造测试伪装成官方验证；
4. 涉及动态内存时运行 AddressSanitizer 与 UndefinedBehaviorSanitizer；
5. 需要最终判定时提交到力扣，并如实记录 Accepted 或失败回执；
6. 记录一个真实卡点、一个 C 细节和下次继续的位置。

复习不再采用固定的 D+1、D+7、D+30 打卡。只有自己仍然生疏、再次做错或无法解释关键边界时，才把题目放回复习队列。

## 完成标准

- 能说明算法不变量与时间、空间复杂度；
- 能指出最容易出错的一处边界、指针或所有权问题；
- 能解释为什么当前数据结构适合这道题，并留下本轮真实思考；
- 提交函数不混入 `main`、断言或调试输出；
- 官方 Examples 全部通过，并记录实际数量；
- 涉及动态内存时，AddressSanitizer 与 UndefinedBehaviorSanitizer 通过；
- 需要在线结果时，以力扣真实回执作为最终判定。

## 后续公开记录

这个项目页只维护当前工作方式、专题路线和整体进度。随着训练推进，我会为值得长期保留的已完成题目发布独立学习笔记，记录：

- 从题意到算法不变量的推导；
- C 接口、指针、内存与返回值合同；
- 实现中出现过的错误和修正；
- 官方样例、Sanitizer 与在线判题结果；
- 后续复习中发生的理解变化。

单题笔记负责沉淀可以复用的理解，不要求每道做过的题都公开成文。

## 参考路线

- [代码随想录题单](https://programmercarl.com/qita/12.list.html)
- [力扣中国站](https://leetcode.cn/)
