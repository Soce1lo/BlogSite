import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const requiredFiles = [
  "scripts/check-publish-content.ts",
  "scripts/copy-assets.ts",
  "scripts/normalize-markdown.ts",
  "scripts/sync-from-vault.ts",
  "scripts/utils/frontmatter.ts",
  "scripts/utils/path.ts",
  "scripts/utils/slug.ts",
  "scripts/utils/vault-index.ts",
  "reports/asset-warnings.md",
  "reports/sync-report.md",
  "reports/wikilink-warnings.md",
];

test("Phase 2 必需文件完整", () => {
  for (const file of requiredFiles) {
    assert.equal(existsSync(file), true, `缺少 ${file}`);
  }
});

test("package scripts 使用本地 TypeScript 实现", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  assert.equal(packageJson.scripts["sync:vault"], "tsx scripts/sync-from-vault.ts");
  assert.equal(
    packageJson.scripts["check:publish"],
    "tsx scripts/check-publish-content.ts",
  );
  assert.equal(
    packageJson.scripts["prepare:publish"],
    "pnpm sync:vault && pnpm check:publish && pnpm build",
  );
});

test("GitHub Actions 不读取或同步 Vault", () => {
  const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");

  assert.doesNotMatch(workflow, /sync:vault/);
  assert.doesNotMatch(workflow, /BLOGSITE_VAULT_PATH|vaultPath/);
});
