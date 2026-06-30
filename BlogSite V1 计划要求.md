# BlogSite V1 计划要求：Astro + Obsidian 发布系统

## 1. 项目目标

创建一个独立的 Astro 博客发布仓库，用于从已有 Obsidian KnowledgeVault 中“采摘”明确标记为可发布的内容，并生成静态博客。

本项目不是 Obsidian Vault，不存放完整私有笔记库。

核心目标：

1. 使用 Astro 构建个人博客站点。
2. 使用 GitHub 管理 BlogSite 仓库。
3. 使用 GitHub Pages 或其他静态部署方式发布。
4. Obsidian Vault 与 BlogSite 仓库分离。
5. Obsidian 内部继续使用 `[[双链]]`。
6. 发布阶段将 Obsidian 双链转换为网页链接。
7. 原始 Obsidian Vault 不被修改。
8. 只有明确标记为可发布的内容才同步到 BlogSite。
9. 未发布目标不生成网页链接。
10. BlogSite 只保存公开发布副本和公开资源。

---

## 2. 仓库关系

采用双仓库 / 双目录结构：

```text
~/Documents//Obsidian Vault/        # 私有 Obsidian 知识库
~/Documents/BlogSite/              # 公开 Astro 博客仓库
```

`Obsidian Vault` 是原始知识库：

```text
- 私有
- 使用 Obsidian 写作
- 使用 [[双链]]
- 可以包含 Daily、Inbox、未发布笔记、私人笔记、Logseq 迁移内容
- 不直接暴露到 GitHub Pages
```

`BlogSite` 是发布仓库：

```text
- 可公开
- 使用 Astro 构建
- 只保存发布副本
- 只保存公开图片和附件
- 不包含完整 Vault
```

---

## 3. V1 范围

### 3.1 V1 要实现

BlogSite V1 需要实现：

1. Astro + TypeScript + pnpm 项目。
2. 基础博客站点结构。
3. `blog`、`notes`、`projects` 三类内容集合。
4. 首页。
5. About 页面。
6. Blog 列表页和详情页。
7. Notes 列表页和详情页。
8. Projects 列表页和详情页。
9. RSS。
10. GitHub Pages 部署 workflow。
11. 本地同步脚本：从 Obsidian Vault 同步可发布内容。
12. Obsidian 双链转换逻辑。
13. Obsidian 图片嵌入转换逻辑。
14. 发布内容检查脚本。
15. 同步报告。
16. 最小文档。

### 3.2 V1 不做

BlogSite V1 不做：

1. 不把 Obsidian Vault 放入 BlogSite 仓库。
2. 不让 Astro 直接读取整个 Vault。
3. 不修改 Obsidian 原始文件。
4. 不发布 Daily 原文。
5. 不自动判断哪些内容应该公开。
6. 不同步 `publish_status: private` 的内容。
7. 不同步没有 `publish_slug` 的内容。
8. 不为未发布目标生成网页链接。
9. 不引入 CMS。
10. 不引入数据库。
11. 不做评论系统。
12. 不做复杂全文搜索。
13. 不做复杂主题设计。
14. 不在 GitHub Actions 中读取私有 Vault。

---

## 4. BlogSite 目录结构

Codex 应创建如下结构：

```text
BlogSite/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   ├── favicon.svg
│   └── images/
├── scripts/
│   ├── sync-from-vault.ts
│   ├── normalize-markdown.ts
│   ├── copy-assets.ts
│   ├── check-publish-content.ts
│   └── utils/
│       ├── frontmatter.ts
│       ├── slug.ts
│       ├── vault-index.ts
│       └── path.ts
├── src/
│   ├── components/
│   ├── content/
│   │   ├── blog/
│   │   ├── notes/
│   │   └── projects/
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ContentLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── notes/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── projects/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   └── rss.xml.js
│   ├── styles/
│   │   └── global.css
│   └── content.config.ts
├── docs/
│   ├── publishing-guide.md
│   ├── vault-sync-guide.md
│   └── codex-maintenance-guide.md
├── reports/
│   └── sync-report.md
├── publish.config.ts
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

---

## 5. Obsidian 发布字段协议

BlogSite 读取 Obsidian Vault 中的扁平 frontmatter 字段。

示例：

```yaml
---
title: "Agent、Subagent、Skill 的区别"
description: "解释 Agent、Subagent、Skill 在 Coding Agent 工作流中的职责边界。"
created: 2026-06-19
updated: 2026-06-19
type: article
status: growing
tags:
  - ai-agent
  - opencode
