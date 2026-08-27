---
title: Obsidian 入门：本地 Markdown、链接网络与我的知识库实践
description: 一篇笔记式 Obsidian 介绍：从官方中文帮助出发，理解本地 Markdown、双向链接、属性和模板，再看我的 KnowledgeVault 如何落地。
pubDate: '2026-07-07'
updatedDate: '2026-08-08'
draft: false
category: Knowledge Management
tags:
  - obsidian
  - knowledge-management
  - markdown
  - llm-wiki
visibility: public
sourceVaultPath: 60-Publish/KnowledgeVault 实践/Obsidian 入门：本地 Markdown、链接网络与我的知识库实践.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: thought
series: KnowledgeVault 实践
seriesOrder: 40
topic: Obsidian
---
# Obsidian 入门：本地 Markdown、链接网络与我的知识库实践

如果只把 Obsidian 当成“另一个 Markdown 编辑器”，很容易错过它真正有意思的地方。它当然能写 Markdown，但更重要的是，它把一组普通文件组织成一个可以长期生长的本地知识库：笔记留在自己的文件夹里，关系由链接和元数据慢慢织出来，界面和插件只是服务于这套文件系统。

这篇是一次笔记式介绍。我主要参考了 Obsidian 的中文帮助文档，并结合当前这个 KnowledgeVault 的真实使用方式，梳理三个问题：Obsidian 的设计思想是什么，最基本的用法是什么，以及我现在怎样把它接进写作、迁移、发布和 LLM Wiki 流程。

专题总览：[我的个人知识系统](../obsidian-personal-knowledge-management-skill/)。

## 先理解 Vault

Obsidian 的核心单位是 Vault。按照官方帮助的解释，Vault 本质上是系统里的一个文件夹，里面放着笔记、附件和 Obsidian 设置。笔记以 Markdown 纯文本保存，仓库级设置保存在 `.obsidian` 目录里。

这个设计决定了 Obsidian 的气质。你的笔记不是被锁进一个远端数据库，也不是只能通过某个导出按钮拿出来。它们就是一批 `.md` 文件，可以被文件管理器、Git、脚本、其他编辑器和备份工具处理。

所以我理解 Obsidian 的第一原则是本地优先。应用本身可以很复杂，但数据应该足够简单。只要文件还在，知识库就不会完全依赖某个应用的生命周期。

## 设计思想：目录负责秩序，链接负责关系

传统文件夹适合回答“这份东西应该放在哪里”。Obsidian 的链接系统更适合回答“这份东西和什么有关”。

官方帮助里介绍了内部链接、反向链接、出链和关系图谱。内部链接可以用紧凑的 Wiki 链接，也可以用普通 Markdown 链接。反向链接让你站在一篇笔记上，看有哪些笔记指向它。关系图谱则把笔记显示成节点，把链接显示成连线，让你观察知识库的连接结构。

这几个功能组合在一起，就形成了 Obsidian 的第二个原则：不要只用目录管理知识。目录给内容一个稳定落点，链接让内容有多个入口。一个主题可以属于某个项目，也可以同时连接到方法、资源、历史记录和后续写作。

这也是我没有把所有内容都压成一套标签系统的原因。标签适合表示主题，不适合承担状态、来源、发布进度和项目结构。状态应该进入属性，来源应该进入字段，长期导航应该由 MOC 或索引页维护。

## 基本用法

最小的 Obsidian 用法其实很简单。

第一步，创建或打开一个 Vault。你可以新建一个空文件夹，也可以把已有 Markdown 文件夹作为 Vault 打开。只要理解 Vault 是一个本地文件夹，后面很多概念都会变得直接。

第二步，写 Markdown。标题、段落、列表、引用、代码块这些基础语法已经足够开始。官方帮助在“创建第一篇笔记”里强调了纯文本的持久性，这也是我选择 Obsidian 作为长期知识库的关键原因。

第三步，建立内部链接。写到一个概念、项目或人名时，如果它值得单独沉淀，就创建一篇笔记并链接过去。如果暂时不确定，也可以先让链接成为一个未来的入口。

第四步，回看反向链接和出链。链接不是越多越好。真正有用的链接应该帮助你发现上下文：这篇笔记从哪里来，影响了哪些内容，还有哪些提及没有被正式链接起来。

第五步，用属性记录元信息。Obsidian 的属性可以保存标题、别名、标签、日期、链接等结构化信息。官方帮助也提醒，嵌套属性支持有限，所以我在这个 Vault 里只使用扁平 YAML。

第六步，用命令面板和模板减少重复劳动。命令面板适合快速运行命令，模板适合固定 Daily、项目、资源和发布稿的基本结构。等这些动作稳定后，再考虑是否需要更多插件。

## 当前 KnowledgeVault 的用法

