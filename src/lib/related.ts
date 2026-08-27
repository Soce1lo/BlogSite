import { isPublicEntry, sortNewestFirst, type SiteEntry } from "./content";

export type RelatedReason = "series" | "topic";

export interface RelatedReadingEntry {
  entry: SiteEntry;
  reasons: RelatedReason[];
}

function isSameEntry(first: SiteEntry, second: SiteEntry): boolean {
  return first.collection === second.collection && first.id === second.id;
}

function hasReason(item: RelatedReadingEntry, reason: RelatedReason): boolean {
  return item.reasons.includes(reason);
}

function compareSeriesOrder(first: SiteEntry, second: SiteEntry): number {
  const firstOrder = first.data.seriesOrder;
  const secondOrder = second.data.seriesOrder;

  if (firstOrder !== undefined && secondOrder === undefined) {
    return -1;
  }
  if (firstOrder === undefined && secondOrder !== undefined) {
    return 1;
  }
  if (firstOrder !== undefined && secondOrder !== undefined && firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return 0;
}

function compareRelatedEntries(first: RelatedReadingEntry, second: RelatedReadingEntry): number {
  const firstIsSeriesMatch = hasReason(first, "series");
  const secondIsSeriesMatch = hasReason(second, "series");

  if (firstIsSeriesMatch !== secondIsSeriesMatch) {
    return firstIsSeriesMatch ? -1 : 1;
  }

  if (firstIsSeriesMatch) {
    const seriesOrderDifference = compareSeriesOrder(first.entry, second.entry);
    if (seriesOrderDifference !== 0) {
      return seriesOrderDifference;
    }
  } else {
    const dateDifference = sortNewestFirst(first.entry, second.entry);
    if (dateDifference !== 0) {
      return dateDifference;
    }
  }

  return (
    first.entry.data.pubDate.valueOf() - second.entry.data.pubDate.valueOf() ||
    first.entry.collection.localeCompare(second.entry.collection) ||
    first.entry.id.localeCompare(second.entry.id)
  );
}

export function resolveRelatedReading(
  currentEntry: SiteEntry,
  entries: readonly SiteEntry[],
  limit = 6,
): RelatedReadingEntry[] {
  if (!isPublicEntry(currentEntry)) {
    return [];
  }

  const relatedEntries = entries
    .filter(isPublicEntry)
    .filter((entry) => !isSameEntry(entry, currentEntry))
    .map((entry): RelatedReadingEntry => {
      const reasons: RelatedReason[] = [];
      if (currentEntry.data.series && entry.data.series === currentEntry.data.series) {
        reasons.push("series");
      }
      if (currentEntry.data.topic && entry.data.topic === currentEntry.data.topic) {
        reasons.push("topic");
      }
      return { entry, reasons };
    })
    .filter((item) => item.reasons.length > 0)
    .sort(compareRelatedEntries);

  return relatedEntries.slice(0, Math.max(0, limit));
}
