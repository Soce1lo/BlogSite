# Phase 2 执行报告

执行日期：2026-06-20

状态：已完成

## 完成范围

- 实现只读 Vault Markdown 扫描和发布候选筛选。
- 实现发布目标索引、普通/别名双链转换及 heading/block 降级 warning。
- 实现 Wiki 图片和 Markdown 图片复制、缺失图片降级及 warning。
- 实现公开 frontmatter 映射，不复制原始 frontmatter 全量字段。
- 实现旧 `managedBy: vault-sync` 副本清理，保留手工内容。
- 实现短同步报告、双链 warning 报告和资源 warning 报告。
- 实现发布内容检查及严重错误/普通 warning 分级。
- 实现环境变量路径覆盖，仓库配置不保存本机绝对路径。

## 安全边界

- 同步器没有任何写入 Vault 的代码路径。
- 内容、图片和报告输出目录位于 Vault 内部时，同步直接拒绝执行。
- Markdown 扫描跳过符号链接、排除目录和 Daily 目录。
- 资源复制禁止从 Vault 外部、私有归档目录和 `file://` 读取。
- GitHub Actions 不运行 `sync:vault`，只检查并构建仓库中的公开副本。
- 本阶段未读取真实 Vault，未复制任何真实文章或真实附件。

## 验证结果

### 自动测试

- `pnpm test`：覆盖结构、双链、图片、筛选、旧副本清理、报告、路径隔离和发布检查。
- 合成 Vault 集成测试验证 private、缺 slug 和 Daily 内容均不输出。
- 跨集合重复 slug 按严重错误处理，避免共享图片目录冲突。

### 命令级验收

使用仓库内完全合成的 fixture，并将全部输出定向到临时目录：

- `pnpm sync:vault`：扫描 1，同步 1，warnings 0，errors 0。
- `pnpm check:publish`：扫描 1，errors 0，warnings 0。
- fixture 同步前后 SHA-256 一致。
- 仓库当前 3 篇示例内容执行 `pnpm check:publish`：errors 0，warnings 0。

### 构建

- `pnpm build`：Astro 检查 0 errors、0 warnings、0 hints。
- 首页、About、三类列表与详情、RSS 均继续生成。

## 未执行事项

真实 Obsidian 内容接入属于 Phase 3。本阶段没有运行默认真实 Vault 路径，也没有生成任何真实内容报告；仓库内 `reports/` 保持未接入真实 Vault 的零值模板。
