import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { checkPublishContent } from "../scripts/check-publish-content";
import { normalizeMarkdown } from "../scripts/normalize-markdown";
import { syncFromVault } from "../scripts/sync-from-vault";
import { createVaultIndex } from "../scripts/utils/vault-index";

async function writeText(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function digestDirectory(root: string): Promise<string> {
  const hash = createHash("sha256");

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        hash.update(relativePath);
        hash.update(await readFile(absolutePath));
      }
    }
  }

  await visit(root);
  return hash.digest("hex");
}

test("双链只为发布目标生成链接并记录降级 warning", async () => {
  const index = createVaultIndex([
    {
      title: "公开页面",
      aliases: ["公开别名"],
      sourceVaultPath: "Notes/Public.md",
      publishTarget: "notes",
      publishSlug: "public-note",
      publishStatus: "published",
      visibility: "public",
    },
  ], ["私密页面"]);

  const result = await normalizeMarkdown({
    markdown: [
      "[[公开页面]]",
      "[[公开别名|显示名]]",
      "[[私密页面]]",
      "[[不存在|缺失别名]]",
      "[[公开页面#章节]]",
      "[[公开页面#^abc123]]",
    ].join("\n"),
    index,
    outputPath: "src/content/blog/example.md",
  });

  assert.equal(
    result.markdown,
    [
      "[公开页面](/notes/public-note/)",
      "[显示名](/notes/public-note/)",
      "私密页面",
      "缺失别名",
      "[公开页面](/notes/public-note/)",
      "[公开页面](/notes/public-note/)",
    ].join("\n"),
  );
  assert.deepEqual(
    result.wikilinkWarnings.map((warning) => warning.reason),
    [
      "target-not-published",
      "target-not-found",
      "heading-anchor-dropped",
      "block-anchor-dropped",
    ],
  );
});

