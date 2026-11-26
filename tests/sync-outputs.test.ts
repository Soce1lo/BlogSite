import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, type TestContext } from "node:test";
import { applyPreparedOutputs, inspectOutputPlan, type OutputLocations } from "../scripts/sync-outputs";

const reportNames = [
  "asset-warnings.md", "publish-manifest.json", "publish-manifest.md", "sync-report.md", "wikilink-warnings.md",
];

const managed = (body: string) => `---\nmanagedBy: vault-sync\n---\n${body}\n`;

async function write(root: string, file: string, body: string): Promise<string> {
  const target = path.join(root, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
  return target;
}

async function fixture(t: TestContext) {
  const root = await fs.mkdtemp(path.join(await fs.realpath(tmpdir()), "blogsite-outputs-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const locations = (scope: string): OutputLocations => ({
    contentOutputPath: path.join(root, scope, "content"),
    imageOutputPath: path.join(root, scope, "images"),
    reportsPath: path.join(root, scope, "reports"),
  });
  return { root, prepared: locations("prepared"), destination: locations("destination") };
}

async function writeReports(locations: OutputLocations, label: string) {
  for (const report of reportNames) await write(locations.reportsPath, report, `${label} ${report}`);
}

async function snapshot(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function visit(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const relative = path.relative(root, file);
      if (entry.isDirectory()) {
        result[relative] = "directory";
        await visit(file);
      } else if (entry.isSymbolicLink()) {
        result[relative] = await fs.readlink(file);
      } else {
        result[relative] = await fs.readFile(file, "utf8");
      }
    }
  }
  await visit(root);
  return result;
}

test("安装受管内容、图片和报告，清理退役输出，保留手工文件", async (t) => {
  const { prepared, destination } = await fixture(t);
  const oldMarkdown = await write(destination.contentOutputPath, "blog/moved.md", managed("旧正文"));
  const retiredMarkdown = await write(destination.contentOutputPath, "notes/history/retired.mdx", managed("退役正文"));
  const retiredImage = await write(destination.imageOutputPath, "retired/old.png", "退役图片");
  const oldImage = await write(destination.imageOutputPath, "moved/old.png", "旧图片");
  const manualMarkdown = await write(destination.contentOutputPath, "blog/manual.mdx", "手工稿");
  const manualImage = await write(destination.imageOutputPath, "manual/image.png", "手工图片");
  const manualReport = await write(destination.reportsPath, "historical-report.md", "手工报告");
  await writeReports(destination, "旧");

  const newMarkdown = await write(prepared.contentOutputPath, "projects/moved.md", managed("新正文"));
  await write(prepared.imageOutputPath, "moved/new.png", "新图片");
  await writeReports(prepared, "新");
  await write(prepared.reportsPath, "internal.md", "非约定报告");
  const preparedBefore = await snapshot(path.dirname(prepared.contentOutputPath));

  const { retiredPages } = await inspectOutputPlan(prepared, destination);
  assert.deepEqual(retiredPages, ["blog/moved.md", "notes/history/retired.mdx"]);
  await applyPreparedOutputs(prepared, destination, retiredPages);
  await applyPreparedOutputs(prepared, destination, retiredPages);

  assert.equal(await fs.readFile(path.join(destination.contentOutputPath, "projects/moved.md"), "utf8"), managed("新正文"));
  assert.equal(await fs.readFile(path.join(destination.imageOutputPath, "moved/new.png"), "utf8"), "新图片");
  for (const missing of [oldMarkdown, oldImage, retiredMarkdown, retiredImage, path.join(destination.reportsPath, "internal.md")]) {
    await assert.rejects(fs.lstat(missing), { code: "ENOENT" });
  }
  assert.equal(await fs.readFile(manualMarkdown, "utf8"), "手工稿");
  assert.equal(await fs.readFile(manualImage, "utf8"), "手工图片");
  assert.equal(await fs.readFile(manualReport, "utf8"), "手工报告");
  for (const report of reportNames) assert.equal(await fs.readFile(path.join(destination.reportsPath, report), "utf8"), `新 ${report}`);
  assert.equal(await fs.readFile(newMarkdown, "utf8"), managed("新正文"));
  assert.deepEqual(await snapshot(path.dirname(prepared.contentOutputPath)), preparedBefore);
  assert.ok(Object.keys(await snapshot(path.dirname(destination.contentOutputPath))).every((file) => !file.includes(".vault-sync-")));
});

