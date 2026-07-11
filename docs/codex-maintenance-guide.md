# Codex 维护指南

## 当前维护边界

BlogSite 当前是 **Soce1lo Growth Output Log**：以 Trace 首页呈现经过选择的思考、学习、项目与修订，同时保留 Ink & Signal 长文阅读体验。仓库内已有真实 Vault 公开副本，但完整 Vault、私有附件和本机配置仍不属于本仓库。同步实现位于 `scripts/`，必须保持 Vault 只读、输出路径与 Vault 分离，并使用合成 fixture 测试。CI 只能检查和构建仓库内已有公开副本，不得读取真实 Vault。

## 常用命令

```bash
pnpm install
pnpm test
pnpm sync:vault
pnpm check:publish
pnpm build
pnpm dev
```

## 修改检查

1. 修改同步逻辑时先运行 `tests/vault-sync.test.ts` 的合成 Vault 测试。
2. 页面链接必须通过 `withBase()` 生成，以兼容 GitHub Pages 子路径。
3. 公开列表和 RSS 必须继续过滤草稿与 unlisted 内容。
4. workflow 不得添加 `sync:vault` 或任何私人路径访问。
5. 报告和 manifest 只能记录相对路径、短链接片段、动作、URL、状态和原因，不得粘贴正文。
6. 提交前运行全部测试、正式发布检查、Astro 类型检查和生产构建。
7. UI 或主题变更要同时核对桌面和移动视口，不得引入横向溢出、重复标题或 GitHub Pages 子路径错误。
8. 首页 Profile、NOW、长期主题和精选引用只在 `src/data/site-profile.ts` 中人工维护，不得从 Daily、任务列表或 git 状态自动生成。
9. `publish_kind` 只允许 `thought`、`learned`、`built`、`revised`；修改映射时必须同步更新合成 Vault 测试、公开 schema 和 manifest。

## 真实内容接入

真实 Obsidian 内容接入必须继续按 `docs/publishing-guide.md` 的 Agent 发布 Runbook 执行。新增或更新真实内容时，先做临时目录 preview sync，确认 `reports/sync-report.md`、`reports/publish-manifest.json` 和 `reports/publish-manifest.md`，再正式同步、检查、构建、提交和发布。遇到源文 `publish_status: draft` 必须先得到明确授权，不要替用户改为 published。

## 站点体验维护

当前界面由 Trace 成长轨迹和 Ink & Signal 阅读系统组成。继续维护时应保留现有内容集合、Vault 发布边界、`withBase()` 和 `check:publish`。结构测试在 `tests/theme-render.test.ts`，已覆盖首页成长输出、轻量搜索、明暗主题、阅读进度、文章目录、目录高亮、重复 H1 隐藏和搜索 JSON 安全序列化。新增年月档案、主题详情、Pagefind、相关文章、代码块复制、图片 lightbox、OG 图片、Giscus 或无障碍增强时，应由真实内容需求触发，先补相应测试，再跑完整验证。
