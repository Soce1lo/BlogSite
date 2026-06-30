import path from "node:path";
import {
  getString,
  getStringArray,
  readPublishTarget,
  type VaultDocument,
} from "./frontmatter";
import { isDailySourcePath } from "./path";
import { isSafePublishSlug, normalizeLookupKey } from "./slug";

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
  visibility: PublishVisibility;
  url?: string;
}

export interface VaultIndex {
  entries: PublishIndexEntry[];
  knownTargets: Set<string>;
  publishedByKey: Map<string, PublishIndexEntry>;
}

export function createVaultIndex(
  entries: PublishIndexEntry[],
  knownTargets: string[] = [],
): VaultIndex {
  const publishedByKey = new Map<string, PublishIndexEntry>();
  const normalizedKnownTargets = new Set<string>();

  for (const target of knownTargets) {
    normalizedKnownTargets.add(normalizeLookupKey(target));
  }
  for (const entry of entries) {
    const completedEntry = {
      ...entry,
      url: entry.url ?? `/${entry.publishTarget}/${entry.publishSlug}/`,
    };
    for (const key of [entry.title, ...entry.aliases, path.basename(entry.sourceVaultPath, ".md")]) {
      const normalizedKey = normalizeLookupKey(key);
      normalizedKnownTargets.add(normalizedKey);
      if (!publishedByKey.has(normalizedKey)) {
        publishedByKey.set(normalizedKey, completedEntry);
      }
    }
  }

  return { entries, knownTargets: normalizedKnownTargets, publishedByKey };
}

export function lookupPublishedTarget(
  index: VaultIndex,
  target: string,
): PublishIndexEntry | undefined {
  return index.publishedByKey.get(normalizeLookupKey(target));
}

export function isKnownVaultTarget(index: VaultIndex, target: string): boolean {
  return index.knownTargets.has(normalizeLookupKey(target));
}

export type CandidateSkipReason =
  | "not-publish-target"
  | "private"
  | "missing-slug"
  | "missing-title"
  | "missing-description"
  | "missing-date"
  | "daily"
  | "invalid-slug";

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
  if (!document.data.created) {
    return { reason: "missing-date" };
  }

  return {
    entry: {
      title,
      aliases: getStringArray(document.data, "aliases"),
      sourceVaultPath: document.sourceVaultPath,
      publishTarget,
      publishSlug,
      publishStatus: rawStatus as PublishStatus,
      visibility: rawVisibility as PublishVisibility,
      url: `/${publishTarget}/${publishSlug}/`,
    },
  };
}

export function collectKnownTargets(documents: VaultDocument[]): string[] {
  return documents.flatMap((document) => [
    getString(document.data, "title"),
    ...getStringArray(document.data, "aliases"),
    path.basename(document.sourceVaultPath, ".md"),
  ]).filter(Boolean);
}
