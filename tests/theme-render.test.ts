import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { SiteEntry } from "../src/lib/content";
import { buildSearchItems, serializeForInlineJson } from "../src/lib/search";
import { buildTagGroups, tagId } from "../src/lib/tags";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

async function discoverDisplayFiles(): Promise<string[]> {
  const files: string[] = [];
  const roots = [
    { directory: "src/styles", extension: ".css" },
    { directory: "src/layouts", extension: ".astro" },
    { directory: "src/components", extension: ".astro" },
    { directory: "src/pages", extension: ".astro" },
  ];

  const visit = async (directory: string, extension: string): Promise<void> => {
    const entries = await readdir(path.join(projectRoot, directory), { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(relativePath, extension);
      } else if (
        entry.isFile() &&
        relativePath.endsWith(extension) &&
        relativePath !== "src/styles/tokens.css"
      ) {
        files.push(relativePath);
      }
    }
  };

  for (const root of roots) {
    await visit(root.directory, root.extension);
  }
  return files.sort();
}

function extractCssBlock(css: string, marker: string): string {
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `缺少 CSS 块：${marker}`);
  const openingBrace = css.indexOf("{", markerIndex);
  assert.notEqual(openingBrace, -1, `CSS 块缺少起始括号：${marker}`);

  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") {
      depth += 1;
    } else if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return css.slice(openingBrace + 1, index);
      }
    }
  }

  assert.fail(`CSS 块缺少结束括号：${marker}`);
}

function readLightPaletteColor(tokens: string, token: string): string {
  const match = tokens.match(
    new RegExp(`${token}:\\s*light-dark\\((#[0-9a-f]{6}),\\s*#[0-9a-f]{6}\\)`, "i"),
  );
  assert.ok(match, `缺少 ${token} 的 light-dark 色值`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((value) => Number.parseInt(value, 16) / 255);
  assert.ok(channels && channels.length === 3, `无法解析颜色：${hex}`);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
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
    "--color-annotation",
    "--font-display",
    "--text-base",
    "--leading-reading",
    "--space-6",
    "--rule-width",
    "--radius-md",
    "--shadow-float",
    "--code-background",
    "--toc-width",
  ]) {
    assert.match(tokens, new RegExp(`${token}:`));
  }
  assert.match(tokens, /light-dark\(/);
  assert.match(tokens, /--tracking-tight:\s*0;/);
  assert.doesNotMatch(tokens, /vw/);
});

test("亮色 fog 与 signal 在 paper 上达到 WCAG AA 正文对比度", async () => {
  const tokens = await readProjectFile("src/styles/tokens.css");
  const paper = readLightPaletteColor(tokens, "--palette-paper");

  for (const token of ["--palette-fog", "--palette-signal"]) {
    const ratio = contrastRatio(readLightPaletteColor(tokens, token), paper);
    assert.ok(ratio >= 4.5, `${token} 对 paper 的对比度仅 ${ratio.toFixed(2)}:1`);
  }
});

test("展示层颜色字面量只允许出现在 tokens.css", async () => {
  const files = await discoverDisplayFiles();
  const colorLiteral = /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i;

  assert.ok(files.includes("src/pages/404.astro"), "递归扫描未发现顶层页面");
  assert.ok(files.includes("src/pages/tags/index.astro"), "递归扫描未发现嵌套页面");
  assert.ok(!files.includes("src/styles/tokens.css"), "颜色 token 文件必须排除");

  for (const file of files) {
    assert.doesNotMatch(await readProjectFile(file), colorLiteral, file);
  }
});

test("标签聚合只包含公开条目并生成稳定锚点", () => {
  const groups = buildTagGroups([
    makeEntry("notes", "newer", [" Astro ", "中文标签"], "2026-07-03"),
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
  assert.equal(tagId(" Astro "), groups[0].id, "列表标签链接必须与目录分组使用相同锚点");
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

test("首页最近更新只展示设计规范要求的三条内容", async () => {
  const home = await readProjectFile("src/pages/index.astro");

  assert.match(
    home,
    /const recentEntries:[\s\S]*?\.sort\(sortNewestFirst\)[\s\S]*?\.slice\(0,\s*3\);/,
  );
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

test("搜索对话框恢复触发焦点并在可见控件间循环 Tab", async () => {
  const layout = await readProjectFile("src/layouts/BaseLayout.astro");
  const openSearch = extractCssBlock(layout, "const openSearch = () => {");
  const closeSearch = extractCssBlock(layout, "const closeSearch = () => {");

  assert.match(layout, /let lastFocusedElement\s*=\s*null;/);
  assert.match(openSearch, /lastFocusedElement\s*=\s*document\.activeElement/);
  assert.match(
    closeSearch,
    /searchPanel\.hidden\s*=\s*true;[\s\S]*lastFocusedElement\?\.focus\(\);/,
  );
  assert.match(layout, /searchPanel\.querySelectorAll\(searchFocusableSelector\)/);
  assert.match(layout, /event\.key\s*===\s*"Tab"/);
  assert.match(layout, /event\.shiftKey/);
  assert.match(layout, /event\.preventDefault\(\)/);
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
  assert.match(
    css,
    /grid-template-columns:\s*minmax\(0,\s*var\(--content-width\)\)\s*minmax\(var\(--toc-min-width\),\s*var\(--toc-width\)\)/,
  );

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

test("reduced motion 不覆盖跳转正文链接的隐藏与聚焦状态", async () => {
  const css = await readProjectFile("src/styles/global.css");
  const reducedMotion = extractCssBlock(css, "@media (prefers-reduced-motion: reduce)");

  assert.doesNotMatch(reducedMotion, /\.skip-link/);
});

test("手机导航退出 sticky 并重设正文标题锚点偏移", async () => {
  const css = await readProjectFile("src/styles/global.css");
  const mobile = extractCssBlock(css, "@media (max-width: 30rem)");

  assert.match(mobile, /\.site-header\s*\{[\s\S]*?position:\s*static;/);
  assert.match(
    mobile,
    /\.prose h1,[\s\S]*?\.prose h6\s*\{[\s\S]*?scroll-margin-top:\s*var\(--space-4\);/,
  );
});

test("首页中文标题不使用拉丁字符宽度限制换行", async () => {
  const css = await readProjectFile("src/styles/global.css");
  const titleRule = extractCssBlock(css, ".home-intro h1 {");

  assert.doesNotMatch(titleRule, /max-width:\s*[\d.]+ch;/);
  assert.match(titleRule, /max-width:\s*100%;/);
});

test("集合计数与文章目录链接达到统一触控高度", async () => {
  const css = await readProjectFile("src/styles/global.css");
  const collectionCount = extractCssBlock(css, ".collection-row__count {");
  const tocLink = extractCssBlock(css, ".content-toc__link {");

  assert.match(collectionCount, /display:\s*inline-flex;/);
  assert.match(collectionCount, /align-items:\s*center;/);
  assert.match(collectionCount, /min-height:\s*var\(--control-height\);/);
  assert.match(tocLink, /display:\s*flex;/);
  assert.match(tocLink, /align-items:\s*center;/);
  assert.match(tocLink, /min-height:\s*var\(--control-height\);/);
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
