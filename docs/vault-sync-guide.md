# Vault 同步边界

当前同步器消费 `contracts/publishing/v1/` 定义的来源契约，并生成 Astro 公开副本。该目录是字段模型的唯一权威位置；本指南只说明当前同步实现和安全边界。

## 运行方式

默认配置使用相对路径，不在仓库中保存本机绝对路径：

```bash
BLOGSITE_VAULT_PATH="../KnowledgeVault" pnpm sync:vault
pnpm check:publish
pnpm build
```

也可以设置以下环境变量覆盖输出位置：

- `BLOGSITE_CONTENT_OUTPUT_PATH`
- `BLOGSITE_IMAGE_OUTPUT_PATH`
- `BLOGSITE_REPORTS_PATH`

## 同步流程

1. 只读递归扫描 Markdown，跳过配置中的排除目录和 Daily 目录；`60-Publish/` 下的管理子文件夹随源路径一起扫描。
2. 建立发布目标索引，只收录满足发布条件且 `publish_kind` 合法的内容。
3. 将已发布目标双链转为适配 GitHub Pages 子路径的相对网页链接；未发布或不存在目标转为纯文本并记录 warning。
4. 将本地图片复制到 `public/images/{publish_slug}/`；缺失图片转为文本并记录 warning。
5. 将 Obsidian callout 标记转换为可移植的标准 Markdown 引用，避免公开页面显示 `[!summary]` 等内部语法。
6. 只清理带 `managedBy: vault-sync` 的旧副本，保留手工内容。
7. 写入同步报告、双链 warning、资源 warning、发布 manifest JSON 和发布 manifest Markdown，不粘贴正文。

## 安全边界

1. 同步只能在本地显式执行。
2. 原始 Vault 必须保持只读，不得被同步流程修改。
3. GitHub Actions 只构建仓库中已有的公开发布副本。
4. 任何本机绝对路径都不得进入公开内容、报告或版本控制。
5. 未明确标记为可发布的内容不得同步。

同步器按照 `contracts/publishing/v1/` 中的允许值、默认行为和校验规则消费 `publish_kind`，并生成用于公开展示的 `outputKind`。公开稿源路径可以是 `60-Publish/<管理文件夹>/...`；完整的相对路径写入 `sourceVaultPath` 和 manifest 供对账，但生成的 `src/content/{collection}/{publish_slug}.md` 仍按 slug 扁平输出，管理文件夹不参与站点路由。系列导航由明确的 `publish_series` 和 `publish_series_order` 驱动，不由文件夹名推导。

同步器拒绝把内容、图片或报告输出目录放到 Vault 内部。自动测试还会比较合成 Vault 同步前后的完整文件哈希。

## 当前公开同步状态

每次真实同步都以当次 `reports/` 中的 `sync-report.md`、`wikilink-warnings.md`、`asset-warnings.md`、`publish-manifest.json` 和 `publish-manifest.md` 为准；本文不固化候选数、同步数或 warning 统计。正式同步前仍须先做临时目录 preview，并确认嵌套源路径、系列字段、私有链接和资源 warning 都符合本次范围。

JSON 和 Markdown manifest 必须记录 `contractVersion: v1` / `contract_version: v1`，用于确认本次结果由哪个契约版本生成。
