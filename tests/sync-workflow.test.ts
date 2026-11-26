import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { syncFromVault, type SyncOptions } from "../scripts/sync-from-vault";

const privateTarget = "Private/Synthetic Confidential Target.md";
const privateLink = `[[${privateTarget}#Confidential Heading|Visible label]]`;
const articleSource = publishableSource(
  "Preview Article",
  "preview-article",
  "blog",
  `First paragraph.\n\n${privateLink}\n\n[[Unresolved target|Reference]]\n\n![[diagram.png]]`,
);
const retiringSource = publishableSource("Retiring Note", "retiring-note", "notes", "Retained copy.");
const initialImage = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]);
const articleOutput = "blog/preview-article.md";
const retiringOutput = "notes/retiring-note.md";
const imageOutput = "preview-article/diagram.png";

function publishableSource(title: string, slug: string, target: "blog" | "notes", body: string): string {
  return `---
title: "${title}"
description: "Synthetic publishing workflow fixture."
created: 2026-09-01
publish_target: ${target}
publish_status: published
publish_slug: ${slug}
publish_visibility: public
---

${body}
`;
}

async function writeFixture(file: string, content: string | Buffer): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

async function snapshotFiles(directory: string): Promise<Record<string, Buffer>> {
  const files = await readdir(directory, { recursive: true, withFileTypes: true });
  const contents = await Promise.all(files.filter((file) => file.isFile()).map(async (file) => {
    const absolutePath = path.join(file.parentPath, file.name);
    return [path.relative(directory, absolutePath), await readFile(absolutePath)] as const;
  }));
  return Object.fromEntries(contents);
}

async function createFixture(t: TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), "blogsite-workflow-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const destination = path.join(root, "destination");
  const options: SyncOptions = {
    vaultPath: path.join(root, "vault"),
    contentOutputPath: path.join(destination, "content"),
    imageOutputPath: path.join(destination, "public", "images"),
    reportsPath: path.join(destination, "reports"),
    excludeVaultDirs: ["90-Attachments"],
    sourceRoots: ["60-Publish/Blog/", "10-Notes/"],
    routes: { blog: "/blog", notes: "/notes", projects: "/projects" },
  };
  const article = path.join(options.vaultPath, "60-Publish", "Blog", "Preview Article.md");
  const retiring = path.join(options.vaultPath, "10-Notes", "Retiring Note.md");
  const image = path.join(options.vaultPath, "90-Attachments", "diagram.png");
  const privateNote = path.join(options.vaultPath, privateTarget);
  const manual = path.join(options.contentOutputPath, "blog", "manual.md");

  await Promise.all([
    writeFixture(article, articleSource),
    writeFixture(retiring, retiringSource),
    writeFixture(image, initialImage),
    writeFixture(privateNote, "Private synthetic body.\n"),
    writeFixture(manual, "Hand-authored content.\n"),
    writeFixture(path.join(options.imageOutputPath, "manual", "diagram.png"), initialImage),
  ]);

  const newPreview = () => mkdtemp(path.join(root, "preview-"));
  const preview = (previewRoot: string) => syncFromVault(options, { mode: "preview", previewRoot });
  const apply = (previewRoot: string) => syncFromVault(options, { mode: "apply", previewRoot });
  const snapshot = () => snapshotFiles(destination);

  async function applyBaseline(): Promise<void> {
    const previewRoot = await newPreview();
    assert.equal((await preview(previewRoot)).errors, 0);
    assert.equal((await apply(previewRoot)).synced, 2);
  }

  return { options, article, retiring, image, privateNote, newPreview, preview, apply, applyBaseline, snapshot };
}

test("预演隔离正式目录，无关笔记更新和新增仍允许正式同步", async (t) => {
  const fixture = await createFixture(t);
  const before = await fixture.snapshot();
  const previewRoot = await fixture.newPreview();
  await assert.rejects(fixture.apply(previewRoot));
  assert.deepEqual(await fixture.snapshot(), before);

  const preview = await fixture.preview(previewRoot);
  assert.equal(preview.errors, 0);
  assert.equal(preview.synced, 2);
  const previewArticle = await readFile(path.join(previewRoot, "content", articleOutput), "utf8");
  assert.match(previewArticle, /Visible label/);
  assert.deepEqual(await readFile(path.join(previewRoot, "public", "images", imageOutput)), initialImage);
  assert.deepEqual(await fixture.snapshot(), before);

  await Promise.all([
    writeFixture(fixture.privateNote, "Updated private body.\n"),
    writeFixture(path.join(fixture.options.vaultPath, "Private", "Unrelated Note.md"), "Unrelated body.\n"),
  ]);
  const applied = await fixture.apply(previewRoot);
  assert.equal(applied.errors, 0);
  assert.equal(applied.synced, 2);
  assert.equal(applied.scannedVaultFiles, preview.scannedVaultFiles + 1);
  const after = await fixture.snapshot();
  for (const [file, content] of Object.entries(before)) {
    assert.deepEqual(after[file], content, file);
  }
  assert.equal(after[path.join("content", articleOutput)].toString("utf8"), previewArticle);
});

