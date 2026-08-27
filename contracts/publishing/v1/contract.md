# Publishing Contract V1

## Authority

本目录是 V1 发布字段、枚举、默认值和兼容规则的唯一权威来源。Vault 局部指南、模板、MOC、同步器和 Astro schema 都是消费者，不得另建契约副本。

## Scope

V1 描述知识来源如何成为 BlogSite 发布候选。它不把 Vault 管理文件夹变成 frontmatter 字段，也不规定 Astro collection 实现、页面布局或未来框架。

## Source layout and series navigation

- 同步器递归读取源 Vault 的 Markdown，因此公开稿可以位于 `60-Publish/` 下的一级或多级管理子文件夹中；当前 KnowledgeVault 对独立公开稿的最低目录深度由 Vault 自己的 frontmatter profile 维护。
- 管理文件夹只用于源稿的整理和 provenance。同步 manifest 与生成副本保留完整的相对 `sourceVaultPath`，但不会把管理文件夹自动变成 `publish_category`、`publish_topic` 或 `publish_series`。
- 公开副本仍按 collection 和唯一 `publish_slug` 输出，站点 URL 由 `publish_slug` 决定；移动源稿或更换管理文件夹不会改变 URL，也不会改变站点集合。
- `publish_series` 是跨 `blog`、`notes`、`projects` 的公开系列标识。只有明确填写该字段的内容才进入系列导航；`publish_series_order` 只能与系列一起使用，且必须是有限数值。系列没有顺序的内容仍可发布，但在系列排序中排在有顺序内容之后。

## Required fields

`schema.json` 的 `required` 定义 V1 历史内容仍可解析的基础字段；`x-authoring-required-by-publish-status` 定义当前来源的状态条件规则：

- `publish_status: draft` 仍是发布候选，可以暂时省略 `publish_date`。
- 当前来源转为 `publish_status: published` 时必须记录 `publish_date`，且状态变更必须得到明确授权。

## Optional fields and defaults

- 缺少 `publish_category` 时，当前 Astro 适配器生成 `未分类`。
- 缺少 `publish_kind` 时，blog、notes、projects 分别映射为 thought、learned、built。
- `publish_date` 记录内容第一次进入公开站点的日期；首次发布后保持不变，正文修订只更新 `updated`。V1 适配器仅为已经存在的旧内容在缺少该字段时回退到 `created`；该兼容路径不豁免当前来源的创作规则。
- `publish_series_order` 必须是有限 number，且必须同时存在 `publish_series`；否则发布候选无效。
- topic、series 和 kind 只表达公开语义，不改变 Vault 管理文件夹或知识层级。

## Privacy and ownership

- Daily、private、未授权正文和本机绝对路径不得进入公开输出。
- 真实知识来源只读；CI 不读取真实 Vault。
- `managedBy: vault-sync` 的 BlogSite 副本不得人工编辑。
- 发布状态只能由用户明确授权改变。

## Compatibility

- V1 可以增加可选字段或非破坏性默认值。
- 当前来源的创作门禁可以收紧，但 V1 适配器必须继续解析收紧前已经存在的内容；只收紧创作规则不要求升级 V2。
- 删除字段、改变字段语义或让现有公开内容无法解析时必须创建 V2。
- V2 的双版本解析和迁移只在用户明确启动重构时实施。

## Deferred identities and migrations

稳定 `publish_id`、协议 V2、来源适配器拆分、发布适配器拆分、框架迁移和 Vault 重组保留在架构设计中，本阶段不实施。

## Examples

- `examples/published-blog.md`
- `examples/draft-note.md`
