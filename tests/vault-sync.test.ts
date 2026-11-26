import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { checkPublishContent } from "../scripts/check-publish-content";
import { normalizeMarkdown } from "../scripts/normalize-markdown";
import { syncFromVault } from "../scripts/sync-from-vault";
import { collectKnownTargets, createVaultIndex } from "../scripts/utils/vault-index";

async function writeText(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function syncAndApply(options: Parameters<typeof syncFromVault>[0]) {
  const previewRoot = await mkdtemp(path.join(tmpdir(), "blogsite-preview-"));
  try {
    await syncFromVault(options, { mode: "preview", previewRoot });
    return await syncFromVault(options, { mode: "apply", previewRoot });
  } finally {
    await rm(previewRoot, { recursive: true, force: true });
  }
}

function publishableSource(
  title: string,
  slug: string,
  publishTarget: "blog" | "notes" | "projects" = "notes",
  content = "公开正文。",
): string {
  return `---
title: "${title}"
description: "用于验证来源边界。"
created: 2026-09-01
publish_target: ${publishTarget}
publish_status: published
publish_slug: ${slug}
publish_visibility: public
---

${content}
`;
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
      publishedDate: "2026-06-01",
      visibility: "public",
      outputKind: "learned",
    },
  ], [{ sourceVaultPath: "Private/secret.md", title: "私密页面", aliases: [] }]);

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
      "[公开页面](../../notes/public-note/)",
      "[显示名](../../notes/public-note/)",
      "私密页面",
      "缺失别名",
      "[公开页面](../../notes/public-note/)",
      "[公开页面](../../notes/public-note/)",
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

test("双链名称按文档消歧，显式路径只匹配所指文件", async () => {
  const publicNote = {
    title: "共享标题",
    aliases: ["共享标题", "Alias", "共享文件名", "唯一别名", "唯一别名"],
    sourceVaultPath: "10-Notes/共享文件名.md",
    publishTarget: "notes",
    publishSlug: "public-note",
    publishStatus: "published",
    publishedDate: "2026-06-01",
    visibility: "unlisted",
    outputKind: "learned",
  } as const;
  const index = createVaultIndex(
    [
      { ...publicNote, aliases: [...publicNote.aliases] },
      {
        ...publicNote,
        title: "草稿标题",
        aliases: ["草稿别名", "草稿同名"],
        sourceVaultPath: "10-Notes/Draft.md",
        publishSlug: "draft",
        publishStatus: "draft",
      },
      {
        ...publicNote,
        title: "草稿同名",
        aliases: [],
        sourceVaultPath: "10-Notes/Published.md",
        publishSlug: "published",
        visibility: "public",
      },
    ],
    collectKnownTargets([
      {
        absolutePath: "/synthetic/10-Notes/共享文件名.md",
        sourceVaultPath: publicNote.sourceVaultPath,
        data: { title: publicNote.title, aliases: publicNote.aliases },
        content: "",
      },
      {
        absolutePath: "/synthetic/00-Inbox/共享文件名.md",
        sourceVaultPath: "00-Inbox/共享文件名.md",
        data: { title: "非来源同文件名", aliases: ["Alias"] },
        content: "",
      },
      {
        absolutePath: "/synthetic/10-Notes/Private.md",
        sourceVaultPath: "10-Notes/Private.md",
        data: { title: "私有文档", aliases: ["共享标题"] },
        content: "",
      },
    ]),
  );
  const result = await normalizeMarkdown({
    markdown: [
      "[[共享标题]]",
      "[[Alias|别名]]",
      "[[共享文件名]]",
      "[[草稿同名]]",
      "[[10-Notes/共享文件名|未列出页面]]",
      "[[../10-Notes/共享文件名.md|相对路径]]",
      "[[00-Inbox/共享文件名]]",
      "[[不存在/共享文件名]]",
      "[[10-Notes/共享标题]]",
      "[[草稿别名]]",
      "[[10-Notes/Draft]]",
      "[[Published]]",
      "[[唯一别名]]",
    ].join("\n"),
    index,
    sourceVaultPath: "00-Inbox/Origin.md",
    outputPath: "blog/example.md",
  });

  assert.deepEqual(result.markdown.split("\n"), [
    "共享标题",
    "别名",
    "共享文件名",
    "草稿同名",
    "[未列出页面](../../notes/public-note/)",
    "[相对路径](../../notes/public-note/)",
    "共享文件名",
    "共享文件名",
    "共享标题",
    "草稿别名",
    "Draft",
    "[Published](../../notes/published/)",
    "[唯一别名](../../notes/public-note/)",
  ]);
  assert.deepEqual(result.wikilinkWarnings.map(({ line, reason }) => [line, reason]), [
    [1, "target-ambiguous"],
    [2, "target-ambiguous"],
    [3, "target-ambiguous"],
    [4, "target-ambiguous"],
    [7, "target-not-published"],
    [8, "target-not-found"],
    [9, "target-not-found"],
    [10, "target-not-published"],
    [11, "target-not-published"],
  ]);
});

