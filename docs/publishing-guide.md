# 发布指南

## 契约权威位置

发布字段、允许值、默认行为和兼容规则以 `contracts/publishing/v1/contract.md` 与 `contracts/publishing/v1/schema.json` 为唯一权威来源。本指南是本仓库真实内容接入、同步和线上发布的唯一操作序列；`AGENTS.md`、README、同步边界和维护指南只保留各自的路由、选项或维护职责，并链接到这里。出现不一致时先修正契约及其测试，再更新本指南。

## Agent 发布 Runbook

按以下顺序执行。MUST 表示必须完成；DO NOT 表示不得绕过。

1. MUST 先运行 `git status --short --branch`，确认当前分支、未提交改动和是否有用户正在编辑的文件。
2. MUST 读取 `docs/publishing-guide.md`、`docs/vault-sync-guide.md` 和 `docs/codex-maintenance-guide.md`，再开始真实发布。
3. MUST 先在真实 Vault 运行其当前合同与 frontmatter 检查，再做只读候选扫描。BlogSite 只从 `10-Notes/`、`20-Projects/` 和 `60-Publish/Blog/` 读取候选；前两者支持原位发布，独立公开改写稿应位于 `60-Publish/Blog/` 下至少一级管理子文件夹。文件夹只承担源稿管理，不自动决定分类或系列。当前来源为 `publish_status: published` 时必须具有 `publish_date`；`draft` 可以省略，但必须得到显式授权后才能改为 `published`，且转换时记录首次发布日期。
4. MUST 先在新的空临时目录中运行预演。该目录必须位于仓库、Vault 和正式输出目录之外。以下命令假定已设置 `BLOGSITE_VAULT_PATH`：

```bash
preview_root="$(mktemp -d)"
pnpm sync:vault --preview "$preview_root"
```

5. MUST 检查预演的 `content/`、`public/images/` 和 `reports/`，核对公开副本、正文链接、图片、同步报告和 manifest。预演有错误时仍可检查已生成的部分产物。只有 `summary.errors === 0` 才能继续。预演会指出正式目的地中占用同一路由的手工内容路径。告警可以随发布保留，须在报告或发布记录中说明原因。可提交的双链告警只记录公开副本文件、原文正文行号和原因，完整目标见预演根目录的本机 `local-diagnostics.json`。
6. MUST 在预演通过并得到正式同步授权后，运行 `pnpm sync:vault --apply "$preview_root"`。也可为无参数 `pnpm sync:vault` 或 `pnpm prepare:publish` 设置 `BLOGSITE_REVIEWED_PREVIEW="$preview_root"`。正式同步会在暂存区重新生成产物并比对已审阅的内容副本、图片、正文链接和公开报告明细。仅扫描数、跳过计数或生成时间变化时可继续。若公开产物变化，重新预演和审阅后再同步。有错误或手工内容占用同一路由时，整批同步失败，保留旧公开副本、图片和 manifest。正式运行的失败诊断保存在系统临时目录。来源范围配置、预演和报告审阅本身不授权写入正式公开副本。
7. MUST 在正式同步后运行：

```bash
pnpm test
pnpm check:publish
pnpm build
```

8. MUST 提交范围只包含公开副本、公开图片、报告、文档和代码改动。DO NOT 提交预演收据、本机诊断、`.env`、真实 Vault、私有附件、本机绝对路径或未授权草稿正文。
9. 如果需要线上发布，MUST 推送后检查 GitHub Actions，并用 live URL 验证首页、目标文章页和 RSS。
10. DO NOT 在 `check:publish` 有 error 时发布。DO NOT 通过删除检查规则绕过隐私边界；路径规则调整必须有测试覆盖。
11. UI 或主题变更发布时，MUST 额外验证搜索入口、明暗主题、文章目录、阅读进度、桌面/移动无横向溢出和 GitHub Pages 子路径。

## 发布方式

公开副本可以由本地 `pnpm sync:vault` 生成，也可以直接在 BlogSite 仓库内维护。不要复制未经明确标记为可发布的内容。

三类内容分别存放在：

```text
src/content/blog/
src/content/notes/
src/content/projects/
```

## Frontmatter

下面是当前 Astro 发布适配器的输出格式，不是 Vault 来源契约：

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
outputKind: thought
sourceVaultPath: "relative/path/example.md"
---
```

约束：

- `sourceVaultPath` 只能是相对路径，不能包含本机绝对路径。
- `pubDate` 由 Vault 的 `publish_date` 映射，表示首次发布时间，是首页时间线、内容列表和 RSS 的排序依据；发布后更新正文时不得覆盖它。当前 `published` 来源必须提供该字段；V1 旧内容缺失时才由适配器暂时回退到 `created`。
- `updatedDate` 只表示最近修订时间，可在详情页独立展示，但不改变内容在时间线中的位置。
- `draft: true` 的内容不生成生产详情页，也不进入列表或 RSS。
- `visibility: unlisted` 的非草稿内容生成详情页，公开正文可以显式链接到它。首页、列表、RSS 和自动阅读导航均不收录它。
- `outputKind` 是当前 Astro 适配器生成的公开展示字段；对应 Vault 来源字段的允许值、默认映射与校验规则以 `contracts/publishing/v1/` 为准。
- 不要提交私人内容、完整 Vault、真实私有附件或 `.env.local`。

## 发布前验证

```bash
pnpm check:publish
pnpm build
```

`check:publish` 会检查残留双链、本机绝对路径、`file://`、必需 frontmatter、重复 slug、缺失图片、Daily 来源和同步状态来源。严重风险返回非零退出码；缺失图片只输出 warning。

`check:publish` 允许文章正文中用于说明的安全相对路径、站内路由文本、Markdown 锚点、查询片段和 `/images/...` 公开资源路径，例如 `_system/migration/report.md`、`../examples/demo.md`、`scripts/example.mjs`、`/blog/some-slug/`、`#local-anchor` 和 `/images/slug/file.png`。指向 `/blog/`、`/notes/` 或 `/projects/` 的可点击 Markdown 链接必须使用相对路径，以免绕过 GitHub Pages 的 `/BlogSite/` 子路径。检查器仍会拒绝 `file://`、`/Users/...`、`/home/...`、Windows 盘符路径、真实 Vault 绝对路径、Daily 来源、残留双链和不可信发布状态。

## 主题发布验证

当前站点使用 Soce1lo 个人实验室界面，保留成长输出日志与长文阅读。主题或布局变更发布前，除常规命令外，还应在本地或线上核对：

- 首页包含身份、探索坐标、Output Log、长期主题、档案入口、搜索入口和明暗主题切换；地图切换能显示对应公开内容。
- 探索档案支持组合筛选、空态、排序，以及 URL 刷新和后退恢复。
- 专注阅读可开启和退出，复制链接有成功反馈或手动复制回退。
- 长文详情页包含阅读进度条和 `content-toc` 目录。
- 目录链接能跳转到对应 heading，滚动后目录高亮正常。
- 移动宽度下 `document.documentElement.scrollWidth` 不大于视口宽度。
- live URL 中资源路径带正确 GitHub Pages 子路径 `/BlogSite/`。
