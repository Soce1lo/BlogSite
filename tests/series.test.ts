import assert from "node:assert/strict";
import test from "node:test";
import type { SiteEntry } from "../src/lib/content";
import { resolveSeriesNavigation } from "../src/lib/series";

interface EntryOptions {
  series?: string;
  seriesOrder?: number;
  draft?: boolean;
  visibility?: "public" | "unlisted";
}

function makeEntry(
  collection: SiteEntry["collection"],
  id: string,
  pubDate: string,
  options: EntryOptions = {},
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
      tags: [],
      visibility: options.visibility ?? "public",
      sourceVaultPath: `fixtures/${id}.md`,
      ...(options.series ? { series: options.series } : {}),
      ...(options.seriesOrder !== undefined ? { seriesOrder: options.seriesOrder } : {}),
    },
  } as SiteEntry;
}

test("合成系列内容按 seriesOrder 排序并解析上一篇与下一篇", () => {
  const current = makeEntry("blog", "middle", "2026-07-02", {
    series: "KnowledgeVault 实践",
    seriesOrder: 20,
  });
  const entries = [
    makeEntry("blog", "last", "2026-07-03", {
      series: "KnowledgeVault 实践",
      seriesOrder: 30,
    }),
    current,
    makeEntry("notes", "first", "2026-07-01", {
      series: "KnowledgeVault 实践",
      seriesOrder: 10,
    }),
    makeEntry("blog", "unordered", "2026-07-04", {
      series: "KnowledgeVault 实践",
    }),
    makeEntry("blog", "other-series", "2026-07-01", {
      series: "另一个系列",
      seriesOrder: 1,
    }),
    makeEntry("blog", "draft", "2026-07-01", {
      series: "KnowledgeVault 实践",
      seriesOrder: 15,
      draft: true,
    }),
    makeEntry("blog", "unlisted", "2026-07-01", {
      series: "KnowledgeVault 实践",
      seriesOrder: 25,
      visibility: "unlisted",
    }),
  ];

  const navigation = resolveSeriesNavigation(current, entries);

  assert.ok(navigation);
  assert.equal(navigation.name, "KnowledgeVault 实践");
  assert.deepEqual(navigation.entries.map((entry) => entry.id), [
    "first",
    "middle",
    "last",
    "unordered",
  ]);
  assert.equal(navigation.currentIndex, 1);
  assert.equal(navigation.previous?.id, "first");
  assert.equal(navigation.next?.id, "last");
});

test("没有系列或当前条目未公开时不生成专题导航", () => {
  const standalone = makeEntry("blog", "standalone", "2026-07-01");
  assert.equal(resolveSeriesNavigation(standalone, [standalone]), undefined);

  const unlisted = makeEntry("blog", "unlisted", "2026-07-01", {
    series: "KnowledgeVault 实践",
    seriesOrder: 10,
    visibility: "unlisted",
  });
  assert.equal(resolveSeriesNavigation(unlisted, [unlisted]), undefined);
});
