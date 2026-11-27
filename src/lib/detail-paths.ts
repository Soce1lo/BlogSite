import { getCollection } from "astro:content";
import { isGeneratedEntry, isPublicEntry, type SiteEntry } from "./content";
import { resolveRelatedReading } from "./related";
import { resolveSeriesNavigation } from "./series";

export async function buildDetailPaths<Collection extends SiteEntry["collection"]>(collection: Collection) {
  const [blog, notes, projects] = await Promise.all([
    getCollection("blog"),
    getCollection("notes"),
    getCollection("projects"),
  ]);
  const generatedEntries = [...blog, ...notes, ...projects].filter(isGeneratedEntry);
  const publicEntries = generatedEntries.filter(isPublicEntry);
  const collectionEntries = generatedEntries.filter(
    (entry): entry is Extract<SiteEntry, { collection: Collection }> => entry.collection === collection,
  );

  return collectionEntries.map((entry) => ({
    params: { slug: entry.id },
    props: {
      entry,
      seriesNavigation: resolveSeriesNavigation(entry, publicEntries),
      relatedReading: resolveRelatedReading(entry, publicEntries),
    },
  }));
}
