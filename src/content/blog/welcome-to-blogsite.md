---
title: "欢迎来到 BlogSite"
description: "介绍这个站点的内容结构、发布边界和当前阅读体验。"
pubDate: 2026-06-20
updatedDate: 2026-07-04
draft: false
category: "站点说明"
tags:
  - Astro
  - 示例
visibility: unlisted
sourceVaultPath: "examples/welcome-to-blogsite.md"
---

这是 BlogSite 的站点说明文章，用于概览当前内容结构、发布边界和阅读体验。

## 当前能力

站点可以构建博客、笔记和项目三类公开内容，并生成完全静态的页面。当前仓库已经接入经过明确授权的公开 Vault 副本，但仍不包含完整 Obsidian Vault、私有附件或本机配置。

发布链路保持本地门禁式流程：先在本机只读扫描 Vault、生成公开副本和报告，再运行发布检查与构建。GitHub Actions 只构建仓库内已有的公开副本，不读取真实 Vault。

## 阅读体验

当前站点使用 Tone-inspired 阅读主题适配，包含明暗主题、轻量站内搜索、阅读进度条、文章目录、目录高亮和移动端阅读优化。主题改动保留现有内容集合、发布检查和 GitHub Pages 子路径规则。
