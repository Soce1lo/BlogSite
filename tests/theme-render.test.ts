import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { SiteEntry } from "../src/lib/content";
import { buildSearchItems, serializeForInlineJson } from "../src/lib/search";
import { buildTagGroups } from "../src/lib/tags";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

function makeEntry(
  collection: SiteEntry["collection"],
  id: string,
  tags: string[],
  pubDate: string,
  options: { draft?: boolean; visibility?: "public" | "unlisted" } = {},
): SiteEntry {
  return {
    collection,
    id,
    data: {
      title: id,
      description: `${id} description`,
      pubDate: new Date(pubDate),
      draft: options.draft ?? false,
      category: "测试",
      tags,
      visibility: options.visibility ?? "public",
      sourceVaultPath: `fixtures/${id}.md`,
    },
  } as SiteEntry;
}

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

test("标签聚合只包含公开条目并生成稳定锚点", () => {
  const groups = buildTagGroups([
    makeEntry("notes", "newer", ["Astro", "中文标签"], "2026-07-03"),
    makeEntry("blog", "older", ["Astro"], "2026-07-01"),
    makeEntry("projects", "draft", ["Astro"], "2026-07-04", { draft: true }),
    makeEntry("notes", "unlisted", ["private"], "2026-07-05", { visibility: "unlisted" }),
  ]);

  assert.deepEqual(
    groups.map(({ name, id }) => ({ name, id })),
    [
      { name: "Astro", id: "tag-astro" },
      { name: "中文标签", id: "tag-%E4%B8%AD%E6%96%87%E6%A0%87%E7%AD%BE" },
    ],
  );
  assert.deepEqual(groups[0].entries.map((entry) => entry.id), ["newer", "older"]);
});

test("标签目录渲染公开分组且内容列表链接到对应锚点", async () => {
  const tagsPagePath = path.join(projectRoot, "src/pages/tags/index.astro");
  assert.equal(existsSync(tagsPagePath), true, "缺少标签目录页面");

  const tagsPage = await readProjectFile("src/pages/tags/index.astro");
  const contentList = await readProjectFile("src/components/ContentList.astro");
  assert.match(tagsPage, /buildTagGroups/);
  assert.match(tagsPage, /class="tag-directory"/);
  assert.match(tagsPage, /id=\{group\.id\}/);
  assert.match(contentList, /tagId\(tag\)/);
  assert.match(contentList, /withBase\("tags\/"\)/);
});

test("首页、标签和 404 提供 Ink & Signal 信息结构", async () => {
  const notFoundPath = path.join(projectRoot, "src/pages/404.astro");
  assert.equal(existsSync(notFoundPath), true, "缺少 404 页面");

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

test("文章布局隔离页面标题和正文 prose，避免同步正文首个 H1 重复显示", async () => {
  const layout = await readProjectFile("src/layouts/ContentLayout.astro");
  const css = await readProjectFile("src/styles/global.css");

  assert.match(layout, /<article class="content-detail">/);
  assert.match(layout, /<div class="prose content-body">/);
  assert.match(css, /\.content-body\s*>\s*h1:first-child\s*\{/);
  assert.match(css, /\.content-body\s*>\s*h1:first-child[\s\S]*display:\s*none/);
});

test("基础布局提供 Tone 风格的搜索面板和主题切换入口", async () => {
  const layout = await readProjectFile("src/layouts/BaseLayout.astro");
  const css = await readProjectFile("src/styles/global.css");

  assert.match(layout, /id="site-search-data"/);
  assert.match(layout, /data-search-open/);
  assert.match(layout, /data-theme-toggle/);
  assert.match(css, /\.search-panel/);
  assert.match(css, /\[data-theme="dark"\]/);
});

test("内容详情页使用 render headings 生成文章目录 rail", async () => {
  const layout = await readProjectFile("src/layouts/ContentLayout.astro");
  const css = await readProjectFile("src/styles/global.css");
  const baseLayout = await readProjectFile("src/layouts/BaseLayout.astro");

  assert.match(layout, /headings\?:/);
  assert.match(layout, /class="content-toc"/);
  assert.match(layout, /href={`#\$\{heading\.slug\}`}/);
  assert.match(layout, /data-toc-link/);
  assert.match(baseLayout, /data-reading-progress/);
  assert.match(css, /\.content-toc/);
  assert.match(css, /\.reading-progress/);
  assert.match(css, /\.content-toc__link\.is-active/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*var\(--content-width\)\)\s*minmax\(12rem,\s*16rem\)/);

  for (const route of [
    "src/pages/blog/[...slug].astro",
    "src/pages/notes/[...slug].astro",
    "src/pages/projects/[...slug].astro",
  ]) {
    const page = await readProjectFile(route);
    assert.match(page, /const \{ Content, headings \} = await render\(entry\);/);
    assert.match(page, /<ContentLayout entry=\{entry\} sectionLabel="[^"]+" headings=\{headings\}>/);
  }
});

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

test("搜索索引只包含公开内容并安全序列化到页面脚本", () => {
  const items = buildSearchItems([
    {
      collection: "notes",
      id: "newer",
      data: {
        title: "较新的公开笔记",
        description: "可进入站内搜索。",
        pubDate: new Date("2026-07-02"),
        draft: false,
        category: "测试",
        tags: ["search"],
        visibility: "public",
        sourceVaultPath: "Notes/Newer.md",
      },
    },
    {
      collection: "blog",
      id: "draft",
      data: {
        title: "草稿",
        description: "不得进入搜索。",
        pubDate: new Date("2026-07-03"),
        draft: true,
        category: "测试",
        tags: [],
        visibility: "public",
        sourceVaultPath: "Blog/Draft.md",
      },
    },
    {
      collection: "projects",
      id: "older",
      data: {
        title: "</script><script>alert(1)</script>",
        description: "测试内联 JSON 转义。",
        pubDate: new Date("2026-07-01"),
        draft: false,
        category: "测试",
        tags: [],
        visibility: "public",
        sourceVaultPath: "Projects/Older.md",
      },
    },
  ]);

  assert.deepEqual(items.map((item) => item.path), ["notes/newer/", "projects/older/"]);
  const serialized = serializeForInlineJson(items);
  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.match(serialized, /\\u003C\/script\\u003E/);
});