这个仓库叫 KnowledgeVault，是从 Logseq 迁移到 Obsidian 后形成的个人知识库。当前约 620 篇活跃笔记，主要围绕 Daily、长期知识笔记、项目材料、外部资源、内容地图和发布稿组织。

顶层目录采用 PAREA 风格前缀：

```text
00-Inbox      新内容和未分类内容
01-Daily      日常工作台
10-Notes      长期知识笔记
20-Projects   项目材料
30-Areas      持续关注领域
40-Resources  外部资料和学习材料
50-MOCs       内容地图
60-Publish    公开原生文章和必要的公开改写稿
70-LLM-Wiki   Agent 派生层与人工审视入口
80-Archive    历史迁移归档
90-Attachments 附件
99-Templates  模板
```

日常入口优先看 `01-Daily/`，新内容先进入 `00-Inbox/`。稳定的知识再移动到 Notes、Projects、Resources 或 MOCs。这样做有一个好处：写作时不用一开始就决定一篇东西的最终分类，整理时又能保持长期目录干净。

所有正式笔记都使用扁平 frontmatter。发布相关字段也显式写在源文里，例如发布目标、发布状态、slug、分类和可见性。默认状态保持 private，不会因为某篇笔记存在就自动发布。

## 迁移归档与发布区分开

这个 Vault 有一段很重的 Logseq 迁移历史。迁移已经结束，脚本、报告和批次记录都放进 `80-Archive/`。这些内容是历史档案，不是日常写作入口，也不进入普通发布检查。

发布资格由源文中的明确元数据和人工授权决定，不由目录决定。正文可以直接公开的正式笔记和项目保留在原目录；`60-Publish/` 只保存以公开表达为本体的文章，以及确实需要匿名化、删减或重组的公开稿。同步器读取这些已授权源文，生成 Astro 站点里的公开副本，再运行发布检查和构建。

这篇文章本身也是这个流程的一次验证：源文在 `60-Publish/`，状态是 published，同步后会进入 BlogSite 的 blog 集合。

## LLM Wiki 的角色

最近我在 Vault 里加了一个 `70-LLM-Wiki/`。它不是 Obsidian 正式知识面，而是 agent-only 的派生层：`raw/` 保存人工指定的输入，`wiki/` 保存 source、concept、entity 和 synthesis 工作稿，`reviews/` 集中承载人工审视，`reports/` 保存检查证据。

本次写作就是一次全流程验证：先把 Obsidian 中文帮助文档记录为 LLM Wiki 的 raw source，再生成 source page、concept page 和 synthesis page，随后在集中审视入口判断哪些内容值得保留。只有用户进一步明确授权时，工作稿才会被重新组织成正式笔记或公开稿；公开稿不会直接复制 LLM Wiki 页面。

这个边界很重要。LLM 可以帮助整理和联想，但正式知识库不能被生成内容自动污染。工作稿先经过保留、删除、压缩和证据缺口审查；能够公开发布的内容，还必须经过来源确认、隐私检查、明确授权、同步预演、发布检查和线上验证。

## 我的使用建议

如果你刚开始用 Obsidian，不需要先设计一套复杂系统。更稳的路线是：

1. 先接受“Vault 是本地文件夹”这件事，把备份和同步想清楚。
2. 用 Markdown 写几周，不急着装插件。
3. 对真正会复用的概念建立链接，不为每个词都建页面。
4. 用属性记录少量关键元数据，不把 YAML 写成数据库。
5. 等 Daily、项目和资源的形态稳定后，再做模板。
6. 图谱用于观察，不用于替代整理。

Obsidian 最有价值的地方，不是它替你决定知识应该怎样分类，而是它允许你从普通文本开始，逐步长出适合自己的结构。这个过程慢一点，反而更耐用。

## 参考

- [创建第一篇笔记 - Obsidian 中文帮助](https://obsidian.md/zh/help/create-note)
- [Obsidian 的储存机制 - Obsidian 中文帮助](https://obsidian.md/zh/help/data-storage)
- [管理仓库 - Obsidian 中文帮助](https://obsidian.md/zh/help/manage-vaults)
- [内部链接 - Obsidian 中文帮助](https://obsidian.md/zh/help/links)
- [反向链接 - Obsidian 中文帮助](https://obsidian.md/zh/help/plugins/backlinks)
- [关系图谱 - Obsidian 中文帮助](https://obsidian.md/zh/help/plugins/graph)
- [属性 - Obsidian 中文帮助](https://obsidian.md/zh/help/properties)
- [命令面板 - Obsidian 中文帮助](https://obsidian.md/zh/help/plugins/command-palette)
- [模板 - Obsidian 中文帮助](https://obsidian.md/zh/help/plugins/templates)
