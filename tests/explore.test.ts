import assert from "node:assert/strict";
import test from "node:test";
import type { SiteEntry } from "../src/lib/content";
import {
  buildExploreItems,
  filterExploreItems,
  readExploreFilters,
  writeExploreFilters,
} from "../src/lib/explore";

function makeEntry(
  collection: SiteEntry["collection"],
  id: string,
  date: string,
  data: Partial<SiteEntry["data"]> = {},
): SiteEntry {
  return {
    collection,
    id,
    body: "private raw body",
    data: {
      title: id,
      description: "公开摘要",
      pubDate: new Date(date),
      draft: false,
      category: "工程记录",
      tags: [],
      visibility: "public",
      sourceVaultPath: `Private/${id}.md`,
      ...data,
    },
  } as SiteEntry;
}

test("探索索引排除草稿和非列出条目，仅保留公开投影", () => {
  const items = buildExploreItems([
    makeEntry("blog", "public-note", "2026-09-01", { topic: "公开主题" }),
    makeEntry("notes", "draft-marker", "2026-09-02", { draft: true }),
    makeEntry("projects", "unlisted-marker", "2026-09-03", { visibility: "unlisted" }),
  ]);

  assert.deepEqual(items.map((item) => item.path), ["blog/public-note/"]);
  assert.doesNotMatch(JSON.stringify(items), /draft-marker|unlisted-marker|Private\/|sourceVaultPath|raw body/);
});

test("按类型、主题、年份和跨字段关键词组合筛选，兼容全角字符", () => {
  const data = {
    title: "ＳＴＭ３２ 时钟",
    description: "基础配置",
    topic: "嵌入式",
    series: "驱动实践",
    tags: ["I²C"],
  };
  const items = buildExploreItems([
    makeEntry("notes", "clock", "2026-01-02", data),
    makeEntry("notes", "older", "2025-01-02", data),
    makeEntry("blog", "essay", "2026-01-03", data),
    makeEntry("notes", "different-topic", "2026-01-04", { ...data, topic: "编程" }),
    makeEntry("notes", "different-summary", "2026-01-05", { ...data, description: "外设" }),
    makeEntry("projects", "fallback-topic", "2026-01-06", { series: "嵌入式", tags: ["STM32"] }),
  ]);
  const filters = readExploreFilters(new URLSearchParams({
    q: " stm32　配置 嵌入式 i2c 驱动 ",
    collection: "notes",
    topic: "嵌入式",
    year: "2026",
  }));

  assert.deepEqual(filterExploreItems(items, filters).map((item) => item.path), ["notes/clock/"]);
  assert.equal(items.find((item) => item.path === "projects/fallback-topic/")?.topic, "嵌入式");
  assert.deepEqual(filterExploreItems(items, { ...filters, q: "不存在" }), []);
});

test("两种排序使用首次发布时间，同日顺序稳定且不修改输入", () => {
  const items = buildExploreItems([
    makeEntry("notes", "new", "2026-09-02"),
    makeEntry("notes", "tie", "2026-09-01"),
    makeEntry("blog", "old", "2025-12-31", { updatedDate: new Date("2026-09-03") }),
    makeEntry("blog", "tie", "2026-09-01"),
  ]);
  const defaults = readExploreFilters(new URLSearchParams());
  const paths = (sort: "newest" | "oldest") =>
    filterExploreItems(items, { ...defaults, sort }).map((item) => item.path);

  assert.deepEqual(paths("newest"), ["notes/new/", "blog/tie/", "notes/tie/", "blog/old/"]);
  assert.deepEqual(paths("oldest"), ["blog/old/", "blog/tie/", "notes/tie/", "notes/new/"]);
  assert.deepEqual(items.map((item) => item.path), ["notes/new/", "notes/tie/", "blog/old/", "blog/tie/"]);
});

test("筛选状态可经 URL 往返并保留站点基路径与其他参数", () => {
  const url = new URL("https://example.test/BlogSite/explore/?ref=home#archive");
  const defaults = readExploreFilters(new URLSearchParams());
  const filters = {
    ...defaults,
    q: "知识 + C & STM32",
    collection: "notes",
    topic: "C++ / 嵌入式",
    year: "2026",
    sort: "oldest",
  } as const;
  writeExploreFilters(url, filters);

  assert.equal(url.pathname, "/BlogSite/explore/");
  assert.equal(url.hash, "#archive");
  assert.equal(url.searchParams.get("ref"), "home");
  assert.deepEqual(readExploreFilters(new URL(url.href).searchParams), filters);

  writeExploreFilters(url, defaults);
  assert.equal(url.search, "?ref=home");
  assert.deepEqual(readExploreFilters(new URLSearchParams("collection=constructor&sort=unknown")), defaults);
});
