# Vault 同步边界

当前同步器消费 `contracts/publishing/v1/` 定义的来源契约，并生成 Astro 公开副本。该目录是字段模型的唯一权威位置；本指南只说明当前同步实现、选项和安全边界。真实内容接入、同步和发布的完整操作顺序以[发布指南](publishing-guide.md)为准。

## 运行方式

默认配置使用相对路径。以下示例展示本地命令，预演审阅、正式同步授权和后续验证按[发布指南](publishing-guide.md)执行。

```bash
export BLOGSITE_VAULT_PATH="../KnowledgeVault"
preview_root="$(mktemp -d)"
pnpm sync:vault --preview "$preview_root"
# 预演通过且获得正式同步授权后执行
pnpm sync:vault --apply "$preview_root"
```

预演根目录必须是仓库、Vault 和正式输出目录之外的新空目录。公开预演产物写入其中的 `content/`、`public/images/` 和 `reports/`，本机诊断和收据保存在预演根目录。为无参数 `pnpm sync:vault` 或 `pnpm prepare:publish` 设置 `BLOGSITE_REVIEWED_PREVIEW` 可指定已审阅的预演根目录。

以下环境变量指定正式输出位置。预演也会使用这些路径检查正式目的地的手工内容冲突。

- `BLOGSITE_CONTENT_OUTPUT_PATH`
- `BLOGSITE_IMAGE_OUTPUT_PATH`
- `BLOGSITE_REPORTS_PATH`

当前 BlogSite 适配器只从 `publish.config.ts` 的 `10-Notes/`、`20-Projects/` 与 `60-Publish/Blog/` 读取候选。根目录按完整目录段匹配，不能用相似前缀扩大范围；该输入范围不改变 `contracts/publishing/v1/` 的通用字段模型。

## 同步流程

1. 只读递归扫描 Markdown，跳过配置中的排除目录。只在三个配置来源根内评估候选，`60-Publish/Blog/` 下的管理子文件夹随源路径一起扫描。草稿可作为候选。同步器也会维护 Vault 的已知目标索引，以识别正文中引用的未发布文档。
2. 建立发布目标索引。满足发布条件且 `publish_kind` 合法的 `published` 文档可作为链接目标，包括 `unlisted` 页面。首页、列表、RSS 和自动阅读导航均不收录 `unlisted` 页面。
3. 带目录的双链按显式路径匹配。无目录的双链若匹配多篇文档，保留文本并告警。匹配到已发布文档的双链转为适配 GitHub Pages 子路径的相对网页链接。匹配到草稿、其他未发布文档或找不到目标时，保留文本并告警。笔记嵌入也按这项规则输出链接或文本。例如 `![[笔记.md|背景说明]]` 引用已发布笔记时，读者可以点击“背景说明”进入详情页。
4. 将本地图片复制到 `public/images/{publish_slug}/`；缺失图片转为文本并记录 warning。
5. 将 Obsidian callout 标记转换为可移植的标准 Markdown 引用，避免公开页面显示 `[!summary]` 等内部语法。
6. 检查拟生成路由是否被正式目的地中的手工内容占用。预演报告冲突路径，正式同步遇到冲突时整批失败。正式同步成功时只清理带 `managedBy: vault-sync` 的旧副本，保留手工内容。
7. 写入同步报告、双链告警、资源告警和两种格式的发布 manifest。可提交的双链告警只记录公开副本文件、原文正文行号和原因，完整链接目标写入本机预演的 `local-diagnostics.json`。
8. 正式同步在暂存区重新生成产物，比较内容副本、图片、正文链接及五份公开报告的明细。扫描数、跳过计数和生成时间可随此次运行更新。若公开产物变化，重新预演和审阅。有错误时保留旧公开副本、图片和 manifest，失败诊断写入系统临时目录。预演有错误时仍可检查部分产物。

预演的 `local-diagnostics.json` 以 `retiredPages` 列出此次将删除的受管稿件。正式写入前会在锁内再次核对这些路径。如果其间正式目录多出一篇本次需要删除的受管稿件，需要重新预演。

写入过程中遇到文件系统错误，同步器会恢复已替换的文件。若进程被强制终止，或文件系统拒绝恢复，先核对锁、暂存备份及正式目录的内容，再决定如何恢复。回滚失败的诊断会列出保留的备份位置。

## 安全边界

1. 同步只能在本地显式执行。
2. 原始 Vault 必须保持只读，不得被同步流程修改。
3. GitHub Actions 只构建仓库中已有的公开发布副本。
4. 任何本机绝对路径都不得进入公开内容、报告或版本控制。
5. 未明确标记为可发布的内容不得同步。
6. 修改来源范围、运行预演或查看报告不构成写入正式公开副本的授权。正式同步须在预演审阅后获得对应授权。
7. 预演收据和本机诊断留在本机临时目录。

同步器按照 `contracts/publishing/v1/` 中的允许值、默认行为和校验规则消费 `publish_kind`，并生成用于公开展示的 `outputKind`。公开改写稿源路径可以是 `60-Publish/Blog/<管理文件夹>/...`；`10-Notes/` 与 `20-Projects/` 支持原位发布。完整的相对路径写入 `sourceVaultPath` 和 manifest 供对账，但生成的 `src/content/{collection}/{publish_slug}.md` 仍按 slug 扁平输出，管理文件夹不参与站点路由。系列导航由明确的 `publish_series` 和 `publish_series_order` 驱动，不由文件夹名推导。

同步器拒绝把内容、图片或报告输出目录放到 Vault 内部。自动测试还会比较合成 Vault 同步前后的完整文件哈希。

## 当前公开同步状态

每次真实同步都以当次 `reports/` 中的 `sync-report.md`、`wikilink-warnings.md`、`asset-warnings.md`、`publish-manifest.json` 和 `publish-manifest.md` 为准；本文不固化候选数、同步数或 warning 统计。preview、授权和报告审阅的顺序以[发布指南](publishing-guide.md)为准；仍须确认嵌套源路径、系列字段、私有链接和资源 warning 都符合本次范围。

JSON 和 Markdown manifest 必须记录 `contractVersion: v1` / `contract_version: v1`，用于确认本次结果由哪个契约版本生成。
