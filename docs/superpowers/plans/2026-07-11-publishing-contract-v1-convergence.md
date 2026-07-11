# Publishing Contract V1 Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重构 Vault 组织、不拆分现有同步器、不更换网站框架且不改变公开 URL 的前提下，把当前发布字段收敛为 BlogSite 内唯一权威的 V1 契约，并让 manifest、操作文档和 Vault 来源目录局部约定明确引用它。

**Architecture:** 在 BlogSite 根级 `contracts/publishing/v1/` 保存权威的人读契约、JSON Schema 和合成示例；现有 `sync-from-vault.ts` 继续承担当前同步流程，只增加可审计的 `contractVersion`。Vault 仅在 `60-Publish/AGENTS.md` 写本地操作边界并引用 BlogSite 契约，不复制 schema、枚举或兼容逻辑。

**Tech Stack:** Astro 6、TypeScript strict、ESM、Node `node:test` / `node:assert`、tsx、gray-matter、JSON Schema Draft 2020-12、pnpm 11。

## Global Constraints

- 当前阶段只做 V1 契约收敛；不拆分来源适配器和发布适配器。
- 不启动 Vault 目录重构、网站信息架构重构、框架迁移、协议 V2 或双版本运行。
- 所有契约模型、版本、schema、示例和兼容规则只维护在 `/Users/bihaoran/Documents/BlogSite/contracts/publishing/`。
- `/Users/bihaoran/Documents/Obsidian Vault/60-Publish/` 只保存局部操作约定和权威契约引用，不复制完整字段模型。
- 不修改 Vault 根级 `AGENTS.md`、`README.md`、`50-MOCs/发布内容索引.md` 或 `99-Templates/publishable-note.md`。
- 真实 Vault 同步必须只读；GitHub Actions 不读取真实 Vault。
- 不自动把 `publish_status: draft` 改为 `published`。
- 不新增运行时依赖；JSON Schema 通过现有 Node 测试核对关键字段和现有运行时行为。
- 保持 `blog` / `notes` / `projects`、现有 slug、公开 URL、页面和导航不变。
- 修改代码时遵守两空格缩进、双引号、分号、ESM 和现有命名风格。
- BlogSite 与 Vault 是两个独立 Git 仓库，必须分别检查状态、暂存和提交。
- 每个任务只提交列出的文件，不夹带用户已有修改。
- 完整架构和未来迁移指导保留在 `docs/superpowers/specs/2026-07-11-vault-blogsite-collaboration-architecture-design.md`，本计划不执行其中第二、第三阶段。

## File Structure

### BlogSite 新增文件

- `contracts/publishing/v1/contract.md`：V1 权威语义、字段责任、默认值和兼容规则。
- `contracts/publishing/v1/schema.json`：V1 发布候选 frontmatter 的机器可读 schema。
- `contracts/publishing/v1/examples/published-blog.md`：完整 published/blog 合成示例。
- `contracts/publishing/v1/examples/draft-note.md`：最小 draft/notes 合成示例。
- `scripts/contracts/publishing-v1.ts`：运行时代码使用的 V1 版本常量，不包含第二份字段模型。
- `tests/publishing-contract.test.ts`：契约文件、schema、示例与当前候选解析行为的对齐测试。

### BlogSite 修改文件

- `scripts/sync-from-vault.ts`：在 JSON 和 Markdown manifest 中记录 `contractVersion: v1`。
- `tests/vault-sync.test.ts`：验证 manifest 的 V1 版本标记。
- `docs/publishing-guide.md`：将权威字段定义指向 `contracts/publishing/v1/`。
- `docs/vault-sync-guide.md`：说明同步器消费 V1 契约，当前报告包含契约版本。
- `docs/codex-maintenance-guide.md`：要求契约变更先改权威目录和契约测试。
- `AGENTS.md`：明确字段、schema、manifest 变更必须同步契约目录。
- `reports/publish-manifest.json`、`reports/publish-manifest.md`：真实 formal sync 生成的最新对账证据。
- `src/content/blog/*.md`：仅在 formal sync 重新生成时接受同步器产生的可预期 frontmatter 对齐，不手工编辑。

