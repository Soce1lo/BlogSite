import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import {
  getPublishedDate,
  isPublicEntry,
  sortNewestFirst,
} from "../lib/content";
import { withBase } from "../lib/site";

export async function GET(context) {
  const [blog, notes, projects] = await Promise.all([
    getCollection("blog"),
    getCollection("notes"),
    getCollection("projects"),
  ]);
  const entries = [...blog, ...notes, ...projects]
    .filter(isPublicEntry)
    .sort(sortNewestFirst);

  return rss({
    title: "Soce1lo",
    description: "Soce1lo 经过选择后公开的思考、学习与项目输出。",
    site: context.site,
    customData: "<language>zh-CN</language>",
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: getPublishedDate(entry),
      link: withBase(`${entry.collection}/${entry.id}/`),
      categories: entry.data.tags,
    })),
  });
}
