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

1. 只读扫描 Markdown，跳过配置中的排除目录和 Daily 目录。
2. 建立发布目标索引，只收录满足发布条件且 `publish_kind` 合法的内容。
3. 将已发布目标双链转为网页链接；未发布或不存在目标转为纯文本并记录 warning。
4. 将本地图片复制到 `public/images/{publish_slug}/`；缺失图片转为文本并记录 warning。
5. 只清理带 `managedBy: vault-sync` 的旧副本，保留手工内容。
6. 写入同步报告、双链 warning、资源 warning、发布 manifest JSON 和发布 manifest Markdown，不粘贴正文。

## 安全边界

1. 同步只能在本地显式执行。
2. 原始 Vault 必须保持只读，不得被同步流程修改。
3. GitHub Actions 只构建仓库中已有的公开发布副本。
4. 任何本机绝对路径都不得进入公开内容、报告或版本控制。
5. 未明确标记为可发布的内容不得同步。

`publish_kind` 是可选的公开输出语义，允许值为 `thought`、`learned`、`built`、`revised`。缺省值按 `publish_target` 映射；非法值会阻止该候选同步。同步后的 `outputKind` 只用于公开展示，不改变 Vault 的目录或内容层级。

同步器拒绝把内容、图片或报告输出目录放到 Vault 内部。自动测试还会比较合成 Vault 同步前后的完整文件哈希。

## 当前公开同步状态

当前仓库已包含四篇由真实 Vault 同步生成的公开博客副本：

- `blog/logseq-to-obsidian-migration-guide`
- `blog/logseq-to-obsidian-migration`
- `blog/llm-wiki-derived-layer`
- `blog/obsidian-local-markdown-knowledge-vault`

最新报告位于 `reports/`：`sync-report.md`、`wikilink-warnings.md`、`asset-warnings.md`、`publish-manifest.json` 和 `publish-manifest.md`。当前报告显示 `publish_candidates: 4`、`synced: 4`、`errors: 0`；warning 来自用于说明边界的降级链接和缺失图片记录，发布前仍需逐项确认其合理性。

JSON 和 Markdown manifest 必须记录 `contractVersion: v1` / `contract_version: v1`，用于确认本次结果由哪个契约版本生成。
