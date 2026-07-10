import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { isPublicEntry } from "../lib/content";
import { getOutputDate } from "../lib/output";
import { withBase } from "../lib/site";

export async function GET(context) {
  const [blog, notes, projects] = await Promise.all([
    getCollection("blog"),
    getCollection("notes"),
    getCollection("projects"),
  ]);
  const entries = [...blog, ...notes, ...projects]
    .filter(isPublicEntry)
    .sort((a, b) => getOutputDate(b).valueOf() - getOutputDate(a).valueOf());

  return rss({
    title: "Soce1lo",
    description: "Soce1lo 经过选择后公开的思考、学习与项目输出。",
    site: context.site,
    customData: "<language>zh-CN</language>",
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: getOutputDate(entry),
      link: withBase(`${entry.collection}/${entry.id}/`),
      categories: entry.data.tags,
    })),
  });
}
