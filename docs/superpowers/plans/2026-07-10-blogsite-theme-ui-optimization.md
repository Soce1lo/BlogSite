# BlogSite Theme UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. If the user explicitly asks for subagents or parallel agent work, use `superpowers:subagent-driven-development` for independent task execution and review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 `/Users/bihaoran/Documents/BlogSite` 的 Astro BlogSite 主题系统、文章阅读体验、列表层级和标签页信息组织，使站点更适合中文长文阅读和公开知识库浏览。

**Architecture:** 保持现有 Astro 6 + TypeScript + content collections 架构。优先通过 `src/styles/tokens.css`、`src/styles/global.css`、`src/layouts/ContentLayout.astro`、`src/components/ContentList.astro` 和少量页面结构调整完成，不改内容源和 Vault 同步逻辑。

**Tech Stack:** Astro 6、TypeScript、CSS custom properties、pnpm、Astro preview、Playwright screenshot verification。

## Goal Prompt

```text
请按 docs/superpowers/plans/2026-07-10-blogsite-theme-ui-optimization.md 执行 BlogSite 主题与 UI 优化。

目标：在不改变内容源、不修改 Obsidian Vault、不破坏现有路由、不引入重型 UI 框架、不改变 [[双链]] 发布转换逻辑的前提下，基于现有 CSS token 和组件样式，优化首页、博客列表页、文章详情页、标签页、关于页的主题与阅读体验。

必须完成：
1. 修复或明确收敛文章详情页 layout 标题与 Markdown 正文 H1 重复问题。
2. 优化文章页中文长文阅读：正文宽度、行高、标题间距、代码块、目录、引用块。
3. 优化 390px 和 768px 下文章目录过高、推迟正文出现的问题。
4. 优化博客列表信息层级，确保日期、分类、标题、摘要、标签不互相抢权重。
5. 优化标签页，使其不只是纯索引，加入 tag cloud 或更好的分组入口。
6. 确保 light/dark mode 都可读。
7. 在 390px、768px、1440px 三个宽度分别截图检查首页、博客列表页、文章详情页、标签页、关于页。

验证必须运行：
- pnpm test
- pnpm check:publish
- pnpm build
- pnpm preview --host 127.0.0.1 --port 4322

最终说明需要列出变更文件、验证结果、截图路径和任何保留的设计取舍。
```

## Global Constraints

- Always respond in Chinese-simplified.
- 不改变 `src/content/**` 内容源。
- 不修改 Obsidian Vault。
- 不破坏现有路由和 GitHub Pages base path 兼容。
- 不引入重型 UI 框架。
- 不改变 `[[双链]]` 发布转换逻辑、Vault sync、publish check 语义。
- 所有设计改动优先通过 CSS token 和组件样式完成。
- 保持 TypeScript strict、ESM、两空格缩进、双引号、分号。
- 不提交 `.env`、本机绝对路径、真实 Vault 正文、私有附件或完整 Obsidian 数据。
- 提交前至少运行 `pnpm test`、`pnpm check:publish` 和 `pnpm build`。
- UI 验证必须使用生产构建：`pnpm build` 后 `pnpm preview`，不要用带 Astro dev toolbar 的 `pnpm dev` 截图。
- 不自动创建 commit，除非用户后续明确要求提交。

---

## Current Audit Findings To Address

1. 文章详情页视觉上隐藏了 Markdown 正文首个 H1，但 DOM 仍同时渲染 layout H1 和 Markdown H1。当前 CSS 是 `.content-body > h1:first-child { display: none; }`，后续应优先在结构层收敛。
2. 390px 和 768px 下文章目录块过高，正文首段被推到首屏以下。移动端和平板需要更轻量的目录体验。
3. 代码块 CSS token 存在，但 Shiki inline style 会覆盖部分 code token。需要让代码块 light/dark 主题与 token 系统更一致。
4. `tokens.css` 已有基础，但语义 token、旧别名、组件级 font weight、shadow、radius 使用仍需收敛。
5. 博客列表桌面层级清晰，但移动端标签 pill 视觉偏重，容易和摘要抢注意力。
6. 标签页目前是按标签分组的索引，缺少 tag cloud 或高频标签入口。
7. light/dark 对比度可读；问题主要在组件权重、目录布局、代码块主题和 token 收敛。