test("双链警告记录原始正文行号及每次出现的原词", async () => {
  const result = await normalizeMarkdown({
    markdown: [
      "",
      "> [!note] 标题",
      "~~~md",
      "[[缺失/目标#小节|显示名]]",
      "~~~",
      "![图片](image.png)",
      "[[缺失/目标#小节|显示名]] 和 [[缺失/目标#小节|显示名]]",
      "[[缺失/目标#小节|显示名]]",
    ].join("\r\n"),
    index: createVaultIndex([]),
    outputPath: "blog/example.md",
    assetHandler: async () => ({ markdown: "一行\n另一行", warnings: [] }),
  });

  assert.deepEqual(result.wikilinkWarnings, [7, 7, 8].map((line) => ({
    file: "blog/example.md",
    line,
    link: "[[缺失/目标#小节|显示名]]",
    target: "缺失/目标",
    action: "converted-to-text",
    reason: "target-not-found",
  })));
  assert.match(result.markdown, /> \*\*标题\*\*/);
  assert.match(result.markdown, /一行\n另一行/);
});

test("归一化保留代码围栏内容并只转换正文 Markdown", async () => {
  const assetRequests: string[] = [];
  const markdown = [
    "[[正文链接]]",
    "~~~js",
    'const wikilink = "[[代码链接]]";',
    'const embed = "![[code.png]]";',
    'const image = "![code](code.png)";',
    "~~~",
    "```md",
    "[[反引号围栏中的链接]]",
    "![反引号围栏中的图片](backtick.png)",
    "```",
    "![正文图片](body.png)",
  ].join("\n");

  const result = await normalizeMarkdown({
    markdown,
    index: createVaultIndex([], []),
    outputPath: "src/content/blog/fenced-code-example.md",
    assetHandler: async (request) => {
      assetRequests.push(request.reference);
      return {
        markdown: `[asset: ${request.reference}]`,
        warnings: [],
      };
    },
  });

  assert.equal(
    result.markdown,
    [
      "正文链接",
      "~~~js",
      'const wikilink = "[[代码链接]]";',
      'const embed = "![[code.png]]";',
      'const image = "![code](code.png)";',
      "~~~",
      "```md",
      "[[反引号围栏中的链接]]",
      "![反引号围栏中的图片](backtick.png)",
      "```",
      "[asset: body.png]",
    ].join("\n"),
  );
  assert.deepEqual(assetRequests, ["body.png"]);
  assert.deepEqual(
    result.wikilinkWarnings.map((warning) => warning.target),
    ["正文链接"],
  );
  assert.deepEqual(result.assetWarnings, []);
});

