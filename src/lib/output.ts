import type { SiteEntry } from "./content";
import { getPublishedDate, isPublicEntry, sortNewestFirst } from "./content";
import { defaultOutputKind, type OutputKind } from "./output-kind";

export interface PublicEntryRef {
  collection: SiteEntry["collection"];
  id: string;
}

export interface ThreadDefinition {
  id: string;
  label: string;
  description: string;
  series?: readonly string[];
  topics?: readonly string[];
  tags?: readonly string[];
}

export interface OutputGroup {
  key: string;
  label: string;
  entries: SiteEntry[];
}

export interface ResolvedThread extends ThreadDefinition {
  entries: SiteEntry[];
  latestPublishedDate: Date;
}

export function getOutputKind(entry: SiteEntry): OutputKind {
  return entry.data.outputKind ?? defaultOutputKind(entry.collection);
}

export function getPrimaryTopic(entry: SiteEntry): string {
  return entry.data.topic ?? entry.data.series ?? entry.data.tags[0] ?? entry.data.category;
}

function compareOutputs(a: SiteEntry, b: SiteEntry): number {
  const dateDifference = sortNewestFirst(a, b);
  if (dateDifference !== 0) {
    return dateDifference;
  }
  const collectionDifference = a.collection.localeCompare(b.collection);
  return collectionDifference || a.id.localeCompare(b.id);
}

function outputMonthKey(entry: SiteEntry): string {
  return getPublishedDate(entry).toISOString().slice(0, 7);
}

function outputMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${year}年${Number(month)}月`;
}

export function buildOutputGroups(
  entries: readonly SiteEntry[],
  limit = 8,
): OutputGroup[] {
  const groups = new Map<string, SiteEntry[]>();
  const publicEntries = entries
    .filter(isPublicEntry)
    .sort(compareOutputs)
    .slice(0, Math.max(0, limit));

  for (const entry of publicEntries) {
    const key = outputMonthKey(entry);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  return [...groups].map(([key, groupedEntries]) => ({
    key,
    label: outputMonthLabel(key),
    entries: groupedEntries,
  }));
}

function matchesThread(entry: SiteEntry, definition: ThreadDefinition): boolean {
  const seriesMatch = Boolean(
    entry.data.series && definition.series?.includes(entry.data.series),
  );
  const topicMatch = Boolean(
    entry.data.topic && definition.topics?.includes(entry.data.topic),
  );
  const tagMatch = entry.data.tags.some((tag) => definition.tags?.includes(tag));
  return seriesMatch || topicMatch || tagMatch;
}

export function resolveThreads(
  entries: readonly SiteEntry[],
  definitions: readonly ThreadDefinition[],
): ResolvedThread[] {
  const publicEntries = entries.filter(isPublicEntry);

  return definitions.flatMap((definition) => {
    const matchingEntries = publicEntries
      .filter((entry) => matchesThread(entry, definition))
      .sort(compareOutputs);
    if (matchingEntries.length === 0) {
      return [];
    }
    return [
      {
        ...definition,
        entries: matchingEntries,
        latestPublishedDate: getPublishedDate(matchingEntries[0]),
      },
    ];
  });
}

export function resolveFeaturedEntries(
  entries: readonly SiteEntry[],
  refs: readonly PublicEntryRef[],
): SiteEntry[] {
  const publicEntries = new Map<string, SiteEntry>(
    entries
      .filter(isPublicEntry)
      .map((entry) => [`${entry.collection}/${entry.id}`, entry] as const),
  );

  return refs.map((ref) => {
    const key = `${ref.collection}/${ref.id}`;
    const entry = publicEntries.get(key);
    if (!entry) {
      throw new Error(`精选内容不存在或未公开: ${key}`);
    }
    return entry;
  });
}