## Files Expected To Modify

- Modify: `src/layouts/ContentLayout.astro`
  - 处理详情页 Markdown 首个 H1 重复问题。
  - 保持文章标题、描述、元信息和目录结构清晰。

- Modify: `src/styles/tokens.css`
  - 收敛主题 token：颜色、字体、space、radius、shadow、reading width、toc height、code theme。
  - 保留兼容别名时要有明确用途，避免随意新增散乱变量。

- Modify: `src/styles/global.css`
  - 优化首页、列表页、详情页、标签页、关于页样式。
  - 改善移动端目录、正文排版、代码块、引用块、表格和标签 pill。
  - 不引入全新设计系统。

- Modify: `src/components/ContentList.astro`
  - 如有必要，调整列表页信息顺序或 class，以便 CSS 更好地控制日期、分类、标题、摘要、标签层级。

- Modify: `src/pages/tags/index.astro`
  - 增加 tag cloud / 高频标签入口 / 更好的分组结构。
  - 保持现有 anchor id 可用，不破坏标签链接。

- Modify: `src/pages/about.astro`
  - 统一关于页标题结构，使其与 `page-heading` 体系一致。

- Optional test updates:
  - Modify: `tests/theme-render.test.ts`
  - Modify or create adjacent tests only if current test coverage does not catch the changed structure.

## Task 1: Baseline Verification

**Files:**
- Read: `package.json`
- Read: `src/layouts/ContentLayout.astro`
- Read: `src/styles/tokens.css`
- Read: `src/styles/global.css`
- Read: `src/components/ContentList.astro`
- Read: `src/pages/tags/index.astro`
- Read: `src/pages/about.astro`

**Interfaces:**
- Consumes: current Astro routes and generated content collections.
- Produces: baseline command results and screenshot paths used for before/after comparison.

- [ ] **Step 1: Inspect current worktree**

Run:

```bash
git status --short
```

Expected: record whether the worktree is clean. Do not revert unrelated user changes.

- [ ] **Step 2: Run baseline gates**

Run:

```bash
pnpm test
pnpm check:publish
pnpm build
```

Expected: all commands pass before UI changes. If a command fails, diagnose current-state failure before editing UI.

- [ ] **Step 3: Start production preview**

Run:

```bash
pnpm preview --host 127.0.0.1 --port 4322
```

Expected: preview URL is `http://127.0.0.1:4322/`.

- [ ] **Step 4: Capture baseline screenshots**

Create an artifact directory:

```bash
mkdir -p output/playwright/theme-ui-optimization/baseline
```

Capture pages:

```bash
for theme in light dark; do
  for width in 390 768 1440; do
    if [ "$width" = "390" ]; then height=1200; else height=1100; fi
    for spec in "home:/" "blog-list:/blog/" "article:/blog/logseq-to-obsidian-migration/" "tags:/tags/" "about:/about/"; do
      key=${spec%%:*}
      route=${spec#*:}
      npx --yes playwright screenshot \
        --color-scheme "$theme" \
        --viewport-size "$width,$height" \
        --full-page \
        --wait-for-timeout 300 \
        "http://127.0.0.1:4322$route" \
        "output/playwright/theme-ui-optimization/baseline/${key}-${theme}-${width}.png"
    done
  done
done
```

Expected: 30 baseline screenshots.

## Task 2: Fix Article H1 Duplication

**Files:**
- Modify: `src/layouts/ContentLayout.astro`
- Modify: `src/styles/global.css`
- Test: `tests/theme-render.test.ts`

