import type { SiteEntry } from "./content";
import { isPublicEntry, sortNewestFirst } from "./content";

type SearchableEntry = Pick<SiteEntry, "collection" | "id" | "data">;

export interface SearchItem {
  title: string;
  description: string;
  section: string;
  category: string;
  tags: string[];
  path: string;
  date: string;
}

const sectionLabels: Record<SiteEntry["collection"], string> = {
  blog: "博客",
  notes: "笔记",
  projects: "项目",
};

export function buildSearchItems(entries: readonly SearchableEntry[]): SearchItem[] {
  return entries
    .filter((entry): entry is SiteEntry => isPublicEntry(entry as SiteEntry))
    .sort((a, b) => sortNewestFirst(a, b))
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      section: sectionLabels[entry.collection],
      category: entry.data.category,
      tags: entry.data.tags,
      path: `${entry.collection}/${entry.id}/`,
      date: entry.data.pubDate.toISOString(),
    }));
}

export function serializeForInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    switch (character) {
      case "<":
        return "\\u003C";
      case ">":
        return "\\u003E";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      case "\u2029":
        return "\\u2029";
      default:
        return character;
    }
  });
}
