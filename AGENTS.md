# Repository Guidelines

## 项目结构与模块组织

本仓库是 Astro 6 静态博客站点。页面入口在 `src/pages/`，共享布局在 `src/layouts/`，组件在 `src/components/`，站点工具函数在 `src/lib/`，全局样式在 `src/styles/global.css`。内容集合位于 `src/content/{blog,notes,projects}/`，schema 定义在 `src/content.config.ts`。Vault 同步、发布检查、资源复制和 Markdown 归一化脚本在 `scripts/`；测试在 `tests/`，合成 Vault fixture 在 `tests/fixtures/`；发布报告在 `reports/`，维护说明和执行设计在 `docs/`。

## 构建、测试与本地开发命令

- `pnpm install`：按 `pnpm-lock.yaml` 安装依赖。
- `pnpm dev`：启动 Astro 开发服务器，默认 `http://localhost:4321/`。
- `pnpm test`：运行 Node/tsx 测试套件。
- `pnpm check:publish`：检查公开内容边界、双链残留、本机/私有路径、来源状态和图片引用；安全相对说明路径不应被拦截。
- `pnpm build`：执行 `astro check` 后生成生产构建。
- `pnpm prepare:publish`：本地同步 Vault、检查发布内容并构建；只在明确配置本地 Vault 且完成 preview/授权后使用。

## 代码风格与命名约定

使用 TypeScript strict 配置与 ESM。保持现有两空格缩进、双引号、分号和 `camelCase` 函数/变量命名；类型、接口使用 `PascalCase`。Astro 页面和组件优先复用 `BaseLayout`、`ContentLayout`、`withBase()` 等本地抽象，确保 GitHub Pages 子路径可用。内容文件 slug 使用小写短横线，如 `welcome-to-blogsite.md`；BlogSite 公开副本保持扁平 slug 输出，Vault 侧可用 `publish_series`、`publish_series_order` 和 `publish_topic` 映射为 `series`、`seriesOrder`、`topic`。

## 测试指南

测试基于 `node:test`、`node:assert` 和 `tsx`。新增同步、manifest、组织字段或发布检查逻辑时，优先补充 `tests/vault-sync.test.ts` 或相邻 `*.test.mjs`/`*.test.ts`，并使用合成 fixture，不读取真实 Vault。路径检查要同时覆盖安全相对路径和真实本机/私有路径泄露。提交前至少运行 `pnpm test`、`pnpm check:publish` 和 `pnpm build`。

发布字段模型以 `contracts/publishing/` 为唯一权威来源。调整字段、枚举、默认值或 manifest 版本时，必须先更新契约和 `tests/publishing-contract.test.ts`；其他指南、同步器和 Astro schema 只消费该契约。

## 提交与 Pull Request 规范

当前历史使用简短英文动宾式提交，如 `Initialize BlogSite V1`；后续保持单一主题、清楚说明结果。PR 应包含变更摘要、验证命令结果、影响的页面或脚本；涉及 UI 时附截图，涉及同步或发布边界时说明隐私影响和回滚方式。

## 安全与配置边界

不要提交 `.env`、本机绝对路径、真实 Vault 正文、私有附件或完整 Obsidian 数据。真实发布必须先按 `docs/publishing-guide.md` 的 Agent 发布 Runbook 做临时目录 preview sync，并检查 `reports/sync-report.md`、`reports/publish-manifest.json` 和 `reports/publish-manifest.md`。`sync:vault` 必须保持源 Vault 只读，输出目录不得位于 Vault 内；遇到源文 `publish_status: draft` 必须先确认，不要代替用户改成 `published`。GitHub Actions 只能构建仓库内已有公开副本，不应加入真实 Vault 同步步骤。
