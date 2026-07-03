# 发布指南

## Agent 发布 Runbook

按以下顺序执行。MUST 表示必须完成；DO NOT 表示不得绕过。

1. MUST 先运行 `git status --short --branch`，确认当前分支、未提交改动和是否有用户正在编辑的文件。
2. MUST 读取 `docs/publishing-guide.md`、`docs/vault-sync-guide.md` 和 `docs/codex-maintenance-guide.md`，再开始真实发布。
3. MUST 对真实 Vault 只做只读候选扫描。遇到源文仍是 `publish_status: draft` 时，必须得到显式授权后才能把源文改为 `published`；不要替用户改发布状态。
4. MUST 先做临时目录 preview sync，不直接写入正式公开副本。示例：

```bash
preview_root="$(mktemp -d)"
BLOGSITE_VAULT_PATH="/path/to/Obsidian Vault" \
BLOGSITE_CONTENT_OUTPUT_PATH="$preview_root/content" \
BLOGSITE_IMAGE_OUTPUT_PATH="$preview_root/public/images" \
BLOGSITE_REPORTS_PATH="$preview_root/reports" \
pnpm sync:vault
```

5. MUST 检查 preview 输出中的 `reports/sync-report.md`、`reports/publish-manifest.json` 和 `reports/publish-manifest.md`。只有 `summary.errors === 0` 才能继续；warning 可以发布，但必须在报告、提交说明或发布记录里说明原因。
6. MUST 在 preview 通过并得到发布授权后，才运行正式 `pnpm sync:vault`。
7. MUST 在正式同步后运行：

```bash
pnpm test
pnpm check:publish
pnpm build
```

8. MUST 提交范围只包含公开副本、公开图片、报告、文档和代码改动。DO NOT 提交 `.env`、真实 Vault、私有附件、本机绝对路径或未授权草稿正文。
9. 如果需要线上发布，MUST 推送后检查 GitHub Actions，并用 live URL 验证首页、目标文章页和 RSS。
10. DO NOT 在 `check:publish` 有 error 时发布。DO NOT 通过删除检查规则绕过隐私边界；路径规则调整必须有测试覆盖。

## 发布方式

公开副本可以由本地 `pnpm sync:vault` 生成，也可以直接在 BlogSite 仓库内维护。不要复制未经明确标记为可发布的内容。

三类内容分别存放在：

```text
src/content/blog/
src/content/notes/
src/content/projects/
```

## Frontmatter

每篇 Markdown 内容需要满足以下结构：

```yaml
---
title: "页面标题"
description: "页面摘要"
pubDate: 2026-06-20
updatedDate: 2026-06-20
draft: false
category: "分类"
tags:
  - 示例标签
visibility: public
sourceVaultPath: "relative/path/example.md"
---
```

约束：

- `sourceVaultPath` 只能是相对路径，不能包含本机绝对路径。
- `draft: true` 的内容不生成生产详情页，也不进入列表或 RSS。
- `visibility: unlisted` 的非草稿内容生成详情页，但不进入首页、列表和 RSS。
- 不要提交私人内容、完整 Vault、真实私有附件或 `.env.local`。

## 发布前验证

```bash
pnpm check:publish
pnpm build
```

`check:publish` 会检查残留双链、本机绝对路径、`file://`、必需 frontmatter、重复 slug、缺失图片、Daily 来源和同步状态来源。严重风险返回非零退出码；缺失图片只输出 warning。

`check:publish` 允许文章正文中用于说明的安全相对路径、站内根路径、Markdown 锚点和查询片段，例如 `_system/migration/report.md`、`../examples/demo.md`、`scripts/example.mjs`、`/images/slug/file.png` 和 `/blog/some-slug/`。它仍会拒绝 `file://`、`/Users/...`、`/home/...`、Windows 盘符路径、真实 Vault 绝对路径、Daily 来源、残留双链和不可信发布状态。
