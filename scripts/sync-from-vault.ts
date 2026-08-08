import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import publishConfig from "../publish.config";
import { PUBLISH_CONTRACT_VERSION } from "./contracts/publishing-v1";
import { buildAssetCatalog, createAssetHandler } from "./copy-assets";
import {
  normalizeMarkdown,
  type AssetWarning,
  type WikilinkWarning,
} from "./normalize-markdown";
import {
  readVaultDocument,
  serializePublishedMarkdown,
  toPublishedFrontmatter,
  type VaultDocument,
} from "./utils/frontmatter";
import {
  assertOutputsOutsideVault,
  isPathInside,
  toPosixPath,
  walkFiles,
} from "./utils/path";
import {
  collectKnownTargets,
  createVaultIndex,
  evaluatePublishCandidate,
  type PublishIndexEntry,
} from "./utils/vault-index";
import type { PublishTarget } from "./utils/vault-index";

export interface SyncOptions {
  vaultPath: string;
  contentOutputPath: string;
  imageOutputPath: string;
  reportsPath: string;
  excludeVaultDirs: string[];
  routes: Record<PublishTarget, string>;
}

export interface SyncSummary {
  scannedVaultFiles: number;
  publishCandidates: number;
  synced: number;
  skippedPrivate: number;
  skippedMissingSlug: number;
  skippedMissingDescription: number;
  skippedMissingTitle: number;
  skippedDaily: number;
  warnings: number;
  errors: number;
  outputs: Record<PublishTarget, number>;
}

interface Candidate {
  document: VaultDocument;
  entry: PublishIndexEntry;
}

interface SkippedContentEntry {
  sourceVaultPath: string;
  reason: "missing-slug";
  fix: string;
}

interface PublishManifestSummary {
  scannedVaultFiles: number;
  publishCandidates: number;
  synced: number;
  warnings: number;
  errors: number;
}

interface PublishManifestEntry {
  sourceVaultPath: string;
  collection: PublishTarget;
  slug: string;
  url: string;
  title: string;
  draft: boolean;
  publishedDate: string;
  visibility: PublishIndexEntry["visibility"];
  outputKind: PublishIndexEntry["outputKind"];
  series?: string;
  seriesOrder?: number;
  topic?: string;
  warnings: string[];
}

interface PublishManifest {
  contractVersion: typeof PUBLISH_CONTRACT_VERSION;
  generatedAt: string;
  summary: PublishManifestSummary;
  entries: PublishManifestEntry[];
}

function createEmptySummary(): SyncSummary {
  return {
    scannedVaultFiles: 0,
    publishCandidates: 0,
    synced: 0,
    skippedPrivate: 0,
    skippedMissingSlug: 0,
    skippedMissingDescription: 0,
    skippedMissingTitle: 0,
    skippedDaily: 0,
    warnings: 0,
    errors: 0,
    outputs: { blog: 0, notes: 0, projects: 0 },
  };
}

function shortInline(value: string): string {
  return value.replaceAll("`", "'").replace(/\s+/gu, " ").slice(0, 160);
}

function wikilinkReport(warnings: WikilinkWarning[]): string {
  const details = warnings.length
    ? warnings.map(
        (warning) =>
          `- file: \`${shortInline(warning.file)}\`; link: \`${shortInline(warning.link)}\`; target: \`${shortInline(warning.target)}\`; action: ${warning.action}; reason: ${warning.reason}`,
      )
    : ["暂无记录。"];
  return `# Wikilink Warnings\n\n${details.join("\n")}\n`;
}

function assetReport(warnings: AssetWarning[]): string {
  const details = warnings.length
    ? warnings.map(
        (warning) =>
          `- file: \`${shortInline(warning.file)}\`; asset: \`${shortInline(warning.asset)}\`; action: ${warning.action}; reason: ${warning.reason}`,
      )
    : ["暂无记录。"];
  return `# Asset Warnings\n\n${details.join("\n")}\n`;
}

