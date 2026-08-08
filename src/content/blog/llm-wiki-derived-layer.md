---
title: 在 Obsidian Vault 中引入 LLM Wiki：从独立派生层到人工审视
description: 一次把 LLM Wiki 落地到个人 Obsidian Vault 并持续重构的实践：分离原始输入、Agent 工作稿、人工审视与正式输出。
pubDate: '2026-07-07'
updatedDate: '2026-08-08'
draft: false
category: Knowledge Management
tags:
  - llm-wiki
  - obsidian
  - knowledge-management
  - agent
visibility: public
sourceVaultPath: 60-Publish/在 Obsidian Vault 中引入 LLM Wiki：从独立派生层到人工审视.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: thought
series: KnowledgeVault 实践
seriesOrder: 50
topic: LLM Wiki
---
# 在 Obsidian Vault 中引入 LLM Wiki：从独立派生层到人工审视

我把 LLM Wiki 引入自己的 Obsidian Vault，最初的想法很直接：不要让大模型每次提问时都重新从原始材料里临时检索和拼接，而是让它持续维护一个中间层 wiki。新材料进入时，Agent 负责整理来源、建立概念、形成综合分析；人负责选择输入、判断方向和决定哪些内容值得留下。

第一版解决了“生成内容不能直接污染正式知识库”的问题，却留下了另一个更实际的问题：source、concept、synthesis、索引和正式输出散在不同位置，人没有一个可以集中审视 Agent 输出的界面。随着 I2C、SPI 和 Obsidian 等主题进入这条链路，我又对它做了一次重构：保留独立派生层，同时增加专门的人工审视层。

专题入口：[Obsidian 个人知识管理专题](../obsidian-personal-knowledge-management-skill/)。

## 为什么不直接放进正式图谱

当前 Vault 的正式知识层主要有几类：

- `01-Daily/` 是日常工作台，里面有上下文和临时想法。
- `10-Notes/` 是长期知识笔记。
- `20-Projects/` 是项目材料。
- `40-Resources/` 是外部资料和阅读笔记。
- `50-MOCs/` 是人工维护的导航和主题地图。

这些目录已经承载了人类判断。LLM 生成内容如果直接写进去，会很快带来两个问题：一是污染图谱，把“模型整理出的可能有用内容”伪装成正式知识；二是让后续审计变困难，不容易区分哪些是原始笔记、哪些是 agent 推断。

所以第一版设计选择把 LLM Wiki 放在 `70-LLM-Wiki/`。这个目录会纳入 git 主 repo，但在 Obsidian 中隐藏。它是 agent 可以维护、可以审计、可以回滚的生成层，而不是正式知识层。

## 落地结构

当前结构是：

```text
70-LLM-Wiki/
├── AGENTS.md
├── SCHEMA.md
├── README.md
├── raw/
│   ├── sources/
│   └── assets/
├── wiki/
│   ├── index.md
│   ├── log.md
│   ├── sources/
│   ├── concepts/
│   ├── entities/
│   └── synthesis/
├── reviews/
│   ├── index.md
│   ├── _审查包模板.md
│   └── 主题审查包.md
└── reports/
    └── lint/
```

现在有四层职责：

`raw/` 保存人工指定的输入。它可以是一篇文章、一个来源清单、一段访谈或一次确认下来的设计。raw source 创建后不由 Agent 静默改写；需要修订时，新建版本或追加更正说明。

`wiki/` 保存 Agent 维护的工作稿，包括 source 摘要、概念页、实体页、综合分析、内容索引和追加式日志。

`reviews/` 是唯一的人工审视入口。这里不复制工作稿全文，而是按主题汇总待审材料、核心结论、证据缺口、建议删除或压缩的部分、可能的正式去向和人工决定。

`reports/` 保存结构和内容健康检查，例如孤页、失效链接、重复材料、来源缺口和潜在隐私风险。

## 为什么必须增加人工审视层

第一版把 review 状态放在每篇工作稿的 YAML 和 `wiki/index.md` 表格里。机器可以读取这些状态，但人仍然要在多个目录之间来回跳转，而且“这份工作稿是否值得保留”和“它是否可以进入正式笔记或公开稿”被混成了一个问题。

重构后的 `reviews/index.md` 只服务于人的判断。每个主题可以建立一份短审查包，统一回答七个问题：

- 这份材料要解决什么？
- Agent 输出的核心结论是什么？
- 哪些内容建议保留？
- 哪些内容建议删除或压缩？
- 证据和不确定性在哪里？
- 最终适合保留成什么形式？
- 人工作出了什么决定？

人可以直接删除或改写工作稿里的无用段落。这本身就是有效反馈，Agent 不应该在后续更新中无理由恢复。只有 `raw/` 中的原始输入保持不可变。

## YAML 不再承担过程管理

重构前，LLM Wiki 为了表达页面类别、可见性、来源和 review 状态，在 frontmatter 中加入了大量专用字段。它们既重复了目录语义，也让这层内容偏离 Vault 的统一约定。

现在 LLM Wiki 内容页与其他 Vault 笔记使用同一套收缩型扁平 YAML：保留标题、创建时间、更新时间、类型和状态五个核心字段，只在确有查询用途时保留非空可选字段。

页面种类交给路径表达，来源和证据边界写进正文，人工决定写进 `reviews/`。原有的 LLM 专用过程字段、来源字段和普通页面里的发布占位都被删除。这样做的目的不是少写几行 YAML，而是让 frontmatter 只承担稳定查询，不再伪装成一套工作流数据库。

## 两道审查门

这次重构最重要的变化，是把两个经常混在一起的问题拆开。

第一道是保留性审查：这份 Agent 工作稿是否有价值？哪些内容应该保留、删除、压缩或继续补证据？它可以只停留在 LLM Wiki，不需要进入正式知识库。

第二道是正式材料审查：只有用户进一步明确要求 promote 或 publish 时，才检查目标读者、单一主线、事实与推断边界、来源可追溯性、私人上下文和目标目录契约。没有明确授权，就只继续修改工作稿。

因此当前流程更接近：

```text
人工指定输入
  -> raw source
  -> source / concept / entity / synthesis 工作稿
  -> reviews 人工审视
      -> 保留、删除、压缩或继续补证据
      -> 明确授权后，改写为正式笔记或公开稿
```

`wiki/index.md` 现在只负责内容导航，`reviews/index.md` 负责人工判断，`wiki/log.md` 只追加操作历史。三者不再互相冒充。

## 这套流程实际跑出了什么

这套结构已经不只是目录设计。I2C 和 SPI 主题经历了 raw、source、concept、synthesis、人工 review 和 promote，最终形成了正式知识笔记；但它们的板级波形、具体器件 datasheet 和实测结论仍被明确标成证据缺口。Obsidian 主题则从官方帮助来源经过派生工作稿，改写成公开文章。

这些结果也暴露出重复：入口型 source page 可能太薄，concept 与 synthesis 可能重复调试清单，已经形成正式输出的工作稿也未必需要永久保留。现在这些问题不再藏在 Agent 专用状态里，而是直接列在人可以阅读和修改的主题审查包中。

## 当前边界

`70-LLM-Wiki/` 仍然纳入 git，但不属于 Obsidian 正式知识面，并在本机界面中隐藏。Agent 可以维护派生层，不能自动改写 Daily、正式笔记或公开稿，也不能自动发布。

我现在更关心的不是让 LLM Wiki 生成更多内容，而是让无用内容更容易被看见、删除和压缩。一个可靠的知识工作流，不只要能持续生产，还要让人始终拥有清晰的审视入口和最终决定权。