aliases: []
areas:
  - AI Coding Agent
projects: []
publish_target: blog
publish_status: draft
publish_slug: agent-subagent-skill
publish_category: "AI Coding"
publish_visibility: public
---
```

字段含义：

| 字段 | 含义 |
|---|---|
| `title` | 页面标题 |
| `description` | 页面摘要 |
| `created` | 创建日期 |
| `updated` | 更新日期 |
| `tags` | 标签 |
| `publish_target` | 发布目标 |
| `publish_status` | 发布状态 |
| `publish_slug` | 公开 URL slug |
| `publish_category` | 分类 |
| `publish_visibility` | 可见性 |

---

## 6. 同步筛选规则

同步脚本只同步满足以下条件的 Obsidian 笔记：

```text
publish_target in ["blog", "notes", "projects"]
publish_status in ["draft", "published"]
publish_visibility in ["public", "unlisted"]
publish_slug 非空
title 非空
description 非空
```

不得同步：

```text
publish_target: none
publish_status: private
publish_visibility: private
publish_slug 为空
title 为空
description 为空
Daily 原文
Logseq raw archive
_system 目录
90-Attachments 原始附件目录本身
```

说明：

1. `draft` 可以同步到 BlogSite 本地内容目录，但生产构建中默认不展示。
2. `published` 可以进入生产构建。
3. `unlisted` 可以生成页面，但不出现在公开列表页中。
4. `private` 一律不同步。

---

## 7. 同步输出规则

Obsidian 原文路径示例：

```text
KnowledgeVault/00-Inbox/Agent、Subagent、Skill 的区别.md
```

如果 frontmatter 为：

```yaml
publish_target: blog
publish_slug: agent-subagent-skill
```

则输出为：

```text
BlogSite/src/content/blog/agent-subagent-skill.md
```

如果：

```yaml
publish_target: notes
publish_slug: opencode
```

则输出为：

```text
BlogSite/src/content/notes/opencode.md
```

如果：

```yaml
publish_target: projects
publish_slug: home-net-fabric
```

则输出为：

```text
BlogSite/src/content/projects/home-net-fabric.md
```

---

## 8. 发布副本 frontmatter 转换

同步脚本需要将 Obsidian frontmatter 转换为 Astro content schema 所需字段。

Obsidian 原始 frontmatter：

```yaml
title: "Agent、Subagent、Skill 的区别"
description: "解释 Agent、Subagent、Skill 在 Coding Agent 工作流中的职责边界。"
created: 2026-06-19
updated: 2026-06-19
tags:
  - ai-agent
  - opencode
publish_target: blog
publish_status: draft
publish_slug: agent-subagent-skill
publish_category: "AI Coding"
publish_visibility: public
```

生成 Astro 发布副本：

```yaml
---
title: "Agent、Subagent、Skill 的区别"
description: "解释 Agent、Subagent、Skill 在 Coding Agent 工作流中的职责边界。"
pubDate: 2026-06-19
updatedDate: 2026-06-19
draft: true
category: "AI Coding"
tags:
  - ai-agent
  - opencode
