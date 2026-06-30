import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const requiredFiles = [
  ".github/workflows/deploy.yml",
  ".gitignore",
  "README.md",
  "astro.config.mjs",
  "docs/codex-maintenance-guide.md",
  "docs/publishing-guide.md",
  "docs/vault-sync-guide.md",
  "package.json",
  "publish.config.ts",
  "public/favicon.svg",
  "public/images/.gitkeep",
  "src/content.config.ts",
  "src/layouts/BaseLayout.astro",
  "src/layouts/ContentLayout.astro",
  "src/pages/about.astro",
  "src/pages/blog/[...slug].astro",
  "src/pages/blog/index.astro",
  "src/pages/index.astro",
  "src/pages/notes/[...slug].astro",
  "src/pages/notes/index.astro",
  "src/pages/projects/[...slug].astro",
  "src/pages/projects/index.astro",
  "src/pages/rss.xml.js",
  "src/styles/global.css",
  "tsconfig.json",
];

test("Phase 1 必需文件完整", () => {
  for (const file of requiredFiles) {
    assert.equal(existsSync(file), true, `缺少 ${file}`);
  }
});

test("三个内容集合各有且仅有一篇示例内容", () => {
  for (const collection of ["blog", "notes", "projects"]) {
    const directory = `src/content/${collection}`;
    assert.equal(existsSync(directory), true, `缺少 ${directory}`);
    const entries = readdirSync(directory).filter((file) => file.endsWith(".md"));
    assert.equal(entries.length, 1, `${collection} 应有一篇示例内容`);
  }
});

test("发布配置不包含本机绝对路径", () => {
  const config = readFileSync("publish.config.ts", "utf8");
  assert.doesNotMatch(config, /\/Users\//, "发布配置不得包含本机绝对路径");
});

test("CI 构建但不读取或同步 Vault", () => {
  const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
  assert.match(workflow, /pnpm build/);
  assert.doesNotMatch(workflow, /sync:vault/);
  assert.doesNotMatch(workflow, /KnowledgeVault|Obsidian Vault/);
});
