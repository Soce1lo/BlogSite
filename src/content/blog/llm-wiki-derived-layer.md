---
title: 在 Obsidian Vault 中引入 LLM Wiki：从独立派生层开始
description: 一次把 LLM Wiki 方法落地到个人 Obsidian Vault 的实践记录：先建立独立生成层，再通过人工确认进入正式笔记和 BlogSite。
pubDate: '2026-07-07'
updatedDate: '2026-07-07'
draft: false
category: Knowledge Management
tags:
  - llm-wiki
  - obsidian
  - knowledge-management
  - agent
visibility: public
sourceVaultPath: 60-Publish/在 Obsidian Vault 中引入 LLM Wiki：从独立派生层开始.md
managedBy: vault-sync
sourcePublishStatus: published
series: KnowledgeVault 实践
seriesOrder: 20
topic: LLM Wiki
---
# 在 Obsidian Vault 中引入 LLM Wiki：从独立派生层开始

我最近准备把 Andrej Karpathy 提到的 LLM Wiki 模式引入自己的 Obsidian Vault。这个想法很直接：不要让大模型每次提问时都重新从原始材料里临时检索和拼接，而是让它持续维护一个中间层 wiki。新材料进入时，agent 负责摘要、交叉引用、更新索引、标注矛盾；人负责选择来源、判断方向和决定哪些内容值得留下。

这个模式对空白知识库很自然。但我的 Vault 不是空白系统。它已经从 Logseq 迁移完成，有 Daily、Inbox、Notes、Projects、Resources、MOCs 和 Publish 区，也有明确的迁移档案和发布边界。因此我没有直接让 LLM 接管正式笔记，而是先把它作为一个独立派生层落地。

## 为什么不直接放进正式图谱

当前 Vault 的正式知识层主要有几类：

- `01-Daily/` 是日常工作台，里面有上下文和临时想法。
- `10-Notes/` 是长期知识笔记。
- `20-Projects/` 是项目材料。
- `40-Resources/` 是外部资料和阅读笔记。
- `50-MOCs/` 是人工维护的导航和主题地图。

这些目录已经承载了人类判断。LLM 生成内容如果直接写进去，会很快带来两个问题：一是污染图谱，把“模型整理出的可能有用内容”伪装成正式知识；二是让后续审计变困难，不容易区分哪些是原始笔记、哪些是 agent 推断。

所以第一版设计选择把 LLM Wiki 放在 `70-LLM-Wiki/`。这个目录和正式笔记区平级，但语义上仍然是派生层。它是一个可审计的生成层，而不是正式知识层。

## 落地结构

当前最小结构是：

```text
70-LLM-Wiki/
├── AGENTS.md
├── SCHEMA.md
├── README.md
├── 00-Raw/
│   ├── sources/
│   └── assets/
├── 10-Wiki/
│   ├── index.md
│   ├── log.md
│   ├── sources/
│   ├── concepts/
│   ├── entities/
│   └── synthesis/
└── 90-Reports/
    └── lint/
```

这里有三个核心层：

`00-Raw/` 保存输入。它可以是一篇文章、一个链接摘要、一段访谈、一份计划，或者一次对话中确认下来的设计。raw source 是输入事实，默认不改写。

`10-Wiki/` 保存 LLM 维护的页面，包括 source 摘要、概念页、实体页、综合分析、索引和日志。这里是 agent 可以工作的主要区域。

`90-Reports/` 保存检查报告，比如孤页、重复概念、缺少来源、潜在隐私风险和可以 promote 的候选内容。

## 第一篇输入

这次我把“LLM Wiki 引入计划”本身作为第一篇输入。它记录了几个约束：

- LLM Wiki 先作为独立派生层，不直接进入正式 Vault。
- 结构贴近公开实践：`00-Raw/`、`10-Wiki/`、`90-Reports/`。
- 每次 agent 工作前必须读取 schema、index 和 log。
- 正式内容仍要人工确认后 promote。
- 公开发布只通过 `60-Publish/` 和 BlogSite 同步链路进行。

执行后的最小闭环是：

```text
plan -> raw source -> source page -> concept page -> synthesis page -> index/log
```

这个闭环很小，但它验证了后续工作方式：agent 不只是回答问题，而是把回答沉淀进一个可追踪的派生知识层。

## Agent 的工作边界

我给 LLM Wiki 单独写了 `AGENTS.md` 和 `SCHEMA.md`。规则很硬：

- 默认只写 `70-LLM-Wiki/`。
- 不直接改写 Daily、Notes、Projects、Resources 和 MOCs。
- 不修改 Logseq raw archive。
- ingest 后必须更新 `10-Wiki/index.md` 和 `10-Wiki/log.md`。
- 单次计划改动超过 10 个 wiki 页面时，先列清单再等待确认。
- promote 到正式 Vault 必须单独授权。

这个边界比很多公开示例更保守，但适合一个已经有历史、隐私和发布链路的个人 Vault。

## 如何进入正式知识库

LLM Wiki 的内容不会自动变成正式笔记。后续只有三种出口：

第一，继续留在 `70-LLM-Wiki/`，作为 agent 的工作记忆和派生材料。

第二，人工确认后 promote 到 `10-Notes/` 或 `50-MOCs/`，成为正式知识笔记或主题地图。

第三，改写成 `60-Publish/` 里的公开文章，再通过 BlogSite 发布。

这次发布走的是第三种路径。公开文章不是直接复制 LLM Wiki 页面，而是把本次设计和执行过程整理成面向读者的实践记录。

## 下一步

我会先用 2-3 个低敏来源继续试运行单来源 ingest，观察几个问题：

- source page 是否足够短，能不能帮助后续 query 快速定位。
- concept page 是否会重复膨胀。
- synthesis page 是否真的值得长期保留。
- lint 是否能发现孤页、无来源结论和可 promote 候选。

如果这些环节稳定，再考虑是否让部分 LLM Wiki 页面进入 Obsidian 可见图谱。当前阶段，我更愿意先让它独立运行：少一点炫技，多一点可回滚、可审计。
