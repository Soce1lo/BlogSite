# Vault 同步边界

## 运行方式

默认配置使用相对路径，不在仓库中保存本机绝对路径：

```bash
BLOGSITE_VAULT_PATH="../KnowledgeVault" pnpm sync:vault
pnpm check:publish
pnpm build
```

也可以设置以下环境变量覆盖输出位置：

- `BLOGSITE_CONTENT_OUTPUT_PATH`
- `BLOGSITE_IMAGE_OUTPUT_PATH`
- `BLOGSITE_REPORTS_PATH`

## 同步流程

1. 只读扫描 Markdown，跳过配置中的排除目录和 Daily 目录。
2. 建立发布目标索引，只收录满足发布条件的内容。
3. 将已发布目标双链转为网页链接；未发布或不存在目标转为纯文本并记录 warning。
4. 将本地图片复制到 `public/images/{publish_slug}/`；缺失图片转为文本并记录 warning。
5. 只清理带 `managedBy: vault-sync` 的旧副本，保留手工内容。
6. 写入三份短报告，不粘贴正文。

## 安全边界

1. 同步只能在本地显式执行。
2. 原始 Vault 必须保持只读，不得被同步流程修改。
3. GitHub Actions 只构建仓库中已有的公开发布副本。
4. 任何本机绝对路径都不得进入公开内容、报告或版本控制。
5. 未明确标记为可发布的内容不得同步。

同步器拒绝把内容、图片或报告输出目录放到 Vault 内部。自动测试还会比较合成 Vault 同步前后的完整文件哈希。
