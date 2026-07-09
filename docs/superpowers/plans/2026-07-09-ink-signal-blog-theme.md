# Ink & Signal Blog Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Astro 博客改造成 Ink & Signal 阅读主题，并补齐标签页、404、明暗主题与三档响应式视觉验证。

**Architecture:** 把所有视觉基础值集中到 `src/styles/tokens.css`，由 `global.css` 只消费语义 token；页面继续使用现有 Astro 内容集合和 `withBase()`。标签聚合由独立纯函数生成，页面只负责渲染，便于用 Node 测试验证。

**Tech Stack:** Astro 6、TypeScript strict、CSS Custom Properties、Node test/tsx、Python Playwright（webapp-testing）

## Global Constraints

- 不读取或修改 Obsidian Vault。
- 不修改 `scripts/`、`src/content.config.ts`、`src/content/**`、双链转换、manifest、RSS 和 GitHub Actions。
- 不引入 UI 框架、字体包、代码高亮包或其他运行时依赖。
- `blog`、`notes`、`projects` 三个集合及现有 URL 保持不变。
- 所有颜色字面量只能出现在 `src/styles/tokens.css`。
- Light/dark 共用一组 `light-dark()` token，并保留手动主题切换。
- 视觉验收宽度固定为 390px、768px、1440px。

---

### Task 1: 建立设计 token 合约

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `tests/theme-render.test.ts`

**Interfaces:**
- Consumes: 浏览器 `color-scheme` 与 `[data-theme="light|dark"]`
- Produces: `--color-*`、`--font-*`、`--text-*`、`--leading-*`、`--space-*`、`--radius-*`、`--shadow-*`、`--code-*` token

- [ ] **Step 1: 写 token 与颜色边界失败测试**

在 `tests/theme-render.test.ts` 添加测试，读取 `tokens.css` 与展示层文件，断言
token 分类完整、`global.css` 导入 token，并禁止 token 文件以外的 hex/rgb/hsl
颜色字面量：

```ts
test("Ink & Signal token 覆盖颜色、字体、排版、间距、圆角、阴影和代码", async () => {
  const tokens = await readProjectFile("src/styles/tokens.css");
  const css = await readProjectFile("src/styles/global.css");
  assert.match(css, /@import\s+"\.\/tokens\.css";/);
  for (const token of [
    "--color-page",
    "--font-display",
    "--text-base",
    "--leading-reading",
    "--space-6",
    "--radius-md",
    "--shadow-float",
    "--code-background",
  ]) {
    assert.match(tokens, new RegExp(`${token}:`));
  }
  assert.match(tokens, /light-dark\(/);
});

test("展示层颜色字面量只允许出现在 tokens.css", async () => {
  const files = [
    "src/styles/global.css",
    "src/layouts/BaseLayout.astro",
    "src/layouts/ContentLayout.astro",
    "src/components/ContentList.astro",
    "src/pages/index.astro",
  ];
  const colorLiteral = /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i;
  for (const file of files) {
    assert.doesNotMatch(await readProjectFile(file), colorLiteral, file);
  }
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm exec tsx --test tests/theme-render.test.ts`

Expected: FAIL，原因是 `src/styles/tokens.css` 不存在。

- [ ] **Step 3: 新建设计 token 并让 global.css 消费 token**

`tokens.css` 使用 `color-scheme: light dark` 与 `light-dark()` 定义 Paper、Sheet、
Ink、Slate、Signal 调色板及语义颜色，同时定义三套字体、流体字号、行高、间距、
圆角、阴影和代码 token。`global.css` 第一行导入 token，移除原有 `:root`、
深色媒体查询和 `[data-theme]` 调色板，所有颜色字面量替换为 token。

- [ ] **Step 4: 运行主题测试并确认 GREEN**

Run: `pnpm exec tsx --test tests/theme-render.test.ts`

Expected: PASS，0 failure。

- [ ] **Step 5: 提交 token 基础**

```bash
git add src/styles/tokens.css src/styles/global.css tests/theme-render.test.ts
git commit -m "Establish Ink and Signal design tokens"
```

### Task 2: 增加标签聚合并让列表标签可导航

**Files:**
- Create: `src/lib/tags.ts`
- Create: `src/pages/tags/index.astro`
- Modify: `src/components/ContentList.astro`
- Modify: `tests/theme-render.test.ts`

