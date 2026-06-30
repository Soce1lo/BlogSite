# Codex 维护指南

## Phase 2 边界

同步实现位于 `scripts/`，必须保持 Vault 只读、输出路径与 Vault 分离，并使用合成 fixture 测试。不要在维护或 CI 验证中读取真实 Vault。

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
5. 报告只能记录相对路径、短链接片段、动作和原因，不得粘贴正文。
6. 提交前运行全部测试、正式发布检查、Astro 类型检查和生产构建。

## 真实内容接入

真实 Obsidian 内容接入属于 Phase 3。本阶段维护任务只能使用 `tests/fixtures/` 或测试运行时创建的合成内容。
