# 访问次数与 GitHub 评论

本站继续由 GitHub Pages 托管静态文件，不增加服务器或数据库。GoatCounter 提供访问统计，giscus 将文章留言保存在 GitHub Discussions。两项服务独立配置，默认关闭。

## 页面与数据边界

- 文章发布日期旁显示单页访问次数，页脚显示全站累计访问次数；首页主体、导航、列表不变。
- 只有取得有效数字才显示计数；404、超时、接口关闭或错误都不显示假零值。次数沿用 GoatCounter 的 Sessions 设置口径，不表示精确人数；公开计数最多缓存四小时。
- 统计只在生产构建且浏览器 origin 与 `SITE_URL` 一致时记录。开发和本地生产预览不记录访问；配置后读取公开计数仍会请求 GoatCounter。
- 只记录页面 pathname，不记录查询字符串或片段；来源只保留 origin，不发送来源路径和查询。不要向服务提供私有来源路径。
- 上报使用 GoatCounter 官方稳定的像素接口，不加载其 `count.js`（该脚本会另外上报查询字段 `q`）。最终请求只包含路径、公开标题、来源 origin 与缓存随机值；不采集屏幕尺寸或点击事件，已知 WebDriver 与嵌入预览不计数。此方式仍不能保证识别所有机器人。
- `unlisted`、草稿和 404 页面不启用统计、计数或评论。公开文章的 `blog`、`notes`、`projects` 共用相同实现。
- 评论放在文章与延伸阅读之后，点击“加载评论”才连接 giscus；不自动要求登录，不自动创建 Discussion，不代替访客发布内容。
- 评论按 `集合/slug` 精确映射，例如 `blog/example`。更换域名、Pages 前缀或文章标题不会串帖；变更 slug 或集合需要人工迁移对应 Discussion。新 Discussion 由 giscus 在第一次有人留言时创建。
- 评论使用本站 token 生成的静态明暗主题 CSS，保留现有字体、纸感背景、辅助色与细线。GitHub 登录与留言由 giscus 提供。
- 本地 HTTP 预览使用 giscus 内置无边框明暗主题，避免尚未发布的定制 CSS 导致文字不可读；正式 HTTPS 页面仍使用本站定制主题。

## 配置访问统计

1. 在 [GoatCounter](https://www.goatcounter.com/) 创建托管站点，将网站地址设为正式 Pages URL。
2. 在 GoatCounter 设置中启用 **Allow adding visitor counts on your website**，否则公开计数接口不可用。
3. 填写站点代码。例如站点地址是 `https://your-code.goatcounter.com`，则 `PUBLIC_GOATCOUNTER_CODE=your-code`。不要填写完整 URL，也不需要任何 API key。
4. 保持默认 Sessions 设置时，显示的是去重后的访问次数。若更改该设置，历史与未来数据口径可能不同，应自行确认。

参考：[官方公开计数接口](https://www.goatcounter.com/help/visitor-counter)、[像素上报接口](https://www.goatcounter.com/help/pixel)、[Sessions 口径](https://www.goatcounter.com/help/sessions)、[隐私说明](https://www.goatcounter.com/help/privacy)。

## 配置 GitHub 留言

1. 评论仓库必须公开。在 GitHub 仓库 Settings 中启用 **Discussions**。
2. 由仓库所有者安装 [giscus GitHub App](https://github.com/apps/giscus)，只授权计划用于评论的仓库。App 安装属于独立的账号授权操作。
3. 在 [giscus 配置页](https://giscus.app/zh-CN) 输入仓库，选择一个 **Announcements** 类型的分类；从生成的代码中复制下面四个公开值。无需提供 GitHub token。

| 构建变量 | giscus 生成的字段 |
| --- | --- |
| `PUBLIC_GISCUS_REPO` | `data-repo` |
| `PUBLIC_GISCUS_REPO_ID` | `data-repo-id` |
| `PUBLIC_GISCUS_CATEGORY` | `data-category` |
| `PUBLIC_GISCUS_CATEGORY_ID` | `data-category-id` |

本站代码固定 `specific` 映射和逐文章 term、严格匹配、中文、评论框在上方，并关闭主帖 reaction 区域；不要直接用配置页的整段脚本替换本站组件。

仓库根目录的 `giscus.json` 限制评论来源为 `https://soce1lo.github.io`。giscus 从**评论仓库的默认分支**读取此配置；仅存在于本地功能分支时尚未生效。使用独立评论仓库时应把配置放到那个仓库，使用自定义域名时应更新 `origins`。本地和 giscus 配置页的嵌入预览可能因此被拒绝，这不代表正式域名接入失败。

公开仓库 ID 可以通过 GitHub GraphQL 查询；分类未建立前无法得到 category ID。必须填齐四项才显示评论区，未配置时不会留下空标题或加载按钮。

## 本地与 GitHub Actions

`.env.example` 仅展示公开配置。将需要的配置添加到被 Git 忽略的 `.env.local`，不要覆盖现有本地 Vault 配置；不要在任何 `PUBLIC_*` 变量里放令牌。

在仓库 **Settings → Secrets and variables → Actions → Variables** 中创建同名的五个 `PUBLIC_*` 变量。workflow 在生产构建时读取它们；它们会进入公开 HTML，因此使用 Variables 即可，不使用凭据。

```bash
pnpm test
pnpm check:publish
SITE_URL=https://soce1lo.github.io BASE_PATH=/BlogSite pnpm build
SITE_URL=https://soce1lo.github.io BASE_PATH=/BlogSite pnpm preview
```

`astro.config.mjs` 从进程环境读取站点地址与前缀，因此构建和预览命令都要传入这两个值；不要只依赖 `.env.local` 中的同名字段。

`SITE_URL` 与 `BASE_PATH` 继续由既有 Pages workflow 设置。自定义主题位于 `/BlogSite/giscus/light.css` 和 `/BlogSite/giscus/dark.css`；它们随站点构建生成，正式上线前不会存在于线上。GitHub Pages 的跨域响应允许 giscus 加载这些 CSS；自定义托管需保证 CSS 的 CORS 响应允许 giscus，不能依赖 `Response` 中的自定义服务端 header 在 Pages 生效。

## 上线验收与回滚

配置服务、安装 App、提交、推送和部署是独立步骤。本地构建成功不代表线上统计或 GitHub OAuth 已验证。

获得发布授权后，先核对五个变量、公开计数开关、Discussions、App 授权与分类，再按既有发布流程处理代码；不要运行 Vault 同步来发布此功能。

- 正式页面只发送一次页面访问，刷新后的数值可能仍来自缓存；不把未立即增加当作失败。
- 首页仅显示全站计数；公开文章有单页计数与留言；三个集合均需检查。404 与 `unlisted` 页面不发送第三方请求。
- 点击留言后核对明暗主题、GitHub 登录与发送流程。实际留言会公开保存，测试评论必须由用户明确授权或亲自发送。
- 使用广告拦截器、断网或服务异常时正文仍可阅读，计数隐藏，评论提供重试与 GitHub 链接。
- 清空 GoatCounter 变量或全部 giscus 变量并重新构建即可分别关闭功能；已有统计与 Discussion 不会被删除。只移除 App 不会自动清理历史留言。

参考：[giscus 官方配置](https://giscus.app/zh-CN)、[主题与消息配置](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md)。
