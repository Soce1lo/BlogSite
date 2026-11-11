import { isPublicEntry, type SiteEntry } from "./content";
import { getPrimaryTopic } from "./output";

export const exploreCollections = {
  blog: "思考",
  notes: "学习",
  projects: "项目",
} satisfies Record<SiteEntry["collection"], string>;

export interface ExploreIndexItem {
  path: string;
  collection: SiteEntry["collection"];
  topic: string;
  timestamp: number;
  year: string;
  searchText: string;
}

interface ExploreItem extends ExploreIndexItem {
  title: string;
  description: string;
}

export interface ExploreFilters {
  q: string;
  collection: SiteEntry["collection"] | "";
  topic: string;
  year: string;
  sort: "newest" | "oldest";
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

export function buildExploreItems(entries: readonly SiteEntry[]): ExploreItem[] {
  return entries.filter(isPublicEntry).map((entry) => {
    const { title, description, pubDate, series, tags } = entry.data;
    const topic = getPrimaryTopic(entry);
    return {
      path: `${entry.collection}/${entry.id}/`,
      collection: entry.collection,
      topic,
      timestamp: pubDate.valueOf(),
      year: String(pubDate.getUTCFullYear()),
      title,
      description,
      searchText: normalizeSearch([title, description, topic, series, ...tags].join(" ")),
    };
  });
}

export function readExploreFilters(params: URLSearchParams): ExploreFilters {
  const collection = params.get("collection") ?? "";
  return {
    q: (params.get("q") ?? "").trim(),
    collection: Object.hasOwn(exploreCollections, collection)
      ? (collection as SiteEntry["collection"])
      : "",
    topic: params.get("topic") ?? "",
    year: params.get("year") ?? "",
    sort: params.get("sort") === "oldest" ? "oldest" : "newest",
  };
}

export function writeExploreFilters(url: URL, filters: ExploreFilters): void {
  const params = url.searchParams;
  for (const [key, value] of Object.entries(filters)) {
    if (!value || (key === "sort" && value === "newest")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
}

export function filterExploreItems<T extends ExploreIndexItem>(
  items: readonly T[],
  filters: ExploreFilters,
): T[] {
  const terms = normalizeSearch(filters.q).split(/\s+/u).filter(Boolean);
  const dateOrder = filters.sort === "oldest" ? 1 : -1;

  return items.filter((item) =>
    (!filters.collection || item.collection === filters.collection) &&
    (!filters.topic || item.topic === filters.topic) &&
    (!filters.year || item.year === filters.year) &&
    terms.every((term) => item.searchText.includes(term)),
  ).sort((a, b) =>
    dateOrder * (a.timestamp - b.timestamp) || a.path.localeCompare(b.path, "en"),
  );
}