test("重复 slug 阻断正式同步，失败预演保留有效条目且修复后可重试", async (t) => {
  const fixture = await createFixture(t);
  await fixture.applyBaseline();
  const before = await fixture.snapshot();
  const approved = await fixture.newPreview();
  assert.equal((await fixture.preview(approved)).errors, 0);

  const duplicate = path.join(fixture.options.vaultPath, "10-Notes", "Duplicate.md");
  await writeFixture(duplicate, publishableSource("Duplicate", "preview-article", "notes", "Duplicate slug."));
  await assert.rejects(fixture.apply(approved));
  assert.deepEqual(await fixture.snapshot(), before);

  const failed = await fixture.newPreview();
  const summary = await fixture.preview(failed);
  assert.equal(summary.errors, 1);
  assert.equal(summary.synced, 1);
  assert.match(await readFile(path.join(failed, "content", retiringOutput), "utf8"), /Retained copy\./);
  const manifest = JSON.parse(await readFile(path.join(failed, "reports", "publish-manifest.json"), "utf8"));
  assert.deepEqual(manifest.entries.map((entry: { slug: string }) => entry.slug), ["retiring-note"]);
  const diagnostics = JSON.parse(await readFile(path.join(failed, "local-diagnostics.json"), "utf8"));
  assert.match(JSON.stringify(diagnostics.errors), /preview-article/);
  await assert.rejects(fixture.apply(failed));
  assert.deepEqual(await fixture.snapshot(), before);

  await rm(duplicate);
  await writeFixture(fixture.article, articleSource.replace("First paragraph.", "Revised paragraph."));
  await fixture.applyBaseline();
  assert.match(await readFile(path.join(fixture.options.contentOutputPath, articleOutput), "utf8"), /Revised paragraph\./);
});

test("正式同步拒绝预演后的发布产物变化并保留既有输出", async (t) => {
  const fixture = await createFixture(t);
  await fixture.applyBaseline();
  const before = await fixture.snapshot();
  const target = path.join(fixture.options.vaultPath, "Private", "Unresolved target.md");

  const changes = [
    {
      name: "公开 Markdown",
      change: () => writeFixture(fixture.article, articleSource.replace("First paragraph.", "Changed paragraph.")),
      restore: () => writeFixture(fixture.article, articleSource),
    },
    {
      name: "图片内容",
      change: () => writeFixture(fixture.image, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff])),
      restore: () => writeFixture(fixture.image, initialImage),
    },
    {
      name: "已发布条目退役",
      change: () => rm(fixture.retiring),
      restore: () => writeFixture(fixture.retiring, retiringSource),
    },
    {
      name: "双链解析结果",
      change: () => writeFixture(target, "Now known but unpublished.\n"),
      restore: () => rm(target),
    },
  ];
  for (const { name, change, restore } of changes) {
    await t.test(name, async () => {
      const previewRoot = await fixture.newPreview();
      assert.equal((await fixture.preview(previewRoot)).errors, 0);
      await change();
      try {
        await assert.rejects(fixture.apply(previewRoot));
        assert.deepEqual(await fixture.snapshot(), before);
      } finally {
        await restore();
      }
    });
  }
});

test("同一份无效 YAML 每次都阻断预演和正式写入", async (t) => {
  const fixture = await createFixture(t);
  await fixture.applyBaseline();
  const before = await fixture.snapshot();
  const approved = await fixture.newPreview();
  assert.equal((await fixture.preview(approved)).errors, 0);
  await writeFixture(fixture.article, "---\ntitle: [invalid\n---\n");
  for (let attempt = 0; attempt < 2; attempt++) {
    const retry = await fixture.newPreview();
    assert.equal((await fixture.preview(retry)).errors, 1);
    await assert.rejects(fixture.apply(retry));
  }
  await assert.rejects(fixture.apply(approved));
  assert.deepEqual(await fixture.snapshot(), before);
});

test("正式目录中新出现的受管页面须先审阅再删除，同一收据可安全重试", async (t) => {
  const fixture = await createFixture(t);
  await fixture.applyBaseline();
  const approved = await fixture.newPreview();
  assert.equal((await fixture.preview(approved)).errors, 0);

  const latePage = path.join(fixture.options.contentOutputPath, "notes/late.md");
  await writeFixture(latePage, "---\nmanagedBy: vault-sync\n---\nLate addition.\n");
  const before = await fixture.snapshot();
  await assert.rejects(fixture.apply(approved));
  assert.deepEqual(await fixture.snapshot(), before);

  const reviewed = await fixture.newPreview();
  assert.equal((await fixture.preview(reviewed)).errors, 0);
  const details = JSON.parse(await readFile(path.join(reviewed, "local-diagnostics.json"), "utf8"));
  assert.deepEqual(details.retiredPages, ["notes/late.md"]);
  await fixture.apply(reviewed);
  await assert.rejects(readFile(latePage), { code: "ENOENT" });
  assert.equal((await fixture.apply(reviewed)).errors, 0);
});

