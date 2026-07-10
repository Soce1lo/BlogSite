import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { OutputKind } from "../../src/lib/output-kind";
import { toPosixPath } from "./path";
import type {
  PublishIndexEntry,
  PublishStatus,
  PublishTarget,
  PublishVisibility,
} from "./vault-index";

export interface VaultDocument {
  absolutePath: string;
  sourceVaultPath: string;
  data: Record<string, unknown>;
  content: string;
}

export interface PublishedFrontmatter {
  title: string;
  description: string;
  pubDate: string;
  updatedDate?: string;
  draft: boolean;
  category: string;
  tags: string[];
  visibility: PublishVisibility;
  sourceVaultPath: string;
  managedBy: "vault-sync";
  sourcePublishStatus: PublishStatus;
  outputKind: OutputKind;
  series?: string;
  seriesOrder?: number;
  topic?: string;
}

export async function readVaultDocument(
  absolutePath: string,
  vaultPath: string,
): Promise<VaultDocument> {
  const source = await readFile(absolutePath, "utf8");
  const parsed = matter(source);
  return {
    absolutePath,
    sourceVaultPath: toPosixPath(path.relative(vaultPath, absolutePath)),
    data: parsed.data as Record<string, unknown>,
    content: parsed.content,
  };
}

export function getString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

export function getStringArray(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) {
      return date.toISOString().slice(0, 10);
    }
  }
  return undefined;
}

export function toPublishedFrontmatter(
  document: VaultDocument,
  entry: PublishIndexEntry,
): PublishedFrontmatter {
  const pubDate = normalizeDate(document.data.created);
  if (!pubDate) {
    throw new Error(`缺少有效 created: ${document.sourceVaultPath}`);
  }
  const updatedDate = normalizeDate(document.data.updated);

  return {
    title: entry.title,
    description: getString(document.data, "description"),
    pubDate,
    ...(updatedDate ? { updatedDate } : {}),
    draft: entry.publishStatus === "draft",
    category: getString(document.data, "publish_category") || "未分类",
    tags: getStringArray(document.data, "tags"),
    visibility: entry.visibility,
    sourceVaultPath: document.sourceVaultPath,
    managedBy: "vault-sync",
    sourcePublishStatus: entry.publishStatus,
    outputKind: entry.outputKind,
    ...(entry.series ? { series: entry.series } : {}),
    ...(entry.series && entry.seriesOrder !== undefined
      ? { seriesOrder: entry.seriesOrder }
      : {}),
    ...(entry.topic ? { topic: entry.topic } : {}),
  };
}

export function serializePublishedMarkdown(
  frontmatter: PublishedFrontmatter,
  content: string,
): string {
  return matter.stringify(content.trimStart(), frontmatter);
}

export function readPublishTarget(data: Record<string, unknown>): PublishTarget | undefined {
  const value = getString(data, "publish_target");
  return value === "blog" || value === "notes" || value === "projects"
    ? value
    : undefined;
}
