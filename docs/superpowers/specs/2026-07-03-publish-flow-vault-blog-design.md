# BlogSite 发布流程与 Vault 对接优化设计

## 背景

当前 BlogSite 已经完成真实 Vault 内容接入，并能通过本地 `pnpm sync:vault` 生成公开副本，再由 GitHub Actions 构建发布。最近一次发布暴露出两个问题：

1. 发布流程说明偏概述，低能力 agent 容易只跑部分命令，跳过预览、确认、部署验证或隐私边界。
2. 发布检查器的路径检查规则过粗，曾经为了发布包含迁移脚本说明的文章而临时放宽，但还没有形成清晰、可测试的“安全相对地址”和“本机私有路径”边界。

同时，`src/content/blog/` 现在采用扁平 slug 输出，适合 Astro 和 GitHub Pages，但缺少从 Vault 表达系列、主题和发布关系的稳定字段。目标是让 Vault 保持自然写作组织，BlogSite 保持稳定公开副本，两边通过发布元数据和同步器无缝对接。

## 已确认方向

采用“Vault 负责组织，BlogSite 保持扁平公开副本”的方案：

- Vault 是写作与知识组织真值源。
- BlogSite 的 `src/content/{blog,notes,projects}/{slug}.md` 继续作为生成后的公开副本，不按 Vault 目录结构建站点 URL。
- 同步器从 Vault frontmatter 读取发布字段，生成 BlogSite 所需的稳定 frontmatter、公开图片和发布报告。
- 发布检查器只拦截真实隐私泄露和发布边界错误，不拦截文章正文中安全的相对说明路径。

## 目标

1. 让发布指南变成 agent 可执行 runbook，而不是只列命令。
2. 让 `check:publish` 明确允许安全相对路径、站内根路径和文章说明用路径，同时继续拒绝本机绝对路径、`file://`、完整 Vault 路径、Daily/private 发布内容和不可信来源状态。
3. 增加 Blog 组织字段，使 Vault 可以表达系列、系列顺序和主题，BlogSite 可以展示这些结构，但 URL 仍由 `publish_slug` 决定。
4. 生成同步后的发布 manifest，让人和 agent 能对账本次发布输出、URL、来源和 warning。
5. 保持真实 Vault 只读、CI 不读取 Vault、不提交私有正文或本机配置。

## 非目标

- 不把完整 Vault 或 Vault 目录结构复制进 BlogSite。
- 不改变现有公开 URL 规则，不把系列或主题写进路由路径。
- 不把 GitHub Actions 改成从真实 Vault 同步。
- 不把迁移档案检查接入日常发布 gate。
- 不要求本轮重做站点视觉设计。

## 发布流程设计

`docs/publishing-guide.md` 顶部应新增“Agent 发布 Runbook”。该 runbook 使用 MUST / DO NOT 风格，按顺序列出：

1. 检查 `git status --short --branch`，确认当前分支和未提交改动。
2. 读取 `docs/publishing-guide.md`、`docs/vault-sync-guide.md` 和 `docs/codex-maintenance-guide.md`。
3. 对真实 Vault 只做只读候选扫描；遇到 `publish_status: draft` 时必须得到显式授权后才能改为 published。
4. 对真实发布执行临时目录 preview sync，输出到临时 content/images/reports，确认 `summary.errors === 0`，并核对 warning。
5. preview 通过且得到授权后，才运行正式 `pnpm sync:vault`。
6. 正式同步后运行 `pnpm test`、`pnpm check:publish`、`pnpm build`。
7. 提交时只包含公开副本、公开图片、报告、文档和代码改动，不包含 `.env`、真实 Vault、私有附件或本机路径。
8. 如果需要线上发布，推送后检查 GitHub Actions，并用 live URL 验证首页、目标文章页和 RSS。

runbook 还要明确失败处理：

- `check:publish` 有 error 时不得发布。
- warning 可以发布，但必须在报告或提交说明里说明原因。
- 不得通过删除检查规则绕过隐私边界；路径规则调整必须有测试覆盖。

## 发布检查器设计

检查器应把路径检查拆成命名函数，避免继续堆叠宽泛正则：

- `isLocalAbsolutePathLeak(value)`：识别 `/Users/...`、`/home/...`、Windows 盘符路径等本机绝对路径。
- `isPrivateVaultPathLeak(value)`：识别真实 Vault 绝对路径或明确私有目录泄露。
- `isFileUrl(value)`：识别 `file://`。
- `resolveImageReference(reference, markdownFile, publicPath)`：按图片规则解析公开图片引用。