test("报告整批手工路由和图片冲突，预检可先于生成报告", async (t) => {
  const { root, prepared, destination } = await fixture(t);
  await write(destination.contentOutputPath, "blog/manual.md", "同名手工稿");
  await write(destination.contentOutputPath, "blog/article.mdx", "同路由手工 MDX");
  await write(destination.contentOutputPath, "blog/Folded/index.md", "折叠 index");
  await write(destination.contentOutputPath, "notes/another.md", "---\nslug: renamed\n---\n自定义路由");
  await write(destination.imageOutputPath, "image/manual.png", "手工图片");
  await write(destination.contentOutputPath, "blog/legacy.md", managed("旧管理稿"));
  const sharedImage = await write(destination.imageOutputPath, "legacy/shared.png", "历史共享图片");
  await write(destination.contentOutputPath, "notes/legacy/index.md", "手工稿共享图片目录");
  for (const file of ["blog/manual.md", "blog/article.md", "blog/folded.md", "notes/renamed.md", "blog/image.md"]) {
    await write(prepared.contentOutputPath, file, managed("新内容"));
  }
  await write(prepared.imageOutputPath, "image/generated.png", "新图片");
  const destinationBefore = await snapshot(path.join(root, "destination"));
  const conflicts = ["内容 blog/Folded/index.md", "内容 blog/article.mdx", "内容 blog/manual.md", "内容 notes/another.md", "图片 image"];
  assert.deepEqual((await inspectOutputPlan(prepared, destination)).conflicts, conflicts);
  await writeReports(prepared, "新");
  await assert.rejects(applyPreparedOutputs(prepared, destination), (error: Error) =>
    conflicts.every((conflict) => error.message.includes(conflict)),
  );
  assert.deepEqual(await snapshot(path.join(root, "destination")), destinationBefore);
  await fs.rm(prepared.contentOutputPath, { recursive: true });
  await applyPreparedOutputs(prepared, destination);
  assert.equal(await fs.readFile(sharedImage, "utf8"), "历史共享图片");
});

test("按 Astro 的 URL 规则识别斜杠和编码等价路由", async (t) => {
  const { prepared, destination } = await fixture(t);
  const customSlugs: Record<string, string> = {
    "leading.mdx": "/article",
    "trailing.mdx": "article/",
    "encoded.mdx": "a%2572ticle",
    "different-case.mdx": "Article",
    "escaped-slash.mdx": "article%2F",
    "trailing-space.mdx": "article ",
  };
  for (const [file, slug] of Object.entries(customSlugs)) {
    await write(destination.contentOutputPath, `blog/${file}`, `---\nslug: ${JSON.stringify(slug)}\n---\n手工稿`);
  }
  await write(prepared.contentOutputPath, "blog/article.md", managed("新内容"));
  const { conflicts } = await inspectOutputPlan(prepared, destination);
  assert.deepEqual(conflicts, ["内容 blog/encoded.mdx", "内容 blog/leading.mdx", "内容 blog/trailing.mdx"]);
});

test("拒绝内容集合下参与 Astro 扫描的符号链接，且不解析链接目标", async (t) => {
  const { root, prepared, destination } = await fixture(t);
  await writeReports(prepared, "新");
  await write(prepared.contentOutputPath, "blog/article.md", managed("新内容"));
  const externalFile = await write(root, "external/linked.mdx", "---\nslug: [article\n---\n链接目标不应被解析");
  const blog = path.join(destination.contentOutputPath, "blog");
  await fs.mkdir(path.join(blog, "nested"), { recursive: true });
  await fs.symlink(externalFile, path.join(blog, "nested/alias.mdx"));
  await fs.symlink(path.dirname(externalFile), path.join(blog, "directory-alias"), "dir");
  await fs.symlink(path.dirname(externalFile), path.join(blog, ".hidden-alias"), "dir");

  const { conflicts } = await inspectOutputPlan(prepared, destination);
  assert.deepEqual(conflicts, ["内容路径为符号链接 blog/directory-alias", "内容路径为符号链接 blog/nested/alias.mdx"]);
  const before = await snapshot(root);
  await assert.rejects(applyPreparedOutputs(prepared, destination), /同步输出冲突/u);
  assert.deepEqual(await snapshot(root), before);
});

test("符号链接目标会阻止变更，链接和指向内容均保留", async (t) => {
  const { root, prepared, destination } = await fixture(t);
  await write(prepared.contentOutputPath, "blog/result.md", managed("新内容"));
  await write(prepared.imageOutputPath, "result/result.png", "新图片");
  await writeReports(prepared, "新");
  const oldMarkdown = await write(destination.contentOutputPath, "blog/result.md", managed("旧内容"));
  const externalImage = await write(root, "external/image.png", "外部图片");
  await fs.mkdir(path.join(destination.imageOutputPath, "result"), { recursive: true });
  await fs.symlink(externalImage, path.join(destination.imageOutputPath, "result/image.png"));
  await fs.mkdir(destination.reportsPath, { recursive: true });
  await fs.symlink(externalImage, path.join(destination.reportsPath, "sync-report.md"));
  assert.deepEqual((await inspectOutputPlan(prepared, destination)).conflicts, ["图片 result", "报告 sync-report.md"]);
  await assert.rejects(applyPreparedOutputs(prepared, destination), /同步输出冲突/u);
  assert.equal(await fs.readFile(oldMarkdown, "utf8"), managed("旧内容"));
  assert.equal(await fs.readFile(externalImage, "utf8"), "外部图片");

  const parentLink = path.join(root, "linked-parent");
  await fs.symlink(path.dirname(externalImage), parentLink, "dir");
  await assert.rejects(
    applyPreparedOutputs(prepared, { ...destination, imageOutputPath: path.join(parentLink, "images") }),
    /输出路径必须是实际目录/u,
  );
  await assert.rejects(fs.lstat(path.join(parentLink, "images")), { code: "ENOENT" });
});

