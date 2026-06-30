import type { CollectionEntry } from "astro:content";

export type SiteEntry =
  | CollectionEntry<"blog">
  | CollectionEntry<"notes">
  | CollectionEntry<"projects">;

export function isPublicEntry(entry: SiteEntry): boolean {
  return !entry.data.draft && entry.data.visibility === "public";
}

export function isGeneratedEntry(entry: SiteEntry): boolean {
  return !entry.data.draft;
}

export function sortNewestFirst(a: SiteEntry, b: SiteEntry): number {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}