### Vault 新增文件

- `/Users/bihaoran/Documents/Obsidian Vault/60-Publish/AGENTS.md`：本目录局部发布边界和 BlogSite 契约引用。

### 明确不修改

- Vault 正文和现有 `publish_status`。
- Vault 根级指南、发布 MOC 和模板。
- Astro 页面、组件、样式、路由和 Profile。
- `publish.config.ts` 的目录排除规则。
- GitHub Actions 和远端部署配置。

---

### Task 1: 建立唯一权威的 V1 契约目录

**Files:**
- Create: `contracts/publishing/v1/contract.md`
- Create: `contracts/publishing/v1/schema.json`
- Create: `contracts/publishing/v1/examples/published-blog.md`
- Create: `contracts/publishing/v1/examples/draft-note.md`
- Create: `scripts/contracts/publishing-v1.ts`
- Create: `tests/publishing-contract.test.ts`

**Interfaces:**
- Consumes: `evaluatePublishCandidate(document: VaultDocument): CandidateEvaluation` from `scripts/utils/vault-index.ts`; `OUTPUT_KINDS` from `src/lib/output-kind.ts`; gray-matter parsing.
- Produces: `PUBLISH_CONTRACT_VERSION: "v1"`; authoritative V1 contract artifacts; contract conformance tests used by later tasks.

- [ ] **Step 1: 先写契约测试，并确认缺少契约文件时失败**

Create `tests/publishing-contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { PUBLISH_CONTRACT_VERSION } from "../scripts/contracts/publishing-v1";
import { evaluatePublishCandidate } from "../scripts/utils/vault-index";
import { OUTPUT_KINDS } from "../src/lib/output-kind";

const contractRoot = path.join(process.cwd(), "contracts", "publishing", "v1");

test("V1 schema 与当前发布候选枚举保持一致", async () => {
  const schema = JSON.parse(
    await readFile(path.join(contractRoot, "schema.json"), "utf8"),
  );

  assert.equal(schema["x-contract-version"], PUBLISH_CONTRACT_VERSION);
  assert.deepEqual(schema.required, [
    "title",
    "description",
    "created",
    "publish_target",
    "publish_status",
    "publish_slug",
    "publish_visibility",
  ]);
  assert.deepEqual(schema.properties.publish_target.enum, ["blog", "notes", "projects"]);
  assert.deepEqual(schema.properties.publish_status.enum, ["draft", "published"]);
  assert.deepEqual(schema.properties.publish_visibility.enum, ["public", "unlisted"]);
  assert.deepEqual(schema.properties.publish_kind.enum, [...OUTPUT_KINDS]);
});

for (const exampleName of ["published-blog.md", "draft-note.md"]) {
  test(`V1 example ${exampleName} 可被当前候选解析器接受`, async () => {
    const absolutePath = path.join(contractRoot, "examples", exampleName);
    const parsed = matter(await readFile(absolutePath, "utf8"));
    const evaluation = evaluatePublishCandidate({
      absolutePath,
      sourceVaultPath: `60-Publish/${exampleName}`,
      data: parsed.data as Record<string, unknown>,
      content: parsed.content,
    });

    assert.ok(evaluation.entry);
    assert.equal(evaluation.entry.publishTarget, parsed.data.publish_target);
    assert.equal(evaluation.entry.publishStatus, parsed.data.publish_status);
    assert.equal(evaluation.entry.visibility, parsed.data.publish_visibility);
  });
}
```

Run:

```bash
pnpm exec tsx --test tests/publishing-contract.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/contracts/publishing-v1` or `ENOENT` for `contracts/publishing/v1/schema.json`.

- [ ] **Step 2: 创建唯一运行时版本常量**

Create `scripts/contracts/publishing-v1.ts`:

