# Soce1lo Growth Output Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 BlogSite 实现为 Soce1lo 的成长输出日志，让首页按时间展示经过授权的思考、学习与项目成果，并保持 Obsidian Vault 只读和现有发布门禁完整。

**Architecture:** 以 `site-profile.ts` 保存明确公开的个人资料，以纯函数 `output.ts` 聚合三个 Astro 内容集合，以 `OutputLog.astro` 和 `LongThreads.astro` 渲染首页。同步层增加可选 `publish_kind → outputKind` 合同；缺省值按 collection 映射，非法值阻止同步。现有 Ink & Signal 主题、搜索、RSS、详情页和 GitHub Pages base path 原地演进。

**Tech Stack:** Astro 6、TypeScript strict、Astro Content Collections、pnpm、node:test、tsx、现有 CSS token 系统。

## Global Constraints

- 对外品牌使用 `Soce1lo`，副标识使用 `Growth Output Log / 成长输出日志`。
- 首屏标题必须是 `记录我如何理解、学习与构建。`。
- `NOW` 初始内容必须是 `正在把个人知识系统整理成可持续的成长输出管道。`。
- 只展示通过 `isPublicEntry()` 的内容；Daily、draft、unlisted、private 和 LLM Wiki 中间稿不得进入公开聚合。
- Vault 只读；本计划不得修改 `/Users/bihaoran/Documents/Obsidian Vault`。
- 不引入 UI 框架、客户端状态库、数据库、远程字体、分析脚本或运行时网络请求。
- 保留现有搜索、主题切换、阅读进度、文章目录、canonical H1、标签页、404 和 GitHub Pages base path。
- 当前工作树中的 H1、标签、About、文章节奏和移动目录优化是实施基线，不得还原或覆盖。
- 新逻辑必须先写失败测试，再写实现；每个任务独立验证和提交。

---

## File Map

- Create `src/lib/output-kind.ts`: 跨展示层和同步层共享 output kind 合同。
- Create `src/lib/output.ts`: 公开输出排序、分组、主题关联与精选解析纯函数。
- Create `src/data/site-profile.ts`: 人工公开的身份、NOW、长期主题和精选引用。
- Create `src/components/OutputLog.astro`: 首页成长脊线。
- Create `src/components/LongThreads.astro`: 首页长期主题。
- Create `tests/output.test.ts`: 输出模型单元测试。
- Modify `scripts/utils/vault-index.ts`: 读取和验证 `publish_kind`。
- Modify `scripts/utils/frontmatter.ts`: 输出 `outputKind`。
- Modify `scripts/sync-from-vault.ts`: manifest 记录 output kind，非法 kind 计为 error。
- Modify `src/content.config.ts`: schema 接受可选 `outputKind`。
- Modify `src/pages/index.astro`: 新首页。
- Modify `src/layouts/BaseLayout.astro`: Soce1lo 品牌、导航、SEO、页脚。
- Modify list/detail routes under `src/pages/{blog,notes,projects}`: 思考、学习、项目读者语义。
- Modify `src/pages/tags/index.astro`, `src/pages/404.astro`, and `src/lib/search.ts`: 主题、思考、学习、项目语义保持全站一致。
- Modify `src/pages/rss.xml.js`: 三集合公开输出 RSS。
- Modify `src/pages/about.astro`: 个人定位和公开知识管道。
- Modify `src/styles/tokens.css` and `src/styles/global.css`: Trace 视觉结构。
- Modify `public/favicon.svg`: `S` 小尺寸标记。
- Modify three starter Markdown files: `visibility: unlisted`。
- Modify `tests/vault-sync.test.ts`, `tests/theme-render.test.ts`, `README.md`.

---

### Task 1: Verify and Commit the Existing UI Baseline

**Files:**
- Existing Modify: `src/layouts/ContentLayout.astro`
- Existing Modify: `src/pages/about.astro`
- Existing Modify: `src/pages/tags/index.astro`
- Existing Modify: `src/styles/global.css`
- Existing Modify: `src/styles/tokens.css`
- Existing Modify: `tests/theme-render.test.ts`
- Existing Create: `docs/superpowers/plans/2026-07-10-blogsite-theme-ui-optimization.md`

