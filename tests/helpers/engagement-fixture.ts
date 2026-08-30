import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
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
  await writeFile(path.join(root, "src/data/site-profile.ts"), `export const siteProfile = {
  name: "Soce1lo",
  eyebrow: "LOCAL PREVIEW / 合成验证",
  title: "记录我如何理解、学习与构建。",
  description: "此页面仅用于本地验证访问次数和 GitHub 留言。",
  boundary: "输入留在私人系统，输出经过选择后公开。",
  now: { label: "预览", text: "使用合成内容验证页面。", updated: "2026-08-30" },
  threads: [],
  featured: [{ collection: "blog", id: "public-example" }],
} as const;
`);

  for (const collection of ["blog", "notes", "projects"]) {
    const directory = path.join(root, "src/content", collection);
    await mkdir(directory, { recursive: true });
    for (const visibility of ["public", "unlisted"]) {
      await writeFile(path.join(directory, `${visibility}-example.md`), `---
title: ${visibility === "public" ? "一次可复用的实践记录" : "不应发送到第三方的未公开标题"}
description: 合成验证页面，仅用于检查排版、访问次数和留言交互。
pubDate: 2026-08-30
category: 验证
tags: [fixture]
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
title: 不应生成的草稿
description: 合成草稿
pubDate: 2026-08-30
category: 验证
visibility: public
draft: true
sourceVaultPath: fixtures/${collection}/draft.md
---
草稿。
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