```ts
export const PUBLISH_CONTRACT_VERSION = "v1" as const;
```

该文件只提供版本常量；字段、枚举、默认值和兼容规则仍以 `contracts/publishing/v1/` 为权威，不在这里建立第二份模型。

- [ ] **Step 3: 创建 V1 JSON Schema**

Create `contracts/publishing/v1/schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://soce1lo.github.io/BlogSite/contracts/publishing/v1/schema.json",
  "title": "Soce1lo Publishing Contract V1",
  "description": "Vault 中可进入 BlogSite 同步候选集的 flat frontmatter。",
  "type": "object",
  "x-contract-version": "v1",
  "required": [
    "title",
    "description",
    "created",
    "publish_target",
    "publish_status",
    "publish_slug",
    "publish_visibility"
  ],
  "properties": {
    "title": { "type": "string", "minLength": 1 },
    "description": { "type": "string", "minLength": 1 },
    "created": { "type": ["string", "number"], "minLength": 1 },
    "updated": { "type": ["string", "number"], "minLength": 1 },
    "tags": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "default": []
    },
    "aliases": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "default": []
    },
    "publish_target": { "enum": ["blog", "notes", "projects"] },
    "publish_status": { "enum": ["draft", "published"] },
    "publish_slug": {
      "type": "string",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "publish_visibility": { "enum": ["public", "unlisted"] },
    "publish_category": { "type": "string" },
    "publish_kind": { "enum": ["thought", "learned", "built", "revised"] },
    "publish_topic": { "type": "string", "minLength": 1 },
    "publish_series": { "type": "string", "minLength": 1 },
    "publish_series_order": { "type": "number" }
  },
  "dependentRequired": {
    "publish_series_order": ["publish_series"]
  },
  "additionalProperties": true
}
```

`additionalProperties: true` 是有意设计：Vault 仍可拥有 `type`、`status`、`areas`、`projects`、`source_*` 等私人知识字段，发布协议只约束公开接口。

- [ ] **Step 4: 创建完整和最小合成示例**

Create `contracts/publishing/v1/examples/published-blog.md`:

```markdown
---
title: "V1 已发布博客示例"
description: "覆盖 V1 可选组织字段和显式输出语义。"
created: 2026-07-11
updated: 2026-07-11
tags: [example, publishing]
aliases: []
publish_target: blog
publish_status: published
publish_slug: v1-published-blog-example
publish_visibility: public
publish_category: "Example"
publish_kind: revised
publish_topic: "Publishing"
publish_series: "Contract Examples"
publish_series_order: 10
---

# V1 已发布博客示例

这是合成示例，不包含真实 Vault 正文。
```

Create `contracts/publishing/v1/examples/draft-note.md`:

```markdown
---
title: "V1 草稿笔记示例"
description: "只包含 V1 发布候选所需字段。"
created: 2026-07-11
publish_target: notes
publish_status: draft
publish_slug: v1-draft-note-example
publish_visibility: unlisted
---

# V1 草稿笔记示例

这是合成示例，不包含真实 Vault 正文。
```

- [ ] **Step 5: 创建人读权威契约**

Create `contracts/publishing/v1/contract.md` with these exact sections and rules:

