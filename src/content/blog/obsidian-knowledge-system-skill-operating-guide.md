---
title: 我的 Obsidian 知识系统如何运行：从 Daily 到 Skill 协作
description: >-
  一份面向真实使用的操作地图：以 Daily-first 的内容流、Weekly 决策、研究缓存、行动与公开边界为主线，说明 Agent 和四个
  Obsidian Skill 何时介入、何时停下。
pubDate: '2026-08-28'
updatedDate: '2026-08-28'
draft: false
category: Knowledge Management
tags:
  - obsidian
  - knowledge-management
  - daily-first
  - agent
  - skill
  - workflow
visibility: public
sourceVaultPath: 60-Publish/KnowledgeVault 实践/我的 Obsidian 知识系统如何运行：从 Daily 到 Skill 协作.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: built
series: KnowledgeVault 实践
seriesOrder: 100
topic: Obsidian
---
# 我的 Obsidian 知识系统如何运行：从 Daily 到 Skill 协作

[系列总览](../obsidian-personal-knowledge-management-skill/)解释了这套知识系统从哪里来、为什么保留 Daily-first 和人工决策。它仍留下一个更实际的问题：打开 Obsidian 之后，什么该直接写，什么值得请 Agent 帮忙，什么时候又该停下来自己判断？

这篇文章补的是这张“操作地图”。它不是把个人配置包装成模板，也不是要求每天跑一遍自动化流程；它只说明内容如何流动、Agent 在何处介入，以及为什么有些门必须一直由人把守。四个 Skill 只是把这套协作边界变成可执行规则的方式，本文只讨论它们在系统中的位置。

## 先看内容怎样运行

这不是“记录 → 自动整理 → 自动发布”的直线流水线。它更像几条并行的路径，在需要判断时回到人：

```text
人类思考 ──> Daily ──(我确认值得继续)──> Inbox ──> Notes / Resources
                                                     ↑
外部资料 ──> LLM Wiki（Research Cache）──(我审核)──────┘

行动任务 ──> Daily / Project / Area ──> 工作台（只读视图）──> Weekly 决策

正式材料 ──(我明确授权公开)──> 原位公开源或独立公开稿 ──> 发布流程
```

| 此刻发生的事 | 真值放在哪里 | Agent 可以做什么 | 必须由我决定什么 |
| --- | --- | --- | --- |
| 冒出想法、观察、疑问或一条任务 | Daily 的原始 Markdown | 围绕我指定的片段提问、连接、核对 | 是否孵化、如何表述、是否保留 |
| 一个概念值得慢慢想，但还不稳定 | Inbox | 准备候选、指出证据缺口 | 是否建页、归到哪里、何时形成正式理解 |
| 需要推进一件有目标和交付物的事 | Project、Daily 或 Area 中的 Markdown task | 聚合、检查、生成有来源的草稿 | 项目范围、优先级、任务去向 |
| 需要消化外部资料 | LLM Wiki 的派生研究层 | 收集来源、解释、对比与综合 | 是否相信、是否带入正式知识、如何写成自己的判断 |
| 有内容想对外说明 | 正式笔记、项目原文或独立公开稿 | 检查公开边界、整理候选、执行已授权的验证 | 是否公开、公开什么、何时发布 |

这里有两个刻意保留的“不自动”。Daily 不会因为被分析过就变成 Inbox 或 Note；LLM Wiki 的综合也不会因为写得完整就成为我的知识。Weekly 的作用不是汇编七天记录，而是集中做任务收口、孵化、promote 和 publish 的判断。

工作台、Tasks、Kanban 与 Bases 也都只读取已有内容。任务仍只写在产生它的 Daily、Project 或 Area 里；视图帮助我看见和安排，而不制造第二份任务数据库。

## 日常与每周的最小节奏

日常的第一步永远不是整理，而是直接写进当天 Daily。一个任务就在它发生的上下文中写成 Markdown task；需要集中查看、改期或排序时，才打开工作台。这样，Daily 保留当天真实的思考流，工作台只提供全景，二者不抢同一份真值。

Weekly 则把节奏拉远一点：我处理未完成任务，决定哪些输入值得继续，哪些候选已经足以形成自己的理解，以及哪些材料应继续保持私有。它不是七篇 Daily 的摘要，更不是自动 promote 的通道。只有在这些决定之后，Skill 才可能参与下一步的核对、研究或受限写入。

## Skill 怎样加入这套系统

四个 Skill 不是四个要同时开启的功能模块，而是一层随问题出现的协作约束。处理真实 Vault 时，顺序始终是：

```text
目标 Vault 的 AGENTS.md、合同和数据边界
                 ↓
obsidian-vault-knowledge-pipeline
                 ↓
按场景选择一个专门 Skill
                 ↓
通用 Markdown 语法、插件或脚本
```

最上层的目标 Vault 规则永远优先。它决定目录、frontmatter、插件、私有范围与 Git 边界；Skill 只能在这些规则之内工作。

