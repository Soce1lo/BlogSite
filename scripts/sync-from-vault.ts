import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import publishConfig from "../publish.config";
import { prepareVaultSync, type SyncDiagnostics, type SyncOptions, type SyncSummary } from "./prepare-vault-sync";
import { applyPreparedOutputs, type OutputLocations } from "./sync-outputs";
import { isPathInside, toPosixPath, walkFiles } from "./utils/path";

export type { SyncOptions, SyncSummary };
export interface SyncRun {
  mode: "preview" | "apply";
  previewRoot: string;
}

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const receiptName = "review-receipt.json";
const diagnosticsName = "local-diagnostics.json";

function previewOutputs(root: string): OutputLocations {
  return {
    contentOutputPath: path.join(root, "content"),
    imageOutputPath: path.join(root, "public", "images"),
    reportsPath: path.join(root, "reports"),
  };
}

// Resolve existing ancestors too, so a new output underneath a symlink cannot enter the Vault.
async function resolveLocation(location: string): Promise<string> {
  const absolute = path.resolve(location);
  try {
    return await realpath(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const info = await lstat(absolute).catch((cause: NodeJS.ErrnoException) => {
      if (cause.code !== "ENOENT") throw cause;
    });
    if (info?.isSymbolicLink()) throw new Error(`目录是无效的符号链接: ${absolute}`);
    return path.join(await resolveLocation(path.dirname(absolute)), path.basename(absolute));
  }
}

function overlap(a: string, b: string): boolean {
  return isPathInside(a, b) || isPathInside(b, a);
}

async function canonicalOutputs(options: OutputLocations): Promise<OutputLocations> {
  const [contentOutputPath, imageOutputPath, reportsPath] = await Promise.all([
    resolveLocation(options.contentOutputPath),
    resolveLocation(options.imageOutputPath),
    resolveLocation(options.reportsPath),
  ]);
  return { contentOutputPath, imageOutputPath, reportsPath };
}

// Review the planned public result. Scan counts and generation time can change without changing a page.
async function outputDigest(outputs: OutputLocations): Promise<string> {
  const entries: [string, string][] = [];
  for (const [prefix, root] of [["content", outputs.contentOutputPath], ["images", outputs.imageOutputPath]]) {
    for (const file of await walkFiles(root)) {
      const name = `${prefix}/${toPosixPath(path.relative(root, file))}`;
      entries.push([name, createHash("sha256").update(await readFile(file)).digest("hex")]);
    }
  }
  entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const readReport = (name: string) => readFile(path.join(outputs.reportsPath, name), "utf8");
  const [json, manifestMarkdown, syncReport, wikilinks, assets] = await Promise.all([
    "publish-manifest.json", "publish-manifest.md", "sync-report.md", "wikilink-warnings.md", "asset-warnings.md",
  ].map(readReport));
  const manifest = JSON.parse(json);
  delete manifest.generatedAt;
  delete manifest.summary.scannedVaultFiles;
  // Skip counters can reflect unrelated private notes. Keep every detail row reviewers can read.
  const stableSyncReport = syncReport.replace(/^- (?:scanned_vault_files|skipped_\w+): \d+$/gmu, "");
  const stableManifest = manifestMarkdown.replace(/^- (?:generated_at|scanned_vault_files): .*$/gmu, "");
  return createHash("sha256")
    .update(JSON.stringify([entries, manifest, stableManifest, stableSyncReport, wikilinks, assets]))
    .digest("hex");
}

async function prepare(
  options: SyncOptions, destination: OutputLocations, root: string, diagnostics: SyncDiagnostics,
): Promise<SyncSummary> {
  const prepared = previewOutputs(root);
  return prepareVaultSync({ ...options, ...prepared }, destination, diagnostics);
}

async function writeDiagnostics(root: string, diagnostics: SyncDiagnostics): Promise<void> {
  await writeFile(path.join(root, diagnosticsName), JSON.stringify(diagnostics, null, 2) + "\n", { mode: 0o600 });
}

async function createReview(
  options: SyncOptions, destination: OutputLocations, root: string,
): Promise<SyncSummary> {
  await mkdir(root, { recursive: true, mode: 0o700 });
  if ((await readdir(root)).length) throw new Error("预演需要一个新的空目录。");
  await chmod(root, 0o700);
  const receiptFile = path.join(root, receiptName);
  // Reserve the directory before writing any output, including when two previews start together.
  await writeFile(receiptFile, "{}\n", { flag: "wx", mode: 0o600 });
  const diagnostics: SyncDiagnostics = { errors: [], wikilinks: [], retiredPages: [] };
  let summary: SyncSummary;
  try {
    summary = await prepare(options, destination, root, diagnostics);
  } catch (error) {
    diagnostics.errors.push(String(error));
    throw error;
  } finally {
    await writeDiagnostics(root, diagnostics);
  }
  if (!summary.errors) {
    const digest = await outputDigest(previewOutputs(root));
    const receipt = { destination: await canonicalOutputs(destination), digest, retiredPages: diagnostics.retiredPages };
    await writeFile(receiptFile, JSON.stringify(receipt) + "\n");
  }
  return summary;
}

async function applyReview(
  options: SyncOptions, destination: OutputLocations, reviewRoot: string,
): Promise<SyncSummary> {
  const attempt = await mkdtemp(path.join(await realpath(tmpdir()), "blogsite-apply-"));
  const stage = path.join(attempt, "prepared");
  const prepared = previewOutputs(stage);
  const diagnostics: SyncDiagnostics = { errors: [], wikilinks: [], retiredPages: [] };
  let failed = false;
  try {
    const receipt = await readFile(path.join(reviewRoot, receiptName), "utf8")
      .then((s) => JSON.parse(s)).catch(() => null);
    const currentDestination = await canonicalOutputs(destination);
    if (typeof receipt?.digest !== "string" || !Array.isArray(receipt.retiredPages) ||
        JSON.stringify(receipt.destination) !== JSON.stringify(currentDestination)) {
      throw new Error("正式同步需要针对当前目的地的成功预演，请先运行 --preview。");
    }
    if (receipt.digest !== await outputDigest(previewOutputs(reviewRoot))) {
      throw new Error("预演目录的待发布内容已改变，请重新预演。");
    }
    const summary = await prepare(options, destination, stage, diagnostics);
    if (summary.errors) throw new Error(`正式同步发现 ${summary.errors} 个错误。`);
    if (receipt.digest !== await outputDigest(prepared)) {
      throw new Error("待发布内容与已审预演不同，请重新预演。");
    }
    await applyPreparedOutputs(prepared, destination, receipt.retiredPages);
    return summary;
  } catch (error) {
    failed = true;
    diagnostics.errors.push(String(error));
    await writeDiagnostics(attempt, diagnostics);
    throw new Error(`${error instanceof Error ? error.message : error} 本次诊断: ${path.join(attempt, diagnosticsName)}`, { cause: error });
  } finally {
    const discard = failed ? stage : attempt;
    await rm(discard, { recursive: true, force: true }).catch((error: unknown) =>
      console.warn(`请清理本机暂存目录 ${discard}: ${String(error)}`),
    );
  }
}

export async function syncFromVault(options: SyncOptions, run: SyncRun): Promise<SyncSummary> {
  if (!run?.previewRoot || !["preview", "apply"].includes(run.mode)) {
    throw new Error("请指定 --preview <空目录> 或 --apply <已审预演目录>。");
  }
  const vaultPath = await realpath(options.vaultPath);
  const checked = await canonicalOutputs(options);
  const destination: OutputLocations = {
    contentOutputPath: path.resolve(options.contentOutputPath),
    imageOutputPath: path.resolve(options.imageOutputPath),
    reportsPath: path.resolve(options.reportsPath),
  };
  const reviewRoot = await resolveLocation(run.previewRoot);
  const outputs = Object.values(checked);
  if (outputs.some((p) => overlap(p, vaultPath))) throw new Error("输出目录不得位于 Vault 内部或包含 Vault。");
  if (outputs.some((p, i) => outputs.slice(i + 1).some((other) => overlap(p, other)))) {
    throw new Error("内容、图片和报告需要使用互不重叠的输出目录。");
  }
  if ([vaultPath, await realpath(repoRoot), ...outputs].some((p) => overlap(p, reviewRoot))) {
    throw new Error("预演目录必须与仓库、Vault 和正式输出目录分开。");
  }
  const tempRoot = await realpath(tmpdir());
  if (run.mode === "apply" && [vaultPath, await realpath(repoRoot), ...outputs, reviewRoot].some((p) => isPathInside(p, tempRoot))) {
    throw new Error("系统临时目录不可位于仓库、Vault、预演或正式输出内。");
  }
  const resolved = { ...options, vaultPath };
  return run.mode === "preview"
    ? createReview(resolved, destination, reviewRoot)
    : applyReview(resolved, destination, reviewRoot);
}

function cliRun(args: string[]): SyncRun {
  const [flag, previewRoot] = args;
  if (args.length === 2 && previewRoot && (flag === "--preview" || flag === "--apply")) {
    return { mode: flag === "--preview" ? "preview" : "apply", previewRoot };
  }
  if (!args.length && process.env.BLOGSITE_REVIEWED_PREVIEW) {
    return { mode: "apply", previewRoot: process.env.BLOGSITE_REVIEWED_PREVIEW };
  }
  throw new Error("用法: pnpm sync:vault --preview <空目录> 或 --apply <已审预演目录>。");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const run = cliRun(process.argv.slice(2));
    const summary = await syncFromVault({
      ...publishConfig,
      excludeVaultDirs: [...publishConfig.excludeVaultDirs],
      sourceRoots: [...publishConfig.sourceRoots],
    }, run);
    console.log(`${run.mode === "preview" ? "预演" : "正式同步"}完成: synced=${summary.synced}, warnings=${summary.warnings}, errors=${summary.errors}`);
    if (run.mode === "preview") console.log(`本地诊断: ${path.resolve(run.previewRoot, diagnosticsName)}`);
    if (summary.errors) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