test("同步筛选内容、复制图片、清理旧托管副本且不修改源 Vault", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-sync-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const vaultPath = path.join(root, "vault");
  const contentOutputPath = path.join(root, "content");
  const imageOutputPath = path.join(root, "public", "images");
  const reportsPath = path.join(root, "reports");

  await writeText(
    path.join(vaultPath, "Articles", "Article.md"),
    `---
title: "公开文章"
description: "用于验证同步的合成文章。"
created: 2026-06-01
updated: 2026-06-02
tags: [test, sync]
aliases: []
publish_target: blog
publish_status: published
publish_slug: public-article
publish_category: "测试"
publish_visibility: public
---

链接到 [[公开笔记|笔记别名]]、[[私密页面]] 和 [[不存在页面]]。

![[diagram.png|架构图]]

![另一个图](../90-Attachments/other.png)

![[missing.png]]
`,
  );
  await writeText(
    path.join(vaultPath, "Notes", "Public Note.md"),
    `---
title: "公开笔记"
description: "用于验证别名索引。"
created: 2026-05-01
updated: 2026-05-02
tags: [note]
aliases: ["笔记别名"]
publish_target: notes
publish_status: draft
publish_slug: public-note
publish_category: "测试"
publish_visibility: unlisted
---

合成笔记正文。
`,
  );
  await writeText(
    path.join(vaultPath, "Private.md"),
    `---
title: "私密页面"
description: "不得同步。"
created: 2026-04-01
publish_target: notes
publish_status: private
publish_slug: private-note
publish_category: "测试"
publish_visibility: private
---

这段私密正文绝不能进入报告。
`,
  );
  await writeText(
    path.join(vaultPath, "Missing Slug.md"),
    `---
title: "缺少 Slug"
description: "不得同步。"
created: 2026-04-02
publish_target: blog
publish_status: published
publish_category: "测试"
publish_visibility: public
---

缺少 slug。
`,
  );
  await writeText(
    path.join(vaultPath, "Daily", "2026-06-01.md"),
    `---
title: "Daily 示例"
description: "即使有发布字段也不得同步。"
created: 2026-06-01
publish_target: blog
publish_status: published
publish_slug: daily-example
publish_category: "测试"
publish_visibility: public
---

Daily 原文。
`,
  );
  await writeText(path.join(vaultPath, "90-Attachments", "diagram.png"), "diagram");
  await writeText(path.join(vaultPath, "90-Attachments", "other.png"), "other");

  await writeText(
    path.join(contentOutputPath, "blog", "stale.md"),
    `---
title: "旧副本"
description: "应被清理。"
pubDate: 2025-01-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "Old.md"
managedBy: vault-sync
sourcePublishStatus: published
---

旧内容。
`,
  );
  await writeText(
    path.join(contentOutputPath, "blog", "manual.md"),
    `---
title: "手工内容"
description: "不得被同步清理。"
pubDate: 2025-01-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "examples/manual.md"
---

保留。
`,
  );

  const beforeDigest = await digestDirectory(vaultPath);
  const summary = await syncFromVault({
    vaultPath,
    contentOutputPath,
    imageOutputPath,
    reportsPath,
    excludeVaultDirs: [".git", ".obsidian", "80-Archive", "_system", "90-Attachments"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  });
  const afterDigest = await digestDirectory(vaultPath);

  assert.equal(afterDigest, beforeDigest, "同步前后 Vault 文件哈希必须一致");
  assert.equal(summary.synced, 2);
  assert.equal(summary.skippedPrivate, 1);
  assert.equal(summary.skippedMissingSlug, 1);
  assert.equal(summary.skippedDaily, 1);

  const articlePath = path.join(contentOutputPath, "blog", "public-article.md");
  const article = await readFile(articlePath, "utf8");
  const parsedArticle = matter(article);
  assert.equal(parsedArticle.data.draft, false);
  assert.equal(parsedArticle.data.sourcePublishStatus, "published");
  assert.equal(parsedArticle.data.managedBy, "vault-sync");
  assert.equal(parsedArticle.data.sourceVaultPath, "Articles/Article.md");
  assert.match(article, /\[笔记别名\]\(\/notes\/public-note\/\)/);
  assert.match(article, /私密页面/);
  assert.doesNotMatch(article, /\[私密页面\]\(/);
  assert.doesNotMatch(article, /\[\[/);
  assert.match(article, /!\[架构图\]\(\/images\/public-article\/diagram\.png\)/);
  assert.match(article, /!\[另一个图\]\(\/images\/public-article\/other\.png\)/);
  assert.match(article, /\[missing image: missing\.png\]/);

  await readFile(path.join(imageOutputPath, "public-article", "diagram.png"));
  await readFile(path.join(imageOutputPath, "public-article", "other.png"));
  await assert.rejects(readFile(path.join(contentOutputPath, "blog", "stale.md")));
  await readFile(path.join(contentOutputPath, "blog", "manual.md"));
  await assert.rejects(readFile(path.join(contentOutputPath, "notes", "private-note.md")));
  await assert.rejects(readFile(path.join(contentOutputPath, "blog", "daily-example.md")));

  const syncReport = await readFile(path.join(reportsPath, "sync-report.md"), "utf8");
  const wikilinkReport = await readFile(
    path.join(reportsPath, "wikilink-warnings.md"),
    "utf8",
  );
  const assetReport = await readFile(path.join(reportsPath, "asset-warnings.md"), "utf8");
  assert.match(syncReport, /synced: 2/);
  assert.match(wikilinkReport, /target-not-published/);
  assert.match(wikilinkReport, /target-not-found/);
  assert.match(assetReport, /missing-asset/);
  assert.doesNotMatch(syncReport + wikilinkReport + assetReport, /这段私密正文/);

  const checkResult = await checkPublishContent({
    contentPath: contentOutputPath,
    publicPath: path.join(root, "public"),
  });
  assert.deepEqual(checkResult.errors, []);
});

test("同步拒绝把输出目录放进 Vault", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-path-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const vaultPath = path.join(root, "vault");
  await mkdir(vaultPath, { recursive: true });

  await assert.rejects(
    syncFromVault({
      vaultPath,
      contentOutputPath: path.join(vaultPath, "content"),
      imageOutputPath: path.join(root, "images"),
      reportsPath: path.join(root, "reports"),
      excludeVaultDirs: [],
      routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
    }),
    /输出目录不得位于 Vault 内部/,
  );
});

test("发布检查区分严重错误与缺失图片 warning", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-check-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contentPath = path.join(root, "content");
  const publicPath = path.join(root, "public");

  await writeText(
    path.join(contentPath, "blog", "bad.md"),
    `---
title: "不安全内容"
description: "用于验证检查器。"
pubDate: 2026-06-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "/Users/example/Vault/Bad.md"
managedBy: vault-sync
sourcePublishStatus: draft
---

残留 [[双链]]、file://private/path 和 ![缺失](/images/missing.png)。
`,
  );

  const result = await checkPublishContent({ contentPath, publicPath });
  const errorCodes = result.errors.map((issue) => issue.code);
  const warningCodes = result.warnings.map((issue) => issue.code);

  assert.ok(errorCodes.includes("residual-wikilink"));
  assert.ok(errorCodes.includes("absolute-local-path"));
  assert.ok(errorCodes.includes("file-url"));
  assert.ok(errorCodes.includes("draft-provenance-mismatch"));
  assert.ok(warningCodes.includes("missing-image"));
});

test("发布检查允许正文代码块说明 private 发布状态", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-check-code-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contentPath = path.join(root, "content");
  const publicPath = path.join(root, "public");

  await writeText(
    path.join(contentPath, "blog", "status-example.md"),
    `---
title: "发布状态说明"
description: "用于验证正文代码块不会被误判。"
pubDate: 2026-06-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "Notes/Status.md"
---

\`\`\`yaml
publish_status: private
\`\`\`
`,
  );

  const result = await checkPublishContent({ contentPath, publicPath });

  assert.deepEqual(result.errors, []);
});