**Interfaces:**
- Consumes: `SiteEntry[]`
- Produces: `TagGroup { name: string; id: string; entries: SiteEntry[] }[]`
- Produces: `/tags/#<encoded-id>` 标签锚点

- [ ] **Step 1: 写标签聚合失败测试**

在 `tests/theme-render.test.ts` 导入 `buildTagGroups`，使用公开和草稿 fixture，
断言标签去重、排序、条目排序和稳定锚点：

```ts
test("标签聚合只包含公开条目并生成稳定锚点", () => {
  const groups = buildTagGroups([
    makeEntry("notes", "newer", ["Astro", "中文标签"], "2026-07-03"),
    makeEntry("blog", "older", ["Astro"], "2026-07-01"),
  ]);
  assert.deepEqual(groups.map(({ name, id }) => ({ name, id })), [
    { name: "Astro", id: "tag-astro" },
    { name: "中文标签", id: "tag-%E4%B8%AD%E6%96%87%E6%A0%87%E7%AD%BE" },
  ]);
  assert.deepEqual(groups[0].entries.map((entry) => entry.id), ["newer", "older"]);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm exec tsx --test tests/theme-render.test.ts`

Expected: FAIL，原因是 `../src/lib/tags` 不存在。

- [ ] **Step 3: 实现标签纯函数、标签页和列表链接**

`buildTagGroups(entries)` 先调用 `isPublicEntry` 过滤，再按标签名称合并，用
`sortNewestFirst` 排序条目，并用
`tag-${encodeURIComponent(name.toLocaleLowerCase("zh-CN"))}` 生成 id。
`tags/index.astro` 合并三个集合并渲染 `.tag-directory`；`ContentList.astro`
把标签文本改成指向 `withBase("tags/") + "#" + id` 的链接。

- [ ] **Step 4: 运行主题测试并确认 GREEN**

Run: `pnpm exec tsx --test tests/theme-render.test.ts`

Expected: PASS，0 failure。

- [ ] **Step 5: 提交标签导航**

```bash
git add src/lib/tags.ts src/pages/tags/index.astro src/components/ContentList.astro tests/theme-render.test.ts
git commit -m "Add public tag directory"
```

### Task 3: 重组首页信息层级并补齐 404

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/pages/404.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `tests/theme-render.test.ts`

**Interfaces:**
- Consumes: 三个公开集合的最新条目
- Produces: `.home-intro`、`.recent-stream`、`.collection-index` 首页结构
- Produces: `/404.html`

- [ ] **Step 1: 写页面结构失败测试**

```ts
test("首页、标签和 404 提供 Ink & Signal 信息结构", async () => {
  const home = await readProjectFile("src/pages/index.astro");
  const tags = await readProjectFile("src/pages/tags/index.astro");
  const notFound = await readProjectFile("src/pages/404.astro");
  const layout = await readProjectFile("src/layouts/BaseLayout.astro");
  assert.match(home, /class="home-intro"/);
  assert.match(home, /class="recent-stream"/);
  assert.match(home, /class="collection-index"/);
  assert.match(tags, /class="tag-directory"/);
  assert.match(notFound, /返回首页/);
  assert.match(notFound, /浏览博客/);
  assert.match(layout, /withBase\("tags\/"\)/);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm exec tsx --test tests/theme-render.test.ts`

Expected: FAIL，首页缺少 `.home-intro`，且 `404.astro` 不存在。

- [ ] **Step 3: 实现首页、导航和 404**

首页合并三个集合生成最近更新流，并保持 Blog、Notes、Projects 三个集合入口。
导航加入标签。404 页面使用 `BaseLayout`、`withBase("")` 和
`withBase("blog/")`，只提供两个明确动作。

- [ ] **Step 4: 运行主题测试并确认 GREEN**

Run: `pnpm exec tsx --test tests/theme-render.test.ts`

Expected: PASS，0 failure。

- [ ] **Step 5: 提交页面结构**

```bash
git add src/pages/index.astro src/pages/404.astro src/layouts/BaseLayout.astro tests/theme-render.test.ts
git commit -m "Refine home hierarchy and add 404 page"
```

