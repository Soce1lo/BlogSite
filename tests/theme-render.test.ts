import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { SiteEntry } from "../src/lib/content";
import { buildSearchItems, serializeForInlineJson } from "../src/lib/search";
import { prefixBaseInHtmlImageSources } from "../src/lib/site";
import { buildTagGroups, tagId } from "../src/lib/tags";

const projectRoot = path.resolve(import.meta.dirname, "..");
const execFileAsync = promisify(execFile);
let buildPromise: Promise<void> | undefined;

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

async function buildProject(): Promise<void> {
  buildPromise ??= execFileAsync("pnpm", ["build"], {
    cwd: projectRoot,
    maxBuffer: 10 * 1024 * 1024,
  }).then(() => undefined);
  await buildPromise;
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
  assert.match(tagsPage, /const tagCloud\s*=/);
  assert.match(tagsPage, /class="tag-cloud"/);
  assert.match(tagsPage, /class="tag-directory"/);
  assert.match(tagsPage, /id=\{group\.id\}/);
  assert.match(tagsPage, /href=\{`#\$\{group\.id\}`\}/);
  assert.match(contentList, /tagId\(tag\)/);
  assert.match(contentList, /withBase\("tags\/"\)/);
});

test("全站对外品牌与导航语义统一为 Soce1lo 成长输出", async () => {
  const notFoundPath = path.join(projectRoot, "src/pages/404.astro");
  assert.equal(existsSync(notFoundPath), true, "缺少 404 页面");

  const tags = await readProjectFile("src/pages/tags/index.astro");
  const notFound = await readProjectFile("src/pages/404.astro");
  const layout = await readProjectFile("src/layouts/BaseLayout.astro");
  const profile = await readProjectFile("src/data/site-profile.ts");
  const search = await readProjectFile("src/lib/search.ts");
  const blogIndex = await readProjectFile("src/pages/blog/index.astro");
  const notesIndex = await readProjectFile("src/pages/notes/index.astro");
  const projectsIndex = await readProjectFile("src/pages/projects/index.astro");
  const blogDetail = await readProjectFile("src/pages/blog/[...slug].astro");
  const notesDetail = await readProjectFile("src/pages/notes/[...slug].astro");

  assert.match(profile, /name: "Soce1lo"/);
  assert.match(profile, /输入留在私人系统，输出经过选择后公开。/);
  assert.match(layout, /title = siteProfile\.name/);
  assert.match(layout, /class="site-title"[^>]*>\{siteProfile\.name\}</);
  assert.match(layout, />成长输出日志</);
  assert.match(layout, />思考</);
  assert.match(layout, />学习</);
  assert.match(layout, /const isCurrentSection\s*=/);
  assert.match(layout, /aria-current=\{isCurrentSection\("blog"\) \? "page" : undefined\}/);
  assert.match(layout, /siteProfile\.boundary/);
  assert.match(blogIndex, /<h1>思考<\/h1>/);
  assert.match(notesIndex, /<h1>学习<\/h1>/);
  assert.match(projectsIndex, /<h1>项目<\/h1>/);
  assert.match(blogDetail, /sectionLabel="思考"/);
  assert.match(notesDetail, /sectionLabel="学习"/);
  assert.match(search, /blog: "思考"/);
  assert.match(search, /notes: "学习"/);
  assert.match(tags, /<h1>主题<\/h1>/);
  assert.match(tags, /class="tag-directory"/);
  assert.match(notFound, /返回首页/);
  assert.match(notFound, /浏览思考/);
  assert.match(notFound, /查看主题/);
  assert.match(layout, /withBase\("tags\/"\)/);
});

test("RSS 聚合三个公开集合并排除 starter 内容", async () => {
  const rssPage = await readProjectFile("src/pages/rss.xml.js");
  assert.match(rssPage, /getCollection\("blog"\)/);
  assert.match(rssPage, /getCollection\("notes"\)/);
  assert.match(rssPage, /getCollection\("projects"\)/);
  assert.match(rssPage, /entry\.collection/);
  assert.match(rssPage, /\.sort\(sortNewestFirst\)/);
  assert.match(rssPage, /pubDate: getPublishedDate\(entry\)/);

  for (const starter of [
    "src/content/blog/welcome-to-blogsite.md",
    "src/content/notes/content-boundaries.md",
    "src/content/projects/blogsite-v1.md",
  ]) {
    assert.match(await readProjectFile(starter), /^visibility:\s*unlisted$/m, starter);
  }

  await buildProject();
  const rss = await readProjectFile("dist/rss.xml");
  assert.match(rss, /Soce1lo/);
  assert.match(rss, /从 Logseq 到 Obsidian/);
  assert.doesNotMatch(rss, /欢迎来到 BlogSite/);
  assert.doesNotMatch(rss, /公开内容边界/);
  assert.doesNotMatch(rss, /BlogSite V1/);
});

