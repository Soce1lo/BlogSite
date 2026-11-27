import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const execFileAsync = promisify(execFile);

export async function buildEngagementFixture(): Promise<string> {
  // Resolve macOS /var -> /private/var before Vite creates virtual Astro modules.
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "blogsite-engagement-")));
  await cp(path.join(projectRoot, "src"), path.join(root, "src"), {
    recursive: true,
    filter: (source) => source !== path.join(projectRoot, "src/content"),
  });
  for (const file of ["package.json", "astro.config.mjs", "tsconfig.json"]) {
    await cp(path.join(projectRoot, file), path.join(root, file));
  }
  await cp(path.join(root, "astro.config.mjs"), path.join(root, "astro.fixture-base.mjs"));
  await writeFile(path.join(root, "astro.config.mjs"), `import base from "./astro.fixture-base.mjs";
export default {
  ...base,
  cacheDir: "./.astro-cache/",
  vite: { ...base.vite, cacheDir: "./.vite-cache/" },
};
`);
  await symlink(path.join(projectRoot, "node_modules"), path.join(root, "node_modules"), "dir");
  await mkdir(path.join(root, "public"));
  await cp(path.join(projectRoot, "public/favicon.svg"), path.join(root, "public/favicon.svg"));
  const profilePath = path.join(root, "src/data/site-profile.ts");
  await rename(profilePath, path.join(root, "src/data/production-profile.ts"));
  await writeFile(profilePath, `import { siteProfile as production } from "./production-profile";
export const siteProfile = {
  ...production,
  threads: [...production.threads, {
    id: "fixture-thread", label: "合成主题", description: "跨集合主题验证",
    series: ["fixture-series"], topics: ["fixture-topic"], tags: ["fixture"],
    readingOrder: [
      { label: "入门", collection: "notes", id: "public-example" },
      { label: "实践", collection: "blog", id: "public-example" },
      { label: "不应公开的导航", collection: "blog", id: "unlisted-example" },
    ],
  }],
} as const;
`);

  const collections = [
    { collection: "blog", title: "一次可复用的实践记录", metadata: "series: fixture-series\nseriesOrder: 1" },
    { collection: "notes", title: "一则可复用的学习笔记", metadata: "series: fixture-series\nseriesOrder: 2\ntopic: fixture-topic" },
    { collection: "projects", title: "一个可复用的实验项目", metadata: "topic: fixture-topic" },
  ];
  for (const { collection, title, metadata } of collections) {
    const directory = path.join(root, "src/content", collection);
    await mkdir(directory, { recursive: true });
    for (const visibility of ["public", "unlisted"]) {
      const relationshipFields = visibility === "public"
        ? metadata
        : "series: fixture-series\nseriesOrder: 3\ntopic: fixture-topic";
      await writeFile(path.join(directory, `${visibility}-example.md`), `---
title: ${visibility === "public" ? title : `不应发送到第三方的未公开标题（${collection}）`}
description: 合成验证页面，仅用于检查排版、访问次数和留言交互。
pubDate: ${collection === "projects" ? "2026-08-31" : "2026-08-30"}
category: 验证
tags: [${collection === "projects" ? "fixture" : "other"}]
${relationshipFields}
visibility: ${visibility}
sourceVaultPath: fixtures/${collection}/${visibility}.md
---

## 留下可复用的理解

一篇记录不必把每个过程都展开。把问题、判断和边界写清楚，下一次遇到相近的问题，就有了可以返回的地方。

## 从阅读到交流

访问次数只是一条辅助信息。真正有用的交流，仍然围绕正文中的具体问题展开。
`);
    }
    await writeFile(path.join(directory, "draft-example.md"), `---
title: 不应生成的草稿（${collection}）
description: 合成草稿
tags: [fixture]
pubDate: 2026-08-30
category: 验证
series: fixture-series
seriesOrder: 4
topic: fixture-topic
visibility: public
draft: true
sourceVaultPath: fixtures/${collection}/draft.md
---
草稿。
`);
  }

  // Exercise the configured public navigation with synthetic bodies in an isolated collection.
  const navigationEntries = [
    ["blog", "obsidian-personal-knowledge-management-skill", "series: KnowledgeVault 实践"],
    ["notes", "mac-heat-clash-wechat-udp-investigation", "topic: macOS 排障"],
    ["blog", "cortex-m4-mpu-fault-diagnosis", "series: 技术实践"],
    ["blog", "home-fixture", "series: Home Lab"],
    ["projects", "leetcode-c-language-training", "topic: Algorithms"],
    ["projects", "c-design-patterns-learning", "topic: Design Patterns"],
    ["projects", "qemu-machine-device-lab", "topic: 嵌入式与系统实验"],
    ["projects", "stm32-embedded-components-survey", "topic: 嵌入式与系统实验"],
    ["projects", "trading-basics-strategy-replay", "topic: 投资学习"],
  ];
  for (const [collection, slug, classification] of navigationEntries) {
    await writeFile(path.join(root, "src/content", collection, slug + ".md"), `---
title: 合成页面 ${slug}
description: 公开导航验收用的合成材料。
pubDate: 2026-11-27
category: 验证
${classification}
visibility: public
sourceVaultPath: fixtures/${collection}/${slug}.md
---
这段文字只用于导航验收。
`);
  }

  await execFileAsync("pnpm", ["exec", "astro", "build"], {
    cwd: root,
    env: {
      ...process.env,
      SITE_URL: "https://soce1lo.github.io",
      BASE_PATH: "/BlogSite",
      PUBLIC_GOATCOUNTER_CODE: "blogsite-fixture",
      PUBLIC_GISCUS_REPO: "fixture/comments",
      PUBLIC_GISCUS_REPO_ID: "R_fixture",
      PUBLIC_GISCUS_CATEGORY: "Announcements",
      PUBLIC_GISCUS_CATEGORY_ID: "DIC_fixture",
    },
    maxBuffer: 10 * 1024 * 1024,
  }).catch(async (error) => {
    await rm(root, { recursive: true, force: true });
    throw error;
  });
  return root;
}
