import { isPublicEntry, type SiteEntry } from "./content";

export interface SeriesNavigation {
  name: string;
  entries: SiteEntry[];
  currentIndex: number;
  previous?: SiteEntry;
  next?: SiteEntry;
}

function compareSeriesEntries(first: SiteEntry, second: SiteEntry): number {
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

  const dateDifference = first.data.pubDate.valueOf() - second.data.pubDate.valueOf();
  if (dateDifference !== 0) {
    return dateDifference;
  }

  return first.collection.localeCompare(second.collection) || first.id.localeCompare(second.id);
}

export function sortSeriesEntries(entries: readonly SiteEntry[]): SiteEntry[] {
  return [...entries].sort(compareSeriesEntries);
}

function isSameEntry(first: SiteEntry, second: SiteEntry): boolean {
  return first.collection === second.collection && first.id === second.id;
}

export function resolveSeriesNavigation(
  currentEntry: SiteEntry,
  entries: readonly SiteEntry[],
): SeriesNavigation | undefined {
  const seriesName = currentEntry.data.series;
  if (!seriesName) {
    return undefined;
  }

  const seriesEntries = sortSeriesEntries(
    entries.filter((entry) => isPublicEntry(entry) && entry.data.series === seriesName),
  );
  const currentIndex = seriesEntries.findIndex((entry) => isSameEntry(entry, currentEntry));
  if (currentIndex === -1) {
    return undefined;
  }

  return {
    name: seriesName,
    entries: seriesEntries,
    currentIndex,
    previous: seriesEntries[currentIndex - 1],
    next: seriesEntries[currentIndex + 1],
  };
}