**Interfaces:**
- Consumes: current Ink & Signal layout and current dirty worktree.
- Produces: a verified clean baseline commit containing duplicate-H1 removal, compact mobile ToC, tag cloud, About heading normalization, and adjacent regression tests.

- [ ] **Step 1: Confirm the existing diff is limited to the documented UI baseline**

Run:

```bash
git diff --stat
git diff -- src/layouts/ContentLayout.astro src/pages/about.astro src/pages/tags/index.astro src/styles/global.css src/styles/tokens.css tests/theme-render.test.ts
```

Expected: no Vault sync, content schema, generated public content, deployment workflow, or private path changes.

- [ ] **Step 2: Run the targeted regression suite and production build**

Run:

```bash
pnpm exec tsx --test tests/theme-render.test.ts
pnpm build
git diff --check
```

Expected: all theme tests pass; Astro reports 0 errors; whitespace check passes.

- [ ] **Step 3: Commit only the existing baseline**

Run:

```bash
git add docs/superpowers/plans/2026-07-10-blogsite-theme-ui-optimization.md src/layouts/ContentLayout.astro src/pages/about.astro src/pages/tags/index.astro src/styles/global.css src/styles/tokens.css tests/theme-render.test.ts
git commit -m "Polish article and tag presentation"
```

Expected: new feature files remain untouched and the worktree is clean before Task 2.

---

### Task 2: Add the Output Kind Publishing Contract

**Files:**
- Create: `src/lib/output-kind.ts`
- Modify: `src/content.config.ts`
- Modify: `scripts/utils/vault-index.ts`
- Modify: `scripts/utils/frontmatter.ts`
- Modify: `scripts/sync-from-vault.ts`
- Test: `tests/vault-sync.test.ts`

**Interfaces:**
- Consumes: optional Vault field `publish_kind` and existing `publish_target`.
- Produces: `OutputKind`, `isOutputKind()`, `defaultOutputKind()`, `PublishIndexEntry.outputKind`, generated frontmatter `outputKind`, and manifest `outputKind`.

- [ ] **Step 1: Write failing sync tests**

Add fixtures/assertions to `tests/vault-sync.test.ts` that cover this exact contract:

```ts
publish_kind: revised
```

The synced Markdown and JSON manifest must contain:

```ts
assert.match(article, /outputKind: revised/);
assert.equal(publicEntry.outputKind, "revised");
```

Add an invalid candidate with:

```yaml
publish_kind: speculative
```

and assert:

```ts
assert.ok(summary.errors >= 1);
assert.equal(summary.synced, expectedValidCount);
```

Also assert that a missing `publish_kind` defaults from collection.

- [ ] **Step 2: Run the targeted test and confirm RED**

Run:

```bash
pnpm exec tsx --test tests/vault-sync.test.ts
```

Expected: FAIL because `outputKind` and invalid-kind validation do not exist.

- [ ] **Step 3: Create the shared contract**

Create `src/lib/output-kind.ts` with:

```ts
export const OUTPUT_KINDS = ["thought", "learned", "built", "revised"] as const;

export type OutputKind = (typeof OUTPUT_KINDS)[number];
export type OutputCollection = "blog" | "notes" | "projects";

const defaultKinds: Record<OutputCollection, OutputKind> = {
  blog: "thought",
  notes: "learned",
  projects: "built",
};

export function isOutputKind(value: string): value is OutputKind {
  return OUTPUT_KINDS.includes(value as OutputKind);
}

export function defaultOutputKind(collection: OutputCollection): OutputKind {
  return defaultKinds[collection];
}
```

- [ ] **Step 4: Implement sync parsing and serialization**

Apply these exact interface changes:

```ts
// PublishIndexEntry and PublishedFrontmatter
outputKind: OutputKind;
```

In `evaluatePublishCandidate()`:

```ts
const rawOutputKind = getString(document.data, "publish_kind");
if (rawOutputKind && !isOutputKind(rawOutputKind)) {
  return { reason: "invalid-publish-kind" };
}
const outputKind = rawOutputKind || defaultOutputKind(publishTarget);
```