test("缺图显示文字相同时，公开图片告警中的目标变化也需要重新预演", async (t) => {
  const fixture = await createFixture(t);
  await fixture.applyBaseline();
  const before = await fixture.snapshot();
  await writeFixture(fixture.article, articleSource.replace("diagram.png", "Old/missing.png"));
  const approved = await fixture.newPreview();
  assert.equal((await fixture.preview(approved)).errors, 0);
  await writeFixture(fixture.article, articleSource.replace("diagram.png", "New/missing.png"));
  await assert.rejects(fixture.apply(approved), /重新预演/);
  assert.deepEqual(await fixture.snapshot(), before);
});

test("新增进入公开同步报告的跳过明细需要重新预演", async (t) => {
  const fixture = await createFixture(t);
  await fixture.applyBaseline();
  const approved = await fixture.newPreview();
  assert.equal((await fixture.preview(approved)).errors, 0);
  const before = await fixture.snapshot();
  const noSlug = retiringSource.replace(/^publish_slug: .*\n/mu, "");
  await writeFixture(path.join(fixture.options.vaultPath, "10-Notes/Needs Slug.md"), noSlug);
  await assert.rejects(fixture.apply(approved), /重新预演/);
  assert.deepEqual(await fixture.snapshot(), before);
});

test("预演报告指出手工稿冲突，正式同步也阻止预演后才出现的手工稿冲突", async (t) => {
  const fixture = await createFixture(t);
  const approved = await fixture.newPreview();
  assert.equal((await fixture.preview(approved)).errors, 0);

  const manualOutput = "blog/preview-article.mdx";
  await writeFixture(path.join(fixture.options.contentOutputPath, manualOutput), "New hand-authored content.\n");
  const withManual = await fixture.snapshot();
  await assert.rejects(fixture.apply(approved));
  assert.deepEqual(await fixture.snapshot(), withManual);

  const failed = await fixture.newPreview();
  assert.ok((await fixture.preview(failed)).errors > 0);
  const diagnostics = JSON.parse(await readFile(path.join(failed, "local-diagnostics.json"), "utf8"));
  assert.match(JSON.stringify(diagnostics.errors), /blog\/preview-article\.mdx/);
  await assert.rejects(fixture.apply(failed));
  assert.deepEqual(await fixture.snapshot(), withManual);
});

test("公开双链报告保留位置与原因，完整双链只写入本地诊断", async (t) => {
  const fixture = await createFixture(t);
  const previewRoot = await fixture.newPreview();
  assert.equal((await fixture.preview(previewRoot)).errors, 0);
  const reportPath = path.join("reports", "wikilink-warnings.md");
  const report = await readFile(path.join(previewRoot, reportPath), "utf8");
  const warning = report.split("\n").find((line) => line.includes("target-not-published"));
  assert.ok(warning);
  assert.match(warning, /blog\/preview-article\.md/);
  const body = articleSource.split("\n---\n", 2)[1];
  const lineNumber = body.slice(0, body.indexOf(privateLink)).split("\n").length;
  assert.match(warning, new RegExp(`line: ${lineNumber}\\b`, "u"));
  assert.doesNotMatch(report, /Visible label|\[\[/);

  const diagnostics = JSON.parse(await readFile(path.join(previewRoot, "local-diagnostics.json"), "utf8"));
  const details = diagnostics.wikilinks.find((entry: { target: string }) => entry.target === privateTarget);
  assert.equal(details?.link, privateLink);

  await fixture.apply(previewRoot);
  const published = await fixture.snapshot();
  assert.equal(published[reportPath].toString("utf8"), report);
  for (const [file, content] of Object.entries(published)) {
    assert.doesNotMatch(file, /local-diagnostics/);
    assert.doesNotMatch(content.toString("utf8"), /Synthetic Confidential Target|Confidential Heading/, file);
  }
});

test("命令行可将成功的预演独立应用到正式目录", async (t) => {
  const fixture = await createFixture(t);
  const previewRoot = await fixture.newPreview();
  const run = promisify(execFile);
  const settings = {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: {
      ...process.env,
      BLOGSITE_VAULT_PATH: fixture.options.vaultPath,
      BLOGSITE_CONTENT_OUTPUT_PATH: fixture.options.contentOutputPath,
      BLOGSITE_IMAGE_OUTPUT_PATH: fixture.options.imageOutputPath,
      BLOGSITE_REPORTS_PATH: fixture.options.reportsPath,
    },
  };
  const before = await fixture.snapshot();
  await run("pnpm", ["sync:vault", "--preview", previewRoot], settings);
  assert.deepEqual(await fixture.snapshot(), before);
  await run("pnpm", ["sync:vault", "--apply", previewRoot], settings);
  assert.match(await readFile(path.join(fixture.options.contentOutputPath, articleOutput), "utf8"), /First paragraph\./);
});