test("归一化把 Obsidian callout 转为可移植引用且保留围栏示例", async () => {
  const markdown = [
    "> [!summary] 结论",
    "> 这是一段公开摘要。",
    "",
    "> [!warning]",
    "> 这是一段风险提示。",
    "",
    "```md",
    "> [!summary] 代码示例",
    "```",
  ].join("\n");

  const result = await normalizeMarkdown({
    markdown,
    index: createVaultIndex([], []),
    outputPath: "notes/callout-example.md",
  });

  assert.equal(
    result.markdown,
    [
      "> **结论**",
      ">",
      "> 这是一段公开摘要。",
      "",
      "> **注意**",
      ">",
      "> 这是一段风险提示。",
      "",
      "```md",
      "> [!summary] 代码示例",
      "```",
    ].join("\n"),
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
    path.join(vaultPath, "60-Publish", "Blog", "KnowledgeVault 实践", "Article.md"),
    `---
title: "公开文章"
description: "用于验证同步的合成文章。"
created: 2026-06-01
updated: 2026-06-02
publish_date: 2026-06-15
tags: [test, sync]
aliases: []
publish_target: blog
publish_status: published
publish_slug: public-article
publish_category: "测试"
publish_visibility: public
publish_series: "从 Logseq 到 Obsidian"
publish_series_order: 10
publish_topic: "Knowledge Management"
publish_kind: revised
---

链接到 [[公开笔记|笔记别名]]、[[私密页面]]、[[不存在页面]] 和 [[10-Notes/Draft#小节|草稿引用]]。

![[diagram.png|架构图]]

![另一个图](../90-Attachments/other.png)

![[missing.png]]
`,
  );
  await writeText(
    path.join(vaultPath, "10-Notes", "Public Note.md"),
    `---
title: "公开笔记"
description: "用于验证别名索引。"
created: 2026-05-01
updated: 2026-05-02
tags: [note]
aliases: ["笔记别名"]
publish_target: notes
publish_status: published
publish_slug: public-note
publish_category: "测试"
publish_visibility: unlisted
---

合成笔记正文。
`,
  );
  await writeText(
    path.join(vaultPath, "10-Notes", "Draft.md"),
    publishableSource("未定稿笔记", "draft-note").replace("publish_status: published", "publish_status: draft"),
  );
  await writeText(
    path.join(vaultPath, "10-Notes", "Private.md"),
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
    path.join(vaultPath, "10-Notes", "Missing Slug.md"),
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
    path.join(vaultPath, "01-Daily", "2026-06-01.md"),
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
  const summary = await syncAndApply({
    vaultPath,
    contentOutputPath,
    imageOutputPath,
    reportsPath,
    excludeVaultDirs: [".git", ".obsidian", "80-Archive", "_system", "90-Attachments"],
    sourceRoots: ["10-Notes/", "20-Projects/", "60-Publish/Blog/"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  });
  const afterDigest = await digestDirectory(vaultPath);

  assert.equal(afterDigest, beforeDigest, "同步前后 Vault 文件哈希必须一致");
  assert.equal(summary.synced, 3);
  assert.equal(summary.skippedPrivate, 1);
  assert.equal(summary.skippedMissingSlug, 1);
  assert.equal(summary.skippedDaily, 0);

  const articlePath = path.join(contentOutputPath, "blog", "public-article.md");
  const article = await readFile(articlePath, "utf8");
  const parsedArticle = matter(article);
  assert.equal(parsedArticle.data.draft, false);
  assert.equal(parsedArticle.data.sourcePublishStatus, "published");
  assert.equal(parsedArticle.data.pubDate, "2026-06-15");
  assert.equal(parsedArticle.data.managedBy, "vault-sync");
  assert.equal(
    parsedArticle.data.sourceVaultPath,
    "60-Publish/Blog/KnowledgeVault 实践/Article.md",
  );
  assert.equal(parsedArticle.data.series, "从 Logseq 到 Obsidian");
  assert.equal(parsedArticle.data.seriesOrder, 10);
  assert.equal(parsedArticle.data.topic, "Knowledge Management");
  assert.equal(parsedArticle.data.outputKind, "revised");
  assert.match(article, /\[笔记别名\]\(\.\.\/\.\.\/notes\/public-note\/\)/);
  assert.match(article, /私密页面/);
  assert.doesNotMatch(article, /\[私密页面\]\(/);
  assert.match(article, /草稿引用/);
  assert.doesNotMatch(article, /\[草稿引用\]\(|10-Notes\/Draft/u);
  assert.doesNotMatch(article, /\[\[/);
  assert.match(article, /!\[架构图\]\(\/images\/public-article\/diagram\.png\)/);
  assert.match(article, /!\[另一个图\]\(\/images\/public-article\/other\.png\)/);
  assert.match(article, /\[missing image: missing\.png\]/);
  await assert.rejects(
    readFile(path.join(contentOutputPath, "blog", "KnowledgeVault 实践", "public-article.md")),
  );

  await readFile(path.join(imageOutputPath, "public-article", "diagram.png"));
  await readFile(path.join(imageOutputPath, "public-article", "other.png"));
  await assert.rejects(readFile(path.join(contentOutputPath, "blog", "stale.md")));
  await readFile(path.join(contentOutputPath, "blog", "manual.md"));
  const publicNote = matter(
    await readFile(path.join(contentOutputPath, "notes", "public-note.md"), "utf8"),
  );
  assert.equal(publicNote.data.outputKind, "learned");
  assert.equal(publicNote.data.visibility, "unlisted");
  const draftNote = matter(
    await readFile(path.join(contentOutputPath, "notes", "draft-note.md"), "utf8"),
  );
  assert.equal(draftNote.data.draft, true);
  await assert.rejects(readFile(path.join(contentOutputPath, "notes", "private-note.md")));
  await assert.rejects(readFile(path.join(contentOutputPath, "blog", "daily-example.md")));

  const syncReport = await readFile(path.join(reportsPath, "sync-report.md"), "utf8");
  const publishManifestJson = await readFile(
    path.join(reportsPath, "publish-manifest.json"),
    "utf8",
  );
  const publishManifestMarkdown = await readFile(
    path.join(reportsPath, "publish-manifest.md"),
    "utf8",
  );
  const wikilinkReport = await readFile(
    path.join(reportsPath, "wikilink-warnings.md"),
    "utf8",
  );
  const assetReport = await readFile(path.join(reportsPath, "asset-warnings.md"), "utf8");
  const manifest = JSON.parse(publishManifestJson);
  assert.match(syncReport, /synced: 3/);
  assert.equal(manifest.contractVersion, "v1");
  assert.equal(typeof manifest.generatedAt, "string");
  assert.equal(manifest.summary.scannedVaultFiles, summary.scannedVaultFiles);
  assert.equal(manifest.summary.synced, 3);
  assert.equal(manifest.entries.length, 3);
  assert.deepEqual(
    manifest.entries.find((entry: { slug: string }) => entry.slug === "public-article"),
    {
      sourceVaultPath: "60-Publish/Blog/KnowledgeVault 实践/Article.md",
      collection: "blog",
      slug: "public-article",
      url: "/blog/public-article/",
      title: "公开文章",
      draft: false,
      publishedDate: "2026-06-15",
      visibility: "public",
      series: "从 Logseq 到 Obsidian",
      seriesOrder: 10,
      topic: "Knowledge Management",
      outputKind: "revised",
      warnings: [
        "wikilink: target-not-published",
        "wikilink: target-not-found",
        "wikilink: target-not-published",
        "asset: missing-asset",
      ],
    },
  );
  assert.match(publishManifestMarkdown, /60-Publish\/Blog\/KnowledgeVault 实践\/Article\.md/);
  assert.match(publishManifestMarkdown, /\/blog\/public-article\//);
  assert.match(publishManifestMarkdown, /revised/);
  assert.match(publishManifestMarkdown, /contract_version: v1/);
  assert.match(wikilinkReport, /file: `blog\/public-article\.md`; line: 2; reason: target-not-published/u);
  assert.match(wikilinkReport, /file: `blog\/public-article\.md`; line: 2; reason: target-not-found/u);
  assert.doesNotMatch(wikilinkReport, /\[\[|私密页面|不存在页面|Draft|草稿引用|link:|target:/u);
  assert.match(assetReport, /missing-asset/);
  assert.doesNotMatch(
    syncReport + publishManifestJson + publishManifestMarkdown + wikilinkReport + assetReport,
    /这段私密正文/,
  );

  const checkResult = await checkPublishContent({
    contentPath: contentOutputPath,
    publicPath: path.join(root, "public"),
  });
  assert.deepEqual(checkResult.errors, []);
});

test("笔记嵌入降级为链接或文本，附件目录只收到预期图片", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-note-embeds-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const vaultPath = path.join(root, "vault");
  const previewRoot = await mkdtemp(path.join(root, "preview-"));
  const sourceRoot = path.join(vaultPath, "10-Notes");
  const privateSource = path.join(vaultPath, "00-Inbox", "Confidential Source.md");
  const privateEmbed = "![[00-Inbox/Confidential Source.md#Confidential Heading|内部说明]]";
  const draftEmbed = "![[DraftFile|草稿说明]]";
  const content = [
    "![[10-Notes/Published.md|正式笔记]]",
    "![[diagram.png|图示]]",
    privateEmbed,
    draftEmbed,
    "![图片说明](<../00-Inbox/Confidential%20Source%2Emd> \"title\")",
    "![图片说明](../00-Inbox/Confidential.mdx)",
    "![[linked-note.png|链接图片说明]]",
  ].join("\n");
  await writeText(path.join(sourceRoot, "Article.md"), publishableSource("示例", "example", "blog", content));
  await writeText(path.join(sourceRoot, "Published.md"), publishableSource("发布目标", "published"));
  await writeText(
    path.join(sourceRoot, "DraftFile.md"),
    publishableSource("草稿目标", "draft", "notes", "fixture draft body")
      .replace("publish_status: published", "publish_status: draft"),
  );
  await writeText(privateSource, "fixture private Markdown body");
  await writeText(path.join(vaultPath, "00-Inbox", "Confidential.mdx"), "fixture private MDX body");
  await writeText(path.join(sourceRoot, "diagram.png"), "fixture image");
  await symlink(privateSource, path.join(sourceRoot, "linked-note.png"));

  const options = {
    vaultPath,
    contentOutputPath: path.join(root, "content"),
    imageOutputPath: path.join(root, "public", "images"),
    reportsPath: path.join(root, "reports"),
    excludeVaultDirs: [],
    sourceRoots: ["10-Notes/"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  };
  const preview = await syncFromVault(options, { mode: "preview", previewRoot });
  assert.equal(preview.errors, 0);
  const diagnostics = JSON.parse(await readFile(path.join(previewRoot, "local-diagnostics.json"), "utf8"));
  assert.deepEqual(
    diagnostics.wikilinks.map(({ line, link }: { line: number; link: string }) => [line, link]),
    [[4, privateEmbed], [5, draftEmbed]],
  );
  await syncFromVault(options, { mode: "apply", previewRoot });

  const article = matter(await readFile(path.join(options.contentOutputPath, "blog", "example.md"), "utf8"));
  assert.deepEqual(article.content.trim().split("\n"), [
    "[正式笔记](../../notes/published/)",
    "![图示](/images/example/diagram.png)",
    "内部说明",
    "草稿说明",
    "图片说明",
    "图片说明",
    "链接图片说明",
  ]);
  assert.deepEqual(await readdir(options.imageOutputPath, { recursive: true }), ["example", "example/diagram.png"]);
  assert.equal(await readFile(path.join(options.imageOutputPath, "example", "diagram.png"), "utf8"), "fixture image");
  const wikilinkReport = await readFile(path.join(options.reportsPath, "wikilink-warnings.md"), "utf8");
  const assetReport = await readFile(path.join(options.reportsPath, "asset-warnings.md"), "utf8");
  assert.match(wikilinkReport, /line: 4; reason: target-not-published/u);
  assert.match(wikilinkReport, /line: 5; reason: target-not-published/u);
  assert.equal(assetReport.match(/unsupported-markdown-source/gu)?.length, 3);
  assert.doesNotMatch(wikilinkReport + assetReport, /Confidential|DraftFile|00-Inbox|linked-note|!\[\[/u);
});

test("同步只评估配置来源，保留全 Vault 已知目标而不输出其他端口", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-source-roots-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const vaultPath = path.join(root, "vault");
  const contentOutputPath = path.join(root, "content");
  const reportsPath = path.join(root, "reports");
  await writeText(
    path.join(vaultPath, "10-Notes", "Nested", "Note.md"),
    publishableSource("原位笔记", "nested-note", "notes"),
  );
  await writeText(
    path.join(vaultPath, "20-Projects", "Deep", "Project.md"),
    publishableSource("原位项目", "deep-project", "projects"),
  );
  await writeText(
    path.join(vaultPath, "60-Publish", "Blog", "Series", "Article.md"),
    publishableSource(
      "博客改写稿",
      "nested-blog",
      "blog",
      "链接到 [[其他端口页面]]、[[Article|有多个来源]]、[[Broken|格式异常目标]] 和 [[./Article|当前稿]]。",
    ),
  );
  await writeText(
    path.join(vaultPath, "60-Publish", "OtherPort", "Article.md"),
    publishableSource("其他端口页面", "other-port", "blog"),
  );
  await writeText(
    path.join(vaultPath, "10-Notes-Archive", "Collision.md"),
    publishableSource("前缀碰撞", "prefix-collision", "notes"),
  );
  await writeText(
    path.join(vaultPath, "60-Publish", "OtherPort", "Broken.md"),
    "---\ntitle: [未闭合\n---\n不应阻断博客同步。\n",
  );

  const summary = await syncAndApply({
    vaultPath,
    contentOutputPath,
    imageOutputPath: path.join(root, "public", "images"),
    reportsPath,
    excludeVaultDirs: [],
    sourceRoots: ["10-Notes/", "20-Projects/", "60-Publish/Blog/"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  });

  assert.equal(summary.scannedVaultFiles, 6);
  assert.equal(summary.synced, 3);
  assert.equal(summary.errors, 0);
  await readFile(path.join(contentOutputPath, "notes", "nested-note.md"));
  await readFile(path.join(contentOutputPath, "projects", "deep-project.md"));
  const blogArticle = await readFile(path.join(contentOutputPath, "blog", "nested-blog.md"), "utf8");
  assert.match(blogArticle, /其他端口页面/);
  assert.doesNotMatch(blogArticle, /\[(?:其他端口页面|有多个来源|格式异常目标)\]\(/u);
  assert.match(blogArticle, /\[当前稿\]\(\.\/\)/u);
  await assert.rejects(readFile(path.join(contentOutputPath, "blog", "other-port.md")));
  await assert.rejects(readFile(path.join(contentOutputPath, "notes", "prefix-collision.md")));
  const wikilinkReport = await readFile(path.join(reportsPath, "wikilink-warnings.md"), "utf8");
  assert.deepEqual(
    wikilinkReport.match(/reason: target-[\w-]+/gu),
    ["reason: target-not-published", "reason: target-ambiguous", "reason: target-not-published"],
  );
});

test("同步拒绝不安全的来源根目录", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-invalid-source-root-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const vaultPath = path.join(root, "vault");
  await mkdir(vaultPath, { recursive: true });

  for (const sourceRoots of [
    [],
    [""],
    ["../10-Notes/"],
    ["10-Notes/../20-Projects/"],
    ["10-Notes//Nested/"],
    ["/10-Notes/"],
    ["C:\\Vault\\10-Notes"],
  ]) {
    const previewRoot = await mkdtemp(path.join(root, "preview-"));
    await assert.rejects(
      syncFromVault({
        vaultPath,
        contentOutputPath: path.join(root, "content"),
        imageOutputPath: path.join(root, "images"),
        reportsPath: path.join(root, "reports"),
        excludeVaultDirs: [],
        sourceRoots,
        routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
      }, { mode: "preview", previewRoot }),
      /来源根目录/,
    );
  }
});

test("来源迁移或删除时更新或清理受管输出，保留手工内容", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-source-move-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const vaultPath = path.join(root, "vault");
  const contentOutputPath = path.join(root, "content");
  const options = {
    vaultPath,
    contentOutputPath,
    imageOutputPath: path.join(root, "public", "images"),
    reportsPath: path.join(root, "reports"),
    excludeVaultDirs: [],
    sourceRoots: ["10-Notes/", "20-Projects/", "60-Publish/Blog/"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  };
  const originalPath = path.join(vaultPath, "10-Notes", "Nested", "Moved.md");
  const movedPath = path.join(vaultPath, "20-Projects", "Nested", "Moved.md");
  const outputPath = path.join(contentOutputPath, "notes", "stable-slug.md");
  const manualPath = path.join(contentOutputPath, "notes", "manual.md");
  await writeText(originalPath, publishableSource("迁移来源", "stable-slug", "notes"));
  await writeText(manualPath, "---\ntitle: 手工内容\n---\n保留。\n");

  await syncAndApply(options);
  assert.equal(matter(await readFile(outputPath, "utf8")).data.sourceVaultPath, "10-Notes/Nested/Moved.md");

  await rm(originalPath);
  await writeText(movedPath, publishableSource("迁移来源", "stable-slug", "notes"));
  await syncAndApply(options);
  const movedOutput = matter(await readFile(outputPath, "utf8"));
  assert.equal(movedOutput.data.sourceVaultPath, "20-Projects/Nested/Moved.md");
  const movedManifest = JSON.parse(
    await readFile(path.join(options.reportsPath, "publish-manifest.json"), "utf8"),
  );
  assert.equal(movedManifest.entries[0].url, "/notes/stable-slug/");

  await rm(movedPath);
  await syncAndApply(options);
  await assert.rejects(readFile(outputPath));
  await readFile(manualPath);
});

test("同步报告为缺少 publish_slug 的合成 fixture 提供安全修复提示", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-missing-slug-report-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const vaultPath = path.resolve("tests/fixtures/vault");
  const reportsPath = path.join(root, "reports");
  const summary = await syncAndApply({
    vaultPath,
    contentOutputPath: path.join(root, "content"),
    imageOutputPath: path.join(root, "public", "images"),
    reportsPath,
    excludeVaultDirs: [],
    sourceRoots: ["10-Notes/"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  });

  assert.equal(summary.synced, 1);
  assert.equal(summary.skippedMissingSlug, 1);

  const syncReport = await readFile(path.join(reportsPath, "sync-report.md"), "utf8");
  assert.match(
    syncReport,
    /source: `10-Notes\/Missing Publish Slug\.md`; reason: `missing-slug`;/,
  );
  assert.match(
    syncReport,
    /fix: 在 frontmatter 中添加 `publish_slug: <unique-kebab-case>`/,
  );
  assert.equal(syncReport.includes(vaultPath), false);
  assert.doesNotMatch(syncReport, /\/Users\/|\/home\/|[A-Za-z]:\\/u);
});

test("同步拒绝非法 publish_kind 且为缺省 kind 使用集合映射", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-output-kind-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const vaultPath = path.join(root, "vault");
  const contentOutputPath = path.join(root, "content");
  const imageOutputPath = path.join(root, "public", "images");
  const reportsPath = path.join(root, "reports");
  const previewRoot = path.join(root, "preview");
  await mkdir(previewRoot);

  await writeText(
    path.join(vaultPath, "10-Notes", "Valid.md"),
    `---
title: "缺省输出类型"
description: "应按集合映射为 thought。"
created: 2026-07-10
tags: [test]
aliases: []
publish_target: blog
publish_status: published
publish_slug: default-output-kind
publish_category: "测试"
publish_visibility: public
---

公开正文。
`,
  );
  await writeText(
    path.join(vaultPath, "10-Notes", "Invalid.md"),
    `---
title: "非法输出类型"
description: "不得进入公开输出。"
created: 2026-07-10
tags: [test]
aliases: []
publish_target: notes
publish_status: published
publish_slug: invalid-output-kind
publish_category: "测试"
publish_visibility: public
publish_kind: speculative
---

不得同步的正文。
`,
  );

  const summary = await syncFromVault({
    vaultPath,
    contentOutputPath,
    imageOutputPath,
    reportsPath,
    excludeVaultDirs: [".git", ".obsidian", "80-Archive", "_system", "90-Attachments"],
    sourceRoots: ["10-Notes/"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  }, { mode: "preview", previewRoot });

  assert.equal(summary.synced, 1);
  assert.equal(summary.errors, 1);
  const previewContentPath = path.join(previewRoot, "content");
  const published = matter(
    await readFile(path.join(previewContentPath, "blog", "default-output-kind.md"), "utf8"),
  );
  assert.equal(published.data.outputKind, "thought");
  await assert.rejects(
    readFile(path.join(previewContentPath, "notes", "invalid-output-kind.md")),
  );
});

test("同步将非法 publish_series_order 计入 errors 且不生成副本", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-series-order-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const vaultPath = path.join(root, "vault");
  const contentOutputPath = path.join(root, "content");
  const imageOutputPath = path.join(root, "public", "images");
  const reportsPath = path.join(root, "reports");
  const previewRoot = path.join(root, "preview");
  await mkdir(previewRoot);

  await writeText(
    path.join(vaultPath, "10-Notes", "Quoted.md"),
    `---
title: "带引号顺序"
description: "字符串顺序不得进入公开输出。"
created: 2026-07-11
publish_target: blog
publish_status: published
publish_slug: quoted-series-order
publish_visibility: public
publish_series: "Series"
publish_series_order: "2"
---

不得同步的正文。
`,
  );
  await writeText(
    path.join(vaultPath, "10-Notes", "Missing Series.md"),
    `---
title: "缺少系列"
description: "没有 series 的顺序不得进入公开输出。"
created: 2026-07-11
publish_target: notes
publish_status: published
publish_slug: missing-series
publish_visibility: public
publish_series_order: 2
---

不得同步的正文。
`,
  );

  const summary = await syncFromVault({
    vaultPath,
    contentOutputPath,
    imageOutputPath,
    reportsPath,
    excludeVaultDirs: [".git", ".obsidian", "80-Archive", "_system", "90-Attachments"],
    sourceRoots: ["10-Notes/"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  }, { mode: "preview", previewRoot });

  assert.equal(summary.synced, 0);
  assert.equal(summary.errors, 2);
  const previewContentPath = path.join(previewRoot, "content");
  await assert.rejects(
    readFile(path.join(previewContentPath, "blog", "quoted-series-order.md")),
  );
  await assert.rejects(
    readFile(path.join(previewContentPath, "notes", "missing-series.md")),
  );
});

test("同步拒绝把输出目录放进 Vault", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-path-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const vaultPath = path.join(root, "vault");
  const previewRoot = path.join(root, "preview");
  await mkdir(vaultPath, { recursive: true });
  await mkdir(previewRoot);

  await assert.rejects(
    syncFromVault({
      vaultPath,
      contentOutputPath: path.join(vaultPath, "content"),
      imageOutputPath: path.join(root, "images"),
      reportsPath: path.join(root, "reports"),
      excludeVaultDirs: [],
      sourceRoots: ["10-Notes/"],
      routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
    }, { mode: "preview", previewRoot }),
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

test("发布检查忽略代码围栏中的双链和图片示例", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-check-fenced-markdown-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contentPath = path.join(root, "content");
  const publicPath = path.join(root, "public");

  await writeText(
    path.join(contentPath, "blog", "fenced-markdown.md"),
    `---
title: "围栏中的 Markdown 示例"
description: "用于验证代码示例不会被当作公开正文。"
pubDate: 2026-06-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "Notes/Fenced Markdown.md"
---

~~~md
[[代码中的双链]]
![[代码中的嵌入图片.png]]
![代码中的 Markdown 图片](missing.png)
~~~
`,
  );

  const result = await checkPublishContent({ contentPath, publicPath });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("发布检查允许安全相对说明路径、站内路径和可解析图片路径", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-check-safe-paths-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contentPath = path.join(root, "content");
  const publicPath = path.join(root, "public");

  await writeText(path.join(publicPath, "images", "known", "pic.png"), "image");
  await writeText(path.join(contentPath, "blog", "images", "relative.png"), "relative");
  await writeText(
    path.join(contentPath, "blog", "safe-paths.md"),
    `---
title: "安全路径说明"
description: "用于验证说明路径不会被误判。"
pubDate: 2026-06-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "_system/migration/report.md"
---

正文提到 _system/migration/report.md、../examples/demo.md、scripts/example.mjs、
/blog/some-slug/?from=guide#section 和 [锚点](#local-anchor)。

\`\`\`bash
node scripts/example.mjs --input ../examples/demo.md
\`\`\`

![公开图片](/images/known/pic.png)
![相对图片](images/relative.png)
`,
  );

  const result = await checkPublishContent({ contentPath, publicPath });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test("发布检查拒绝绕过 Pages base path 的站内根路径链接", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-check-root-links-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contentPath = path.join(root, "content");
  const publicPath = path.join(root, "public");

  await writeText(
    path.join(contentPath, "notes", "root-link.md"),
    `---
title: "根路径链接"
description: "用于验证 GitHub Pages 子路径门禁。"
pubDate: 2026-07-24
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "60-Publish/Root Link.md"
managedBy: vault-sync
sourcePublishStatus: published
---

[错误链接](/notes/other-note/)
[正确链接](../other-note/)

\`\`\`md
[代码示例](/blog/example/)
\`\`\`
`,
  );

  const result = await checkPublishContent({ contentPath, publicPath });

  assert.deepEqual(
    result.errors.filter((issue) => issue.code === "site-root-content-link"),
    [
      {
        file: "notes/root-link.md",
        code: "site-root-content-link",
        message: "站内内容链接必须使用相对路径: /notes/other-note/",
      },
    ],
  );
});

test("发布检查拒绝本机绝对路径、sourceVaultPath 绝对路径和 file URL", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-check-local-leaks-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contentPath = path.join(root, "content");
  const publicPath = path.join(root, "public");

  await writeText(
    path.join(contentPath, "blog", "local-body.md"),
    `---
title: "本机路径泄露"
description: "用于验证正文路径泄露。"
pubDate: 2026-06-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "Notes/Local Body.md"
---

/Users/example/Vault/Note.md
/home/example/Vault/Note.md
C:\\Users\\example\\Vault\\Note.md
file:///Users/example/Vault/Note.md
`,
  );
  await writeText(
    path.join(contentPath, "blog", "absolute-source.md"),
    `---
title: "绝对来源路径"
description: "用于验证来源路径泄露。"
pubDate: 2026-06-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "/tmp/KnowledgeVault/Article.md"
---

合成内容。
`,
  );
  await writeText(
    path.join(contentPath, "blog", "home-body.md"),
    `---
title: "Home 路径泄露"
description: "用于验证 /home 绝对路径。"
pubDate: 2026-06-01
draft: false
category: "测试"
tags: []
visibility: public
sourceVaultPath: "Notes/Home Body.md"
---

/home/example/Vault/Note.md
`,
  );

  const result = await checkPublishContent({ contentPath, publicPath });
  const codes = result.errors.map((issue) => issue.code);

  assert.ok(codes.includes("absolute-local-path"));
  assert.ok(codes.includes("absolute-source-path"));
  assert.ok(codes.includes("file-url"));
  assert.ok(codes.includes("knowledge-vault-path"));
  assert.ok(
    result.errors.some(
      (issue) => issue.file === "blog/home-body.md" && issue.code === "absolute-local-path",
    ),
  );
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