Add `"invalid-publish-kind"` to `CandidateSkipReason`, serialize `outputKind` in `toPublishedFrontmatter()`, include it in JSON manifest entries, and count the invalid reason as `summary.errors += 1`.

Extend the content schema with:

```ts
outputKind: z.enum(["thought", "learned", "built", "revised"]).optional(),
```

- [ ] **Step 5: Run targeted and full contract tests**

Run:

```bash
pnpm exec tsx --test tests/vault-sync.test.ts tests/phase1-structure.test.mjs tests/phase2-structure.test.mjs
pnpm check:publish
```

Expected: all tests pass and publish check reports 0 errors.

- [ ] **Step 6: Commit the contract**

```bash
git add src/lib/output-kind.ts src/content.config.ts scripts/utils/vault-index.ts scripts/utils/frontmatter.ts scripts/sync-from-vault.ts tests/vault-sync.test.ts
git commit -m "Add growth output publishing metadata"
```

---

### Task 3: Build the Public Output Model and Profile

**Files:**
- Create: `src/lib/output.ts`
- Create: `src/data/site-profile.ts`
- Create: `tests/output.test.ts`

**Interfaces:**
- Consumes: `SiteEntry[]`, optional `entry.data.outputKind`, public thread definitions, and `{ collection, id }` refs.
- Produces: `buildOutputGroups()`, `resolveThreads()`, `resolveFeaturedEntries()`, `getOutputKind()`, `getOutputDate()`, and `siteProfile`.

- [ ] **Step 1: Write failing output model tests**

Create `tests/output.test.ts` with fixtures that assert:

```ts
assert.equal(getOutputKind(blogEntry), "thought");
assert.equal(getOutputKind(revisedEntry), "revised");
assert.deepEqual(buildOutputGroups(entries, 2).map((group) => group.key), ["2026-07"]);
assert.deepEqual(resolveThreads(entries, definitions)[0].entries.map((entry) => entry.id), ["newer", "older"]);
assert.throws(() => resolveFeaturedEntries(entries, [{ collection: "blog", id: "missing" }]));
```

Include draft and unlisted entries and assert that output helpers exclude them even when callers pass them accidentally.

- [ ] **Step 2: Run the new test and confirm RED**

Run:

```bash
pnpm exec tsx --test tests/output.test.ts
```

Expected: FAIL with module-not-found for `src/lib/output.ts`.

- [ ] **Step 3: Implement `src/lib/output.ts`**

Use these exact public interfaces:

```ts
export interface PublicEntryRef {
  collection: SiteEntry["collection"];
  id: string;
}

export interface ThreadDefinition {
  id: string;
  label: string;
  description: string;
  series?: readonly string[];
  topics?: readonly string[];
  tags?: readonly string[];
}

export interface OutputGroup {
  key: string;
  label: string;
  entries: SiteEntry[];
}

export interface ResolvedThread extends ThreadDefinition {
  entries: SiteEntry[];
  latestDate: Date;
}
```

Implement:

```ts
export function getOutputKind(entry: SiteEntry): OutputKind;
export function getOutputDate(entry: SiteEntry): Date;
export function getPrimaryTopic(entry: SiteEntry): string;
export function buildOutputGroups(entries: readonly SiteEntry[], limit?: number): OutputGroup[];
export function resolveThreads(entries: readonly SiteEntry[], definitions: readonly ThreadDefinition[]): ResolvedThread[];
export function resolveFeaturedEntries(entries: readonly SiteEntry[], refs: readonly PublicEntryRef[]): SiteEntry[];
```

Rules: call `isPublicEntry()` internally; sort by `updatedDate ?? pubDate`, then `collection`, then `id`; group by `YYYY-MM`; format labels with `zh-CN`; thread match is OR across configured series/topic/tag selectors; featured refs throw if missing or non-public.

- [ ] **Step 4: Create the explicit public profile**

Create `src/data/site-profile.ts` with:

```ts
export const siteProfile = {
  name: "Soce1lo",
  eyebrow: "SOCE1LO / GROWTH OUTPUT LOG",
  title: "记录我如何理解、学习与构建。",
  description:
    "这里是我的知识管道的公开输出端。我把经历中的思考、学到的技术和做过的项目，整理成可复用、可追踪的长期记录。",
  now: {
    label: "NOW / 当前关注",
    text: "正在把个人知识系统整理成可持续的成长输出管道。",
    updated: "2026-07-10",
  },
  boundary: "输入留在私人系统，输出经过选择后公开。",
  threads: [
    {
      id: "knowledge-systems",
      label: "知识系统",
      description: "本地知识、迁移、Agent 派生层与公开发布。",
      series: ["KnowledgeVault 实践"],
      topics: ["Obsidian", "LLM Wiki"],
      tags: ["knowledge-management"],
    },
  ],
  featured: [
    { collection: "blog", id: "logseq-to-obsidian-migration" },
    { collection: "blog", id: "llm-wiki-derived-layer" },
    { collection: "blog", id: "obsidian-local-markdown-knowledge-vault" },
  ],
} as const;
```

Use `satisfies` against a typed `SiteProfile` interface so refs and thread definitions remain checked without widening literal values.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm exec tsx --test tests/output.test.ts
pnpm exec astro check
```

Expected: all output tests pass and Astro reports 0 errors.

Commit:

```bash
git add src/lib/output.ts src/data/site-profile.ts tests/output.test.ts
git commit -m "Add public growth output model"
```

---

### Task 4: Apply Soce1lo Branding, Routes, RSS, and Public Content Boundaries

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/notes/index.astro`
- Modify: `src/pages/projects/index.astro`
- Modify: `src/pages/blog/[...slug].astro`
- Modify: `src/pages/notes/[...slug].astro`
- Modify: `src/pages/projects/[...slug].astro`
- Modify: `src/pages/tags/index.astro`
- Modify: `src/pages/404.astro`
- Modify: `src/lib/search.ts`
- Modify: `src/pages/rss.xml.js`
- Modify: `src/content/blog/welcome-to-blogsite.md`
- Modify: `src/content/notes/content-boundaries.md`
- Modify: `src/content/projects/blogsite-v1.md`
- Test: `tests/theme-render.test.ts`

**Interfaces:**
- Consumes: `siteProfile`, `getOutputDate()`, public entries from all three collections, existing `withBase()`.
- Produces: Soce1lo shell, 思考/学习/项目 labels, aggregate RSS, and unlisted starter pages.

- [ ] **Step 1: Replace old structural assertions with failing brand/RSS assertions**

In `tests/theme-render.test.ts`, remove assertions that require `.home-intro`, `.recent-stream`, `.collection-index`, and exactly 3 recent entries. Add assertions for:

```ts
assert.match(layout, />Soce1lo</);
assert.match(layout, />思考</);
assert.match(layout, />学习</);
assert.match(layout, /输入留在私人系统，输出经过选择后公开。/);
assert.match(tagsPage, /<h1>主题<\/h1>/);
assert.match(notFound, /浏览思考/);
assert.match(rssPage, /getCollection\("notes"\)/);
assert.match(rssPage, /getCollection\("projects"\)/);
```

Build once and assert `dist/rss.xml` includes a real Vault-synced blog title but excludes `欢迎来到 BlogSite`、`公开内容边界`、`BlogSite V1`.

- [ ] **Step 2: Run theme tests and confirm RED**

```bash
pnpm exec tsx --test tests/theme-render.test.ts
```

Expected: FAIL on old BlogSite brand, missing aggregate RSS, and public starter entries.

- [ ] **Step 3: Update the shell and route copy**

Set BaseLayout defaults to:

```ts
title = "Soce1lo";
description = "Soce1lo 的成长输出日志：记录思考、技术学习与项目实践。";
const pageTitle = title === "Soce1lo" ? title : `${title} | Soce1lo`;
```

Render `Soce1lo / 成长输出日志`; use navigation labels 思考、学习、项目、主题、关于; update RSS alternate title and footer boundary copy while retaining existing routes and JS behavior.

Update collection page titles/descriptions, detail `sectionLabel` values, search section labels, tag page title/copy, and 404 actions to 思考、学习、项目、主题. Keep every route unchanged.

