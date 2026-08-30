# Soce1lo Growth Output Log

这是 Soce1lo 的成长输出日志：记录我如何理解、学习与构建。它是个人知识管道的公开输出端，用于发布经过选择、核验和整理的思考、技术学习与项目记录。

当前站点以 **Soce1lo / Growth Output Log** 为公开品牌：首页由 NOW、跨集合 Output Log、长期主题、精选成果和档案入口组成；内容层仍使用 `blog`、`notes`、`projects` 三个稳定集合。仓库包含本地只读 Vault 同步、双链转换、图片复制、发布检查、发布 manifest、搜索、明暗主题和长文阅读能力，但不包含完整 Obsidian Vault、私有附件或本机配置。

线上地址：[https://soce1lo.github.io/BlogSite/](https://soce1lo.github.io/BlogSite/)

## 技术栈

- Astro 6
- TypeScript
- pnpm
- Astro Content Collections
- GitHub Pages

## 当前能力

- 三类内容集合：`blog`、`notes`、`projects`。
- 跨集合成长输出：按首次发布时间 `pubDate` 排序并按年月组织思考、学习、构建与修订；`updatedDate` 只记录修订，不改变时间线位置。
- 人工维护的公开 Profile：集中管理身份、NOW、长期主题和精选内容，不从私人 Daily 自动推导状态。
- 真实 Vault 只读同步：递归读取可位于管理子文件夹中的公开稿，生成公开 Markdown、公开图片和报告，不写回 Vault；源文件夹不改变站点 URL。
- 版本化发布契约：Vault 的公开元数据能力、允许值和缺省行为统一以 [`contracts/publishing/v1/`](contracts/publishing/v1/) 为准。
- 发布边界检查：拦截残留双链、本机绝对路径、`file://`、Daily 来源、重复 slug、不可信发布状态和缺失必需 frontmatter。
- 发布 manifest：生成 `reports/publish-manifest.json` 和 `reports/publish-manifest.md`，用于对账来源、URL、状态和 warning。
- GitHub Pages 部署：push 到 `main` 后由 Actions 构建并部署；CI 不执行 Vault 同步。
- Tone-inspired 阅读主题：明暗主题、轻量站内搜索、阅读进度条、文章目录 rail、目录高亮、长文 prose、移动端适配和重复 H1 隐藏。
- 可选访客互动：GoatCounter 单页/全站访问次数，以及按需加载的 giscus GitHub 留言；默认关闭，不在未公开页面启用。配置见[访问次数与留言](docs/visitor-comments-guide.md)。

## 页面与视觉结构

视觉概念是 **Trace / 一个人持续变化留下的轨迹**，在既有 Ink & Signal 色彩与排版系统上演进：

1. 首页首先回答“我是谁、现在关注什么、最近产生了什么输出”。
2. Output Log 使用连续时间脊线，不用内容数量或热力图替代成长。
3. 长期主题跨越思考、学习和项目，只在已有真实公开成果时出现。
4. Signal 色仅用于链接、状态、焦点和轨迹节点；明暗主题共享同一语义层级。
5. 搜索、阅读进度、文章目录、响应式阅读和 GitHub Pages 子路径能力继续保留。

## 长期演进

后续演进以真实公开内容为触发条件，不为填满页面制造空功能：

- 当 Vault 中形成适合公开的技术笔记和项目复盘时，让 `notes` 与 `projects` 成为真实输出。
- 当某个长期主题积累至少 3 条公开记录时，再考虑独立主题详情页。
- 有持续半年以上的公开输出后，再增加按年月浏览和年度回顾。
- NOW 历史只在显式发布快照后保留，不自动读取私人状态。
- Pagefind、代码复制、图片查看和 OG 图片等能力，只有在真实使用需求出现后再引入。

任何新增能力都不得导入示例内容冒充个人输出，不得让 GitHub Actions 读取真实 Vault，也不得绕过 `check:publish` 的隐私边界。

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

`sync:vault` 只读取 Vault，将发布副本、公开图片和短报告写入 BlogSite。路径可以通过 `BLOGSITE_VAULT_PATH`、`BLOGSITE_CONTENT_OUTPUT_PATH`、`BLOGSITE_IMAGE_OUTPUT_PATH` 和 `BLOGSITE_REPORTS_PATH` 覆盖。正式同步前必须先按发布指南执行临时目录 preview。

## 内容结构

```text
src/content/
├── blog/
├── notes/
└── projects/
```

每个集合使用 `src/content.config.ts` 中的共享 schema。生产列表和 RSS 仅包含 `draft: false`、`visibility: public` 的内容；`unlisted` 内容可生成详情页但不会进入公开列表。

Vault 侧的 `60-Publish/<管理文件夹>/...` 只是源稿管理结构；公开系列使用 `publish_series` / `publish_series_order` 明确表达，不能从文件夹名自动推导。

## 页面

- `/`：首页
- `/about/`：个人定位、工作方式与公开边界
- `/blog/` 与 `/blog/{slug}/`：思考、经历、判断与复盘
- `/notes/` 与 `/notes/{slug}/`：已经自洽、可复用的学习记录
- `/projects/` 与 `/projects/{slug}/`：项目决策、实施与结果
- `/tags/`：跨输出形式的公开主题
- `/rss.xml`：思考、学习与项目的公开输出 RSS

## GitHub Pages

`.github/workflows/deploy.yml` 在 pull request 中只检查和构建，在 `main` 分支 push 时额外部署。workflow 不执行 Vault 同步，也不会读取任何私人目录。

默认部署到 GitHub Pages 标准域名和仓库子路径。使用自定义域名时，可配置仓库变量：

- `SITE_URL`：例如 `https://example.com`
- `BASE_PATH`：例如 `/` 或 `/blog`

## 文档

- [发布指南](docs/publishing-guide.md)
- [Vault 同步边界](docs/vault-sync-guide.md)
- [Codex 维护指南](docs/codex-maintenance-guide.md)
- [访问次数与 GitHub 留言](docs/visitor-comments-guide.md)
- [Phase 1 执行报告](docs/phase-1-execution-report.md)
- [Phase 2 执行报告](docs/phase-2-execution-report.md)
- [Phase 3 执行报告](docs/phase-3-execution-report.md)

完整需求基线见 [BlogSite V1 计划要求](BlogSite%20V1%20计划要求.md)。
