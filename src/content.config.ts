import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const contentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(["public", "unlisted"]),
  sourceVaultPath: z.string().min(1),
  managedBy: z.literal("vault-sync").optional(),
  sourcePublishStatus: z.enum(["draft", "published"]).optional(),
});

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: contentSchema,
});

const notes = defineCollection({
  loader: glob({ base: "./src/content/notes", pattern: "**/*.{md,mdx}" }),
  schema: contentSchema,
});

const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
  schema: contentSchema,
});

export const collections = { blog, notes, projects };