- [ ] **Step 4: Aggregate RSS and unlist starter content**

In RSS, load all three collections with `Promise.all`, merge them, filter with `isPublicEntry`, sort by `getOutputDate`, and generate links using each entry collection.

Change exactly these frontmatter values:

```yaml
visibility: unlisted
```

in the three starter Markdown files. Do not delete their detail routes.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm exec tsx --test tests/theme-render.test.ts
pnpm check:publish
pnpm build
```

Expected: tests pass; RSS contains all public collections; starter entries do not appear in lists or RSS; build has 0 errors.

Commit:

```bash
git add src/layouts/BaseLayout.astro src/pages/blog src/pages/notes src/pages/projects src/pages/tags/index.astro src/pages/404.astro src/pages/rss.xml.js src/lib/search.ts src/content/blog/welcome-to-blogsite.md src/content/notes/content-boundaries.md src/content/projects/blogsite-v1.md tests/theme-render.test.ts
git commit -m "Rebrand public output as Soce1lo"
```

---

### Task 5: Build the Growth Output Home and About Experience

**Files:**
- Create: `src/components/OutputLog.astro`
- Create: `src/components/LongThreads.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `public/favicon.svg`
- Test: `tests/theme-render.test.ts`

**Interfaces:**
- Consumes: `siteProfile`, `OutputGroup[]`, `ResolvedThread[]`, featured `SiteEntry[]`, and `withBase()`.
- Produces: Identity/NOW, chronological Output Log, Long Threads, Selected, Archive, public pipeline About page, Trace visual identity.

- [ ] **Step 1: Write failing page-structure tests**

Add exact source assertions for:

```ts
assert.match(home, /siteProfile\.title/);
assert.match(home, /<OutputLog/);
assert.match(home, /<LongThreads/);
assert.match(home, /class="home-now"/);
assert.doesNotMatch(home, /homeStats|公开内容计数|collection-index/);
assert.match(about, /长期建设者/);
assert.match(about, /研究型工程师/);
assert.match(about, /INTJ/);
assert.match(about, /捕捉/);
assert.match(about, /公开什么/);
```

Add CSS assertions for `.output-log`, `.output-log__item`, `.output-log__marker`, `.long-threads`, `.home-now`, and reduced-motion coverage.

- [ ] **Step 2: Run theme tests and confirm RED**

```bash
pnpm exec tsx --test tests/theme-render.test.ts
```

Expected: FAIL because new components and selectors do not exist.

- [ ] **Step 3: Implement focused components**

`OutputLog.astro` props:

```ts
interface Props {
  groups: OutputGroup[];
}
```

Render an `<ol class="output-log">` with grouped `<time>`, a decorative marker, `THOUGHT / LEARNED / BUILT / REVISED`, linked title, description, and primary topic. All URLs must use `withBase()`.

`LongThreads.astro` props:

```ts
interface Props {
  threads: ResolvedThread[];
}
```

Render nothing for an empty array. Each thread shows label, description, latest output date, count, and up to 3 linked outputs.

- [ ] **Step 4: Replace the homepage**

In `index.astro`:

```ts
const entries: SiteEntry[] = [...blog, ...notes, ...projects];
const outputGroups = buildOutputGroups(entries, 8);
const threads = resolveThreads(entries, siteProfile.threads);
const featured = resolveFeaturedEntries(entries, siteProfile.featured);
```

Render, in order: `.growth-hero`, `.home-now`, `.output-section`, `.threads-section` when non-empty, `.selected-section` when non-empty, `.archive-links`. Do not render collection totals or starter content.

- [ ] **Step 5: Replace About copy with the public pipeline**

Use semantic sections for:

1. `关于 Soce1lo` — 长期建设者、研究型工程师、INTJ。
2. `我如何工作` — 独立判断、结构化理解、长期维护、可验证结果。
3. `知识如何抵达这里` — 捕捉、复盘、加工、选择、发布。
4. `公开什么` and `不公开什么` — authorized outputs vs Daily/private/intermediate content.
5. RSS action.

Do not render absolute paths or private filenames.

- [ ] **Step 6: Implement Trace styling and favicon**

