import path from "node:path";
import {
  defaultOutputKind,
  isOutputKind,
  type OutputKind,
} from "../../src/lib/output-kind";
import {
  getString,
  getStringArray,
  normalizeDate,
  readPublishTarget,
  type VaultDocument,
} from "./frontmatter";
import { isDailySourcePath } from "./path";
import {
  isSafePublishSlug,
  normalizeLookupKey,
  resolveWikilinkPath,
  withoutMarkdownExtension,
} from "./slug";

export type PublishTarget = "blog" | "notes" | "projects";
export type PublishStatus = "draft" | "published";
export type PublishVisibility = "public" | "unlisted";

export interface PublishIndexEntry {
  title: string;
  aliases: string[];
  sourceVaultPath: string;
  publishTarget: PublishTarget;
  publishSlug: string;
  publishStatus: PublishStatus;
  publishedDate: string;
  visibility: PublishVisibility;
  outputKind: OutputKind;
  series?: string;
  seriesOrder?: number;
  topic?: string;
  url?: string;
}

export interface VaultIndex {
  pathsByName: Map<string, Set<string>>;
  pathsByVaultPath: Map<string, Set<string>>;
  publishedUrlsByPath: Map<string, string>;
}

type KnownTarget = Pick<PublishIndexEntry, "sourceVaultPath" | "title" | "aliases">;

export function createVaultIndex(
  entries: PublishIndexEntry[],
  knownTargets: KnownTarget[] = [],
): VaultIndex {
  const pathsByName = new Map<string, Set<string>>();
  const pathsByVaultPath = new Map<string, Set<string>>();
  const publishedUrlsByPath = new Map<string, string>();

  function addPath(map: Map<string, Set<string>>, key: string, sourceVaultPath: string): void {
    const paths = map.get(key) ?? new Set<string>();
    paths.add(sourceVaultPath);
    map.set(key, paths);
  }

  for (const { sourceVaultPath, title, aliases } of [...knownTargets, ...entries]) {
    addPath(pathsByVaultPath, withoutMarkdownExtension(sourceVaultPath), sourceVaultPath);
    for (const name of [title, ...aliases, path.posix.basename(sourceVaultPath)]) {
      const key = normalizeLookupKey(name);
      if (key) {
        addPath(pathsByName, key, sourceVaultPath);
      }
    }
  }
  for (const entry of entries) {
    if (entry.publishStatus === "published") {
      publishedUrlsByPath.set(
        entry.sourceVaultPath,
        entry.url ?? `/${entry.publishTarget}/${entry.publishSlug}/`,
      );
    }
  }

  return { pathsByName, pathsByVaultPath, publishedUrlsByPath };
}

type UnlinkedTargetReason = "target-not-published" | "target-not-found" | "target-ambiguous";

export function resolveWikilinkTarget(
  index: VaultIndex,
  target: string,
  sourceVaultPath?: string,
): { url: string; reason?: never } | { url?: never; reason: UnlinkedTargetReason } {
  const isPath = /[/\\]/u.test(target);
  const key = isPath ? resolveWikilinkPath(target, sourceVaultPath) : normalizeLookupKey(target);
  if (!key) {
    return { reason: "target-not-found" };
  }
  const pathKey = withoutMarkdownExtension(key);
  const paths = isPath
    ? index.pathsByVaultPath.get(pathKey)
    : index.pathsByName.get(key);
  const includesExtension = isPath && key !== pathKey;
  if (!paths?.size || (includesExtension && !paths.has(key))) {
    return { reason: "target-not-found" };
  }
  if (!includesExtension && paths.size > 1) {
    return { reason: "target-ambiguous" };
  }
  const [onlyPath] = paths;
  const matchedPath = includesExtension ? key : onlyPath;
  const url = index.publishedUrlsByPath.get(matchedPath);
  return url ? { url } : { reason: "target-not-published" };
}

export type CandidateSkipReason =
  | "not-publish-target"
  | "private"
  | "missing-slug"
  | "missing-title"
  | "missing-description"
  | "missing-date"
  | "daily"
  | "invalid-slug"
  | "invalid-publish-kind"
  | "invalid-publish-date"
  | "invalid-series-order";

export type CandidateEvaluation =
  | { entry: PublishIndexEntry; reason?: never }
  | { entry?: never; reason: CandidateSkipReason };

export function evaluatePublishCandidate(document: VaultDocument): CandidateEvaluation {
  if (isDailySourcePath(document.sourceVaultPath)) {
    return { reason: "daily" };
  }
  const publishTarget = readPublishTarget(document.data);
  if (!publishTarget) {
    return { reason: "not-publish-target" };
  }

  const rawStatus = getString(document.data, "publish_status");
  const rawVisibility = getString(document.data, "publish_visibility");
  if (
    rawStatus === "private" ||
    rawVisibility === "private" ||
    (rawStatus !== "draft" && rawStatus !== "published") ||
    (rawVisibility !== "public" && rawVisibility !== "unlisted")
  ) {
    return { reason: "private" };
  }

  const rawOutputKind = getString(document.data, "publish_kind");
  let outputKind = defaultOutputKind(publishTarget);
  if (rawOutputKind) {
    if (!isOutputKind(rawOutputKind)) {
      return { reason: "invalid-publish-kind" };
    }
    outputKind = rawOutputKind;
  }

  const publishSlug = getString(document.data, "publish_slug");
  if (!publishSlug) {
    return { reason: "missing-slug" };
  }
  if (!isSafePublishSlug(publishSlug)) {
    return { reason: "invalid-slug" };
  }

  const title = getString(document.data, "title");
  if (!title) {
    return { reason: "missing-title" };
  }
  if (!getString(document.data, "description")) {
    return { reason: "missing-description" };
  }
  const createdDate = normalizeDate(document.data.created);
  if (!createdDate) {
    return { reason: "missing-date" };
  }
  const hasPublishDate = Object.hasOwn(document.data, "publish_date");
  const publishedDate = hasPublishDate
    ? normalizeDate(document.data.publish_date)
    : createdDate;
  if (!publishedDate || publishedDate < createdDate) {
    return { reason: "invalid-publish-date" };
  }
  const series = getString(document.data, "publish_series");
  const rawSeriesOrder = document.data.publish_series_order;
  const hasSeriesOrder = Object.hasOwn(document.data, "publish_series_order");
  if (
    hasSeriesOrder &&
    (typeof rawSeriesOrder !== "number" || !Number.isFinite(rawSeriesOrder) || !series)
  ) {
    return { reason: "invalid-series-order" };
  }
  const seriesOrder = hasSeriesOrder ? (rawSeriesOrder as number) : undefined;
  const topic = getString(document.data, "publish_topic");

  return {
    entry: {
      title,
      aliases: getStringArray(document.data, "aliases"),
      sourceVaultPath: document.sourceVaultPath,
      publishTarget,
      publishSlug,
      publishStatus: rawStatus as PublishStatus,
      publishedDate,
      visibility: rawVisibility as PublishVisibility,
      outputKind,
      ...(series ? { series } : {}),
      ...(series && seriesOrder !== undefined ? { seriesOrder } : {}),
      ...(topic ? { topic } : {}),
      url: `/${publishTarget}/${publishSlug}/`,
    },
  };
}

export function collectKnownTargets(documents: VaultDocument[]): KnownTarget[] {
  return documents.map(({ sourceVaultPath, data }) => ({
    sourceVaultPath,
    title: getString(data, "title"),
    aliases: getStringArray(data, "aliases"),
  }));
}