```markdown
# Publishing Contract V1

## Authority

本目录是 V1 发布字段、枚举、默认值和兼容规则的唯一权威来源。Vault 局部指南、模板、MOC、同步器和 Astro schema 都是消费者，不得另建契约副本。

## Scope

V1 描述知识来源如何成为 BlogSite 发布候选。它不规定 Vault 目录、Astro collection 实现、页面布局或未来框架。

## Required fields

必需字段以 `schema.json` 的 `required` 为准。`publish_status: draft` 仍是发布候选，但未经明确授权不得改为 `published`。

## Optional fields and defaults

- 缺少 `publish_category` 时，当前 Astro 适配器生成 `未分类`。
- 缺少 `publish_kind` 时，blog、notes、projects 分别映射为 thought、learned、built。
- `publish_series_order` 只有在 `publish_series` 存在时生效。
- topic、series 和 kind 只表达公开语义，不改变 Vault 目录或知识层级。

## Privacy and ownership

- Daily、private、未授权正文和本机绝对路径不得进入公开输出。
- 真实知识来源只读；CI 不读取真实 Vault。
- `managedBy: vault-sync` 的 BlogSite 副本不得人工编辑。
- 发布状态只能由用户明确授权改变。

## Compatibility

- V1 可以增加可选字段或非破坏性默认值。
- 删除字段、改变字段语义或让现有公开内容无法解析时必须创建 V2。
- V2 的双版本解析和迁移只在用户明确启动重构时实施。

## Deferred identities and migrations

稳定 `publish_id`、协议 V2、来源适配器拆分、发布适配器拆分、框架迁移和 Vault 重组保留在架构设计中，本阶段不实施。

## Examples

- `examples/published-blog.md`
- `examples/draft-note.md`
```

- [ ] **Step 6: 运行契约测试并确认通过**

Run:

```bash
pnpm exec tsx --test tests/publishing-contract.test.ts
```

Expected: 3 tests PASS, 0 failures.

- [ ] **Step 7: 检查格式并提交 Task 1**

Run:

```bash
git diff --check
git status --short
```

Expected: only the six Task 1 files are new.

Commit:

```bash
git add contracts/publishing/v1 scripts/contracts/publishing-v1.ts tests/publishing-contract.test.ts
git commit -m "Define publishing contract V1"
```

---

### Task 2: 在 publish manifest 中记录契约版本

**Files:**
- Modify: `scripts/sync-from-vault.ts:1-87,185-210,402-406`
- Modify: `tests/vault-sync.test.ts:285-329`

**Interfaces:**
- Consumes: `PUBLISH_CONTRACT_VERSION` from `scripts/contracts/publishing-v1.ts`.
- Produces: JSON manifest `contractVersion: "v1"`; Markdown manifest `contract_version: v1`.

- [ ] **Step 1: 先扩展 manifest 测试**

In the existing end-to-end sync test, add after parsing `publishManifestJson`:

```ts
assert.equal(manifest.contractVersion, "v1");
```

Add near the existing Markdown manifest assertions:

```ts
assert.match(publishManifestMarkdown, /contract_version: v1/);
```

- [ ] **Step 2: 运行目标测试并确认失败**

Run:

```bash
pnpm exec tsx --test tests/vault-sync.test.ts
```

Expected: FAIL because `manifest.contractVersion` is `undefined` and the Markdown manifest lacks `contract_version: v1`.

- [ ] **Step 3: 将版本常量接入 manifest**

At the top of `scripts/sync-from-vault.ts`, add:

```ts
import { PUBLISH_CONTRACT_VERSION } from "./contracts/publishing-v1";
```

Extend `PublishManifest`:

```ts
interface PublishManifest {
  contractVersion: typeof PUBLISH_CONTRACT_VERSION;
  generatedAt: string;
  summary: PublishManifestSummary;
  entries: PublishManifestEntry[];
}
```

Add the version line in `createManifestMarkdown()` before `generated_at`:

```ts
- contract_version: ${manifest.contractVersion}
```

Construct the manifest with:

```ts
const publishManifest: PublishManifest = {
  contractVersion: PUBLISH_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  summary: createManifestSummary(summary),
  entries: manifestEntries,
};
```

- [ ] **Step 4: 运行目标和契约测试**

Run:

```bash
pnpm exec tsx --test tests/publishing-contract.test.ts tests/vault-sync.test.ts
```

Expected: all tests PASS; generated JSON and Markdown manifests both identify V1.

- [ ] **Step 5: 检查并提交 Task 2**

Run:

```bash
git diff --check
git diff -- scripts/sync-from-vault.ts tests/vault-sync.test.ts
```

Commit:

```bash
git add scripts/sync-from-vault.ts tests/vault-sync.test.ts
git commit -m "Record publishing contract version"
```