visibility: public
sourceVaultPath: "00-Inbox/Agent、Subagent、Skill 的区别.md"
---
```

转换规则：

| Obsidian 字段 | Astro 字段 |
|---|---|
| `title` | `title` |
| `description` | `description` |
| `created` | `pubDate` |
| `updated` | `updatedDate` |
| `tags` | `tags` |
| `publish_category` | `category` |
| `publish_visibility` | `visibility` |
| `publish_status: draft` | `draft: true` |
| `publish_status: published` | `draft: false` |
| 相对 Vault 路径 | `sourceVaultPath` |

注意：

1. `sourceVaultPath` 只能保存相对路径。
2. 不得保存本机绝对路径。
3. 不得保存私有目录完整路径。
4. 不得把 Obsidian 原始 frontmatter 全量复制到发布副本。

---

## 9. Obsidian 双链处理规则

### 9.1 基本原则

Obsidian 原始 Vault 中继续使用：

```md
[[页面名]]
[[页面名|别名]]
```

BlogSite 同步或构建阶段负责转换。

原始 Vault 不被修改。

### 9.2 推荐实现方式

V1 可以选择两种实现方式之一：

```text
方案 A：sync-from-vault.ts 同步阶段转换双链
方案 B：Astro remark 插件在构建阶段转换双链
```

两种方式都必须满足：

1. 不修改 Obsidian 原文。
2. 不在发布副本中保留无法处理的 `[[...]]`。
3. 未发布目标不生成链接。
4. 无法解析的链接要记录 warning。
5. 不因单个未发布目标导致整个同步失败。

V1 推荐优先使用 **同步阶段转换**，因为更容易生成报告和检查发布副本。

后续可升级为 remark 插件。

---

## 10. 双链目标索引

同步脚本在转换双链之前，必须先扫描整个 Vault，建立发布目标索引。

索引只包含满足发布条件的笔记：

```text
publish_target in ["blog", "notes", "projects"]
publish_status in ["draft", "published"]
publish_visibility in ["public", "unlisted"]
publish_slug 非空
```

索引项至少包含：

```ts
{
  title: string
  aliases: string[]
  sourceVaultPath: string
  publishTarget: "blog" | "notes" | "projects"
  publishSlug: string
  publishStatus: "draft" | "published"
  visibility: "public" | "unlisted"
  url: string
}
```

URL 规则：

```text
blog     → /blog/{publish_slug}/
notes    → /notes/{publish_slug}/
projects → /projects/{publish_slug}/
```

---

## 11. 普通双链转换规则

### 11.1 目标已发布或可发布

Obsidian 原文：

```md
[[OpenCode]]
```

如果 `OpenCode` 对应笔记满足发布条件，并且：

```yaml
publish_target: notes
publish_slug: opencode
```

则转换为：

```md
[OpenCode](/notes/opencode/)
```

### 11.2 目标未发布

Obsidian 原文：

```md
[[OpenCode]]
```

如果 `OpenCode` 不满足发布条件，则转换为纯文本：

```md
OpenCode
```

并记录 warning：

```md
- file: `src/content/blog/agent-subagent-skill.md`
  link: `[[OpenCode]]`
  target: `OpenCode`
  action: converted-to-text
  reason: target-not-published
```

### 11.3 目标不存在

如果目标页面不存在，也转换为纯文本，并记录 warning：

```md
- file: `src/content/blog/example.md`
  link: `[[Unknown Page]]`
  target: `Unknown Page`
  action: converted-to-text
  reason: target-not-found
