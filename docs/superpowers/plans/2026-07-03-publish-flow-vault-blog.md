# Publish Flow Vault Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the BlogSite publish flow safer and more executable by tightening publish checks, adding Vault blog organization fields, generating publish manifests, and documenting the agent runbook.

**Architecture:** Keep Vault as the private writing source and BlogSite as the flat public copy. Extend the existing TypeScript sync/check scripts and Astro content schema without changing URL routing or CI Vault access.

**Tech Stack:** Astro 6 content collections, TypeScript ESM scripts, `node:test`, `tsx`, `gray-matter`, `pnpm`.

---

## File Structure

- Modify `tests/vault-sync.test.ts` to add RED coverage for path classification, image resolution, organization fields, and manifest generation.
- Modify `scripts/check-publish-content.ts` to extract named path and image helpers, allow safe explanatory relative paths, and keep absolute/private path errors.
- Modify `scripts/utils/vault-index.ts` to carry optional series/topic metadata from Vault candidate evaluation.
- Modify `scripts/utils/frontmatter.ts` to emit optional `series`, `seriesOrder`, and `topic`.
- Modify `scripts/sync-from-vault.ts` to build `reports/publish-manifest.json` and `reports/publish-manifest.md` from synced entries.
- Modify `src/content.config.ts` to accept optional organization fields.
- Modify `src/layouts/ContentLayout.astro` to display series/topic metadata near the title.
- Modify `docs/publishing-guide.md` to add the MUST/DO NOT agent runbook and failure rules.

## Task 1: Publish Check Path Boundaries

**Files:**
- Modify: `tests/vault-sync.test.ts`
- Modify: `scripts/check-publish-content.ts`

- [ ] **Step 1: Write failing tests for allowed relative paths and blocked local paths**

Add tests that create synthetic content with `_system/migration/report.md`, `../examples/demo.md`, `scripts/example.mjs`, `/blog/some-slug/`, `/images/known/pic.png`, and code-block path snippets. Assert no errors for safe relative/site paths. Add a separate test for `/Users/...`, `/home/...`, Windows drive paths, and `file://`, asserting error codes include `absolute-local-path` and `file-url`.

- [ ] **Step 2: Run RED verification**

Run: `pnpm test -- tests/vault-sync.test.ts`

Expected: FAIL because `/home/...` is not fully classified today and helper behavior is not exposed by named functions.

- [ ] **Step 3: Implement named helpers**

In `scripts/check-publish-content.ts`, add and use:

```ts
export function isFileUrl(value: string): boolean;
export function isLocalAbsolutePathLeak(value: string): boolean;
export function isPrivateVaultPathLeak(value: string): boolean;
export function resolveImageReference(reference: string, markdownFile: string, publicPath: string): string | undefined;
```

Keep existing behavior for Obsidian wikilinks, parsed `publish_status: private`, Daily source paths, duplicate slugs, and missing images as warnings.

- [ ] **Step 4: Run GREEN verification**

Run: `pnpm test -- tests/vault-sync.test.ts`

Expected: PASS.

## Task 2: Blog Organization Fields

**Files:**
- Modify: `tests/vault-sync.test.ts`
- Modify: `scripts/utils/vault-index.ts`
- Modify: `scripts/utils/frontmatter.ts`
- Modify: `src/content.config.ts`
- Modify: `src/layouts/ContentLayout.astro`

- [ ] **Step 1: Write failing sync/schema test**

Extend the synthetic Vault article with:

```yaml
publish_series: "从 Logseq 到 Obsidian"
publish_series_order: 10
publish_topic: "Knowledge Management"
```

Assert generated frontmatter has `series`, `seriesOrder`, and `topic`. Ensure no output is emitted when source fields are blank.

- [ ] **Step 2: Run RED verification**

Run: `pnpm test -- tests/vault-sync.test.ts`

Expected: FAIL because the fields are not mapped.

- [ ] **Step 3: Implement minimal mapping and schema**

Carry optional fields through `PublishIndexEntry`, `evaluatePublishCandidate()`, and `toPublishedFrontmatter()`. Update the Astro content schema with optional `series`, `seriesOrder`, and `topic`. Display available metadata in `ContentLayout.astro` without changing routes or list ordering.

- [ ] **Step 4: Run GREEN verification**

Run: `pnpm test -- tests/vault-sync.test.ts`

Expected: PASS.

## Task 3: Publish Manifest

**Files:**
- Modify: `tests/vault-sync.test.ts`
- Modify: `scripts/sync-from-vault.ts`

- [ ] **Step 1: Write failing manifest test**

After `syncFromVault()`, assert `reports/publish-manifest.json` and `reports/publish-manifest.md` exist. Parse JSON and verify `generatedAt`, `summary`, and entries with `sourceVaultPath`, `collection`, `slug`, `url`, `title`, `draft`, `visibility`, optional organization fields, and `warnings`. Assert the Markdown manifest contains paths/URLs/status only and does not include private body text.

- [ ] **Step 2: Run RED verification**

Run: `pnpm test -- tests/vault-sync.test.ts`

Expected: FAIL because manifest files do not exist.

- [ ] **Step 3: Implement manifest generation**

Create manifest entry records while syncing unique candidates. Add per-entry warnings by matching wikilink and asset warnings to output file. Write JSON with `JSON.stringify(manifest, null, 2)` and a concise Markdown table.

- [ ] **Step 4: Run GREEN verification**

Run: `pnpm test -- tests/vault-sync.test.ts`

Expected: PASS.

## Task 4: Agent Publishing Runbook

**Files:**
- Modify: `docs/publishing-guide.md`

- [ ] **Step 1: Update guide**

Add an "Agent 发布 Runbook" section at the top with ordered MUST / DO NOT instructions: status check, reading the three docs, read-only candidate scan, preview sync into temporary outputs, warning review, explicit authorization for drafts, formal sync, `pnpm test`, `pnpm check:publish`, `pnpm build`, commit boundary, push/Actions/live URL verification, and failure handling.

- [ ] **Step 2: Review for privacy boundary**

Confirm the guide says CI must not read the real Vault, source Vault stays read-only, errors block publishing, warnings require explanation, and checks cannot be bypassed by deleting privacy rules.

## Task 5: Full Verification

**Files:**
- No new source files.

- [ ] **Step 1: Run all tests**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 2: Run publish check**

Run: `pnpm check:publish`

Expected: PASS with `errors=0`.

- [ ] **Step 3: Run production build**

Run: `pnpm build`

Expected: PASS with Astro check reporting 0 errors.

- [ ] **Step 4: Inspect git diff**

Run: `git status --short --branch` and `git diff --stat`.

Expected: only planned files plus pre-existing `.gitignore` user change are present.