---

### Task 3: 让 BlogSite 操作文档引用权威契约

**Files:**
- Modify: `docs/publishing-guide.md:1-75`
- Modify: `docs/vault-sync-guide.md:1-49`
- Modify: `docs/codex-maintenance-guide.md:18-32`
- Modify: `AGENTS.md:1-30`

**Interfaces:**
- Consumes: `contracts/publishing/v1/contract.md` and `schema.json` from Task 1.
- Produces: operational documentation that references, rather than duplicates, the authoritative contract.

- [ ] **Step 1: 在发布指南中声明权威位置**

Add after `# 发布指南`:

```markdown
## 契约权威位置

发布字段、允许值、默认行为和兼容规则以 `contracts/publishing/v1/contract.md` 与 `contracts/publishing/v1/schema.json` 为唯一权威来源。本指南只描述执行流程；出现不一致时先修正契约及其测试，再更新本指南。
```

Keep the existing public Astro frontmatter example, but introduce it with:

```markdown
下面是当前 Astro 发布适配器的输出格式，不是 Vault 来源契约：
```

- [ ] **Step 2: 在 Vault 同步指南中标明输入和输出边界**

Add after the title:

```markdown
当前同步器消费 `contracts/publishing/v1/` 定义的来源契约，并生成 Astro 公开副本。该目录是字段模型的唯一权威位置；本指南只说明当前同步实现和安全边界。
```

In the reports section, add:

```markdown
JSON 和 Markdown manifest 必须记录 `contractVersion: v1` / `contract_version: v1`，用于确认本次结果由哪个契约版本生成。
```

- [ ] **Step 3: 收紧维护指南和仓库指南**

Add to `docs/codex-maintenance-guide.md` under “修改检查”:

```markdown
10. 发布字段、枚举或默认值变更必须先更新 `contracts/publishing/` 和 `tests/publishing-contract.test.ts`，再修改同步器、Astro schema、操作文档或 Vault 局部约定。
```

Add to `AGENTS.md` under “测试指南”:

```markdown
发布字段模型以 `contracts/publishing/` 为唯一权威来源。调整字段、枚举、默认值或 manifest 版本时，必须先更新契约和 `tests/publishing-contract.test.ts`；其他指南、同步器和 Astro schema 只消费该契约。
```

- [ ] **Step 4: 验证文档没有建立第二份契约**

Run:

```bash
rg -n "唯一权威|contracts/publishing/v1|contractVersion" \
  AGENTS.md docs/publishing-guide.md docs/vault-sync-guide.md docs/codex-maintenance-guide.md
git diff --check
```

Expected: all four files reference the authoritative directory; no new JSON schema or complete enum table appears outside `contracts/publishing/v1/`.

- [ ] **Step 5: 提交 Task 3**

```bash
git add AGENTS.md docs/publishing-guide.md docs/vault-sync-guide.md docs/codex-maintenance-guide.md
git commit -m "Document publishing contract authority"
```

---

### Task 4: 在 Vault 发布来源目录添加局部约定

**Files:**
- Create: `/Users/bihaoran/Documents/Obsidian Vault/60-Publish/AGENTS.md`

**Interfaces:**
- Consumes: BlogSite V1 contract at `../../BlogSite/contracts/publishing/v1/contract.md` from the `60-Publish/` directory.
- Produces: local author/agent rules for `60-Publish/` without duplicating the contract model.

- [ ] **Step 1: 先检查 Vault 工作区和目标路径**

Run in `/Users/bihaoran/Documents/Obsidian Vault`:

```bash
git status --short --branch
test ! -e 60-Publish/AGENTS.md
```

Expected: record the existing branch and changes; the target file does not yet exist. If the worktree contains unrelated changes, do not stage them.

- [ ] **Step 2: 创建目录局部约定**

Create `/Users/bihaoran/Documents/Obsidian Vault/60-Publish/AGENTS.md`:

```markdown
# 60-Publish 协作约定

本目录是当前公开稿的编辑、匿名化和授权工作区，不是永久发布协议，也不决定网站框架或路由。

## 权威契约

发布字段、允许值、默认行为和兼容规则只维护在 BlogSite：

- `../../BlogSite/contracts/publishing/v1/contract.md`
- `../../BlogSite/contracts/publishing/v1/schema.json`

本目录不得复制完整 schema、枚举或版本兼容逻辑。契约变化时只更新本文件中的版本引用和必要操作提示。

## 允许行为

- 在用户明确要求时创建或编辑公开稿。
- 按权威契约补充当前内容所需的发布元数据。
- 在发布前移除私人上下文、本机绝对路径和未授权附件。
- 保留来源关系，但不把 LLM Wiki、Daily 或私人原文直接公开。

## 禁止行为

- 不得自动把 `draft` 改为 `published`。
- 不得因为 BlogSite 视觉或布局变化改写正文。
- 不得把 BlogSite 生成副本同步回本目录。
- 不得在未获授权时发布 private、Daily 或 LLM 派生原稿。

## 发布交接

真实发布由 BlogSite 的 Agent 发布 Runbook 负责：preview sync、manifest 审阅、formal sync、测试、发布检查、构建和需要时的 live verification。
```

- [ ] **Step 3: 验证局部约定只引用契约**

Run:

```bash
rg -n "contracts/publishing/v1|不得复制|不得自动|preview sync" 60-Publish/AGENTS.md
rg -n "thought|learned|built|revised|blog.*notes.*projects" 60-Publish/AGENTS.md
git diff --check -- 60-Publish/AGENTS.md
```

Expected: the first command finds the local rules; the second command has no output, proving the file did not copy enums or the complete target model.

- [ ] **Step 4: 只提交 Vault 局部约定**

Run:

```bash
git add 60-Publish/AGENTS.md
git diff --cached --check
git diff --cached --stat
```

Expected: only `60-Publish/AGENTS.md` is staged.

Commit:

```bash
git commit -m "docs: 添加发布目录协作约定"
```

---

### Task 5: 用真实 Vault 刷新 manifest 并验证当前发布链路

**Files:**
- Modify by formal sync: `reports/publish-manifest.json`
- Modify by formal sync: `reports/publish-manifest.md`
- Modify by formal sync if generated output changes: `reports/sync-report.md`, `reports/wikilink-warnings.md`, `reports/asset-warnings.md`
- Modify by formal sync if frontmatter alignment changes: `src/content/blog/*.md`

**Interfaces:**
- Consumes: V1 contract artifacts, manifest version support, real Vault sources, local `60-Publish/AGENTS.md`.
- Produces: current preview evidence, refreshed formal reports and locally verified BlogSite state. This task does not push or deploy.

- [ ] **Step 1: 检查两个仓库的提交边界**

Run:

```bash
git -C "/Users/bihaoran/Documents/BlogSite" status --short --branch
git -C "/Users/bihaoran/Documents/Obsidian Vault" status --short --branch
```

Expected: BlogSite contains only expected ahead commits and no unstaged work; Vault contains no unstaged work after Task 4. Stop if unrelated changes could be overwritten by formal sync.

- [ ] **Step 2: 执行临时目录 preview sync**

Run in `/Users/bihaoran/Documents/BlogSite`:

```bash
preview_root="$(mktemp -d)"
BLOGSITE_VAULT_PATH="/Users/bihaoran/Documents/Obsidian Vault" \
BLOGSITE_CONTENT_OUTPUT_PATH="$preview_root/content" \
BLOGSITE_IMAGE_OUTPUT_PATH="$preview_root/public/images" \
BLOGSITE_REPORTS_PATH="$preview_root/reports" \
pnpm sync:vault
```

Expected: command exits 0 and creates the five report files under `$preview_root/reports`.

- [ ] **Step 3: 机器核对 preview manifest**

Run:

