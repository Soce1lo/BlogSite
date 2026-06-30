# BlogSite

BlogSite 是一个独立的 Astro 静态博客仓库，用于发布经过明确选择的博客、笔记和项目记录。

当前状态为 **V1 Phase 2**：站点骨架之外，已包含本地只读 Vault 同步、双链转换、图片复制、发布检查和短报告。仓库仍不包含真实文章、真实附件或完整 Obsidian Vault。

## 技术栈

- Astro 6
- TypeScript
- pnpm
- Astro Content Collections
- GitHub Pages

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

完整需求基线见 [BlogSite V1 计划要求](BlogSite%20V1%20计划要求.md)。