```

---

## 12. 别名双链转换规则

### 12.1 目标已发布

Obsidian 原文：

```md
[[Agent、Subagent、Skill 的区别|Agent 三件套]]
```

如果目标已发布为：

```text
/blog/agent-subagent-skill/
```

则转换为：

```md
[Agent 三件套](/blog/agent-subagent-skill/)
```

### 12.2 目标未发布

如果目标未发布，则转换为别名纯文本：

```md
Agent 三件套
```

并记录 warning。

### 12.3 目标不存在

如果目标不存在，也转换为别名纯文本：

```md
Agent 三件套
```

并记录 warning。

---

## 13. heading / block 链接处理规则

### 13.1 heading 链接

Obsidian 原文：

```md
[[OpenCode#权限管理]]
```

如果 `OpenCode` 已发布，则可以转换为：

```md
[OpenCode#权限管理](/notes/opencode/#权限管理)
```

但 V1 对 heading anchor 不做复杂 slug 兼容保证。

更稳妥的 V1 策略：

```text
如果目标页已发布：
- 转为目标页面 URL，不强制保留 heading anchor
- 记录 warning: heading-anchor-dropped
```

示例：

```md
[OpenCode](/notes/opencode/)
```

### 13.2 block 链接

Obsidian 原文：

```md
[[OpenCode#^abc123]]
```

V1 不支持发布 block 链接。

处理方式：

```text
如果目标页已发布：转为目标页面链接，并记录 warning: block-anchor-dropped
如果目标页未发布：转为纯文本，并记录 warning
```

---

## 14. Obsidian 图片嵌入处理规则

### 14.1 Wiki 图片嵌入

Obsidian 原文：

```md
![[diagram.png]]
```

同步后转换为：

```md
![diagram](/images/{publish_slug}/diagram.png)
```

图片复制到：

```text
public/images/{publish_slug}/diagram.png
```

### 14.2 带别名 / 尺寸的图片嵌入

Obsidian 原文可能出现：

```md
![[diagram.png|600]]
![[diagram.png|架构图]]
```

V1 简化处理：

1. 提取真实文件名 `diagram.png`。
2. alt 文本使用文件名或别名。
3. 尺寸信息可以丢弃并记录 warning。

### 14.3 Markdown 图片链接

Obsidian 原文：

```md
![架构图](../90-Attachments/logseq-assets/diagram.png)
```

同步时复制图片到：

```text
public/images/{publish_slug}/diagram.png
```

并转换为：

```md
![架构图](/images/{publish_slug}/diagram.png)
```

### 14.4 找不到图片

如果图片找不到：

1. 保留 alt 文本。
2. 移除图片链接。
3. 记录 warning。
4. 不阻断整个同步。

示例：

```md
[missing image: diagram.png]
```

---

## 15. 发布内容检查规则

Codex 应实现：

```bash
pnpm check:publish
```

检查 `src/content/` 中：

1. 是否还有 `[[...]]`。
2. 是否还有 `![[...]]`。
3. 是否存在 `file://`。
4. 是否存在本机绝对路径。
5. 是否缺少 `title`。
6. 是否缺少 `description`。
7. 是否缺少 `pubDate`。
8. 是否存在重复 slug。
9. 是否引用不存在的图片。
10. `draft: false` 是否来自 `publish_status: published`。
11. 是否有 `sourceVaultPath` 使用本机绝对路径。
12. 是否把 Daily 原文同步到了发布内容。

检查失败时：

```text
严重隐私风险：直接失败
普通未发布链接：不失败，但应已转换为纯文本并记录 warning
图片缺失：不失败，但必须记录 warning
```

严重隐私风险包括：

```text
/Users/
C:\
file://
KnowledgeVault 绝对路径
80-Archive/logseq-raw
_system/
publish_status: private 的内容
```

---

## 16. 同步报告

同步脚本生成：

```text
reports/sync-report.md
```

报告必须短，不粘贴正文。

格式：

```md
# Sync Report

## Summary

- scanned_vault_files: 320
- publish_candidates: 12
- synced: 10
- skipped_private: 280
- skipped_missing_slug: 2
- skipped_missing_description: 0
- warnings: 6
- errors: 0

## Outputs

- blog: 6
- notes: 3
- projects: 1

## Warnings

- unpublished_wikilinks_converted_to_text: 4
- missing_images: 1
- heading_anchors_dropped: 1

## Detail Files

- wikilink warnings: `reports/wikilink-warnings.md`
- asset warnings: `reports/asset-warnings.md`
```

详细 warning 文件也不得粘贴正文全文，只记录路径、原始短片段和处理动作。

---

## 17. package scripts

`package.json` 至少包含：

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "sync:vault": "tsx scripts/sync-from-vault.ts",
    "check:publish": "tsx scripts/check-publish-content.ts",
    "prepare:publish": "pnpm sync:vault && pnpm check:publish && pnpm build"
  }
}
```

---

## 18. publish.config.ts

创建：

```ts
export default {
  vaultPath: "../KnowledgeVault",
  contentOutputPath: "src/content",
  imageOutputPath: "public/images",
  reportsPath: "reports",
  defaultLang: "zh-CN",
  collections: {
    blog: "src/content/blog",
    notes: "src/content/notes",
    projects: "src/content/projects"
  },
  routes: {
    blog: "/blog",
    notes: "/notes",
    projects: "/projects"
  },
  excludeVaultDirs: [
    ".git",
    ".obsidian",
    "80-Archive",
    "_system",
    "90-Attachments"
  ]
}
```

说明：

1. `vaultPath` 必须可配置。
2. 不要把本机绝对路径写死进 Git。
3. 可以支持 `.env.local` 覆盖本地路径。
4. `.env.local` 必须加入 `.gitignore`。

---

## 19. Astro 内容集合

创建：

```text
src/content.config.ts
```

定义：

```text
blog
notes
projects
```

字段至少包括：

```text
title
description
pubDate
updatedDate
draft
category
tags
visibility
sourceVaultPath
```

要求：

1. `draft` 为 true 的内容不进入生产列表页。
2. `visibility: unlisted` 的内容可生成页面，但不进入列表页。
3. `sourceVaultPath` 只作为内部追踪，不在页面中公开展示，除非后续明确需要。

---

## 20. 页面要求

### 20.1 首页

首页包含：

1. 个人简介。
2. 最近博客。
3. 最近公开笔记。
4. 项目入口。
5. RSS 链接。

### 20.2 Blog

路径：

```text
/blog/
/blog/{slug}/
```

### 20.3 Notes

路径：

```text
/notes/
/notes/{slug}/
```

### 20.4 Projects

路径：

```text
/projects/
/projects/{slug}/
```

### 20.5 About

路径：

```text
/about/
```

### 20.6 RSS

路径：

```text
/rss.xml
```

RSS 默认只包含：

```text
draft: false
visibility: public
```

---

## 21. GitHub Actions

创建：

```text
.github/workflows/deploy.yml
```

要求：

1. push 到 `main` 时构建并部署。
2. pull request 时只构建检查，不部署。
3. 构建前运行 `pnpm check:publish`。
4. CI 不运行 `pnpm sync:vault`。
5. CI 不读取私有 Obsidian Vault。
6. CI 只构建 BlogSite 仓库中已经存在的公开发布副本。

关键原则：

```text
Obsidian → BlogSite 的同步在本地执行。
GitHub Actions 只负责构建和部署已同步的公开内容。
```

---

## 22. Codex 执行阶段

### Phase 1：创建 Astro BlogSite 骨架

Codex 第一阶段只做：

1. 初始化 Astro + TypeScript + pnpm 项目。
2. 创建目录结构。
3. 创建 content collections。
4. 创建页面和布局。
5. 创建最小样式。
6. 创建 3 篇示例内容。
7. 创建 GitHub Actions。
8. 创建 README 和 docs。
9. 确保 `pnpm build` 通过。

Phase 1 不做：

1. 不读取 Obsidian Vault。
2. 不实现复杂同步逻辑。
3. 不复制真实图片。
4. 不发布真实文章。

### Phase 2：实现 Vault 同步脚本

Codex 第二阶段做：

1. 实现 `scripts/sync-from-vault.ts`。
2. 实现 `scripts/normalize-markdown.ts`。
3. 实现 `scripts/copy-assets.ts`。
4. 实现 `scripts/check-publish-content.ts`。
5. 实现发布目标索引。
6. 实现双链转换。
7. 实现图片复制和链接转换。
8. 实现 sync report。
9. 保证不修改 Vault 原文件。

### Phase 3：接入真实 Obsidian 内容

Codex 第三阶段做：

1. 读取本地 `vaultPath`。
2. 扫描发布候选。
3. 同步少量测试文章。
4. 运行 `pnpm check:publish`。
5. 运行 `pnpm build`。
6. 修复问题。
7. 生成同步报告。

---

## 23. 验收标准

### Phase 1 验收

1. `pnpm install` 成功。
2. `pnpm dev` 可以启动。
3. `pnpm build` 通过。
4. 首页可访问。
5. Blog / Notes / Projects 列表页可访问。
6. 示例详情页可访问。
7. RSS 可生成。
8. GitHub Actions 文件存在。
9. README 和 docs 存在。

### Phase 2 验收

1. `pnpm sync:vault` 可以运行。
2. 只同步满足发布条件的内容。
3. 不修改 Obsidian 原文件。
4. `[[双链]]` 被转换。
5. 未发布目标被转换为纯文本，不生成链接。
6. `![[图片]]` 被转换为 public images 链接。
7. 图片被复制到 `public/images/{publish_slug}/`。
8. 找不到图片时有 warning。
9. `reports/sync-report.md` 存在且简短。
10. `pnpm check:publish` 通过。

### Phase 3 验收

1. 至少一篇真实 Obsidian 文章成功同步到 BlogSite。
2. 同步后的文章可本地预览。
3. 生产构建不展示 draft。
4. public 内容出现在列表页。
5. unlisted 内容可访问但不出现在列表页。
6. CI 不依赖私有 Vault。
7. BlogSite 仓库不包含未发布 Obsidian 原文。
8. BlogSite 仓库不包含 Logseq raw archive。
9. BlogSite 仓库不包含本机绝对路径。
10. GitHub Pages 可以部署。

---

## 24. 给 Codex 的第一轮提示词

```text
请严格按照《BlogSite V1 计划要求》执行 Phase 1。

目标：
创建独立 Astro BlogSite 仓库骨架，支持 blog / notes / projects 三类内容、基础页面、RSS、GitHub Pages workflow、README 和 docs。

本阶段不要读取 Obsidian Vault，不要实现真实同步，不要复制真实内容。

要求：
1. 使用 Astro + TypeScript + pnpm。
2. 创建 src/content/blog、src/content/notes、src/content/projects。
3. 创建 content.config.ts。
4. 创建首页、about、blog 列表和详情、notes 列表和详情、projects 列表和详情、RSS。
5. 创建最小响应式样式。
6. 创建 GitHub Actions deploy workflow。
7. 创建 publish.config.ts，但只保留配置结构。
8. 创建 3 篇示例内容。
9. 确保 pnpm build 通过。
10. 输出执行报告。
```

## 25. 给 Codex 的第二轮提示词

```text
请继续执行《BlogSite V1 计划要求》Phase 2，实现 Obsidian Vault 到 BlogSite 的本地同步脚本。

关键约束：
1. Obsidian 原始 Vault 不得被修改。
2. Vault 内部继续使用 [[双链]]。
3. BlogSite 同步阶段或构建阶段将 [[双链]] 转为网页链接。
4. 未发布目标不生成链接，应转换为纯文本并记录 warning。
5. 不同步 private 内容。
6. 不同步没有 publish_slug 的内容。
7. 不在 GitHub Actions 中读取私有 Vault。
8. 同步报告必须短，不粘贴正文。

实现：
1. scripts/sync-from-vault.ts
2. scripts/normalize-markdown.ts
3. scripts/copy-assets.ts
4. scripts/check-publish-content.ts
5. reports/sync-report.md
6. reports/wikilink-warnings.md
7. reports/asset-warnings.md

验收：
1. pnpm sync:vault 可运行。
2. pnpm check:publish 可运行。
3. pnpm build 通过。
4. 原始 Vault 没有任何 diff。
```