```bash
node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const manifest = JSON.parse(readFileSync(process.argv[1], "utf8"));
  if (manifest.contractVersion !== "v1") throw new Error("contractVersion must be v1");
  if (manifest.summary.publishCandidates !== 4) throw new Error("expected 4 candidates");
  if (manifest.summary.synced !== 4) throw new Error("expected 4 synced entries");
  if (manifest.summary.errors !== 0) throw new Error("preview contains errors");
  if (manifest.entries.some((entry) => !entry.outputKind)) {
    throw new Error("every entry must expose outputKind");
  }
  console.log(JSON.stringify({
    contractVersion: manifest.contractVersion,
    candidates: manifest.summary.publishCandidates,
    synced: manifest.summary.synced,
    warnings: manifest.summary.warnings,
    errors: manifest.summary.errors
  }));
' "$preview_root/reports/publish-manifest.json"
```

Expected: prints `contractVersion: "v1"`, `candidates: 4`, `synced: 4`, `errors: 0`. Record and review the actual warning count; do not suppress warnings.

- [ ] **Step 4: 人工检查 preview 边界**

Run:

```bash
sed -n '1,220p' "$preview_root/reports/publish-manifest.md"
sed -n '1,120p' "$preview_root/reports/sync-report.md"
rg -n "/Users/|/home/|file://|KnowledgeVault" "$preview_root/content" "$preview_root/reports"
```

Expected: manifest lists only four authorized public sources; `errors: 0`; the final `rg` has no output. Warnings must correspond to known Wikilink degradation or missing assets, not private content.

- [ ] **Step 5: 执行 formal sync**

Run:

```bash
BLOGSITE_VAULT_PATH="/Users/bihaoran/Documents/Obsidian Vault" pnpm sync:vault
```

Expected: exits 0 with `publishCandidates=4`, `synced=4`, `errors=0`; formal `reports/publish-manifest.json` contains `contractVersion: "v1"`.

- [ ] **Step 6: 检查 formal sync 变更边界**

Run:

```bash
git status --short
git diff --stat
git diff -- reports src/content/blog
```

Expected: only generated public copies and reports changed. No `.env`, absolute path, Vault file, private attachment, page code or unrelated user file appears.

- [ ] **Step 7: 运行完整本地门禁**

Run:

```bash
pnpm test
pnpm check:publish
pnpm build
git diff --check
```

Expected:

- `pnpm test`: all tests PASS.
- `pnpm check:publish`: `errors=0`; only reviewed warnings allowed.
- `pnpm build`: Astro check and production build succeed.
- `git diff --check`: no output.

- [ ] **Step 8: 提交刷新后的正式同步证据**

Stage only actual generated changes:

```bash
git add reports src/content/blog
git diff --cached --check
git diff --cached --stat
```

If formal sync produced no tracked changes, skip the commit and record that the current repository was already aligned. Otherwise commit:

```bash
git commit -m "Refresh V1 publish manifest"
```

- [ ] **Step 9: 最终确认两个仓库状态**

Run:

```bash
git -C "/Users/bihaoran/Documents/BlogSite" status --short --branch
git -C "/Users/bihaoran/Documents/Obsidian Vault" status --short --branch
```

Expected: both worktrees have no unstaged or untracked task files. Branches may be ahead of their remotes; this plan intentionally does not push, deploy or perform live verification.

---

## Deferred Migration Guidance — Not Executed by This Plan

The following work remains documented in `docs/superpowers/specs/2026-07-11-vault-blogsite-collaboration-architecture-design.md` and must not be started while executing this plan:

- stable `publish_id` rollout;
- protocol V2 or dual-version parsing;
- splitting `sync-from-vault.ts` into a source adapter, domain model and Astro adapter;
- Vault directory, knowledge model or storage-format migration;
- website navigation, route or framework migration;
- parallel old/new website builds;
- redirect registry and migration cutover;
- moving contracts into a third repository or package.

When the user explicitly starts a future migration, write a new spec and a separate implementation plan. Do not append migration tasks to this V1 convergence plan.