### Task 4: 完成长文、列表与响应式视觉样式

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/layouts/ContentLayout.astro`
- Modify: `src/components/ContentList.astro`
- Modify: `tests/theme-render.test.ts`

**Interfaces:**
- Consumes: Task 1 的 token 与 Task 2/3 的页面 class
- Produces: 390px、768px、1440px 的首页、列表、文章、标签、404 布局

- [ ] **Step 1: 写阅读与响应式失败测试**

```ts
test("主题样式覆盖首页、列表、标签、404、阅读和 reduced motion", async () => {
  const css = await readProjectFile("src/styles/global.css");
  for (const selector of [
    ".home-intro",
    ".recent-stream",
    ".collection-index",
    ".content-list",
    ".tag-directory",
    ".not-found",
    ".content-detail-shell",
    ".prose pre",
  ]) {
    assert.match(css, new RegExp(selector.replace(".", "\\.")));
  }
  assert.match(css, /@media\s+\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s+\(max-width:\s*48rem\)/);
  assert.match(css, /@media\s+\(max-width:\s*30rem\)/);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm exec tsx --test tests/theme-render.test.ts`

Expected: FAIL，缺少新页面 selector 和 reduced-motion 规则。

- [ ] **Step 3: 重写展示层样式**

按设计规范重写 `global.css`：首页使用双栏引言与索引轨道；列表改为编辑式分隔；
文章正文限制为阅读宽度；目录在宽屏固定、平板前置；标签目录分组；404 使用
留白和文本层级；控件触控高度至少 40px；30rem 和 48rem 断点分别处理手机与
平板；reduced motion 关闭平滑滚动、位移和非必要过渡。

- [ ] **Step 4: 运行完整自动化验证**

Run: `pnpm test && pnpm check:publish && pnpm build`

Expected: 三个命令 exit 0，无 test failure、publish error 或 Astro error。

- [ ] **Step 5: 提交完整展示层**

```bash
git add src/styles/global.css src/layouts/ContentLayout.astro src/components/ContentList.astro tests/theme-render.test.ts
git commit -m "Polish Ink and Signal reading experience"
```

### Task 5: Playwright 多视口验收与变更报告

**Files:**
- Create: `docs/theme-optimization-report.md`
- Create locally: `output/playwright/ink-signal/*.png`

**Interfaces:**
- Consumes: `pnpm preview` at `http://127.0.0.1:4321/BlogSite/`
- Produces: 390px、768px、1440px light/dark 截图、控制台与溢出检查记录

- [ ] **Step 1: 检查 webapp-testing helper 用法**

Run: `python3 "$HOME/.codex/skills/webapp-testing/scripts/with_server.py" --help`

Expected: 输出 `--server`、`--port` 和要执行的子命令参数说明。

- [ ] **Step 2: 编写临时 Playwright 验收脚本**

脚本遍历首页、`blog/`、`blog/obsidian-local-markdown-knowledge-vault/`、
`tags/` 和 `404.html`；每个页面在 390、768、1440 宽度与 light/dark
主题下截图，记录 `console.error`、`pageerror`，并断言
`document.documentElement.scrollWidth <= window.innerWidth`。脚本还点击主题
切换、打开与关闭搜索，并验证标签锚点 URL。

- [ ] **Step 3: 启动 preview 并执行视觉验收**

Run:

```bash
python3 "$HOME/.codex/skills/webapp-testing/scripts/with_server.py" \
  --server "pnpm preview --host 127.0.0.1" \
  --port 4321 \
  -- python3 /tmp/ink-signal-visual-check.py
```

Expected: 所有页面和视口输出 `PASS`，无 console error、page error 或横向溢出。

- [ ] **Step 4: 逐张检查截图并修正视觉问题**

检查 390px、768px、1440px 的首页、列表、文章、标签、404；确认标题不截断、
导航不溢出、正文行长合理、目录不覆盖正文、light/dark 代码块清晰。发现问题时
先补回归断言或记录可重复的 Playwright 检查，再修改 CSS 并重跑。

- [ ] **Step 5: 写变更报告**

`docs/theme-optimization-report.md` 必须列出：修改文件、token 组织、页面变化、
验证命令与截图目录、未改动边界、隐私影响和后续建议。

- [ ] **Step 6: 最终验证并提交报告**

Run:

```bash
pnpm test
pnpm check:publish
pnpm build
git diff --check
```

Expected: 全部 exit 0。

```bash
git add docs/theme-optimization-report.md
git commit -m "Document Ink and Signal theme verification"
```
