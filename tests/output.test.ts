import assert from "node:assert/strict";
import test from "node:test";
import { getPublishedDate, type SiteEntry } from "../src/lib/content";
import {
  buildOutputGroups,
  getOutputKind,
  getPrimaryTopic,
  resolveFeaturedEntries,
  resolveThreads,
  type ThreadDefinition,
} from "../src/lib/output";

interface EntryOptions {
  updatedDate?: string;
  outputKind?: "thought" | "learned" | "built" | "revised";
  series?: string;
  topic?: string;
  tags?: string[];
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
      ...(options.updatedDate ? { updatedDate: new Date(options.updatedDate) } : {}),
      draft: options.draft ?? false,
      category: "测试",
      tags: options.tags ?? [],
      visibility: options.visibility ?? "public",
      sourceVaultPath: `fixtures/${id}.md`,
      ...(options.outputKind ? { outputKind: options.outputKind } : {}),
      ...(options.series ? { series: options.series } : {}),
      ...(options.topic ? { topic: options.topic } : {}),
    },
  } as SiteEntry;
}

test("输出类型使用显式值并按集合提供稳定缺省值", () => {
  assert.equal(getOutputKind(makeEntry("blog", "essay", "2026-07-01")), "thought");
  assert.equal(getOutputKind(makeEntry("notes", "note", "2026-07-01")), "learned");
  assert.equal(getOutputKind(makeEntry("projects", "project", "2026-07-01")), "built");
  assert.equal(
    getOutputKind(
      makeEntry("blog", "changed-mind", "2026-07-01", { outputKind: "revised" }),
    ),
    "revised",
  );
});

test("最近输出按首次发布时间排序，修订时间不改变位置", () => {
  const older = makeEntry("blog", "older", "2026-06-20");
  const revised = makeEntry("notes", "revised", "2026-07-05", {
    updatedDate: "2026-07-09",
  });
  const newest = makeEntry("projects", "newest", "2026-07-10");
  const draft = makeEntry("blog", "draft", "2026-07-11", { draft: true });
  const unlisted = makeEntry("notes", "unlisted", "2026-07-12", {
    visibility: "unlisted",
  });

  assert.equal(getPublishedDate(revised).toISOString().slice(0, 10), "2026-07-05");
  const groups = buildOutputGroups([older, revised, newest, draft, unlisted], 2);

  assert.deepEqual(groups.map((group) => group.key), ["2026-07"]);
  assert.deepEqual(groups[0].entries.map((entry) => entry.id), ["newest", "revised"]);
  assert.equal(groups[0].label, "2026年7月");
});

test("长期主题按 series、topic 或 tag 关联公开输出并隐藏空主题", () => {
  const definitions: ThreadDefinition[] = [
    {
      id: "knowledge-systems",
      label: "知识系统",
      description: "知识管道与发布。",
      series: ["KnowledgeVault 实践"],
      topics: ["Obsidian"],
      tags: ["knowledge-management"],
    },
    {
      id: "empty",
      label: "尚未公开",
      description: "不应显示。",
      tags: ["missing"],
    },
  ];
  const entries = [
    makeEntry("blog", "series-match", "2026-07-01", {
      series: "KnowledgeVault 实践",
      updatedDate: "2026-08-08",
    }),
    makeEntry("notes", "topic-match", "2026-07-03", { topic: "Obsidian" }),
    makeEntry("projects", "tag-match", "2026-07-02", {
      tags: ["knowledge-management"],
    }),
    makeEntry("blog", "private-match", "2026-07-04", {
      tags: ["knowledge-management"],
      draft: true,
    }),
  ];

  const threads = resolveThreads(entries, definitions);

  assert.deepEqual(threads.map((thread) => thread.id), ["knowledge-systems"]);
  assert.deepEqual(threads[0].entries.map((entry) => entry.id), [
    "topic-match",
    "tag-match",
    "series-match",
  ]);
  assert.equal(
    threads[0].latestPublishedDate.toISOString().slice(0, 10),
    "2026-07-03",
  );
});

test("精选输出保持配置顺序并拒绝缺失或非公开引用", () => {
  const first = makeEntry("blog", "first", "2026-07-01");
  const second = makeEntry("notes", "second", "2026-07-02");
  const hidden = makeEntry("projects", "hidden", "2026-07-03", {
    visibility: "unlisted",
  });

  const resolved = resolveFeaturedEntries(
    [first, second, hidden],
    [
      { collection: "notes", id: "second" },
      { collection: "blog", id: "first" },
    ],
  );
  assert.deepEqual(resolved.map((entry) => entry.id), ["second", "first"]);
  assert.throws(
    () =>
      resolveFeaturedEntries([first, second, hidden], [
        { collection: "projects", id: "hidden" },
      ]),
    /精选内容不存在或未公开: projects\/hidden/,
  );
  assert.throws(
    () =>
      resolveFeaturedEntries([first, second], [
        { collection: "blog", id: "missing" },
      ]),
    /精选内容不存在或未公开: blog\/missing/,
  );
});

test("主要主题优先使用 topic、series、首个标签和分类", () => {
  assert.equal(
    getPrimaryTopic(
      makeEntry("blog", "topic", "2026-07-01", {
        topic: "Obsidian",
        series: "KnowledgeVault 实践",
        tags: ["knowledge-management"],
      }),
    ),
    "Obsidian",
  );
  assert.equal(
    getPrimaryTopic(
      makeEntry("blog", "series", "2026-07-01", {
        series: "KnowledgeVault 实践",
        tags: ["knowledge-management"],
      }),
    ),
    "KnowledgeVault 实践",
  );
  assert.equal(
    getPrimaryTopic(
      makeEntry("blog", "tag", "2026-07-01", { tags: ["knowledge-management"] }),
    ),
    "knowledge-management",
  );
  assert.equal(getPrimaryTopic(makeEntry("blog", "category", "2026-07-01")), "测试");
});
