# 发布指南

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
