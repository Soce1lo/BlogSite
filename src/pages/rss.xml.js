import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { isPublicEntry, sortNewestFirst } from "../lib/content";
import { withBase } from "../lib/site";

export async function GET(context) {
  const posts = (await getCollection("blog")).filter(isPublicEntry).sort(sortNewestFirst);

  return rss({
    title: "BlogSite",
    description: "BlogSite 的公开博客文章。",
    site: context.site,
    customData: "<language>zh-CN</language>",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: withBase(`blog/${post.id}/`),
      categories: post.data.tags,
    })),
  });
}

