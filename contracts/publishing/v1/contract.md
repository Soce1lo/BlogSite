# Publishing Contract V1

## Authority

本目录是 V1 发布字段、枚举、默认值和兼容规则的唯一权威来源。Vault 局部指南、模板、MOC、同步器和 Astro schema 都是消费者，不得另建契约副本。

## Scope

V1 描述知识来源如何成为 BlogSite 发布候选。它不规定 Vault 目录、Astro collection 实现、页面布局或未来框架。

## Required fields

必需字段以 `schema.json` 的 `required` 为准。`publish_status: draft` 仍是发布候选，但未经明确授权不得改为 `published`。

## Optional fields and defaults

- 缺少 `publish_category` 时，当前 Astro 适配器生成 `未分类`。
- 缺少 `publish_kind` 时，blog、notes、projects 分别映射为 thought、learned、built。
- `publish_series_order` 只有在 `publish_series` 存在时生效。
- topic、series 和 kind 只表达公开语义，不改变 Vault 目录或知识层级。

## Privacy and ownership

- Daily、private、未授权正文和本机绝对路径不得进入公开输出。
- 真实知识来源只读；CI 不读取真实 Vault。
- `managedBy: vault-sync` 的 BlogSite 副本不得人工编辑。
- 发布状态只能由用户明确授权改变。

## Compatibility

- V1 可以增加可选字段或非破坏性默认值。
- 删除字段、改变字段语义或让现有公开内容无法解析时必须创建 V2。
- V2 的双版本解析和迁移只在用户明确启动重构时实施。

## Deferred identities and migrations

稳定 `publish_id`、协议 V2、来源适配器拆分、发布适配器拆分、框架迁移和 Vault 重组保留在架构设计中，本阶段不实施。

## Examples

- `examples/published-blog.md`
- `examples/draft-note.md`