Add only layout tokens required by the new design, including:

```css
--output-date-width: 7rem;
--output-marker-size: 0.625rem;
--output-spine-offset: 0.3125rem;
--home-now-width: 18rem;
```

Use existing semantic colors. The output spine uses `var(--rule)` and markers use `var(--accent)`; hover fills the hollow marker. At `48rem`, stack hero/NOW and move dates above entries. At `30rem`, preserve at least 40px targets. Reduced motion removes marker transitions.

Replace the favicon path with a white `S` glyph on the existing Signal-compatible green/teal surface; no additional colors outside the SVG asset.

- [ ] **Step 7: Verify and commit**

Run:

```bash
pnpm exec tsx --test tests/output.test.ts tests/theme-render.test.ts
pnpm check:publish
pnpm build
git diff --check
```

Expected: all tests and build pass; no color literal leaks outside tokens; no whitespace errors.

Commit:

```bash
git add src/components/OutputLog.astro src/components/LongThreads.astro src/pages/index.astro src/pages/about.astro src/styles/tokens.css src/styles/global.css public/favicon.svg tests/theme-render.test.ts
git commit -m "Build Soce1lo growth output experience"
```

---

### Task 6: Documentation, Visual QA, and Full Completion Audit

**Files:**
- Modify: `README.md`
- Evidence only, do not commit: `output/playwright/soce1lo-growth-output-log/**`

**Interfaces:**
- Consumes: completed static site and all automated gates.
- Produces: current repository documentation plus authoritative desktop/mobile light/dark verification evidence.

- [ ] **Step 1: Update README to current public identity**

Replace obsolete `BlogSite / Tone-inspired` language with:

```md
# Soce1lo

Soce1lo 的成长输出日志，是 Obsidian KnowledgeVault 经过人工选择和发布门禁后的公开输出端。
```

Document navigation semantics 思考/学习/项目, aggregate RSS, optional `publish_kind`, and retain all privacy, preview-sync, GitHub Actions, and Vault read-only instructions.

- [ ] **Step 2: Run all authoritative automated gates**

Run:

```bash
pnpm test
pnpm check:publish
pnpm build
git diff --check
git status --short --branch
```

Expected: zero failed tests; `check:publish` errors=0; Astro 0 errors/warnings/hints; whitespace check clean; only intended README or screenshot artifacts remain.

- [ ] **Step 3: Start a production preview with Pages base path**

Run:

```bash
BASE_PATH=/BlogSite pnpm build
BASE_PATH=/BlogSite pnpm preview --host 127.0.0.1 --port 4322
```

Expected: preview is available at `http://127.0.0.1:4322/BlogSite/`.

- [ ] **Step 4: Capture visual evidence**

Create `output/playwright/soce1lo-growth-output-log/` and capture light/dark screenshots at 390×1200, 768×1100, and 1440×1100 for:

- `/BlogSite/`
- `/BlogSite/about/`
- `/BlogSite/blog/`
- `/BlogSite/notes/`
- `/BlogSite/projects/`
- `/BlogSite/blog/logseq-to-obsidian-migration/`

Expected: 36 screenshots, no horizontal overflow, no console error, and no page error.

- [ ] **Step 5: Inspect representative screenshots and interactions**

Inspect at minimum homepage light/dark at 390 and 1440, About at 390 and 1440, and article at 390. Verify theme switch, search open/close/focus restore, RSS response, tags anchor, and base-path links.

Expected: within five seconds the homepage communicates Soce1lo, NOW, and recent outputs; the growth spine remains readable on mobile; empty 学习/项目 pages are intentional and calm.

- [ ] **Step 6: Commit documentation and final fixes**

```bash
git add README.md
git commit -m "Document Soce1lo public output workflow"
```

If visual QA required code fixes, stage those exact files with README and describe the fixes in the commit body. Do not add screenshot artifacts.

- [ ] **Step 7: Final current-state audit**

Re-run:

```bash
pnpm test
pnpm check:publish
pnpm build
git diff --check
git status --short --branch
```

Expected: every requirement in the design spec has direct test, build, rendered page, or screenshot evidence; the worktree is clean; the Vault remains unchanged.