function syncReport(
  summary: SyncSummary,
  wikilinkWarnings: WikilinkWarning[],
  assetWarnings: AssetWarning[],
  skippedContent: SkippedContentEntry[],
): string {
  const unpublishedLinks = wikilinkWarnings.filter((warning) =>
    warning.reason.startsWith("target-"),
  ).length;
  const droppedAnchors = wikilinkWarnings.length - unpublishedLinks;
  const missingImages = assetWarnings.filter(
    (warning) => warning.reason === "missing-asset",
  ).length;
  const skippedContentDetails = skippedContent.length
    ? skippedContent.map(
        (entry) =>
          `- source: \`${shortInline(entry.sourceVaultPath)}\`; reason: \`${entry.reason}\`; fix: ${entry.fix}`,
      )
    : ["暂无记录。"];
  return `# Sync Report

## Summary

- scanned_vault_files: ${summary.scannedVaultFiles}
- publish_candidates: ${summary.publishCandidates}
- synced: ${summary.synced}
- skipped_private: ${summary.skippedPrivate}
- skipped_missing_slug: ${summary.skippedMissingSlug}
- skipped_missing_title: ${summary.skippedMissingTitle}
- skipped_missing_description: ${summary.skippedMissingDescription}
- skipped_daily: ${summary.skippedDaily}
- warnings: ${summary.warnings}
- errors: ${summary.errors}

## Outputs

- blog: ${summary.outputs.blog}
- notes: ${summary.outputs.notes}
- projects: ${summary.outputs.projects}

## Skipped Content

${skippedContentDetails.join("\n")}

## Warnings

- unpublished_wikilinks_converted_to_text: ${unpublishedLinks}
- missing_images: ${missingImages}
- anchors_dropped: ${droppedAnchors}

## Detail Files

- wikilink warnings: \`reports/wikilink-warnings.md\`
- asset warnings: \`reports/asset-warnings.md\`
`;
}

function createManifestSummary(summary: SyncSummary): PublishManifestSummary {
  return {
    scannedVaultFiles: summary.scannedVaultFiles,
    publishCandidates: summary.publishCandidates,
    synced: summary.synced,
    warnings: summary.warnings,
    errors: summary.errors,
  };
}

function createManifestMarkdown(manifest: PublishManifest): string {
  const rows = manifest.entries.map((entry) =>
    [
      entry.sourceVaultPath,
      entry.collection,
      entry.slug,
      entry.url,
      entry.draft ? "draft" : "published",
      entry.publishedDate,
      entry.outputKind,
      String(entry.warnings.length),
    ].map((value) => value.replaceAll("|", "\\|")).join(" | "),
  );

  return `# Publish Manifest

- contract_version: ${manifest.contractVersion}
- generated_at: ${manifest.generatedAt}
- scanned_vault_files: ${manifest.summary.scannedVaultFiles}
- publish_candidates: ${manifest.summary.publishCandidates}
- synced: ${manifest.summary.synced}
- warnings: ${manifest.summary.warnings}
- errors: ${manifest.summary.errors}

| Source | Collection | Slug | URL | Status | First published | Kind | Warnings |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.length ? rows.map((row) => `| ${row} |`).join("\n") : "| 暂无 | - | - | - | - | - | - | - |"}
`;
}