test("发布检查拒绝 frontmatter 中的 private 发布状态", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-check-private-status-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contentPath = path.join(root, "content");
  const publicPath = path.join(root, "public");

  await writeText(
    path.join(contentPath, "blog", "private-status.md"),
    `---
title: "私有状态"
description: "用于验证 frontmatter 私有状态会被拒绝。"
pubDate: 2026-06-01
draft: true
category: "测试"
tags: []
visibility: public
sourceVaultPath: "Notes/Private.md"
publish_status: private
---

合成内容。
`,
  );

  const result = await checkPublishContent({ contentPath, publicPath });

  assert.ok(result.errors.some((issue) => issue.code === "private-publish-status"));
});

test("发布检查拒绝跨集合重复 slug、缺失字段和 Vault 绝对路径", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-check-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contentPath = path.join(root, "content");
  const publicPath = path.join(root, "public");

  await writeText(
    path.join(contentPath, "blog", "same-slug.md"),
    `---
draft: true
category: "测试"
tags: []
visibility: public
sourceVaultPath: "/home/example/KnowledgeVault/Article.md"
---

缺少必需字段。
`,
  );
  await writeText(
    path.join(contentPath, "notes", "same-slug.md"),
    `---
title: "重复 Slug"
description: "用于验证跨集合重复。"
pubDate: 2026-06-01
draft: true
category: "测试"
tags: []
visibility: public
sourceVaultPath: "Notes/Same.md"
---

合成内容。
`,
  );

  const result = await checkPublishContent({ contentPath, publicPath });
  const codes = result.errors.map((issue) => issue.code);

  assert.ok(codes.includes("missing-title"));
  assert.ok(codes.includes("missing-description"));
  assert.ok(codes.includes("missing-pubDate"));
  assert.ok(codes.includes("duplicate-slug"));
  assert.ok(codes.includes("knowledge-vault-path"));
});