async function failureFixture(t: TestContext) {
  const { root, prepared, destination } = await fixture(t);
  await write(prepared.contentOutputPath, "blog/result.md", managed("新正文"));
  await write(prepared.contentOutputPath, "notes/new.md", managed("新增正文"));
  await write(prepared.imageOutputPath, "result/new.png", "新图片");
  await writeReports(prepared, "新");
  await write(destination.contentOutputPath, "blog/result.md", managed("旧正文"));
  await write(destination.contentOutputPath, "blog/retired.md", managed("退役正文"));
  await write(destination.imageOutputPath, "result/old.png", "旧图片");
  await writeReports(destination, "旧");
  return { root, prepared, destination };
}

test("持锁后拒绝预演未包含的受管页面删除", async (t) => {
  const { root, prepared, destination } = await failureFixture(t);
  const { retiredPages } = await inspectOutputPlan(prepared, destination);
  assert.deepEqual(retiredPages, ["blog/retired.md"]);
  await write(destination.contentOutputPath, "projects/added.md", managed("预演后新出现的受管页"));
  const before = await snapshot(root);
  await assert.rejects(applyPreparedOutputs(prepared, destination, retiredPages), /新增的待退役页面:\nprojects\/added.md/u);
  assert.deepEqual(await snapshot(root), before);
});

test("安装部分报告后失败，恢复旧正文、图片和报告并移除新增文件", async (t) => {
  const { root, prepared, destination } = await failureFixture(t);
  const before = await snapshot(root);
  const rename = fs.rename;
  const failure = new Error("模拟安装报告失败");
  const report = path.join(destination.reportsPath, "publish-manifest.json");
  t.mock.method(fs, "rename", async (source: string, target: string) => {
    if (path.basename(source).startsWith("next-") && target === report) throw failure;
    await rename(source, target);
  });
  await assert.rejects(applyPreparedOutputs(prepared, destination), failure);
  assert.deepEqual(await snapshot(root), before);
});

test("恢复失败时保留备份和锁，后续写者收到锁定错误", async (t) => {
  const { root, prepared, destination } = await failureFixture(t);
  const rename = fs.rename;
  const oldMarkdown = path.join(destination.contentOutputPath, "blog/result.md");
  const report = path.join(destination.reportsPath, "publish-manifest.json");
  t.mock.method(fs, "rename", async (source: string, target: string) => {
    if (path.basename(source).startsWith("next-") && target === report) throw new Error("模拟安装失败");
    if (path.basename(source).startsWith("previous-") && target === oldMarkdown) throw new Error("模拟还原失败");
    await rename(source, target);
  });
  await assert.rejects(applyPreparedOutputs(prepared, destination), (error: AggregateError) =>
    error.errors.length === 2 && error.message.includes("已保留工作目录和锁") &&
    error.message.includes(`恢复 ${oldMarkdown}`),
  );
  const after = await snapshot(path.join(root, "destination"));
  assert.ok(Object.entries(after).some(([file, contents]) => file.includes("previous-") && contents === managed("旧正文")));
  await assert.rejects(applyPreparedOutputs(prepared, destination), /输出目录已锁定/u);
});

test("安装完成后清理失败只告警，并告知残留位置", async (t) => {
  const { prepared, destination } = await failureFixture(t);
  const rm = fs.rm;
  let remaining: string | undefined;
  t.mock.method(fs, "rm", async (target: string, options?: Parameters<typeof rm>[1]) => {
    if (path.dirname(target) === destination.reportsPath && path.basename(target).startsWith(".vault-sync-work-")) {
      remaining = target;
      throw new Error("模拟清理工作目录失败");
    }
    await rm(target, options);
  });
  const warn = t.mock.method(console, "warn", () => {});
  await applyPreparedOutputs(prepared, destination);
  assert.equal(await fs.readFile(path.join(destination.reportsPath, "sync-report.md"), "utf8"), "新 sync-report.md");
  assert.ok(remaining);
  assert.ok((await fs.stat(remaining)).isDirectory());
  assert.equal(warn.mock.callCount(), 1);
  const remainingWorkspace = remaining;
  assert.ok(warn.mock.calls[0].arguments.map(String).some((argument) => argument.includes(remainingWorkspace)));
});

test("另一同步写者持锁时，当前写者保留对方正在处理的输出", async (t) => {
  const { prepared, destination } = await failureFixture(t);
  const rename = fs.rename;
  let release: () => void = () => {};
  let started: () => void = () => {};
  const paused = new Promise<void>((resolve) => { release = resolve; });
  const installing = new Promise<void>((resolve) => { started = resolve; });
  t.mock.method(fs, "rename", async (source: string, target: string) => {
    started();
    await paused;
    await rename(source, target);
  });
  const first = applyPreparedOutputs(prepared, destination);
  await installing;
  try {
    await assert.rejects(applyPreparedOutputs(prepared, destination), /输出目录已锁定/u);
  } finally {
    release();
    await first;
  }
});