| Skill | 何时使用 | 它应交付什么 | 它不会替人做什么 |
| --- | --- | --- | --- |
| `obsidian-vault-knowledge-pipeline` | 要审计、维护、创建公开稿或处理真实 Vault 时 | 先确认权威、范围、授权与验证边界，再完成受限操作 | 覆盖目标 Vault 合同，或把 commit、发布当成默认动作 |
| `obsidian-daily-first-knowledge-system` | 新建 Vault，或评估既有 Vault 是否适合 Daily-first | `init`、`adopt`、`audit`、`maintain` 的可审查起点 | 把示例路径和字段强行套进既有 Vault |
| `obsidian-knowledge-gardener` | 指定 Daily、有限日期范围或一段思考，需要看清已建立的连接 | 显式 Wikilink 账目，以及少量值得继续的问题和候选 | 自动建空白页面、替我归类、改写 Daily 或 promote 内容 |
| `logseq-to-obsidian-migration` | 从 Logseq 的快照或导出开始一次迁移 | 源审计、staging 迁移计划、验证和人工分类清单 | 把迁移当成日常同步，或直接改写生产 Vault |

前两个 Skill 解决“系统怎样被约束和维护”，Gardener 服务于日常知识催化，迁移 Skill 只服务于一次性的历史转换。这样的分工让一项任务只加载真正需要的规则，而不是把所有能力、插件和旧迁移逻辑带进每次写作。

## 按发生的事选择动作

日常使用并不从“调用 Agent”开始，而从一件真实发生的事开始。

| 当下情况 | 先做什么 | 是否需要 Skill |
| --- | --- | --- |
| 今天只是有想法、记录或任务 | 直接打开 Daily 写下，不先分类 | 不需要 |
| 某段 Daily 中出现很多明确双链，或我卡在一个概念上 | 指定该 Daily，请 Agent 做只读盘点和催化 | Gardener |
| 想把一个旧 Vault 改造成 Daily-first，或怀疑现有结构已经漂移 | 先做只读 audit，看差异和候选路径 | Daily-first Skill；不要先 `--apply` |
| 要改真实 Vault 的结构、frontmatter、公开稿或发布链路 | 先说明精确路径与授权级别 | Pipeline 作为总边界，再按需要叠加场景 Skill |
| 手上是 Logseq 历史数据 | 冻结只读快照，在 staging Vault 做审计和 dry-run | Migration Skill |

这也解释了为什么我不让系统每日全库扫描：多数时刻只需要写，而不是被整理。Agent 的介入由问题、链接、研究需求、结构漂移或明确输出目标触发；时间节奏主要保留给 Weekly 的人工回顾。

## 协作请求怎样不越界

我只需要把当前问题、目标材料、可读范围、授权级别和期待的证据说清。这样“请帮我整理”不会被误解为允许批量重写；一次双链盘点也不会悄悄升级成创建页面、公开或提交。Skill 的价值不是替我多做决定，而是把每一次协作准确地停在该停的位置。

## 有些决定不应交给 Skill

Skill 能让 Agent 的行为更稳定，但不能替代作者身份。无论它给出多么完整的报告，下面几件事仍然必须由我确认：

- Daily 的原始表达是否应被保留、忽略还是继续思考；
- 一个候选是否已经是我认可的长期知识，而不只是 Agent 的拟议表述；
- 研究材料是否足以支撑结论，是否适合脱离私人语境；
- 一篇内容是否应该公开，以及公开、提交、推送和上线各自是否授权；
- 目标 Vault 应采用什么目录、字段、插件和数据边界。

这不是为了给流程增加摩擦，而是为了让工具服务于思考。系统可以迁移、目录可以重构、插件可以更换；只要原始输入、人工判断和公开边界没有被自动化越过，它就不会反过来要求我按工具的方式思考。

## 系统不会在输出处结束

一篇笔记形成、一个项目推进或一次公开表达完成后，留下的新问题仍会回到 Daily，新的外部材料仍会先进入研究缓存。系统的终点不是一篇“完成”的笔记，而是下一次更容易进入、也更容易作出判断的思考。

想理解这套系统的来由，可以从 [系列总览](../obsidian-personal-knowledge-management-skill/) 开始；想看 Daily、任务与项目怎样各归其位，则继续读 [把 Daily 还给思考：一次 Obsidian 知识系统重构](../daily-first-knowledge-system-refactor/)、[用 Obsidian 管理任务：Daily、看板与项目进度的职责分离](../obsidian-task-management-workflow/) 与 [让 Projects 回到真实项目：一次 Obsidian 项目边界重构](../obsidian-project-boundary-refactor/)。

我愿意分享的是一套可讨论、可检查的方法，不是一份应被原样复制的个人生活。对我而言，这正是把知识系统做成 Skill 的意义：让协作过程更可靠，同时把知识、判断和责任仍然留在人的手里。
