# GitHub Actions Node 24 运行时收敛设计

## 背景

2026-09-11 的 `main` 推送运行 `34625846556` 在 `Build and deploy Astro site` workflow 中输出 GitHub 弃用提示：

```text
Node 20 is being deprecated. This workflow is running with Node 24 by default.
```

GitHub 自 2025-09-19 起弃用 Actions 的 Node 20 运行时；凡是 `action.yml` 声明 `using: node20` 的 action，现在默认改在 Node 24 上运行并打印提示，后续会移除 Node 20。当前 workflow 中被命中的步骤是：

- `pnpm/action-setup@v4`：`v4` 浮动 tag 仍指向 node20 版本（v4.4.0 起已支持 node24，但 tag 未跟进；项目已提供后继 action `pnpm/setup`）。
- `actions/upload-pages-artifact@v4`：内部嵌套 `actions/upload-artifact@v4.6.2`（node20）。
- `actions/deploy-pages@v4`：声明 `using: node20`。

`actions/checkout@v5` 和 `actions/setup-node@v5` 已是 node24，未产生警告。

## 目标

1. 消除 Node 20 弃用提示，并避免 Node 20 移除后部署失败。
2. 保持构建产物、Pages 部署流程、权限和隐私边界不变。
3. 用最小改动完成，不扩大 workflow 行为变化面。

## 非目标

- 不迁移到后继 action `pnpm/setup`（会同时替换 `actions/setup-node` 和 `pnpm install` 步骤，改动面更大）。
- 不改为固定 action SHA，保持仓库现有 major tag 风格。
- 不改变 `pnpm check:publish`、构建命令、环境变量或 Vault 边界。

## 决策

只升级产生 node20 警告的三个 action：

| 位置 | 变更前 | 变更后 | 运行时 |
| --- | --- | --- | --- |
| Setup pnpm | `pnpm/action-setup@v4` | `pnpm/action-setup@v6` | node24 |
| Upload Pages artifact | `actions/upload-pages-artifact@v4` | `actions/upload-pages-artifact@v5` | 复合 action，内部使用 node24 的 `upload-artifact@v7` |
| Deploy to GitHub Pages | `actions/deploy-pages@v4` | `actions/deploy-pages@v5` | node24 |

`actions/checkout@v5` 与 `actions/setup-node@v5` 保持不变。

## 兼容性

- `pnpm/action-setup@v6` 支持 pnpm v11/v12；`package.json` 的 `packageManager: pnpm@11.8.0` 与 workflow 的 `version: 11.8.0` 一致，不会触发版本冲突错误。
- `actions/upload-pages-artifact@v5` 默认仍排除 dotfiles，站点产物不变；其内部 `upload-artifact@v7` 要求 Actions Runner ≥ 2.327.1，GitHub 托管的 `ubuntu-latest` 满足，自托管 runner 需先升级。
- `actions/deploy-pages@v5` 输入、权限（`pages: write`、`id-token: write`）和部署方式不变，仅轮询逻辑增加退避与抖动。
- PR 只构建、`main` 推送才部署的触发条件保持不变。

## 验证

1. 本地运行 `pnpm test`、`pnpm check:publish`、`pnpm build`。
2. 合并后由 `main` 推送或 `workflow_dispatch` 触发，运行 `gh run view <run-id> --log | grep "Node 20 is being deprecated"`，必须无输出。
3. 确认 build 与 deploy job 成功，并用 live URL 检查 `/BlogSite/` 首页、文章页和 RSS。

## 回滚

本次只改 workflow 中三个 action 主版本。回滚时 revert 对应提交即可；不涉及内容、契约、构建产物或线上数据。

## 维护约定

后续新增或升级 action 时按 `docs/codex-maintenance-guide.md` 的 CI 运行时规则执行：只使用 Node 24 兼容版本，并在运行日志中确认不再出现 Node 20 弃用提示。