async function assertExistingOutputsOutsideVault(
  realVaultPath: string,
  outputPaths: string[],
): Promise<void> {
  for (const outputPath of outputPaths) {
    try {
      const realOutputPath = await realpath(outputPath);
      if (isPathInside(realVaultPath, realOutputPath)) {
        throw new Error(`输出目录不得位于 Vault 内部: ${outputPath}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("输出目录不得")) {
        throw error;
      }
    }
  }
}

async function removeManagedOutputs(
  contentOutputPath: string,
  imageOutputPath: string,
): Promise<void> {
  const files = await walkFiles(contentOutputPath, { extensions: [".md", ".mdx"] });
  for (const file of files) {
    const parsed = matter(await readFile(file, "utf8"));
    if (parsed.data.managedBy === "vault-sync") {
      await rm(file, { force: true });
      await rm(path.join(imageOutputPath, path.basename(file, path.extname(file))), {
        recursive: true,
        force: true,
      });
    }
  }
}

export async function syncFromVault(options: SyncOptions): Promise<SyncSummary> {
  const vaultPath = path.resolve(options.vaultPath);
  const contentOutputPath = path.resolve(options.contentOutputPath);
  const imageOutputPath = path.resolve(options.imageOutputPath);
  const reportsPath = path.resolve(options.reportsPath);
  const outputPaths = [contentOutputPath, imageOutputPath, reportsPath];
  assertOutputsOutsideVault(vaultPath, outputPaths);

  const realVaultPath = await realpath(vaultPath);
  await assertExistingOutputsOutsideVault(realVaultPath, outputPaths);
  for (const collection of ["blog", "notes", "projects"] as const) {
    await mkdir(path.join(contentOutputPath, collection), { recursive: true });
  }
  await mkdir(imageOutputPath, { recursive: true });
  await mkdir(reportsPath, { recursive: true });

  const summary = createEmptySummary();
  const markdownFiles = await walkFiles(realVaultPath, {
    excludeDirectories: options.excludeVaultDirs,
    extensions: [".md"],
  });
  summary.scannedVaultFiles = markdownFiles.length;

  const documents: VaultDocument[] = [];
  for (const markdownFile of markdownFiles) {
    try {
      documents.push(await readVaultDocument(markdownFile, realVaultPath));
    } catch {
      summary.errors += 1;
    }
  }

  const candidates: Candidate[] = [];
  const skippedContent: SkippedContentEntry[] = [];
  for (const document of documents) {
    const evaluation = evaluatePublishCandidate(document);
    if (evaluation.entry) {
      const route = options.routes[evaluation.entry.publishTarget].replace(/\/$/u, "");
      candidates.push({
        document,
        entry: {
          ...evaluation.entry,
          url: `${route}/${evaluation.entry.publishSlug}/`,
        },
      });
      continue;
    }
    switch (evaluation.reason) {
      case "private":
        summary.skippedPrivate += 1;
        break;
      case "missing-slug":
        summary.skippedMissingSlug += 1;
        skippedContent.push({
          sourceVaultPath: document.sourceVaultPath,
          reason: "missing-slug",
          fix: "在 frontmatter 中添加 `publish_slug: <unique-kebab-case>`。",
        });
        break;
      case "missing-title":
        summary.skippedMissingTitle += 1;
        break;
      case "missing-description":
        summary.skippedMissingDescription += 1;
        break;
      case "daily":
        summary.skippedDaily += 1;
        break;
      case "invalid-slug":
      case "invalid-publish-kind":
      case "invalid-publish-date":
      case "invalid-series-order":
      case "missing-date":
        summary.errors += 1;
        break;
      case "not-publish-target":
        break;
    }
  }
  summary.publishCandidates = candidates.length;

  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();
  for (const candidate of candidates) {
    const key = candidate.entry.publishSlug;
    if (seenKeys.has(key)) {
      duplicateKeys.add(key);
    }
    seenKeys.add(key);
  }
  if (duplicateKeys.size > 0) {
    summary.errors += duplicateKeys.size;
  }
  const uniqueCandidates = candidates.filter(
    (candidate) => !duplicateKeys.has(candidate.entry.publishSlug),
  );
  const index = createVaultIndex(
    uniqueCandidates.map((candidate) => candidate.entry),
    collectKnownTargets(documents),
  );
  const assetCatalog = await buildAssetCatalog(realVaultPath);

  await removeManagedOutputs(contentOutputPath, imageOutputPath);

  const wikilinkWarnings: WikilinkWarning[] = [];
  const assetWarnings: AssetWarning[] = [];
  const manifestEntries: PublishManifestEntry[] = [];
  for (const candidate of uniqueCandidates) {
    const { document, entry } = candidate;
    const outputRelativePath = `${entry.publishTarget}/${entry.publishSlug}.md`;
    const outputPath = path.join(contentOutputPath, outputRelativePath);
    try {
      const assetHandler = await createAssetHandler({
        vaultPath: realVaultPath,
        sourceAbsolutePath: document.absolutePath,
        imageOutputPath,
        publishSlug: entry.publishSlug,
        outputPath: toPosixPath(outputRelativePath),
        catalog: assetCatalog,
      });
      const normalized = await normalizeMarkdown({
        markdown: document.content,
        index,
        outputPath: toPosixPath(outputRelativePath),
        assetHandler,
      });
      const frontmatter = toPublishedFrontmatter(document, entry);
      await writeFile(
        outputPath,
        serializePublishedMarkdown(frontmatter, normalized.markdown),
        "utf8",
      );
      wikilinkWarnings.push(...normalized.wikilinkWarnings);
      assetWarnings.push(...normalized.assetWarnings);
      const entryWarnings = [
        ...normalized.wikilinkWarnings.map((warning) => `wikilink: ${warning.reason}`),
        ...normalized.assetWarnings.map((warning) => `asset: ${warning.reason}`),
      ];
      manifestEntries.push({
        sourceVaultPath: document.sourceVaultPath,
        collection: entry.publishTarget,
        slug: entry.publishSlug,
        url: entry.url ?? `/${entry.publishTarget}/${entry.publishSlug}/`,
        title: entry.title,
        draft: entry.publishStatus === "draft",
        publishedDate: entry.publishedDate,
        visibility: entry.visibility,
        outputKind: entry.outputKind,
        ...(entry.series ? { series: entry.series } : {}),
        ...(entry.series && entry.seriesOrder !== undefined
          ? { seriesOrder: entry.seriesOrder }
          : {}),
        ...(entry.topic ? { topic: entry.topic } : {}),
        warnings: entryWarnings,
      });
      summary.synced += 1;
      summary.outputs[entry.publishTarget] += 1;
    } catch {
      summary.errors += 1;
    }
  }

  summary.warnings = wikilinkWarnings.length + assetWarnings.length;
  const publishManifest: PublishManifest = {
    contractVersion: PUBLISH_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    summary: createManifestSummary(summary),
    entries: manifestEntries,
  };
  await writeFile(
    path.join(reportsPath, "wikilink-warnings.md"),
    wikilinkReport(wikilinkWarnings),
    "utf8",
  );
  await writeFile(
    path.join(reportsPath, "asset-warnings.md"),
    assetReport(assetWarnings),
    "utf8",
  );
  await writeFile(
    path.join(reportsPath, "sync-report.md"),
    syncReport(summary, wikilinkWarnings, assetWarnings, skippedContent),
    "utf8",
  );
  await writeFile(
    path.join(reportsPath, "publish-manifest.json"),
    `${JSON.stringify(publishManifest, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(reportsPath, "publish-manifest.md"),
    createManifestMarkdown(publishManifest),
    "utf8",
  );

  return summary;
}

function configuredOptions(): SyncOptions {
  return {
    vaultPath: publishConfig.vaultPath,
    contentOutputPath: publishConfig.contentOutputPath,
    imageOutputPath: publishConfig.imageOutputPath,
    reportsPath: publishConfig.reportsPath,
    excludeVaultDirs: [...publishConfig.excludeVaultDirs],
    routes: { ...publishConfig.routes },
  };
}

function isDirectExecution(): boolean {
  return Boolean(
    process.argv[1] &&
      import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href,
  );
}

if (isDirectExecution()) {
  try {
    const summary = await syncFromVault(configuredOptions());
    console.log(
      `同步完成: scanned=${summary.scannedVaultFiles}, synced=${summary.synced}, warnings=${summary.warnings}, errors=${summary.errors}`,
    );
    if (summary.errors > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
