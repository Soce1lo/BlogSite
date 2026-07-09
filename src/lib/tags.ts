import { isPublicEntry, sortNewestFirst, type SiteEntry } from "./content";

export interface TagGroup {
  name: string;
  id: string;
  entries: SiteEntry[];
}

export function tagId(name: string): string {
  return `tag-${encodeURIComponent(name.toLocaleLowerCase("zh-CN"))}`;
}

export function buildTagGroups(entries: SiteEntry[]): TagGroup[] {
  const groups = new Map<string, TagGroup>();

  for (const entry of entries.filter(isPublicEntry)) {
    for (const rawTag of entry.data.tags) {
      const name = rawTag.trim();
      if (!name) continue;

      const key = name.toLocaleLowerCase("zh-CN");
      const group = groups.get(key) ?? {
        name,
        id: tagId(name),
        entries: [],
      };
      group.entries.push(entry);
      groups.set(key, group);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: group.entries.sort(sortNewestFirst),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}