**Interfaces:**
- Consumes: Astro `render(entry)` output from `src/pages/blog/[...slug].astro`, `src/pages/notes/[...slug].astro`, and `src/pages/projects/[...slug].astro`.
- Produces: detail pages with one meaningful H1 and stable content body rendering.

- [ ] **Step 1: Inspect current generated HTML**

Run:

```bash
pnpm build
rg -n "<h1|content-body|article-header" dist/blog/logseq-to-obsidian-migration/index.html
```

Expected before fix: generated HTML shows both `.article-header h1` and `.content-body h1`.

- [ ] **Step 2: Add or update a render test for duplicate H1**

Open `tests/theme-render.test.ts`. Add an assertion that rendered article detail HTML does not expose duplicate visible/meaningful H1 text for `从 Logseq 到 Obsidian：迁移回顾`.

Use this expected behavior:

```ts
assert.equal(
  [...html.matchAll(/<h1(?:\\s[^>]*)?>从 Logseq 到 Obsidian：迁移回顾<\\/h1>/g)].length,
  1,
);
```

If the current test harness reads built files, target `dist/blog/logseq-to-obsidian-migration/index.html`. If it renders source pages directly, keep the assertion at the rendered HTML layer.

- [ ] **Step 3: Run the targeted test to verify failure**

Run:

```bash
pnpm exec tsx --test tests/theme-render.test.ts
```

Expected: fails before implementation if duplicate H1 is still present in rendered HTML.

- [ ] **Step 4: Implement the minimal structural fix**

Preferred implementation:

- Keep `.article-header h1` as the canonical article title.
- Prevent the first Markdown H1 from being emitted into `.content-body`.
- Do not edit `src/content/**`.
- Do not remove other headings from Markdown content.

Acceptable approaches:

- Use an Astro content rendering hook or wrapper if available in this codebase.
- Use a small post-render HTML transform only within `ContentLayout.astro` if it remains simple and testable.
- If Astro slot output cannot be transformed cleanly without introducing brittle code, keep CSS fallback but add a documented test that verifies the first body H1 is hidden and mark the structural limitation in final notes.

- [ ] **Step 5: Remove or narrow the CSS fallback**

If structural removal succeeds, remove this broad fallback from `src/styles/global.css`:

```css
.content-body > h1:first-child {
  display: none;
}
```

If structural removal is not feasible in this iteration, keep it and add a short comment explaining that Markdown source H1 is intentionally suppressed visually until render-layer removal is implemented.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm exec tsx --test tests/theme-render.test.ts
pnpm build
rg -n "<h1|content-body|article-header" dist/blog/logseq-to-obsidian-migration/index.html
```

Expected: only one meaningful article H1 remains, or the retained limitation is explicitly documented and tested.

## Task 3: Improve Article Reading Experience

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Optional Modify: `src/layouts/ContentLayout.astro`

**Interfaces:**
- Consumes: existing `.content-detail`, `.article-header`, `.content-toc`, `.prose`, `.content-body` classes.
- Produces: stable article layout for desktop, tablet, and mobile.

- [ ] **Step 1: Add focused article tokens**

In `src/styles/tokens.css`, add or refine tokens for:

```css
--content-width: 43rem;
--content-wide-width: 58rem;
--toc-min-width: 12rem;
--toc-width: 16rem;
--toc-compact-max-height: 16rem;
--leading-reading: 1.82;
--code-background: color-mix(in srgb, var(--palette-signal) 7%, var(--palette-sheet));
--code-inline-background: color-mix(in srgb, var(--palette-signal) 12%, transparent);
--code-border: color-mix(in srgb, var(--palette-signal) 22%, transparent);
```

If a token already exists with the same value, keep it and do not duplicate.

- [ ] **Step 2: Make mobile and tablet ToC compact**

In `src/styles/global.css`, under `@media (max-width: 48rem)`, update `.content-toc` so it does not consume an entire first viewport:

```css
.content-toc {
  position: static;
  grid-row: 3;
  max-height: var(--toc-compact-max-height);
  margin-bottom: var(--space-8);
  overflow-y: auto;
  padding: var(--space-4);
  border: var(--border-width) solid var(--border);
  border-top: var(--rule-width) solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--accent-wash);
}
```

Expected effect: 390px and 768px article pages show the start of正文 earlier than before, while still exposing the directory.

- [ ] **Step 3: Tune heading rhythm**

Keep section separation clear, but reduce excessive jumps if screenshots show headings too far apart:

```css
.prose h2 {
  margin-top: var(--space-12);
}