允许的正文路径包括：

- 普通相对说明路径，如 `_system/migration/report.md`、`../examples/demo.md`、`scripts/example.mjs`。
- 站内根路径，如 `/images/slug/file.png`、`/blog/some-slug/`。
- Markdown 锚点和查询片段。
- 代码块中用于解释的相对路径、命令参数和脚本片段。

仍然必须拒绝：

- `file://...`。
- `/Users/...`、`/home/...`、`C:\...` 等本机绝对路径。
- `sourceVaultPath` 中的绝对路径。
- 指向 `KnowledgeVault` 或真实 Vault 绝对位置的路径。
- 残留 Obsidian 双链。
- parsed frontmatter 中的 `publish_status: private`。
- `managedBy: vault-sync` 且 `draft: false` 但 `sourcePublishStatus !== "published"`。
- Daily 来源内容。

图片规则：

- `https:`, `http:`, `data:` 继续跳过存在性检查。
- `/images/...` 按 `publicPath` 解析。
- 相对图片按 Markdown 文件所在目录解析。
- 不存在图片继续作为 warning，不作为 error。

## Blog 组织字段设计

在 Vault frontmatter 中新增可选字段：

```yaml
publish_series: "从 Logseq 到 Obsidian"
publish_series_order: 10
publish_topic: "Knowledge Management"
```

同步器生成 BlogSite frontmatter：

```yaml
series: "从 Logseq 到 Obsidian"
seriesOrder: 10
topic: "Knowledge Management"
```

字段约束：

- `publish_series` / `series` 是可选字符串，空值不输出。
- `publish_series_order` / `seriesOrder` 是可选数字；只有设置 series 时才有意义。
- `publish_topic` / `topic` 是可选字符串，用于站点组织和筛选；不替代现有 `category`。
- URL 仍由 `publish_target` 和 `publish_slug` 决定。
- 如果没有这些字段，现有内容行为保持不变。

展示规则：

- 列表页仍按 `pubDate` 倒序。
- 详情页在 `series` 或 `topic` 存在时，应在标题附近显示这些元数据。
- 系列内上一篇/下一篇导航不属于本轮交付；本轮只交付数据模型、基础展示和同步映射。

## 发布 Manifest 设计

`pnpm sync:vault` 正式或 preview 同步后应生成：

- `reports/publish-manifest.json`
- `reports/publish-manifest.md`

JSON 结构包含：

```json
{
  "generatedAt": "2026-07-03T00:00:00.000Z",
  "summary": {
    "scannedVaultFiles": 0,
    "publishCandidates": 0,
    "synced": 0,
    "warnings": 0,
    "errors": 0
  },
  "entries": [
    {
      "sourceVaultPath": "60-Publish/example.md",
      "collection": "blog",
      "slug": "example",
      "url": "/blog/example/",
      "title": "Example",
      "draft": false,
      "visibility": "public",
      "series": "Series",
      "seriesOrder": 10,
      "topic": "Topic",
      "warnings": []
    }
  ]
}
```

Markdown manifest 面向人读，只列来源、目标、URL、状态和 warning 数量，不粘贴正文。

## 测试要求

新增或调整 `tests/vault-sync.test.ts`，至少覆盖：

1. 正文中安全相对路径和 `_system/...` 说明路径不会触发 error。
2. `/Users/...`、`/home/...`、Windows 盘符和 `file://` 仍触发 error。
3. `sourceVaultPath` 绝对路径仍触发 error。
4. `/images/...` 图片按 public 目录解析，相对图片按 Markdown 文件目录解析。
5. Vault 的 `publish_series`、`publish_series_order`、`publish_topic` 会同步为 `series`、`seriesOrder`、`topic`。
6. `publish-manifest.json` 和 `.md` 生成，且不包含私有正文。

调整 `src/content.config.ts` 的 schema 测试或构建验证，确保新增字段被 Astro 接受。

最终验证命令：

```bash
pnpm test
pnpm check:publish
pnpm build
```

## 成功标准

完成后，一个能力较弱的 agent 只读 `docs/publishing-guide.md` 就能按顺序发布，不会跳过 preview、确认、验证和线上检查。`check:publish` 不再因为文章中安全的相对说明路径失败，但仍能拦截真实隐私泄露。Vault 可通过可选发布字段表达 blog 系列和主题，BlogSite 保持稳定 URL，并有 manifest 可用于发布对账。
