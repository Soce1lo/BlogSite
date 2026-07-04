import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { buildSearchItems, serializeForInlineJson } from "../src/lib/search";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

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