test("首页与 About 呈现 Soce1lo 的成长输出结构和公开管道", async () => {
  const outputLogPath = path.join(projectRoot, "src/components/OutputLog.astro");
  const longThreadsPath = path.join(projectRoot, "src/components/LongThreads.astro");
  assert.equal(existsSync(outputLogPath), true, "缺少 OutputLog 组件");
  assert.equal(existsSync(longThreadsPath), true, "缺少 LongThreads 组件");

  const home = await readProjectFile("src/pages/index.astro");
  const about = await readProjectFile("src/pages/about.astro");
  const outputLog = await readProjectFile("src/components/OutputLog.astro");
  const longThreads = await readProjectFile("src/components/LongThreads.astro");

  assert.match(home, /siteProfile\.title/);
  assert.match(home, /class="growth-hero"/);
  assert.match(home, /class="home-now"/);
  assert.match(home, /<OutputLog groups=\{outputGroups\}/);
  assert.match(home, /<LongThreads threads=\{threads\}/);
  assert.match(home, /class="selected-section"/);
  assert.match(home, /class="archive-links"/);
  assert.doesNotMatch(home, /homeStats|公开内容计数|collection-index/);
  assert.match(outputLog, /class="output-log"/);
  assert.match(outputLog, /class="output-log__marker"/);
  assert.match(outputLog, /getPublishedDate/);
  assert.match(outputLog, /getOutputKind/);
  assert.match(longThreads, /class="long-threads"/);
  assert.match(longThreads, /最近发布于/);

  assert.match(about, /关于 Soce1lo/);
  assert.match(about, /长期建设者/);
  assert.match(about, /研究型工程师/);
  assert.match(about, /INTJ/);
  assert.match(about, /知识如何抵达这里/);
  assert.match(about, /捕捉/);
  assert.match(about, /复盘/);
  assert.match(about, /公开什么/);
  assert.match(about, /不公开什么/);
  assert.doesNotMatch(about, /\/Users\//);
});

test("文章详情构建产物只暴露一个 canonical H1", async () => {
  await buildProject();
  const html = await readProjectFile("dist/blog/logseq-to-obsidian-migration/index.html");

  assert.equal(
    [...html.matchAll(/<h1(?:\s[^>]*)?>从 Logseq 到 Obsidian：迁移回顾<\/h1>/g)].length,
    1,
  );
});

test("文章正文公开图片继承 GitHub Pages base path", () => {
  const html = [
    '<p><img src="/images/article/picture.jpg" alt="公开图片"></p>',
    '<p><img src="relative.jpg" alt="相对图片"></p>',
    '<p><img src="https://example.com/external.jpg" alt="外部图片"></p>',
  ].join("");

  assert.equal(
    prefixBaseInHtmlImageSources(html, "/BlogSite"),
    [
      '<p><img src="/BlogSite/images/article/picture.jpg" alt="公开图片"></p>',
      '<p><img src="relative.jpg" alt="相对图片"></p>',
      '<p><img src="https://example.com/external.jpg" alt="外部图片"></p>',
    ].join(""),
  );
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

test("导航状态、搜索按钮和手机导航保持紧凑且可辨识", async () => {
  const css = await readProjectFile("src/styles/global.css");
  const controlButton = extractCssBlock(css, ".control-button {");
  const mobile = extractCssBlock(css, "@media (max-width: 30rem)");

  assert.match(css, /\.site-navigation > nav a\[aria-current="page"\]/);
  assert.match(controlButton, /white-space:\s*nowrap;/);
  assert.match(mobile, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/);
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
    assert.match(page, /<ContentLayout[\s\S]*entry=\{entry\}/);
    assert.match(page, /sectionLabel="[^"]+"/);
    assert.match(page, /headings=\{headings\}/);
  }
});

test("文章详情页自动渲染系列目录和上一篇下一篇导航", async () => {
  const component = await readProjectFile("src/components/SeriesNavigation.astro");
  const layout = await readProjectFile("src/layouts/ContentLayout.astro");
  const css = await readProjectFile("src/styles/global.css");

  assert.match(component, /class="series-navigation"/);
  assert.match(component, /seriesOrder/);
  assert.match(component, /aria-current="page"/);
  assert.match(component, /上一篇/);
  assert.match(component, /下一篇/);
  assert.match(component, /withBase\(/);
  assert.match(component, /entry\.collection/);
  assert.match(layout, /seriesNavigation\?: SeriesNavigation/);
  assert.match(layout, /SeriesNavigationComponent/);
  assert.match(css, /\.series-navigation/);
  assert.match(css, /\.series-navigation__pager/);

  for (const route of [
    "src/pages/blog/[...slug].astro",
    "src/pages/notes/[...slug].astro",
    "src/pages/projects/[...slug].astro",
  ]) {
    const page = await readProjectFile(route);
    assert.match(page, /resolveSeriesNavigation/);
    assert.match(page, /seriesNavigation=/);
  }
});

test("主题样式覆盖首页、列表、标签、404、阅读和 reduced motion", async () => {
  const css = await readProjectFile("src/styles/global.css");
  for (const selector of [
    ".growth-hero",
    ".home-now",
    ".output-log",
    ".output-log__item",
    ".output-log__marker",
    ".long-threads",
    ".selected-section",
    ".archive-links",
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
  assert.match(reducedMotion, /\.output-log__marker/);
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
  const titleRule = extractCssBlock(css, ".growth-hero h1 {");

  assert.doesNotMatch(titleRule, /max-width:\s*[\d.]+ch;/);
  assert.match(titleRule, /max-width:\s*100%;/);
});

test("档案入口与文章目录链接达到统一触控高度", async () => {
  const css = await readProjectFile("src/styles/global.css");
  const archiveLink = extractCssBlock(css, ".archive-links a {");
  const tocLink = extractCssBlock(css, ".content-toc__link {");

  assert.match(archiveLink, /display:\s*inline-flex;/);
  assert.match(archiveLink, /align-items:\s*center;/);
  assert.match(archiveLink, /min-height:\s*var\(--control-height\);/);
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
