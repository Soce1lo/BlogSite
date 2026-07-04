# BlogSite

BlogSite 是一个独立的 Astro 静态博客仓库，用于发布经过明确选择的博客、笔记和项目记录。

当前状态为 **V1 Phase 3 + Tone 阅读主题适配**：站点骨架之外，已包含本地只读 Vault 同步、双链转换、图片复制、发布检查、发布 manifest、短报告和两篇真实公开文章。阅读体验已完成一轮 Tone-inspired 适配并发布到 GitHub Pages。仓库不包含完整 Obsidian Vault、私有附件或本机配置。

线上地址：[https://soce1lo.github.io/BlogSite/](https://soce1lo.github.io/BlogSite/)

## 技术栈

- Astro 6
- TypeScript
- pnpm
- Astro Content Collections
- GitHub Pages

## 当前能力

- 三类内容集合：`blog`、`notes`、`projects`。
- 真实 Vault 只读同步：生成公开 Markdown、公开图片和报告，不写回 Vault。
- 发布边界检查：拦截残留双链、本机绝对路径、`file://`、Daily 来源、重复 slug、不可信发布状态和缺失必需 frontmatter。
- 发布 manifest：生成 `reports/publish-manifest.json` 和 `reports/publish-manifest.md`，用于对账来源、URL、状态和 warning。
- GitHub Pages 部署：push 到 `main` 后由 Actions 构建并部署；CI 不执行 Vault 同步。
- Tone-inspired 阅读主题：明暗主题、轻量站内搜索、阅读进度条、文章目录 rail、目录高亮、长文 prose、移动端适配和重复 H1 隐藏。

## 主题优化过程

本次主题优化没有直接套用完整 Tone 模板，也没有导入主题 demo 内容。实际做法是把 Tone 作为参考主题，将阅读版式和交互逐步适配到现有 BlogSite：

1. 保留现有 `src/content/{blog,notes,projects}`、Vault 同步、发布检查和 GitHub Pages 子路径规则。
2. 先在 `codex/tone-preview` 分支做本地预览，再把主题改动合入并推送 `main` 发布。
3. 重写 `src/styles/global.css` 的设计 token、prose、列表、搜索、目录和响应式样式。
4. 调整 `BaseLayout` 与 `ContentLayout`：加入主题切换、站内搜索、阅读进度、文章目录和正文容器隔离。
5. 三类详情页都从 `render(entry)` 传入 `headings`，由统一布局生成目录。
6. 新增 `tests/theme-render.test.ts`，覆盖主题结构、搜索索引安全序列化、目录接入和重复 H1 处理。
7. 发布前后验证 `pnpm test`、`pnpm check:publish`、`pnpm build`、Playwright 冒烟检查、GitHub Actions 和 live URL。

发布提交：`572e27f Introduce Tone-inspired reading theme`。

## 后续可引入特性

后续可以继续评估以下能力。引入时应先补测试，再验证本地构建、GitHub Pages 子路径和发布内容边界。

- 完整 Pagefind 索引，用于更强的全文搜索。
- 阅读时长和字数统计。
- 相关文章或同系列文章导航。
- 代码块复制按钮。
- 图片 lightbox。
- Open Graph 图片生成。
- 标签、主题和系列筛选页。
- RSS 分类输出。
- Giscus 评论。
- 更完整的键盘导航和无障碍状态。

这些特性都不得导入主题示例内容，不得让 GitHub Actions 读取真实 Vault，不得绕过 `check:publish` 的隐私边界。

## 本地运行

环境要求：Node.js 22.12 或更高版本，pnpm 11 或更高版本。

```bash
pnpm install
pnpm dev
```

开发服务器默认运行在 `http://localhost:4321/`。

## 验证与构建

```bash
pnpm test
pnpm check:publish
pnpm build
pnpm preview
```

配置好本地 Vault 路径后，可运行：

```bash
BLOGSITE_VAULT_PATH="../KnowledgeVault" pnpm sync:vault
pnpm check:publish
pnpm build
```

`sync:vault` 只读取 Vault，将发布副本、公开图片和短报告写入 BlogSite。路径可以通过 `BLOGSITE_VAULT_PATH`、`BLOGSITE_CONTENT_OUTPUT_PATH`、`BLOGSITE_IMAGE_OUTPUT_PATH` 和 `BLOGSITE_REPORTS_PATH` 覆盖。

## 内容结构

```text
src/content/
├── blog/
├── notes/
└── projects/
```

每个集合使用 `src/content.config.ts` 中的共享 schema。生产列表和 RSS 仅包含 `draft: false`、`visibility: public` 的内容；`unlisted` 内容可生成详情页但不会进入公开列表。

## 页面

- `/`：首页
- `/about/`：关于
- `/blog/` 与 `/blog/{slug}/`
- `/notes/` 与 `/notes/{slug}/`
- `/projects/` 与 `/projects/{slug}/`
- `/rss.xml`：公开博客 RSS

## GitHub Pages

`.github/workflows/deploy.yml` 在 pull request 中只检查和构建，在 `main` 分支 push 时额外部署。workflow 不执行 Vault 同步，也不会读取任何私人目录。

默认部署到 GitHub Pages 标准域名和仓库子路径。使用自定义域名时，可配置仓库变量：

- `SITE_URL`：例如 `https://example.com`
- `BASE_PATH`：例如 `/` 或 `/blog`

## 文档

- [发布指南](docs/publishing-guide.md)
- [Vault 同步边界](docs/vault-sync-guide.md)
- [Codex 维护指南](docs/codex-maintenance-guide.md)
- [Phase 1 执行报告](docs/phase-1-execution-report.md)
- [Phase 2 执行报告](docs/phase-2-execution-report.md)
- [Phase 3 执行报告](docs/phase-3-execution-report.md)

完整需求基线见 [BlogSite V1 计划要求](BlogSite%20V1%20计划要求.md)。
