# Ink & Signal 主题优化报告

## 结果

BlogSite 已从通用卡片式阅读主题收敛为 Ink & Signal：以纸墨色、蓝青信号色、
中文出版式标题和等宽元数据构成视觉语言。三个内容集合及公开 URL 保持不变，
没有引入 UI 框架、字体包或运行时依赖。

## 改造前审查

- `global.css` 只有基础颜色、单一圆角、单一阴影和部分间距变量。
- Light/dark 调色板在媒体查询和属性选择器中重复维护。
- 字号、行高、控件高度、圆角、阴影和代码块样式散落为裸值。
- 卡片悬浮和搜索遮罩使用一次性颜色，没有进入主题 token。
- 首页三个集合完全同权，最近内容与站点定位缺少主次。
- 列表元数据、标题、摘要和标签的层级差异有限。
- 文章已有目录、阅读进度和重复 H1 处理，但移动端目录顺序和长文排版仍可改进。
- 仓库没有标签聚合页和自定义 404 页。

## 设计系统

`src/styles/tokens.css` 是唯一允许出现颜色字面量的文件。token 分为：

- 调色板与语义颜色：Paper、Sheet、Ink、Slate、Signal，以及页面、表面、正文、
  边框、遮罩、状态和阴影语义。
- 字体：展示标题、正文、等宽元数据/代码三套字体栈。
- 排版：`--text-xs` 至 `--text-5xl`、紧凑/标题/正文/阅读/代码行高。
- 空间：`--space-1` 至 `--space-24`。
- 形状与层级：四级圆角、两级阴影、统一控件高度和边框宽度。
- 代码：代码块与内联代码的背景、前景、边框、选区、字号和行高。

颜色使用 `light-dark()` 定义成对主题值，`[data-theme]` 只改变
`color-scheme`，不再复制整套深色调色板。系统主题和手动切换继续共存。
Light 模式中用于小号文字的 Fog 和 Signal 均通过自动对比度测试，
相对 Paper 的对比度分别约为 4.78:1 和 5.15:1。

## 文件与页面变化

- `src/styles/tokens.css`
  - 新增完整 Ink & Signal token。
- `src/styles/global.css`
  - 所有颜色改为 token。
  - 重写首页、列表、文章、标签、404、搜索、导航和响应式样式。
  - 新增 48rem/30rem 断点和 reduced-motion 处理。
  - 集合计数、目录链接和其他交互目标统一使用至少 40px 高度。
- `src/pages/index.astro`
  - 首页改为“站点定位 + 最近更新”主区域和真实集合索引轨道。
  - 保留博客、笔记、项目三类入口及最新内容。
- `src/components/ContentList.astro`
  - 列表改为编辑式分隔结构，强化日期、分类、标题、摘要和标签层级。
  - 标签链接到标签聚合页锚点。
- `src/layouts/BaseLayout.astro`
  - 导航增加标签入口；主题切换和阅读进度行为保留。
  - 搜索增加 Tab/Shift+Tab 焦点循环，并在关闭后恢复触发前焦点。
- `src/layouts/ContentLayout.astro`
  - 目录进入文章语义结构，移动端位于标题和正文之间，桌面保持右侧 sticky rail。
- `src/lib/tags.ts`
  - 新增公开标签的过滤、合并、稳定锚点和条目排序纯函数。
- `src/pages/tags/index.astro`
  - 新增标签聚合页，显示公开条目数量和对应内容。
- `src/pages/404.astro`
  - 新增静态 404，提供返回首页和浏览博客两个动作。
- `tests/theme-render.test.ts`
  - 增加 token、颜色边界、标签、页面结构、断点、reduced-motion、
    移动锚点、对比度、触控目标、搜索焦点和中文标题换行回归测试。
  - 颜色边界递归扫描全部展示层文件，不依赖固定文件白名单。

设计规范与实施计划分别位于：

- `docs/superpowers/specs/2026-07-09-ink-signal-blog-theme-design.md`
- `docs/superpowers/plans/2026-07-09-ink-signal-blog-theme.md`

## 验证

自动化门禁：

- `pnpm test`：33/33 通过。
- `pnpm check:publish`：`scanned=7, errors=0, warnings=0`。
- `pnpm build`：Astro check 0 errors、0 warnings、0 hints；14 个页面构建完成。
- `git diff --check`：通过。

Playwright 使用独立 `4322` 端口和 `BASE_PATH=/BlogSite`，验证：

- 页面：首页、博客列表、文章详情、标签、404。
- 宽度：390px、768px、1440px。
- 主题：light、dark。
- 结果：30/30 张截图通过，无横向溢出、console error 或 page error。
- 交互：主题切换与持久化、搜索焦点循环/关闭恢复、标签锚点均通过。

截图保存在本地目录 `output/playwright/ink-signal/`。人工检查覆盖三档首页、
移动与桌面文章、标签和 404；检查中发现并修复了中文标题使用 `ch` 导致的孤行。

## 未改动的边界

- 没有读取或修改 Obsidian 原始 Vault。
- 没有修改 `scripts/` 下的同步、Markdown 归一化、资源复制或发布检查逻辑。
- 没有修改 `src/content.config.ts` 或 `src/content/**`。
- 没有修改双链转换、manifest、RSS 数据生成和 GitHub Actions。
- 没有改变三个内容集合、现有内容 slug 或文章 URL。
- 没有把主题改造成 dashboard，也没有加入重型组件库。

## 后续建议

- 在真实设备上复核宋体 fallback 差异，必要时只调整系统字体栈，不引入远程字体。
- 内容中出现更多语言或大量标签后，可在现有标签页上增加纯客户端筛选。
- 代码样例明显增多后，再评估 Astro 官方 Shiki 输出；当前不需要增加复制按钮或新依赖。
- 如果要把视觉回归加入 CI，应固定浏览器版本并选取少量稳定截图，避免提交当前
  30 张人工验收图造成无意义二进制变更。
