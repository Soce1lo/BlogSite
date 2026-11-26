# Codex 维护指南

## 当前维护边界

BlogSite 当前是 **Soce1lo 个人实验室**：以交互探索坐标、成长输出日志与公开档案呈现经过选择的思考、学习、项目与修订，同时保留长文阅读体验。仓库内已有真实 Vault 公开副本，但完整 Vault、私有附件和本机配置仍不属于本仓库。同步实现位于 `scripts/`，必须保持 Vault 只读、输出路径与 Vault 分离，并使用合成 fixture 测试。CI 只能检查和构建仓库内已有公开副本，不得读取真实 Vault。

## 常用命令

```bash
pnpm install
pnpm test
pnpm check:publish
pnpm build
pnpm dev
```

## 修改检查

1. 修改同步逻辑时先运行 `tests/vault-sync.test.ts` 的合成 Vault 测试。
2. 页面链接必须通过 `withBase()` 生成，以兼容 GitHub Pages 子路径。
3. 公开列表和 RSS 必须继续过滤草稿与 unlisted 内容。
4. workflow 不得添加 `sync:vault` 或任何私人路径访问。
5. 报告和 manifest 只记录公开产物的元数据。可提交的双链告警仅包含公开副本文件、原文正文行号和原因，完整链接目标保留在本机预演的 `local-diagnostics.json`。
6. 提交前运行全部测试、正式发布检查、Astro 类型检查和生产构建。
7. UI 或主题变更要同时核对桌面和移动视口，不得引入横向溢出、重复标题或 GitHub Pages 子路径错误。
8. 首页 Profile、长期主题和精选引用只在 `src/data/site-profile.ts` 中人工维护，不得从 Daily、任务列表或 git 状态自动生成。公开数量、最近发布日期和探索档案只从 `isPublicEntry` 筛选后的公开集合派生。
9. 维护 `publish_kind` 的同步或展示行为时，以 `contracts/publishing/v1/` 为执行依据，并同步更新合成 Vault 测试、Astro schema 和 manifest。
10. 发布字段、枚举或默认值变更必须先更新 `contracts/publishing/` 和 `tests/publishing-contract.test.ts`，再修改同步器、Astro schema、操作文档或 Vault 局部约定。
11. GitHub Actions 只能使用 Node 24 运行时兼容的 action 版本；当前基线是 `actions/checkout@v5`、`pnpm/action-setup@v6`、`actions/setup-node@v5`、`actions/upload-pages-artifact@v5`、`actions/deploy-pages@v5`。升级或新增 action 后，必须用 `gh run view <run-id> --log | grep "Node 20 is being deprecated"` 确认无输出，并核对 build、deploy 和 live URL；设计依据见 `docs/superpowers/specs/2026-09-12-github-actions-node24-runtime-design.md`。

## 真实内容接入

真实 Obsidian 内容接入必须按[发布指南](publishing-guide.md)的 Agent 发布 Runbook 执行；本指南不重复发布操作序列。维护时继续遵守其中的 preview、授权和报告审阅要求。遇到源文 `publish_status: draft` 必须先得到明确授权，不要替用户改为 `published`。

## 站点体验维护

当前界面由个人实验室首页、探索档案与阅读系统组成。继续维护时应保留现有内容集合、Vault 发布边界、`withBase()` 和 `check:publish`。结构测试在 `tests/theme-render.test.ts`，已覆盖首页成长输出、轻量搜索、明暗主题、阅读进度、文章目录、目录高亮、重复 H1 隐藏和搜索 JSON 安全序列化；探索筛选与 URL 状态由 `tests/explore.test.ts` 覆盖，合成构建在 `tests/engagement.test.ts` 验证探索页公开边界与 Pages 路径。新增主题详情、全文搜索、代码块复制、图片 lightbox 或 OG 图片等功能时，应由真实内容需求触发并补充相应验证。