.prose h3 {
  margin-top: var(--space-8);
}
```

Only apply if the visual review confirms current `space-16` / `space-10` feels too loose after ToC change.

- [ ] **Step 4: Improve code and quote styling**

Ensure `.prose pre`, `.prose code`, and `.prose blockquote` remain token-driven:

```css
.prose blockquote {
  padding: var(--space-3) 0 var(--space-3) var(--space-5);
  border-left: var(--accent-rule-width) solid var(--annotation);
  margin-left: 0;
  color: var(--muted);
}

.prose pre {
  overflow-x: auto;
  padding: var(--space-5);
  border: var(--border-width) solid var(--code-border);
  border-radius: var(--radius-sm);
  background: var(--code-background);
  font-family: var(--font-utility);
  font-size: var(--code-font-size);
  line-height: var(--code-line-height);
  tab-size: 2;
}
```

If Shiki inline styles still override background/color, document that syntax theme configuration remains a follow-up unless a minimal Astro config change can solve it safely.

- [ ] **Step 5: Verify article screenshots**

Run preview and capture:

```bash
mkdir -p output/playwright/theme-ui-optimization/article
for theme in light dark; do
  for width in 390 768 1440; do
    if [ "$width" = "390" ]; then height=1200; else height=1100; fi
    npx --yes playwright screenshot \
      --color-scheme "$theme" \
      --viewport-size "$width,$height" \
      --wait-for-timeout 300 \
      "http://127.0.0.1:4322/blog/logseq-to-obsidian-migration/" \
      "output/playwright/theme-ui-optimization/article/article-${theme}-${width}-viewport.png"
  done
done
```

Expected: no horizontal overflow,正文入口 is not buried below a full-height directory on 390px/768px.

## Task 4: Refine Blog List Hierarchy

**Files:**
- Modify: `src/components/ContentList.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `SiteEntry` objects with `pubDate`, `category`, `series`, `topic`, `description`, `tags`.
- Produces: list cards where title > summary > taxonomy/tags/date in visual priority.

- [ ] **Step 1: Keep semantic order stable**

Preserve the existing content order in `ContentList.astro` unless a class hook is needed:

```astro
<p class="content-card__meta">...</p>
<div class="content-card__body">
  <h2>...</h2>
  <p class="content-card__taxonomy">...</p>
  <p class="content-card__description">...</p>
  <ul class="tag-list" aria-label="标签">...</ul>
</div>
```

- [ ] **Step 2: Reduce tag pill visual weight inside list cards**

In `src/styles/global.css`, adjust `.tag-list a` so tags remain clickable but quieter:

```css
.tag-list a {
  min-height: 2rem;
  padding-inline: var(--space-3);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--subtle);
  background: transparent;
  font-family: var(--font-utility);
  font-size: var(--text-xs);
  text-decoration: none;
}
```

If this makes tag links too faint in dark mode, use `background: color-mix(in srgb, var(--accent) 6%, transparent);`.

- [ ] **Step 3: Keep date and category secondary**

Ensure `.content-card__meta` remains utility-sized and muted:

```css
.content-card__meta {
  align-content: start;
  flex-direction: column;
  color: var(--subtle);
  font-family: var(--font-utility);
  font-size: var(--text-xs);
}
```

- [ ] **Step 4: Verify blog screenshots**

Capture:

```bash
mkdir -p output/playwright/theme-ui-optimization/blog-list
for theme in light dark; do
  for width in 390 768 1440; do
    if [ "$width" = "390" ]; then height=1200; else height=1100; fi
    npx --yes playwright screenshot \
      --color-scheme "$theme" \
      --viewport-size "$width,$height" \
      --full-page \
      --wait-for-timeout 300 \
      "http://127.0.0.1:4322/blog/" \
      "output/playwright/theme-ui-optimization/blog-list/blog-list-${theme}-${width}.png"
  done
done
```

Expected: title is dominant, tags no longer compete with summary, mobile layout has no horizontal overflow.

## Task 5: Add Better Tags Page Structure

**Files:**
- Modify: `src/pages/tags/index.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `buildTagGroups(entries)` output.
- Produces: a top tag cloud / common tag entry area plus existing complete grouped index.

- [ ] **Step 1: Derive tag cloud data**

In `src/pages/tags/index.astro`, after `groups`:

```ts
const tagCloud = [...groups]
  .sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name, "zh-CN"))
  .slice(0, 12);
```

- [ ] **Step 2: Add tag cloud before `.tag-directory`**

Add this block between `.page-heading` and `.tag-directory`:

```astro
{
  tagCloud.length > 0 && (
    <nav class="tag-cloud" aria-label="常用标签">
      {tagCloud.map((group) => (
        <a
          class={`tag-cloud__item tag-cloud__item--count-${Math.min(group.entries.length, 4)}`}
          href={`#${group.id}`}
        >
          <span>#{group.name}</span>
          <small>{group.entries.length} 篇</small>
        </a>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Style tag cloud**

Add CSS:

```css
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  max-width: var(--content-wide-width);
  margin-top: var(--space-6);
}

.tag-cloud__item {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  min-height: var(--control-height);
  padding-inline: var(--space-3);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  background: var(--surface);
  text-decoration: none;
}

.tag-cloud__item:hover {
  border-color: var(--border-strong);
  background: var(--accent-wash);
}

.tag-cloud__item small {
  color: var(--subtle);
  font-family: var(--font-utility);
  font-size: var(--text-xs);
}

.tag-cloud__item--count-3,
.tag-cloud__item--count-4 {
  border-color: var(--border-strong);
  background: var(--accent-wash);
}
```

- [ ] **Step 4: Preserve existing anchors**

Do not change:

```astro
<section class="tag-group" id={group.id}>
```

Expected: existing links like `/tags/#tag-obsidian` still jump to the same section.

- [ ] **Step 5: Verify tags screenshots and anchors**

Capture:

```bash
mkdir -p output/playwright/theme-ui-optimization/tags
for theme in light dark; do
  for width in 390 768 1440; do
    if [ "$width" = "390" ]; then height=1200; else height=1100; fi
    npx --yes playwright screenshot \
      --color-scheme "$theme" \
      --viewport-size "$width,$height" \
      --full-page \
      --wait-for-timeout 300 \
      "http://127.0.0.1:4322/tags/" \
      "output/playwright/theme-ui-optimization/tags/tags-${theme}-${width}.png"
  done
done
```

Check at least:

```bash
curl -s "http://127.0.0.1:4322/tags/" | rg 'id="tag-obsidian"|class="tag-cloud"'
```

Expected: tag cloud exists and `id="tag-obsidian"` remains.

## Task 6: Align About Page With Page System

**Files:**
- Modify: `src/pages/about.astro`
- Modify: `src/styles/global.css` only if existing classes are insufficient.

**Interfaces:**
- Consumes: `BaseLayout`, `.page-heading`, `.prose`.
- Produces: about page with one H1 and consistent top-level page rhythm.

- [ ] **Step 1: Restructure about page**

Change `src/pages/about.astro` from one all-prose article to:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="关于" description="关于 BlogSite 及其内容边界。">
  <header class="page-heading">
    <p class="eyebrow">About</p>
    <h1>关于本站</h1>
    <p>BlogSite 是一个独立的静态发布站点，用于呈现经过明确选择的公开内容。</p>
  </header>

  <article class="prose">
    <h2>内容范围</h2>
    <p>
      站点分为博客、笔记和项目三类内容。当前仓库仅包含公开发布副本与示例材料，不包含私人知识库。
    </p>
    <h2>技术方案</h2>
    <p>
      本站使用 Astro、TypeScript 和 pnpm 构建，通过 GitHub Pages workflow 生成并部署静态页面。
    </p>
  </article>
</BaseLayout>
```

- [ ] **Step 2: Verify about page**

Run:

```bash
pnpm build
rg -n "<h1|<h2" dist/about/index.html
```

Expected: one H1 and two H2 headings.

## Task 7: Token Cleanup Pass

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: all existing CSS classes.
- Produces: more coherent token usage without broad redesign.

- [ ] **Step 1: Search for raw colors and scattered hard-coded values**

Run:

```bash
rg -n "#[0-9a-fA-F]{3,8}|rgb\\(" src/styles src/**/*.astro
rg -n "[0-9]+px|box-shadow:|border-radius:|font-family:|font-size:|font-weight:" src/styles src/**/*.astro
```

Expected: raw color definitions mostly live in `src/styles/tokens.css`; component styles use tokens.

- [ ] **Step 2: Keep deliberate constants only**

Acceptable constants:

- `min-width: 320px`
- media query thresholds such as `48rem` and `30rem`
- `999px` for pill radius if retained as `--radius-pill`

Move repeated component values into tokens only when they are reused or represent a semantic design decision.

- [ ] **Step 3: Avoid over-refactoring**

Do not split `global.css` during this task unless it becomes necessary to complete the requested optimization. This repo currently centralizes global styles there.

## Final Verification

- [ ] **Step 1: Run all gates**

```bash
pnpm test
pnpm check:publish
pnpm build
```

Expected: all pass.

- [ ] **Step 2: Start production preview**

```bash
pnpm preview --host 127.0.0.1 --port 4322
```

Expected: preview URL is `http://127.0.0.1:4322/`.

- [ ] **Step 3: Capture final screenshot matrix**

```bash
mkdir -p output/playwright/theme-ui-optimization/final
for theme in light dark; do
  for width in 390 768 1440; do
    if [ "$width" = "390" ]; then height=1200; else height=1100; fi
    for spec in "home:/" "blog-list:/blog/" "article:/blog/logseq-to-obsidian-migration/" "tags:/tags/" "about:/about/"; do
      key=${spec%%:*}
      route=${spec#*:}
      npx --yes playwright screenshot \
        --color-scheme "$theme" \
        --viewport-size "$width,$height" \
        --full-page \
        --wait-for-timeout 300 \
        "http://127.0.0.1:4322$route" \
        "output/playwright/theme-ui-optimization/final/${key}-${theme}-${width}.png"
    done
  done
done
```

Expected: 30 final screenshots.

- [ ] **Step 4: Manual visual checks**

Check these files:

```text
output/playwright/theme-ui-optimization/final/home-light-390.png
output/playwright/theme-ui-optimization/final/blog-list-light-390.png
output/playwright/theme-ui-optimization/final/article-light-390.png
output/playwright/theme-ui-optimization/final/article-light-768.png
output/playwright/theme-ui-optimization/final/article-light-1440.png
output/playwright/theme-ui-optimization/final/tags-dark-1440.png
output/playwright/theme-ui-optimization/final/about-dark-390.png
```

Expected:

- 首页首屏信息清晰。
- 博客列表标题、摘要、标签权重有序。
- 文章页正文不会被移动端目录过度推迟。
- 标签页有 tag cloud 或更好的顶部入口。
- 关于页标题结构一致。
- light/dark 均可读。

## Final Response Requirements

Final response must include:

- Changed files.
- What was intentionally not changed.
- Verification command results.
- Screenshot artifact paths.
- Known tradeoffs, especially if H1 render-layer removal or Shiki theme tokenization cannot be fully solved safely in this pass.
