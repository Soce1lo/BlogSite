import assert from "node:assert/strict";
import test from "node:test";
import type { SiteEntry } from "../src/lib/content";
import { resolveRelatedReading } from "../src/lib/related";

interface EntryOptions {
  series?: string;
  seriesOrder?: number;
  topic?: string;
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
      sourceVaultPath: `private/${id}.md`,
      ...(options.series ? { series: options.series } : {}),
      ...(options.seriesOrder !== undefined ? { seriesOrder: options.seriesOrder } : {}),
      ...(options.topic ? { topic: options.topic } : {}),
    },
  } as SiteEntry;
}

test("延伸阅读只从公开集合取条目，并优先同系列再取同主题", () => {
  const current = makeEntry("blog", "current", "2026-08-24", {
    series: "KnowledgeVault 实践",
    seriesOrder: 80,
    topic: "Obsidian",
  });
  const entries = [
    current,
    makeEntry("blog", "series-later", "2026-08-27", {
      series: "KnowledgeVault 实践",
      seriesOrder: 90,
      topic: "Obsidian",
    }),
    makeEntry("notes", "series-earlier", "2026-07-01", {
      series: "KnowledgeVault 实践",
      seriesOrder: 20,
      topic: "Obsidian",
    }),
    makeEntry("projects", "topic-only", "2026-08-26", { topic: "Obsidian" }),
    makeEntry("blog", "unrelated", "2026-08-28", { topic: "家庭网络" }),
    makeEntry("blog", "draft-series", "2026-08-29", {
      series: "KnowledgeVault 实践",
      seriesOrder: 10,
      topic: "Obsidian",
      draft: true,
    }),
    makeEntry("notes", "unlisted-topic", "2026-08-30", {
      topic: "Obsidian",
      visibility: "unlisted",
    }),
  ];

  const related = resolveRelatedReading(current, entries);

  assert.deepEqual(related.map((item) => item.entry.id), [
    "series-earlier",
    "series-later",
    "topic-only",
  ]);
  assert.deepEqual(related[0].reasons, ["series", "topic"]);
  assert.deepEqual(related[2].reasons, ["topic"]);
});

test("延伸阅读排除当前条目，并在当前条目未公开时不生成", () => {
  const current = makeEntry("blog", "current", "2026-08-24", {
    series: "KnowledgeVault 实践",
    topic: "Obsidian",
  });
  const related = makeEntry("notes", "related", "2026-08-23", {
    series: "KnowledgeVault 实践",
  });

  assert.deepEqual(
    resolveRelatedReading(current, [current, related], 1).map((item) => item.entry.id),
    ["related"],
  );

  const unlistedCurrent = makeEntry("blog", "unlisted-current", "2026-08-24", {
    series: "KnowledgeVault 实践",
    topic: "Obsidian",
    visibility: "unlisted",
  });
  assert.deepEqual(resolveRelatedReading(unlistedCurrent, [unlistedCurrent, related]), []);
});
