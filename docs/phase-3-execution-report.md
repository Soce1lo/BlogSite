# Phase 3 执行报告

## 范围

本阶段接入真实 Vault 中明确标记为可发布的博客文档，目标集合为 `blog`。当前公开 slug 包括 `logseq-to-obsidian-migration` 和 `logseq-to-obsidian-migration-guide`。

## 已完成

- 将源文档发布状态从 `draft` 切换为 `published`，保持 `publish_target: blog`、`publish_visibility: public` 和既有 `publish_slug` 不变。
- 通过 `pnpm sync:vault` 生成公开副本：`src/content/blog/logseq-to-obsidian-migration.md`。
- 通过后续同步生成配套公开副本：`src/content/blog/logseq-to-obsidian-migration-guide.md`。
- 生成同步报告：`reports/sync-report.md`、`reports/wikilink-warnings.md`、`reports/asset-warnings.md`。
- 生成发布 manifest：`reports/publish-manifest.json`、`reports/publish-manifest.md`。
- 修正发布检查器对正文代码块中 `publish_status: private` 的误判；检查器仍拒绝 frontmatter 中的 private 发布状态。
- 完成 Tone-inspired 阅读主题适配并发布：明暗主题、轻量搜索、阅读进度、文章目录 rail、目录高亮、长文 prose 和移动端适配。

## 同步结果

- scanned_vault_files: 626
- publish_candidates: 2
- synced: 2
- warnings: 73
- errors: 0
- blog 输出: 2

warning 主要来自迁移指导文中用于说明脚本和测试边界的降级双链与缺失图片引用；发布检查 `errors: 0`，发布前已保留 warning 报告用于追溯。

## 发布边界

- GitHub Actions 仍只构建仓库内公开副本，不读取真实 Vault。
- 公开副本只保存发布所需 Markdown，不包含本机绝对路径。
- 同步报告和发布 manifest 不粘贴源文档正文。
- 本阶段未提交完整 Vault、私有附件或 `.env`。
- Tone 主题适配没有导入完整主题 demo 内容，也没有改变公开 URL 规则。

## 后续维护

后续新增真实内容时仍按 Phase 3 门禁执行：先在 Vault 中显式设置发布字段，再本地同步、检查发布边界、构建，并只提交生成后的公开副本和报告。

主题后续可继续评估完整 Pagefind、阅读时长、相关文章、代码块复制、图片 lightbox、Open Graph 图片、标签/系列筛选页、RSS 分类、Giscus 评论和更完整的无障碍导航。引入时需要扩展 `tests/theme-render.test.ts`，并验证 GitHub Pages 子路径和发布隐私边界。
