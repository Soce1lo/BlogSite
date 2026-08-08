---
title: 从 Logseq 到 Obsidian：具体迁移指导
description: 把 Logseq graph 迁到 Obsidian 的可执行步骤、检查边界和完整脚本。迁移脚本只用于一次性迁移，不进入日常写作 gate。
pubDate: '2026-07-03'
updatedDate: '2026-08-08'
draft: false
category: Knowledge Management
tags:
  - obsidian
  - logseq
  - knowledge-management
  - migration
  - guide
visibility: public
sourceVaultPath: 60-Publish/从 Logseq 到 Obsidian：具体迁移指导.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: thought
series: KnowledgeVault 实践
seriesOrder: 30
topic: Obsidian
---
# 从 Logseq 到 Obsidian：具体迁移指导

这篇是《从 Logseq 到 Obsidian：迁移回顾》的配套操作稿，只保留可执行步骤、检查边界和完整脚本。它面向一次性迁移，不面向日常写作。

专题入口：[Obsidian 个人知识管理专题](../obsidian-personal-knowledge-management-skill/)。

最重要的边界是：迁移脚本只能用于迁移窗口内的验收，或者之后手动回看迁移档案。不要把 `logseq-migrate.mjs verify`、`classify-logseq-pages.mjs verify`、迁移测试，或任何依赖 `80-Archive/logseq-migration/reports/` 基线的命令接入日常写作 gate。迁移完成后，日常写作检查应该只关心发布文章自己的 frontmatter、链接、附件和正文质量，不应要求旧 Logseq 页面仍等于迁移闭环时的内容 hash。

## 适用范围

这套流程适合下面这种情况：你有一份已经停写或即将停写的 Logseq graph，希望把 pages、journals 和 assets 搬进一个新的 Obsidian Vault，同时保留可回滚、可审计的迁移证据。

不适合的情况：你还在双写 Logseq 和 Obsidian，或者希望迁移脚本长期同步两边内容。这套脚本刻意不是同步器；它假设迁移是一次性的。

## 目录和输入约定

脚本默认在 Vault 根目录执行。当前仓库不再随附原始 Logseq graph；复现 Phase 2 时，需要把原始快照放在仓库外，并用 `LOGSEQ_RAW_ROOT` 指向它。脚本使用这些路径：

- `LOGSEQ_RAW_ROOT=/path/to/logseq-snapshot`：仓库外 Logseq graph 只读输入；
- `90-Attachments/logseq-assets/`：迁移后的附件目录；
- `01-Daily/`：journals 目标目录；
- `00-Inbox/imported-logseq/pages/`：pages 的初始落点；
- `80-Archive/logseq-migration/reports/`：迁移报告、清单和基线；
- `80-Archive/logseq-migration/scripts/` 与 `80-Archive/logseq-migration/checks/`：迁移窗口内使用的脚本和测试。

执行前先冻结一份 raw snapshot，并完成自己的数量审计。下面命令里的 210 / 371 / 238 是这次 Vault 的实际结果，不是通用常量。

## 日常写作 gate 边界

迁移完成后，请把迁移检查从日常写作流程里移除。具体来说：

- 不在写作检查、发布检查或 pre-commit 中运行 `node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs verify`；
- 不在写作检查、发布检查或 pre-commit 中运行 `node 80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs verify`；
- 不要求普通文章修改后仍匹配 `80-Archive/logseq-migration/reports/classification-final-state-baseline-v2.json`；
- 不把仓库外 raw snapshot 的历史 whitespace 当作日常 Markdown 风格问题；
- 如需复核迁移，只手动运行迁移命令，并把它当作历史档案验收，不当作写作质量门禁。

## 1. 先跑迁移脚本测试

~~~bash
node --test 80-Archive/logseq-migration/checks/logseq-migrate.test.mjs
node --test 80-Archive/logseq-migration/checks/classify-logseq-pages.test.mjs
~~~

测试通过后再碰真实数据。如果你改过目标目录、批次大小、frontmatter 字段或附件规则，先改测试，再改脚本。

## 2. 迁移 assets、journals 和 pages

~~~bash
export LOGSEQ_RAW_ROOT=/path/to/logseq-snapshot

node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs assets --dry-run
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs assets

for year in 2022 2023 2024 2025 2026; do
  node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs journals --year "$year" --dry-run
  node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs journals --year "$year"
done

node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 0 --limit 50 --dry-run
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 0 --limit 50
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 50 --limit 50 --dry-run
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 50 --limit 50
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 100 --limit 50 --dry-run
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 100 --limit 50
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 150 --limit 50 --dry-run
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 150 --limit 50
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 200 --limit 38 --dry-run
node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs pages --offset 200 --limit 38

node 80-Archive/logseq-migration/scripts/logseq-migrate.mjs verify \
  --expected-assets 210 \
  --expected-journals 371 \
  --expected-pages 238
~~~

每一批完成后都提交一次。不要等全部跑完再提交，否则一旦发现问题，只能回滚一大坨混合变更。

`logseq-migrate.mjs verify` 只验证 Phase 2 时点：pages 尚未分类，仍全部位于 Inbox。完成 Phase 3 后，这个命令看到的 pages 数量会变化，不应再当作当前 Vault 的日常检查。

## 3. 审阅并确认分类清单

分类脚本不替你判断知识语义。先人工生成并审阅一份类似 `80-Archive/logseq-migration/reports/classification-manifest-v2.md` 的清单，确认每个文件只出现一次、目标目录明确、边界项有解释。

清单确认前不要移动文件。清单确认后，执行阶段也不要再重新分类；执行脚本只负责按已确认清单移动文件和重写托管附件相对路径。

## 4. 按固定批次移动页面

~~~bash
node 80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs baseline

for batch in 015 016 017 018 019 020 021 022 023 024; do
  node 80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs batch --batch "$batch" --dry-run
  node 80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs batch --batch "$batch"
  node 80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs verify
  git status --short
  git add -- 00-Inbox 10-Notes 20-Projects 30-Areas 40-Resources 50-MOCs 80-Archive/logseq-migration/reports
  git commit -m "migration: classify logseq batch $batch"
done
~~~

这个脚本里的 015-024 是按本次 Vault 的分类分布写死的批次表。换成你的 Vault 时，如果分类数量不同，需要先改脚本里的批次表和测试，再执行。

## 5. 生成最终迁移状态基线

~~~bash
node 80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs final-baseline
node 80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs verify
~~~

`final-baseline` 只应该在迁移完全结束后运行。它固定的是迁移收尾时的最终状态，不是一个长期约束日常写作的基线。后续你正常修改这些页面时，内容 hash 变化是合理的；不要因为它让迁移 verify 失败，就把日常写作视为破坏迁移。

## 6. 迁移后如何保留脚本

推荐做法是把脚本留在迁移档案或文章里，而不是接入写作流水线：

- `80-Archive/logseq-migration/scripts/` 与 `80-Archive/logseq-migration/checks/` 可以作为本 Vault 的历史迁移实现保存；
- 发布文章里直接内嵌完整脚本，方便复现和阅读；
- `60-Publish/` 下不再保留单独 `scripts/` 附件目录，避免发布工具或写作检查把它误当成当前站点资产；
- 日常写作检查只看发布内容本身，不运行迁移命令。

## 完整脚本

下面四段代码就是本次迁移使用的完整脚本和测试。它们适合复制到一次性迁移工作区中使用；迁移完成后，只保留为档案。

### Phase 2 机械迁移脚本

源文件：80-Archive/logseq-migration/scripts/logseq-migrate.mjs

~~~js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const VAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '../../..');
const RAW_ROOT = process.env.LOGSEQ_RAW_ROOT
  ? path.resolve(process.env.LOGSEQ_RAW_ROOT)
  : path.resolve(VAULT_ROOT, '../logseq-raw-snapshot');
const ASSET_OUTPUT = path.join(VAULT_ROOT, '90-Attachments/logseq-assets');
const JOURNAL_OUTPUT = path.join(VAULT_ROOT, '01-Daily');
const PAGE_OUTPUT = path.join(VAULT_ROOT, '00-Inbox/imported-logseq/pages');
const MIGRATION_ROOT = path.join(VAULT_ROOT, '80-Archive/logseq-migration/reports');

const RECOGNIZED_PROPERTIES = new Set(['tags', 'alias', 'description', 'public']);
const SPECIAL_TASK_STATES = new Set(['DOING', 'NOW', 'LATER', 'WAITING', 'CANCELED']);

function yamlString(value) {
  return JSON.stringify(String(value));
}

function yamlList(key, values) {
  if (values.length === 0) return `${key}: []`;
  return `${key}:\n${values.map((value) => `  - ${yamlString(value)}`).join('\n')}`;
}

function splitPropertyValues(value) {
  const values = [];
  let current = '';
  let linkDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const pair = value.slice(index, index + 2);
    if (pair === '[[') {
      linkDepth += 1;
      current += pair;
      index += 1;
    } else if (pair === ']]') {
      linkDepth = Math.max(0, linkDepth - 1);
      current += pair;
      index += 1;
    } else if (value[index] === ',' && linkDepth === 0) {
      if (current.trim()) values.push(current.trim());
      current = '';
    } else {
      current += value[index];
    }
  }

  if (current.trim()) values.push(current.trim());
  return values;
}

function unwrapPageLink(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
    return trimmed.slice(2, -2).trim();
  }
  return trimmed;
}

function normalizeTag(value) {
  return unwrapPageLink(value)
    .replace(/^#+/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseLeadingProperties(content) {
  const lines = content.split(/\r?\n/);
  const bodyLines = [];
  const properties = { tags: [], aliases: [], description: '' };
  const counts = { tags: 0, alias: 0, description: 0, public: 0 };
  let inLeadingMetadata = true;

  for (const line of lines) {
    const match = line.match(/^\s*(?:-\s+)?([A-Za-z0-9_.-]+)::\s*(.*)$/);

    if (inLeadingMetadata && match) {
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      if (RECOGNIZED_PROPERTIES.has(key)) {
        counts[key] += 1;
        if (key === 'tags') {
          properties.tags.push(...splitPropertyValues(value).map(normalizeTag).filter(Boolean));
        } else if (key === 'alias') {
          properties.aliases.push(...splitPropertyValues(value).map(unwrapPageLink).filter(Boolean));
        } else if (key === 'description') {
          properties.description = value;
        }
        continue;
      }
      bodyLines.push(line);
      continue;
    }

    if (inLeadingMetadata && line.trim() === '') {
      bodyLines.push(line);
      continue;
    }

    inLeadingMetadata = false;
    bodyLines.push(line);
  }

  properties.tags = [...new Set(properties.tags)];
  properties.aliases = [...new Set(properties.aliases)];
  return { body: bodyLines.join('\n'), properties, counts };
}

function buildFrontmatter(options, properties) {
  return [
    '---',
    `title: ${yamlString(options.title)}`,
    `description: ${yamlString(properties.description)}`,
    `created: ${options.created}`,
    `updated: ${options.updated}`,
    `type: ${options.type}`,
    `status: ${options.status}`,
    yamlList('tags', properties.tags),
    yamlList('aliases', properties.aliases),
    'areas: []',
    'projects: []',
    'source_type: logseq',
    `source_from: ${yamlString(options.sourceFrom)}`,
    'publish_target: none',
    'publish_status: private',
    'publish_slug: ""',
    'publish_category: ""',
    'publish_visibility: private',
    '---',
  ].join('\n');
}

function countMatches(content, pattern) {
  return [...content.matchAll(pattern)].length;
}

export function transformMarkdown(content, options) {
  if (!content.trim()) {
    return {
      skipped: true,
      reason: 'empty-or-whitespace-only',
      content: null,
      stats: {},
      warnings: {},
      removedBlockRefs: [],
      removedBlockEmbeds: [],
    };
  }
  if (/^---\r?\n/.test(content)) throw new Error('existing-frontmatter');

  const parsed = parseLeadingProperties(content);
  const warnings = {
    collapsed: countMatches(parsed.body, /^\s*(?:-\s+)?collapsed::/gmi),
    id: countMatches(parsed.body, /^\s*(?:-\s+)?id::/gmi),
    renderer: countMatches(parsed.body, /\{\{renderer\b/gi),
  };
  const removedBlockEmbeds = [];
  const removedBlockRefs = [];

  let body = parsed.body.replace(/\{\{embed\s+\(\([0-9a-f]+(?:-[0-9a-f]+){2,}\)\)\s*\}\}/gi, (original) => {
    removedBlockEmbeds.push(original);
    return '';
  });
  body = body.replace(/\(\([0-9a-fA-F]+(?:-[0-9a-fA-F]+){2,}\)\)/g, (original) => {
    removedBlockRefs.push(original);
    return '';
  });
  body = body.replace(/^\s*-\s*$/gm, '');

  let assetLinksRewritten = 0;
  body = body.replace(/(\]\()\.\.\/assets\//g, (_match, prefix) => {
    assetLinksRewritten += 1;
    return `${prefix}${options.assetPrefix}`;
  });

  let tasksConverted = 0;
  body = body.split('\n').flatMap((line) => {
    const match = line.match(/^(\s*)(?:-\s+)?(TODO|DONE|DOING|NOW|LATER|WAITING|CANCELED)\s+(.+)$/i);
    if (!match) return [line];

    const indent = match[1];
    const state = match[2].toUpperCase();
    const text = match[3];
    const checked = state === 'DONE' || state === 'CANCELED';
    const output = [`${indent}- [${checked ? 'x' : ' '}] ${text}`];
    if (SPECIAL_TASK_STATES.has(state)) {
      output.push(`${indent}  - logseq-status:: ${state}`);
    }
    tasksConverted += 1;
    return output;
  }).join('\n');

  body = body.replace(/^\n+/, '');
  const frontmatter = buildFrontmatter(options, parsed.properties);
  return {
    skipped: false,
    content: `${frontmatter}\n\n${body.replace(/\s+$/, '')}\n`,
    stats: {
      frontmatterAdded: 1,
      tagsConverted: parsed.counts.tags,
      aliasesConverted: parsed.counts.alias,
      descriptionsConverted: parsed.counts.description,
      publicRemoved: parsed.counts.public,
      tasksConverted,
      blockRefsRemoved: removedBlockRefs.length,
      blockEmbedsRemoved: removedBlockEmbeds.length,
      assetLinksRewritten,
    },
    warnings,
    removedBlockRefs,
    removedBlockEmbeds,
  };
}

export function stableSortPaths(paths) {
  return [...paths].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return stableSortPaths(files);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function aggregateFingerprint(root) {
  const files = walkFiles(root)
    .map((filePath) => ({
      filePath,
      relativePath: path.relative(root, filePath).normalize('NFC'),
    }))
    .sort((left, right) => Buffer.compare(
      Buffer.from(left.relativePath),
      Buffer.from(right.relativePath),
    ));
  const hash = crypto.createHash('sha256');
  let totalBytes = 0;
  for (const { filePath, relativePath } of files) {
    const buffer = fs.readFileSync(filePath);
    totalBytes += buffer.length;
    hash.update(relativePath);
    hash.update('\0');
    hash.update(buffer);
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), fileCount: files.length, totalBytes };
}

function createBatchStats(scanned) {
  return {
    scanned,
    migrated: 0,
    skippedEmpty: 0,
    conflicts: 0,
    frontmatterAdded: 0,
    tagsConverted: 0,
    aliasesConverted: 0,
    descriptionsConverted: 0,
    publicRemoved: 0,
    tasksConverted: 0,
    blockRefsRemoved: 0,
    blockEmbedsRemoved: 0,
    assetLinksRewritten: 0,
    warnings: { collapsed: 0, id: 0, renderer: 0 },
  };
}

function mergeTransformStats(batch, result) {
  for (const key of [
    'frontmatterAdded',
    'tagsConverted',
    'aliasesConverted',
    'descriptionsConverted',
    'publicRemoved',
    'tasksConverted',
    'blockRefsRemoved',
    'blockEmbedsRemoved',
    'assetLinksRewritten',
  ]) batch[key] += result.stats[key] ?? 0;
  for (const key of ['collapsed', 'id', 'renderer']) batch.warnings[key] += result.warnings[key] ?? 0;
}

function appendDetailEntries(fileName, heading, entries) {
  if (entries.length === 0) return;
  const filePath = path.join(MIGRATION_ROOT, fileName);
  let existing = fs.readFileSync(filePath, 'utf8').replace(/\n- No records\.\s*$/u, '');
  if (!existing.endsWith('\n')) existing += '\n';
  const text = entries.map((entry) => [
    `- file: \`${entry.file}\``,
    `  original: \`${entry.original.replaceAll('`', '\\`')}\``,
    '  action: removed',
  ].join('\n')).join('\n');
  fs.writeFileSync(filePath, `${existing}\n${text}\n`, 'utf8');
  if (!existing.startsWith(`# ${heading}`)) throw new Error(`detail-heading-mismatch: ${fileName}`);
}

function appendEmptyJournals(entries) {
  if (entries.length === 0) return;
  const filePath = path.join(MIGRATION_ROOT, 'empty-journals-removed.md');
  let existing = fs.readFileSync(filePath, 'utf8').replace(/\n- No records\.\s*$/u, '');
  if (!existing.endsWith('\n')) existing += '\n';
  const text = entries.map((source) => [
    `- source: \`${source}\``,
    '  reason: empty-or-whitespace-only',
    '  action: skipped',
  ].join('\n')).join('\n');
  fs.writeFileSync(filePath, `${existing}\n${text}\n`, 'utf8');
}

function prepareMarkdownOperations(sourceFiles, targetFor, optionsFor) {
  const stats = createBatchStats(sourceFiles.length);
  const operations = [];
  const emptySources = [];
  const refs = [];
  const embeds = [];

  for (const sourcePath of sourceFiles) {
    const targetPath = targetFor(sourcePath);
    const result = transformMarkdown(fs.readFileSync(sourcePath, 'utf8'), optionsFor(sourcePath));
    if (result.skipped) {
      stats.skippedEmpty += 1;
      emptySources.push(path.relative(RAW_ROOT, sourcePath));
      continue;
    }
    if (fs.existsSync(targetPath)) stats.conflicts += 1;
    stats.migrated += 1;
    mergeTransformStats(stats, result);
    const targetRelative = path.relative(VAULT_ROOT, targetPath);
    refs.push(...result.removedBlockRefs.map((original) => ({ file: targetRelative, original })));
    embeds.push(...result.removedBlockEmbeds.map((original) => ({ file: targetRelative, original })));
    operations.push({ targetPath, content: result.content });
  }

  return { stats, operations, emptySources, refs, embeds };
}

function writePreparedOperations(prepared) {
  if (prepared.stats.conflicts !== 0) throw new Error(`target-conflicts: ${prepared.stats.conflicts}`);
  for (const operation of prepared.operations) {
    fs.mkdirSync(path.dirname(operation.targetPath), { recursive: true });
    fs.writeFileSync(operation.targetPath, operation.content, { encoding: 'utf8', flag: 'wx' });
  }
  appendDetailEntries('removed-block-refs.md', 'Removed Block References', prepared.refs);
  appendDetailEntries('removed-block-embeds.md', 'Removed Block Embeds', prepared.embeds);
}

export function importAssets({ dryRun = false } = {}) {
  const sourceRoot = path.join(RAW_ROOT, 'assets');
  const sourceFiles = walkFiles(sourceRoot);
  const conflicts = sourceFiles.filter((sourcePath) => {
    const targetPath = path.join(ASSET_OUTPUT, path.relative(sourceRoot, sourcePath));
    return fs.existsSync(targetPath);
  });
  const result = { scanned: sourceFiles.length, copied: sourceFiles.length, conflicts: conflicts.length, verified: 0 };
  if (dryRun) return result;
  if (conflicts.length !== 0) throw new Error(`target-conflicts: ${conflicts.length}`);

  for (const sourcePath of sourceFiles) {
    const targetPath = path.join(ASSET_OUTPUT, path.relative(sourceRoot, sourcePath));
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(targetPath, fs.statSync(sourcePath).mode);
    if (fs.statSync(sourcePath).size !== fs.statSync(targetPath).size || sha256File(sourcePath) !== sha256File(targetPath)) {
      throw new Error(`asset-verification-failed: ${path.relative(sourceRoot, sourcePath)}`);
    }
    result.verified += 1;
  }
  return result;
}

export function importJournals({ year, dryRun = false }) {
  if (!/^\d{4}$/.test(String(year))) throw new Error('invalid-year');
  const sourceRoot = path.join(RAW_ROOT, 'journals');
  const sourceFiles = stableSortPaths(fs.readdirSync(sourceRoot)
    .filter((name) => name.startsWith(`${year}_`) && name.endsWith('.md')))
    .map((name) => path.join(sourceRoot, name));
  const prepared = prepareMarkdownOperations(
    sourceFiles,
    (sourcePath) => path.join(JOURNAL_OUTPUT, path.basename(sourcePath).replaceAll('_', '-')),
    (sourcePath) => {
      const sourceName = path.basename(sourcePath);
      const date = sourceName.slice(0, 10).replaceAll('_', '-');
      return {
        title: date,
        created: date,
        updated: date,
        type: 'daily',
        status: 'archived',
        sourceFrom: `journals/${sourceName}`,
        assetPrefix: '../90-Attachments/logseq-assets/',
      };
    },
  );
  if (!dryRun) {
    writePreparedOperations(prepared);
    appendEmptyJournals(prepared.emptySources);
  }
  return prepared.stats;
}

export function importPages({ offset, limit, dryRun = false }) {
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1) {
    throw new Error('invalid-page-range');
  }
  const sourceRoot = path.join(RAW_ROOT, 'pages');
  const names = stableSortPaths(fs.readdirSync(sourceRoot).filter((name) => name.endsWith('.md')));
  const sourceFiles = names.slice(offset, offset + limit).map((name) => path.join(sourceRoot, name));
  const prepared = prepareMarkdownOperations(
    sourceFiles,
    (sourcePath) => path.join(PAGE_OUTPUT, path.basename(sourcePath)),
    (sourcePath) => {
      const sourceName = path.basename(sourcePath);
      return {
        title: path.basename(sourceName, '.md'),
        created: '2026-06-20',
        updated: '2026-06-20',
        type: 'note',
        status: 'seed',
        sourceFrom: `pages/${sourceName}`,
        assetPrefix: '../../../90-Attachments/logseq-assets/',
      };
    },
  );
  if (!dryRun) writePreparedOperations(prepared);
  return prepared.stats;
}

function markdownOutputs() {
  const journals = walkFiles(JOURNAL_OUTPUT).filter((filePath) => filePath.endsWith('.md'));
  const pages = walkFiles(PAGE_OUTPUT).filter((filePath) => filePath.endsWith('.md'));
  return { journals, pages };
}

function verifyMarkdownFile(filePath, errors) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relative = path.relative(VAULT_ROOT, filePath);
  if (!content.startsWith('---\n')) errors.push(`${relative}: missing-frontmatter`);
  if (!/^source_type: logseq$/m.test(content)) errors.push(`${relative}: missing-source-type`);
  if (!/^source_from: /m.test(content)) errors.push(`${relative}: missing-source-from`);
  if (/^(source|publish):\s*$/m.test(content)) errors.push(`${relative}: nested-property`);
  if (/^\s*(?:-\s+)?public::/mi.test(content)) errors.push(`${relative}: public-property`);
  if (/\(\([0-9a-fA-F]+(?:-[0-9a-fA-F]+){2,}\)\)/.test(content)) errors.push(`${relative}: block-ref`);
  if (/\{\{embed\s+\(\([0-9a-f]+(?:-[0-9a-f]+){2,}\)\)/i.test(content)) errors.push(`${relative}: block-embed`);

  for (const match of content.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    let target = match[1].trim();
    if (!target.includes('90-Attachments/logseq-assets/')) continue;
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    try { target = decodeURI(target); } catch { /* Keep the raw target for reporting. */ }
    const resolved = path.resolve(path.dirname(filePath), target);
    if (!fs.existsSync(resolved)) errors.push(`${relative}: missing-asset:${target}`);
  }
}

export function verifyVault({ expectedAssets, expectedJournals, expectedPages }) {
  const errors = [];
  const assets = walkFiles(ASSET_OUTPUT);
  const outputs = markdownOutputs();
  for (const filePath of [...outputs.journals, ...outputs.pages]) verifyMarkdownFile(filePath, errors);
  if (assets.length !== expectedAssets) errors.push(`assets-count:${assets.length}!=${expectedAssets}`);
  if (outputs.journals.length !== expectedJournals) errors.push(`journals-count:${outputs.journals.length}!=${expectedJournals}`);
  if (outputs.pages.length !== expectedPages) errors.push(`pages-count:${outputs.pages.length}!=${expectedPages}`);

  const manifest = JSON.parse(fs.readFileSync(path.join(MIGRATION_ROOT, 'raw-logseq-manifest.json'), 'utf8'));
  const raw = aggregateFingerprint(RAW_ROOT);
  if (raw.sha256 !== manifest.aggregate_sha256) errors.push('raw-hash-mismatch');
  if (errors.length !== 0) throw new Error(`verification-failed:\n${errors.join('\n')}`);
  return {
    assets: assets.length,
    journals: outputs.journals.length,
    pages: outputs.pages.length,
    rawSha256: raw.sha256,
    errors: 0,
  };
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function argument(name, parser = String) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) throw new Error(`missing-argument: ${name}`);
  return parser(process.argv[index + 1]);
}

function runCli() {
  const command = process.argv[2];
  let result;
  if (command === 'assets') {
    result = importAssets({ dryRun: hasFlag('--dry-run') });
  } else if (command === 'journals') {
    result = importJournals({ year: argument('--year'), dryRun: hasFlag('--dry-run') });
  } else if (command === 'pages') {
    result = importPages({
      offset: argument('--offset', Number),
      limit: argument('--limit', Number),
      dryRun: hasFlag('--dry-run'),
    });
  } else if (command === 'verify') {
    result = verifyVault({
      expectedAssets: argument('--expected-assets', Number),
      expectedJournals: argument('--expected-journals', Number),
      expectedPages: argument('--expected-pages', Number),
    });
  } else {
    throw new Error(`unknown-command: ${command ?? ''}`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
~~~

### Phase 2 转换规则测试

源文件：80-Archive/logseq-migration/checks/logseq-migrate.test.mjs

~~~js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  aggregateFingerprint,
  stableSortPaths,
  transformMarkdown,
} from '../scripts/logseq-migrate.mjs';

const pageOptions = {
  title: 'Example',
  created: '2026-06-20',
  updated: '2026-06-20',
  type: 'note',
  status: 'seed',
  sourceFrom: 'pages/Example.md',
  assetPrefix: '../../../90-Attachments/logseq-assets/',
};

test('converts leading Logseq properties into flat frontmatter', () => {
  const input = [
    'tags:: [[Obsidian]], Knowledge System, 中文标签',
    'alias:: Coding Agent, AI Agent',
    'description:: 迁移说明',
    'public:: true',
    '- 正文 [[保留双链]]',
  ].join('\n');

  const result = transformMarkdown(input, pageOptions);

  assert.match(result.content, /^---\n/);
  assert.match(result.content, /title: "Example"/);
  assert.match(result.content, /tags:\n  - "obsidian"\n  - "knowledge-system"\n  - "中文标签"/);
  assert.match(result.content, /aliases:\n  - "Coding Agent"\n  - "AI Agent"/);
  assert.match(result.content, /description: "迁移说明"/);
  assert.match(result.content, /source_type: logseq/);
  assert.match(result.content, /source_from: "pages\/Example.md"/);
  assert.doesNotMatch(result.content, /^(source|publish):/m);
  assert.doesNotMatch(result.content, /public::/);
  assert.match(result.content, /\[\[保留双链\]\]/);
  assert.equal(result.stats.publicRemoved, 1);
});

test('converts every specified task state', () => {
  const input = [
    '- TODO todo item',
    '- DONE done item',
    '- DOING doing item',
    '- NOW now item',
    '- LATER later item',
    '- WAITING waiting item',
    '- CANCELED canceled item',
  ].join('\n');

  const result = transformMarkdown(input, pageOptions);

  assert.match(result.content, /- \[ \] todo item/);
  assert.match(result.content, /- \[x\] done item/);
  assert.match(result.content, /- \[ \] doing item\n  - logseq-status:: DOING/);
  assert.match(result.content, /- \[ \] now item\n  - logseq-status:: NOW/);
  assert.match(result.content, /- \[ \] later item\n  - logseq-status:: LATER/);
  assert.match(result.content, /- \[ \] waiting item\n  - logseq-status:: WAITING/);
  assert.match(result.content, /- \[x\] canceled item\n  - logseq-status:: CANCELED/);
  assert.equal(result.stats.tasksConverted, 7);
});

test('removes block refs and block embeds while recording originals', () => {
  const input = [
    '- before ((64a12345-aaaa-bbbb)) after',
    '- {{embed ((64a99999-aaaa-bbbb))}}',
  ].join('\n');

  const result = transformMarkdown(input, pageOptions);

  assert.match(result.content, /- before\s+after/);
  assert.doesNotMatch(result.content, /64a12345|64a99999|embed/);
  assert.equal(result.stats.blockRefsRemoved, 1);
  assert.equal(result.stats.blockEmbedsRemoved, 1);
  assert.deepEqual(result.removedBlockRefs, ['((64a12345-aaaa-bbbb))']);
  assert.deepEqual(result.removedBlockEmbeds, ['{{embed ((64a99999-aaaa-bbbb))}}']);
});

test('preserves shell arithmetic that is not a Logseq block ref', () => {
  const input = '- num=$((last_num+i))';

  const result = transformMarkdown(input, pageOptions);

  assert.match(result.content, /num=\$\(\(last_num\+i\)\)/);
  assert.equal(result.stats.blockRefsRemoved, 0);
});

test('rewrites Markdown asset links relative to the destination', () => {
  const input = [
    '![image](../assets/image.png)',
    '[file](../assets/example.pdf)',
  ].join('\n');

  const result = transformMarkdown(input, pageOptions);

  assert.match(result.content, /!\[image\]\(\.\.\/\.\.\/\.\.\/90-Attachments\/logseq-assets\/image\.png\)/);
  assert.match(result.content, /\[file\]\(\.\.\/\.\.\/\.\.\/90-Attachments\/logseq-assets\/example\.pdf\)/);
  assert.equal(result.stats.assetLinksRewritten, 2);
});

test('preserves unsupported Logseq syntax and counts warnings', () => {
  const input = [
    '- collapsed:: true',
    '- id:: 1234',
    '- {{renderer :example}}',
  ].join('\n');

  const result = transformMarkdown(input, pageOptions);

  assert.match(result.content, /collapsed:: true/);
  assert.match(result.content, /id:: 1234/);
  assert.match(result.content, /\{\{renderer :example\}\}/);
  assert.deepEqual(result.warnings, { collapsed: 1, id: 1, renderer: 1 });
});

test('returns skipped for an empty source file', () => {
  const result = transformMarkdown('  \n\t', pageOptions);

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'empty-or-whitespace-only');
  assert.equal(result.content, null);
});

test('rejects source files that already contain frontmatter', () => {
  assert.throws(
    () => transformMarkdown('---\ntitle: Existing\n---\nBody', pageOptions),
    /existing-frontmatter/,
  );
});

test('sorts paths by UTF-8 bytes for deterministic page batches', () => {
  const paths = ['中文.md', 'b.md', 'A.md'];

  assert.deepEqual(stableSortPaths(paths), ['A.md', 'b.md', '中文.md']);
});

test('uses Unicode NFC paths for cross-checkout aggregate fingerprints', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'logseq-manifest-'));
  const nfdRoot = path.join(root, 'nfd');
  const nfcRoot = path.join(root, 'nfc');
  fs.mkdirSync(nfdRoot);
  fs.mkdirSync(nfcRoot);
  fs.writeFileSync(path.join(nfdRoot, 'Ma\u0308tzler.edn'), 'same-content');
  fs.writeFileSync(path.join(nfcRoot, 'M\u00e4tzler.edn'), 'same-content');

  try {
    assert.equal(
      aggregateFingerprint(nfdRoot).sha256,
      aggregateFingerprint(nfcRoot).sha256,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
~~~

### Phase 3 分类移动与迁移验收脚本

源文件：80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs

~~~js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APPROVED_TARGETS = [
  '00-Inbox',
  '10-Notes',
  '20-Projects',
  '30-Areas',
  '40-Resources',
  '50-MOCs',
];
const MOVABLE_TARGETS = APPROVED_TARGETS.filter((target) => target !== '00-Inbox');

const SOURCE_DIRECTORY = '00-Inbox/imported-logseq/pages';
const ASSET_DIRECTORY = '90-Attachments/logseq-assets';
const ASSET_MARKER = '90-Attachments/logseq-assets/';
const OLD_ASSET_PREFIX = '../../../90-Attachments/logseq-assets/';
const NEW_ASSET_PREFIX = '../90-Attachments/logseq-assets/';
const SCAFFOLDING_MARKDOWN_FILES = new Set(['AGENTS.md']);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const CLI_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '../../..');
const DEFAULT_MANIFEST = '80-Archive/logseq-migration/reports/classification-manifest-v2.md';
const DEFAULT_BASELINE = '80-Archive/logseq-migration/reports/classification-content-baseline-v2.json';
const DEFAULT_FINAL_STATE_BASELINE = '80-Archive/logseq-migration/reports/classification-final-state-baseline-v2.json';
const REPORT_DIRECTORY = '80-Archive/logseq-migration/reports/batches';

const BATCHES = Object.freeze({
  '015': Object.freeze({
    id: '015', name: 'classify-area', target: '30-Areas', offset: 0, limit: 1,
    attachmentPages: 0, attachmentLinks: 0, movedTotal: 1, inboxRemaining: 237,
    report: '015-classify-area.md', commitMessage: 'migration: classify logseq area',
  }),
  '016': Object.freeze({
    id: '016', name: 'classify-notes-001', target: '10-Notes', offset: 0, limit: 33,
    attachmentPages: 12, attachmentLinks: 23, movedTotal: 34, inboxRemaining: 204,
    report: '016-classify-notes-001.md', commitMessage: 'migration: classify logseq notes 001',
  }),
  '017': Object.freeze({
    id: '017', name: 'classify-notes-002', target: '10-Notes', offset: 33, limit: 32,
    attachmentPages: 10, attachmentLinks: 26, movedTotal: 66, inboxRemaining: 172,
    report: '017-classify-notes-002.md', commitMessage: 'migration: classify logseq notes 002',
  }),
  '018': Object.freeze({
    id: '018', name: 'classify-resources-001', target: '40-Resources', offset: 0, limit: 25,
    attachmentPages: 3, attachmentLinks: 29, movedTotal: 91, inboxRemaining: 147,
    report: '018-classify-resources-001.md', commitMessage: 'migration: classify logseq resources 001',
  }),
  '019': Object.freeze({
    id: '019', name: 'classify-resources-002', target: '40-Resources', offset: 25, limit: 25,
    attachmentPages: 2, attachmentLinks: 2, movedTotal: 116, inboxRemaining: 122,
    report: '019-classify-resources-002.md', commitMessage: 'migration: classify logseq resources 002',
  }),
  '020': Object.freeze({
    id: '020', name: 'classify-resources-003', target: '40-Resources', offset: 50, limit: 25,
    attachmentPages: 6, attachmentLinks: 19, movedTotal: 141, inboxRemaining: 97,
    report: '020-classify-resources-003.md', commitMessage: 'migration: classify logseq resources 003',
  }),
  '021': Object.freeze({
    id: '021', name: 'classify-projects-001', target: '20-Projects', offset: 0, limit: 17,
    attachmentPages: 7, attachmentLinks: 12, movedTotal: 158, inboxRemaining: 80,
    report: '021-classify-projects-001.md', commitMessage: 'migration: classify logseq projects 001',
  }),
  '022': Object.freeze({
    id: '022', name: 'classify-projects-002', target: '20-Projects', offset: 17, limit: 17,
    attachmentPages: 3, attachmentLinks: 20, movedTotal: 175, inboxRemaining: 63,
    report: '022-classify-projects-002.md', commitMessage: 'migration: classify logseq projects 002',
  }),
  '023': Object.freeze({
    id: '023', name: 'classify-projects-003', target: '20-Projects', offset: 34, limit: 17,
    attachmentPages: 5, attachmentLinks: 16, movedTotal: 192, inboxRemaining: 46,
    report: '023-classify-projects-003.md', commitMessage: 'migration: classify logseq projects 003',
  }),
  '024': Object.freeze({
    id: '024', name: 'classify-mocs', target: '50-MOCs', offset: 0, limit: 3,
    attachmentPages: 0, attachmentLinks: 0, movedTotal: 195, inboxRemaining: 43,
    report: '024-classify-mocs.md', commitMessage: 'migration: classify logseq mocs',
  }),
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function compareNames(left, right) {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}

function unsafePath(filePath) {
  throw new Error(`unsafe-path: ${filePath}`);
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function controlledRoot(root) {
  const absolute = path.resolve(root);
  let stats;
  try {
    stats = fs.lstatSync(absolute);
  } catch {
    return unsafePath(absolute);
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) return unsafePath(absolute);
  const real = fs.realpathSync(absolute);
  if (real !== absolute) return unsafePath(absolute);
  return real;
}

function controlledPath(root, candidate, { allowMissing = false, type } = {}) {
  const absolute = path.resolve(candidate);
  if (!isWithin(root, absolute)) return unsafePath(absolute);
  const relative = path.relative(root, absolute);
  const segments = relative === '' ? [] : relative.split(path.sep);
  let current = root;
  let missing = false;

  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch (error) {
      if (error.code !== 'ENOENT' || !allowMissing) throw error;
      missing = true;
      continue;
    }
    if (missing || stats.isSymbolicLink()) return unsafePath(current);
    const final = index === segments.length - 1;
    if (!final && !stats.isDirectory()) return unsafePath(current);
    if (final && type === 'directory' && !stats.isDirectory()) return unsafePath(current);
    if (final && type === 'file' && !stats.isFile()) return unsafePath(current);
    if (!isWithin(root, fs.realpathSync(current))) return unsafePath(current);
  }

  if (segments.length === 0 && type === 'directory') return root;
  if (missing && !allowMissing) return unsafePath(absolute);
  return absolute;
}

function controlledRegularFileExists(root, filePath) {
  const controlled = controlledPath(root, filePath, { allowMissing: true, type: 'file' });
  return isRegularFile(controlled);
}

function controlledEntryState(root, filePath) {
  const controlled = controlledPath(root, filePath, { allowMissing: true });
  try {
    const stats = fs.lstatSync(controlled);
    return { exists: true, regular: stats.isFile() };
  } catch (error) {
    if (error.code === 'ENOENT') return { exists: false, regular: false };
    throw error;
  }
}

function controlledVaultPaths(root) {
  const sourceRoot = controlledPath(root, path.join(root, SOURCE_DIRECTORY), {
    type: 'directory',
  });
  const targetRoots = Object.fromEntries(APPROVED_TARGETS.map((target) => [
    target,
    controlledPath(root, path.join(root, target), {
      allowMissing: true,
      type: 'directory',
    }),
  ]));
  return { sourceRoot, targetRoots };
}

function auditDirectoryMarkdown(root, directory, location, manifestNames, locationErrors) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const filePath = controlledPath(root, path.join(directory, entry.name));
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) return unsafePath(filePath);
    if (stats.isDirectory()) {
      locationErrors.push({
        filename: entry.name,
        location,
        reason: 'unexpected-directory',
      });
      if (entry.name.endsWith('.md') && !manifestNames.has(entry.name)) {
        locationErrors.push({
          filename: entry.name,
          location,
          reason: 'not-regular-file',
        });
      }
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;
    if (SCAFFOLDING_MARKDOWN_FILES.has(entry.name)) continue;
    if (!stats.isFile()) {
      if (!manifestNames.has(entry.name)) {
        locationErrors.push({
          filename: entry.name,
          location,
          reason: 'not-regular-file',
        });
      }
    } else if (!manifestNames.has(entry.name)) {
      locationErrors.push({
        filename: entry.name,
        location,
        reason: 'unlisted-file',
      });
    }
  }
}

function readManifest(root, manifestPath, expectedTotal) {
  const controlled = controlledPath(root, manifestPath, { type: 'file' });
  const bytes = fs.readFileSync(controlled);
  return {
    bytes,
    entries: parseManifest(bytes.toString('utf8'), { expectedTotal }),
    sha256: sha256(bytes),
  };
}

function readBaseline(root, baselinePath, manifest, expectedTotal) {
  let baseline;
  try {
    const controlled = controlledPath(root, baselinePath, { type: 'file' });
    baseline = JSON.parse(fs.readFileSync(controlled, 'utf8'));
  } catch (error) {
    throw new Error(`invalid-baseline: ${error.message}`);
  }
  if (baseline?.manifest_sha256 !== manifest.sha256) {
    throw new Error('manifest-sha256-mismatch');
  }
  const expectedNames = manifest.entries.map((entry) => entry.filename).sort(compareNames);
  const actualNames = baseline.files && typeof baseline.files === 'object'
    ? Object.keys(baseline.files).sort(compareNames)
    : [];
  if (
    expectedNames.length !== expectedTotal
    || actualNames.length !== expectedNames.length
    || actualNames.some((name, index) => name !== expectedNames[index])
    || actualNames.some((name) => !/^[0-9a-f]{64}$/u.test(baseline.files[name]))
  ) {
    throw new Error('baseline-files-mismatch');
  }
  return baseline;
}

function isRegularFile(filePath) {
  try {
    return fs.lstatSync(filePath).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function markdownBodyStart(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return 0;
  let cursor = text.indexOf('\n') + 1;
  while (cursor > 0 && cursor <= text.length) {
    const newline = text.indexOf('\n', cursor);
    const end = newline === -1 ? text.length : newline;
    const line = text.slice(cursor, end).replace(/\r$/u, '');
    if (line === '---') return newline === -1 ? text.length : newline + 1;
    if (newline === -1) break;
    cursor = newline + 1;
  }
  return text.length;
}

function isEscaped(text, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function fenceMarker(line) {
  let index = 0;
  while (index < 3 && line[index] === ' ') index += 1;
  const character = line[index];
  if (character !== '`' && character !== '~') return null;
  const start = index;
  while (line[index] === character) index += 1;
  const length = index - start;
  return length >= 3 ? { character, length, end: index } : null;
}

function matchingInlineCodeEnd(text, start, runLength) {
  let cursor = start + runLength;
  while (cursor < text.length) {
    if (text[cursor] !== '`') {
      cursor += 1;
      continue;
    }
    let end = cursor;
    while (text[end] === '`') end += 1;
    if (end - cursor === runLength) return end;
    cursor = end;
  }
  return -1;
}

function matchingLabelEnd(text, start) {
  let depth = 1;
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
      continue;
    }
    if (text[index] === '[') depth += 1;
    if (text[index] === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function destinationSpan(text, insideStart) {
  let cursor = insideStart;
  while (/[ \t]/u.test(text[cursor])) cursor += 1;
  let start = cursor;
  let end = cursor;

  if (text[cursor] === '<') {
    start = cursor + 1;
    cursor = start;
    while (cursor < text.length && text[cursor] !== '\r' && text[cursor] !== '\n') {
      if (text[cursor] === '\\') {
        cursor += 2;
        continue;
      }
      if (text[cursor] === '>') break;
      cursor += 1;
    }
    if (text[cursor] !== '>') return null;
    end = cursor;
    cursor += 1;
  } else {
    let depth = 0;
    while (cursor < text.length && text[cursor] !== '\r' && text[cursor] !== '\n') {
      if (text[cursor] === '\\') {
        cursor += 2;
        continue;
      }
      if (text[cursor] === '(') {
        depth += 1;
        cursor += 1;
        continue;
      }
      if (text[cursor] === ')') {
        if (depth === 0) break;
        depth -= 1;
        cursor += 1;
        continue;
      }
      if (depth === 0 && /[ \t]/u.test(text[cursor])) break;
      cursor += 1;
    }
    if (depth !== 0) return null;
    end = cursor;
  }

  const hadSeparator = /[ \t]/u.test(text[cursor]);
  while (/[ \t]/u.test(text[cursor])) cursor += 1;
  if (text[cursor] !== ')') {
    if (!hadSeparator || !['"', "'", '('].includes(text[cursor])) return null;
    const titleOpening = text[cursor];
    const titleClosing = titleOpening === '(' ? ')' : titleOpening;
    cursor += 1;
    while (cursor < text.length && text[cursor] !== '\r' && text[cursor] !== '\n') {
      if (text[cursor] === '\\') {
        cursor += 2;
        continue;
      }
      if (text[cursor] === titleClosing) break;
      cursor += 1;
    }
    if (text[cursor] !== titleClosing) return null;
    cursor += 1;
    while (/[ \t]/u.test(text[cursor])) cursor += 1;
  }
  if (text[cursor] !== ')') return null;
  return {
    closing: cursor,
    span: end > start ? { start, end, raw: text.slice(start, end) } : null,
  };
}

function isIndentedCodeLine(line) {
  return line.startsWith('\t') || line.startsWith('    ');
}

function isThematicBreakLine(line) {
  return /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/u.test(line);
}

function isNonParagraphBlockLine(line) {
  return (
    /^ {0,3}#{1,6}(?:[ \t]+|$)/u.test(line)
    || /^ {0,3}(?:=+|-+)[ \t]*$/u.test(line)
    || isThematicBreakLine(line)
    || /^ {0,3}\[(?:\\.|[^\]\\])+\]:[ \t]*(?:\S.*)?$/u.test(line)
  );
}

function blockContainerInfo(line) {
  let offset = 0;
  const containers = [];
  while (offset < line.length) {
    let marker = offset;
    let spaces = 0;
    while (spaces < 3 && line[marker] === ' ') {
      marker += 1;
      spaces += 1;
    }
    if (line[marker] === '>') {
      marker += 1;
      if (line[marker] === ' ' || line[marker] === '\t') marker += 1;
      offset = marker;
      containers.push({ type: 'quote' });
      continue;
    }
    const remainder = line.slice(marker);
    const list = isThematicBreakLine(remainder)
      ? null
      : remainder.match(/^(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)/u);
    if (list) {
      containers.push({
        type: 'list',
        continuationIndent: marker - offset + list[0].length,
      });
      offset = marker + list[0].length;
      continue;
    }
    break;
  }
  return {
    content: line.slice(offset),
    containers,
  };
}

function stripRequiredQuoteMarker(line) {
  let offset = 0;
  while (offset < 3 && line[offset] === ' ') offset += 1;
  if (line[offset] !== '>') return null;
  offset += 1;
  if (line[offset] === ' ' || line[offset] === '\t') {
    offset += 1;
  }
  return line.slice(offset);
}

function stripRequiredListIndent(line, continuationIndent) {
  if (/^[ \t]*$/u.test(line)) return '';
  let offset = 0;
  let column = 0;
  while (column < continuationIndent) {
    if (line[offset] === ' ') column += 1;
    else if (line[offset] === '\t') column += 4 - (column % 4);
    else return null;
    offset += 1;
  }
  return `${' '.repeat(column - continuationIndent)}${line.slice(offset)}`;
}

function matchingContainerPrefix(line, containers) {
  let content = line;
  let count = 0;
  for (const container of containers) {
    const continuedContent = container.type === 'quote'
      ? stripRequiredQuoteMarker(content)
      : stripRequiredListIndent(content, container.continuationIndent);
    if (continuedContent === null) break;
    content = continuedContent;
    count += 1;
  }
  return {
    content,
    containers: containers.slice(0, count),
  };
}

function activeContainerContent(line, containers) {
  const continuation = matchingContainerPrefix(line, containers);
  if (continuation.containers.length !== containers.length) {
    return null;
  }
  return continuation.content;
}

function copyContainers(containers) {
  return containers.map((container) => ({ ...container }));
}

const RAW_HTML_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body', 'caption',
  'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset', 'h1',
  'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'iframe', 'legend',
  'li', 'link', 'main', 'menu', 'menuitem', 'nav', 'noframes', 'ol', 'optgroup',
  'option', 'p', 'param', 'search', 'section', 'summary', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'title', 'tr', 'track', 'ul',
]);

function rawHtmlBlockStart(line) {
  const content = line.replace(/^ {0,3}/u, '');
  const typeOne = content.match(/^<(pre|script|style|textarea)(?=[\s>])/iu);
  if (typeOne) return { type: 1, kind: 'token-ci', token: `</${typeOne[1].toLowerCase()}>` };
  if (content.startsWith('<!--')) return { type: 2, kind: 'token', token: '-->' };
  if (content.startsWith('<?')) return { type: 3, kind: 'token', token: '?>' };
  if (/^<!\[CDATA\[/iu.test(content)) return { type: 5, kind: 'token', token: ']]>' };
  if (/^<![A-Z]/u.test(content)) return { type: 4, kind: 'token', token: '>' };

  const tag = content.match(/^<\/?([A-Za-z][A-Za-z0-9-]*)(?=[\s/>])/u)?.[1].toLowerCase();
  if (tag && RAW_HTML_BLOCK_TAGS.has(tag)) return { type: 6, kind: 'blank' };
  if (/^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[^<>]*)?\s*\/?>[ \t]*$/u.test(content)) {
    return { type: 7, kind: 'blank' };
  }
  return null;
}

function rawHtmlBlockEnds(line, state) {
  if (state.kind === 'blank') return /^[ \t]*$/u.test(line);
  if (state.kind === 'token-ci') return line.toLowerCase().includes(state.token);
  return line.includes(state.token);
}

function markdownLinkDestinationSpans(text) {
  const destinations = [];
  let fence = null;
  let rawHtml = null;
  let listContainers = null;
  let indentedCode = false;
  let previousLineBlank = true;
  let paragraphOpen = false;
  let index = markdownBodyStart(text);

  while (index < text.length) {
    const lineStart = index === 0 || text[index - 1] === '\n';
    if (lineStart) {
      const newline = text.indexOf('\n', index);
      const lineEnd = newline === -1 ? text.length : newline;
      const line = text.slice(index, lineEnd).replace(/\r$/u, '');
      if (fence) {
        const fenceLine = activeContainerContent(line, fence.containers);
        if (fenceLine !== null) {
          const marker = fenceMarker(fenceLine);
          if (
            marker
            && marker.character === fence.character
            && marker.length >= fence.length
            && /^[ \t]*$/u.test(fenceLine.slice(marker.end))
          ) {
            fence = null;
          }
          paragraphOpen = false;
          previousLineBlank = /^[ \t]*$/u.test(fenceLine);
          index = newline === -1 ? text.length : newline + 1;
          continue;
        }
        fence = null;
        paragraphOpen = false;
      }
      if (rawHtml) {
        const rawHtmlLine = activeContainerContent(line, rawHtml.containers);
        if (rawHtmlLine !== null) {
          if (rawHtmlBlockEnds(rawHtmlLine, rawHtml)) rawHtml = null;
          paragraphOpen = false;
          previousLineBlank = /^[ \t]*$/u.test(rawHtmlLine);
          index = newline === -1 ? text.length : newline + 1;
          continue;
        }
        rawHtml = null;
        paragraphOpen = false;
      }
      let containerLine = line;
      let inheritedContainers = [];
      if (listContainers) {
        const continuation = matchingContainerPrefix(line, listContainers);
        if (continuation.containers.some((container) => container.type === 'list')) {
          containerLine = continuation.content;
          inheritedContainers = continuation.containers;
        } else {
          listContainers = null;
          paragraphOpen = false;
        }
      }
      const parsedContainer = blockContainerInfo(containerLine);
      const container = {
        content: parsedContainer.content,
        containers: [
          ...copyContainers(inheritedContainers),
          ...copyContainers(parsedContainer.containers),
        ],
      };
      listContainers = container.containers.some((entry) => entry.type === 'list')
        ? copyContainers(container.containers)
        : null;
      const blockLine = container.content;
      const blank = /^[ \t]*$/u.test(blockLine);
      const previousWasBlank = previousLineBlank;
      const marker = fenceMarker(blockLine);
      if (indentedCode) {
        if (blank || isIndentedCodeLine(blockLine)) {
          paragraphOpen = false;
          previousLineBlank = blank;
          index = newline === -1 ? text.length : newline + 1;
          continue;
        }
        indentedCode = false;
      }
      if (marker) {
        fence = {
          ...marker,
          containers: copyContainers(container.containers),
        };
        paragraphOpen = false;
        previousLineBlank = blank;
        index = newline === -1 ? text.length : newline + 1;
        continue;
      }
      const openingRawHtml = rawHtmlBlockStart(blockLine);
      if (openingRawHtml && (openingRawHtml.type !== 7 || !paragraphOpen)) {
        if (!rawHtmlBlockEnds(blockLine, openingRawHtml)) {
          rawHtml = {
            ...openingRawHtml,
            containers: copyContainers(container.containers),
          };
        }
        paragraphOpen = false;
        previousLineBlank = blank;
        index = newline === -1 ? text.length : newline + 1;
        continue;
      }
      if (previousWasBlank && isIndentedCodeLine(blockLine)) {
        indentedCode = true;
        paragraphOpen = false;
        previousLineBlank = false;
        index = newline === -1 ? text.length : newline + 1;
        continue;
      }
      previousLineBlank = blank;
      if (blank) {
        paragraphOpen = false;
        index = newline === -1 ? text.length : newline + 1;
        continue;
      }
      paragraphOpen = !isNonParagraphBlockLine(blockLine);
    }

    if (text.startsWith('<!--', index)) {
      const commentEnd = text.indexOf('-->', index + 4);
      if (commentEnd === -1) break;
      index = commentEnd + 3;
      continue;
    }

    if (text[index] === '`') {
      let runEnd = index;
      while (text[runEnd] === '`') runEnd += 1;
      const codeEnd = matchingInlineCodeEnd(text, index, runEnd - index);
      if (codeEnd !== -1) {
        index = codeEnd;
        continue;
      }
      index = runEnd;
      continue;
    }

    let labelStart = -1;
    if (text[index] === '!' && text[index + 1] === '[') {
      if (isEscaped(text, index) || isEscaped(text, index + 1)) {
        index += 2;
        continue;
      }
      labelStart = index + 1;
    } else if (text[index] === '[') {
      if (isEscaped(text, index)) {
        index += 1;
        continue;
      }
      labelStart = index;
    }
    if (labelStart === -1) {
      index += 1;
      continue;
    }

    const labelEnd = matchingLabelEnd(text, labelStart);
    if (labelEnd === -1 || text[labelEnd + 1] !== '(') {
      index = labelStart + 1;
      continue;
    }
    const destination = destinationSpan(text, labelEnd + 2);
    if (!destination) {
      index = labelEnd + 1;
      continue;
    }
    if (destination.span) destinations.push(destination.span);
    index = destination.closing + 1;
  }
  return destinations;
}

function markdownUnescape(value) {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];
    const code = next?.codePointAt(0) ?? 0;
    const escapable = (
      (code >= 0x21 && code <= 0x2f)
      || (code >= 0x3a && code <= 0x40)
      || (code >= 0x5b && code <= 0x60)
      || (code >= 0x7b && code <= 0x7e)
    );
    if (character === '\\' && escapable) {
      result += next;
      index += 1;
    } else {
      result += character;
    }
  }
  return result;
}

function managedDestination(raw) {
  const prefix = raw.startsWith(OLD_ASSET_PREFIX)
    ? OLD_ASSET_PREFIX
    : raw.startsWith(NEW_ASSET_PREFIX)
      ? NEW_ASSET_PREFIX
      : null;
  if (!prefix) {
    if (raw.includes(ASSET_MARKER) || markdownUnescape(raw).includes(ASSET_MARKER)) {
      throw new Error(`invalid-attachment: ${raw}`);
    }
    return null;
  }

  const suffix = raw.slice(prefix.length);
  if (!suffix || suffix.includes('\0') || /%(?:2f|5c)/iu.test(suffix)) {
    throw new Error(`invalid-attachment: ${raw}`);
  }
  const segments = suffix.split('/').map((segment) => {
    if (!segment) throw new Error(`invalid-attachment: ${raw}`);
    let decoded;
    try {
      decoded = decodeURIComponent(markdownUnescape(segment));
    } catch {
      throw new Error(`invalid-attachment: ${raw}`);
    }
    if (
      decoded === '.'
      || decoded === '..'
      || decoded.includes('/')
      || decoded.includes('\\')
      || decoded.includes('\0')
    ) {
      throw new Error(`invalid-attachment: ${raw}`);
    }
    return decoded;
  });
  return { prefix, segments };
}

function transformManagedDestinations(content) {
  const text = content.toString('utf8');
  const chunks = [];
  let cursor = 0;
  for (const span of markdownLinkDestinationSpans(text)) {
    const managed = managedDestination(span.raw);
    if (!managed || managed.prefix === NEW_ASSET_PREFIX) continue;
    chunks.push(text.slice(cursor, span.start));
    chunks.push(NEW_ASSET_PREFIX, span.raw.slice(OLD_ASSET_PREFIX.length));
    cursor = span.end;
  }
  if (chunks.length === 0) return content;
  chunks.push(text.slice(cursor));
  return Buffer.from(chunks.join(''), 'utf8');
}

function normalizeContent(content) {
  return transformManagedDestinations(content);
}

function inspectAttachments(root, filePath, content) {
  const links = [];
  const text = content.toString('utf8');
  const assetRoot = controlledPath(root, path.join(root, ASSET_DIRECTORY), {
    allowMissing: true,
    type: 'directory',
  });
  for (const span of markdownLinkDestinationSpans(text)) {
    const managed = managedDestination(span.raw);
    if (!managed) continue;
    const resolved = path.join(assetRoot, ...managed.segments);
    if (!isWithin(assetRoot, resolved)) throw new Error(`invalid-attachment: ${span.raw}`);
    const state = controlledEntryState(root, resolved);
    if (state.regular) {
      const realAssetRoot = fs.realpathSync(assetRoot);
      if (!isWithin(realAssetRoot, fs.realpathSync(resolved))) {
        throw new Error(`invalid-attachment: ${span.raw}`);
      }
    }
    links.push({
      destination: span.raw,
      resolved,
      exists: state.regular,
    });
  }
  return links;
}

function validateRange(target, offset, limit) {
  if (!APPROVED_TARGETS.includes(target) || target === '00-Inbox') {
    throw new Error(`invalid-target: ${target}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1) {
    throw new Error('invalid-batch-range');
  }
}

function stateContext(root, manifestPath, baselinePath, expectedTotal) {
  const controlled = controlledRoot(root);
  const manifest = readManifest(controlled, manifestPath, expectedTotal);
  const baseline = readBaseline(controlled, baselinePath, manifest, expectedTotal);
  const vaultPaths = controlledVaultPaths(controlled);
  return { root: controlled, manifest, baseline, ...vaultPaths };
}

function layoutContext(root, manifestPath, expectedTotal) {
  const controlled = controlledRoot(root);
  const manifest = readManifest(controlled, manifestPath, expectedTotal);
  const vaultPaths = controlledVaultPaths(controlled);
  return { root: controlled, manifest, ...vaultPaths };
}

function finalBatchState() {
  const configurations = Object.values(BATCHES);
  const final = configurations[configurations.length - 1];
  return {
    moved: final.movedTotal,
    source: final.inboxRemaining,
  };
}

function collectState(context, { baseline } = {}) {
  const { manifest, sourceRoot } = context;
  const targetCounts = Object.fromEntries(APPROVED_TARGETS.map((target) => [target, 0]));
  const files = {};
  const contentMismatches = [];
  const missingAttachments = [];
  const locationErrors = [];
  let source = 0;
  let moved = 0;
  let attachmentPages = 0;
  let attachmentLinks = 0;

  const manifestNames = new Set(manifest.entries.map((entry) => entry.filename));
  auditDirectoryMarkdown(context.root, sourceRoot, 'source', manifestNames, locationErrors);
  for (const target of MOVABLE_TARGETS) {
    auditDirectoryMarkdown(
      context.root,
      context.targetRoots[target],
      target,
      manifestNames,
      locationErrors,
    );
  }

  for (const entry of manifest.entries) {
    const locations = [
      { name: 'source', filePath: path.join(sourceRoot, entry.filename) },
      ...APPROVED_TARGETS.map((target) => ({
        name: target,
        filePath: path.join(context.targetRoots[target], entry.filename),
      })),
    ].map((location) => ({
      ...location,
      state: controlledEntryState(context.root, location.filePath),
    })).filter((location) => location.state.exists);
    const regularLocations = locations.filter((location) => location.state.regular);
    if (regularLocations.length !== locations.length) {
      locationErrors.push({ filename: entry.filename, reason: 'not-regular-file' });
    }

    const allowed = entry.target === '00-Inbox'
      ? new Set(['source'])
      : new Set(['source', entry.target]);
    const validSingleLocation = (
      regularLocations.length === 1
      && regularLocations.every((location) => allowed.has(location.name))
    );
    if (
      regularLocations.length !== 1
      || !regularLocations.every((location) => allowed.has(location.name))
    ) {
      locationErrors.push({
        filename: entry.filename,
        reason: 'invalid-location',
        locations: regularLocations.map((location) => location.name),
      });
    }

    for (const location of regularLocations) {
      if (location.name === 'source') source += 1;
      else moved += 1;
      if (location.name === entry.target || (entry.target === '00-Inbox' && location.name === 'source')) {
        targetCounts[entry.target] += 1;
      }
      const controlledFile = controlledPath(context.root, location.filePath, { type: 'file' });
      const content = fs.readFileSync(controlledFile);
      const digest = sha256(normalizeContent(content));
      if (baseline && digest !== baseline.files[entry.filename]) {
        contentMismatches.push({ filename: entry.filename, location: location.name });
      }
      if (!baseline && validSingleLocation) {
        files[entry.filename] = digest;
      }
      const attachments = inspectAttachments(context.root, controlledFile, content);
      if (attachments.length > 0) attachmentPages += 1;
      attachmentLinks += attachments.length;
      for (const attachment of attachments) {
        if (!attachment.exists) {
          missingAttachments.push({
            filename: entry.filename,
            location: location.name,
            destination: attachment.destination,
          });
        }
      }
    }
  }

  return {
    files: manifest.entries.length,
    source,
    moved,
    targetCounts,
    contentMismatches,
    missingAttachments,
    locationErrors,
    attachmentPages,
    attachmentLinks,
    stateFiles: files,
  };
}

export function parseManifest(markdown, { expectedTotal = 238 } = {}) {
  if (typeof markdown !== 'string') throw new TypeError('manifest-must-be-text');
  if (!Number.isInteger(expectedTotal) || expectedTotal < 0) {
    throw new Error('invalid-expected-total');
  }

  const approved = new Set(APPROVED_TARGETS);
  const sections = new Map();
  let current = null;

  for (const line of markdown.split(/\r?\n/u)) {
    const heading = line.match(/^###\s+(.+?)（(\d+)）\s*$/u);
    if (heading) {
      const target = heading[1];
      if (!approved.has(target)) throw new Error(`unknown-target: ${target}`);
      if (sections.has(target)) throw new Error(`duplicate-section: ${target}`);
      current = { target, declared: Number(heading[2]), filenames: [] };
      sections.set(target, current);
      continue;
    }
    if (/^###\s+/u.test(line)) throw new Error(`invalid-section-heading: ${line}`);
    if (/^#{1,3}\s+/u.test(line)) {
      current = null;
      continue;
    }
    if (current && line.startsWith('- ')) current.filenames.push(line.slice(2).trim());
  }

  for (const target of APPROVED_TARGETS) {
    if (!sections.has(target)) throw new Error(`missing-section: ${target}`);
  }

  const entries = [];
  const filenames = new Set();
  for (const section of sections.values()) {
    const { target } = section;
    if (section.declared !== section.filenames.length) {
      throw new Error(`section-count-mismatch: ${target}`);
    }
    for (const filename of section.filenames) {
      if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('\\')) {
        throw new Error(`invalid-filename: ${filename}`);
      }
      if (filenames.has(filename)) throw new Error(`duplicate-filename: ${filename}`);
      filenames.add(filename);
      entries.push({ filename, target });
    }
  }
  if (entries.length !== expectedTotal) {
    throw new Error(`manifest-total-mismatch: ${entries.length}!=${expectedTotal}`);
  }
  return entries;
}

export function createBaseline({ root, manifestPath, baselinePath, expectedTotal = 238 }) {
  const controlled = controlledRoot(root);
  const manifest = readManifest(controlled, manifestPath, expectedTotal);
  const controlledBaseline = controlledPath(controlled, baselinePath, {
    allowMissing: true,
    type: 'file',
  });
  const { sourceRoot } = controlledVaultPaths(controlled);
  const baselineExists = isRegularFile(controlledBaseline);
  const existingBaseline = baselineExists
    ? readBaseline(controlled, controlledBaseline, manifest, expectedTotal)
    : null;
  const actual = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .map((entry) => {
      const filePath = controlledPath(controlled, path.join(sourceRoot, entry.name));
      return { name: entry.name, regular: fs.lstatSync(filePath).isFile() };
    })
    .sort((left, right) => compareNames(left.name, right.name));
  const expected = manifest.entries.map((entry) => entry.filename).sort(compareNames);
  if (
    actual.length !== expected.length
    || actual.some((entry, index) => !entry.regular || entry.name !== expected[index])
  ) {
    throw new Error('source-set-mismatch');
  }

  const files = {};
  for (const entry of manifest.entries) {
    const sourcePath = controlledPath(controlled, path.join(sourceRoot, entry.filename), {
      type: 'file',
    });
    const content = fs.readFileSync(sourcePath);
    const attachments = inspectAttachments(controlled, sourcePath, content);
    const missing = attachments.find((attachment) => !attachment.exists);
    if (missing) {
      throw new Error(`missing-attachment: ${entry.filename}:${missing.destination}`);
    }
    files[entry.filename] = sha256(normalizeContent(content));
  }
  if (existingBaseline) {
    const mismatch = manifest.entries.find(
      (entry) => existingBaseline.files[entry.filename] !== files[entry.filename],
    );
    if (mismatch) throw new Error(`content-sha256-mismatch: ${mismatch.filename}`);
    return {
      files: manifest.entries.length,
      manifest_sha256: existingBaseline.manifest_sha256,
      duplicates: 0,
      created: false,
    };
  }
  const baseline = {
    manifest_sha256: manifest.sha256,
    files,
  };
  fs.writeFileSync(controlledBaseline, `${JSON.stringify(baseline, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  controlledPath(controlled, controlledBaseline, { type: 'file' });
  return {
    files: manifest.entries.length,
    manifest_sha256: baseline.manifest_sha256,
    duplicates: 0,
    created: true,
  };
}

export function createStateBaseline({
  root,
  manifestPath,
  baselinePath,
  expectedTotal = 238,
  requireFinalState = false,
}) {
  const context = layoutContext(root, manifestPath, expectedTotal);
  const controlledBaseline = controlledPath(context.root, baselinePath, {
    allowMissing: true,
    type: 'file',
  });
  const state = collectState(context);
  assertCleanVerification(state);
  if (Object.keys(state.stateFiles).length !== expectedTotal) {
    throw new Error('state-baseline-files-mismatch');
  }
  if (requireFinalState) {
    const expected = finalBatchState();
    if (state.source !== expected.source || state.moved !== expected.moved) {
      throw new Error(`final-state-mismatch: source=${state.source} moved=${state.moved}`);
    }
  }

  const existingBaseline = isRegularFile(controlledBaseline)
    ? readBaseline(context.root, controlledBaseline, context.manifest, expectedTotal)
    : null;
  if (existingBaseline) {
    const mismatch = context.manifest.entries.find(
      (entry) => existingBaseline.files[entry.filename] !== state.stateFiles[entry.filename],
    );
    if (mismatch) throw new Error(`content-sha256-mismatch: ${mismatch.filename}`);
    return {
      files: context.manifest.entries.length,
      manifest_sha256: existingBaseline.manifest_sha256,
      source: state.source,
      moved: state.moved,
      created: false,
    };
  }

  const baseline = {
    manifest_sha256: context.manifest.sha256,
    baseline_scope: requireFinalState ? 'final-classification-state' : 'current-classification-state',
    files: state.stateFiles,
  };
  fs.writeFileSync(controlledBaseline, `${JSON.stringify(baseline, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  controlledPath(context.root, controlledBaseline, { type: 'file' });
  return {
    files: context.manifest.entries.length,
    manifest_sha256: baseline.manifest_sha256,
    source: state.source,
    moved: state.moved,
    created: true,
  };
}

export function applyBatch({
  root,
  manifestPath,
  baselinePath,
  target,
  offset,
  limit,
  dryRun,
  expectedTotal = 238,
}) {
  validateRange(target, offset, limit);
  const context = stateContext(root, manifestPath, baselinePath, expectedTotal);
  const { manifest, baseline, sourceRoot } = context;
  const candidates = manifest.entries.filter((entry) => entry.target === target);
  if (offset + limit > candidates.length) throw new Error('invalid-batch-range');
  const selected = candidates.slice(offset, offset + limit);
  const targetRoot = context.targetRoots[target];
  const operations = [];
  let attachmentPages = 0;
  let attachmentLinks = 0;

  for (const entry of selected) {
    const sourcePath = path.join(sourceRoot, entry.filename);
    const targetPath = path.join(targetRoot, entry.filename);
    if (!controlledRegularFileExists(context.root, sourcePath)) {
      throw new Error(`source-missing: ${entry.filename}`);
    }
    const controlledTarget = controlledPath(context.root, targetPath, {
      allowMissing: true,
      type: 'file',
    });
    if (fs.existsSync(controlledTarget)) throw new Error(`target-conflict: ${entry.filename}`);
    const controlledSource = controlledPath(context.root, sourcePath, { type: 'file' });
    const content = fs.readFileSync(controlledSource);
    if (sha256(normalizeContent(content)) !== baseline.files[entry.filename]) {
      throw new Error(`content-sha256-mismatch: ${entry.filename}`);
    }
    const attachments = inspectAttachments(context.root, controlledSource, content);
    const missing = attachments.find((attachment) => !attachment.exists);
    if (missing) {
      throw new Error(`missing-attachment: ${entry.filename}:${missing.destination}`);
    }
    if (attachments.length > 0) attachmentPages += 1;
    attachmentLinks += attachments.length;
    operations.push({
      sourcePath: controlledSource,
      targetPath: controlledTarget,
      content: transformManagedDestinations(content),
    });
  }

  if (!dryRun) {
    fs.mkdirSync(targetRoot, { recursive: true });
    controlledPath(context.root, targetRoot, { type: 'directory' });
    for (const operation of operations) {
      fs.writeFileSync(operation.targetPath, operation.content, { flag: 'wx' });
      controlledPath(context.root, operation.targetPath, { type: 'file' });
      controlledPath(context.root, operation.sourcePath, { type: 'file' });
      fs.unlinkSync(operation.sourcePath);
    }
  }

  return {
    selected: selected.length,
    conflicts: 0,
    written: dryRun ? 0 : operations.length,
    moved: dryRun ? 0 : operations.length,
    attachmentPages,
    attachmentLinks,
  };
}

export function verifyState({ root, manifestPath, baselinePath, expectedTotal = 238 }) {
  const context = stateContext(root, manifestPath, baselinePath, expectedTotal);
  const state = collectState(context, { baseline: context.baseline });
  const { stateFiles, ...verification } = state;
  return verification;
}

function safeReportOutputPath(outputPath) {
  const absolute = path.resolve(outputPath);
  let ancestor = path.dirname(absolute);
  while (true) {
    try {
      const stats = fs.lstatSync(ancestor);
      if (stats.isSymbolicLink() || !stats.isDirectory()) return unsafePath(ancestor);
      if (fs.realpathSync(ancestor) !== path.resolve(ancestor)) return unsafePath(ancestor);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) return unsafePath(absolute);
      ancestor = parent;
    }
  }
  try {
    const stats = fs.lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile()) return unsafePath(absolute);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return absolute;
}

export function writeBatchReport({ configuration, verification, outputPath }) {
  const fixedConfiguration = assertFixedBatchConfiguration(configuration);
  const controlledOutput = safeReportOutputPath(outputPath);
  if (path.basename(controlledOutput) !== fixedConfiguration.report) {
    throw new Error(`report-path-mismatch: ${fixedConfiguration.report}`);
  }
  const requiredFields = [
    'files',
    'source',
    'moved',
    'locationErrors',
    'contentMismatches',
    'missingAttachments',
  ];
  if (
    !verification
    || typeof verification !== 'object'
    || requiredFields.some((field) => !Object.hasOwn(verification, field))
    || !Array.isArray(verification.locationErrors)
    || !Array.isArray(verification.contentMismatches)
    || !Array.isArray(verification.missingAttachments)
    || verification.files !== fixedConfiguration.movedTotal + fixedConfiguration.inboxRemaining
    || verification.locationErrors.length !== 0
    || verification.contentMismatches.length !== 0
    || verification.missingAttachments.length !== 0
  ) {
    throw new Error('verification-failed');
  }
  if (
    verification.moved !== fixedConfiguration.movedTotal
    || verification.source !== fixedConfiguration.inboxRemaining
  ) {
    throw new Error(`batch-state-mismatch: ${fixedConfiguration.id}`);
  }
  const contentMismatches = verification.contentMismatches.length;
  const missingAttachments = verification.missingAttachments.length;
  const report = [
    `# Batch ${fixedConfiguration.id}: ${fixedConfiguration.name}`,
    '',
    `- batch: ${fixedConfiguration.id}`,
    `- target: ${fixedConfiguration.target}`,
    `- offset: ${fixedConfiguration.offset}`,
    `- limit: ${fixedConfiguration.limit}`,
    `- moved: ${fixedConfiguration.limit}`,
    `- moved_total: ${fixedConfiguration.movedTotal}`,
    `- inbox_remaining: ${fixedConfiguration.inboxRemaining}`,
    `- attachment_pages: ${fixedConfiguration.attachmentPages}`,
    `- attachment_links_rewritten: ${fixedConfiguration.attachmentLinks}`,
    `- content_mismatches: ${contentMismatches}`,
    `- missing_attachments: ${missingAttachments}`,
    '- frontmatter_changes: 0',
    '- filename_changes: 0',
    '- wikilink_changes: 0',
    '',
  ].join('\n');
  fs.mkdirSync(path.dirname(controlledOutput), { recursive: true });
  safeReportOutputPath(controlledOutput);
  fs.writeFileSync(controlledOutput, report, { encoding: 'utf8', flag: 'wx' });
  safeReportOutputPath(controlledOutput);
  return {
    outputPath: controlledOutput,
    bytes: Buffer.byteLength(report),
  };
}

function resolveCliPath(value, fallback) {
  return path.resolve(CLI_ROOT, value ?? fallback);
}

function defaultVerifyBaseline() {
  const finalState = path.resolve(CLI_ROOT, DEFAULT_FINAL_STATE_BASELINE);
  return isRegularFile(finalState)
    ? finalState
    : path.resolve(CLI_ROOT, DEFAULT_BASELINE);
}

function parseCliOptions(args, { values = [], flags = [] }) {
  const valueOptions = new Set(values);
  const flagOptions = new Set(flags);
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (!option.startsWith('--')) throw new Error(`unexpected-argument: ${option}`);
    if (!valueOptions.has(option) && !flagOptions.has(option)) {
      throw new Error(`unknown-option: ${option}`);
    }
    if (Object.hasOwn(options, option)) throw new Error(`duplicate-option: ${option}`);
    if (flagOptions.has(option)) {
      options[option] = true;
      continue;
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing-argument: ${option}`);
    }
    options[option] = value;
    index += 1;
  }
  return options;
}

function requireOption(options, name) {
  if (!Object.hasOwn(options, name)) throw new Error(`missing-argument: ${name}`);
  return options[name];
}

function batchConfiguration(id) {
  const configuration = BATCHES[id];
  if (!configuration) throw new Error(`unknown-batch: ${id ?? ''}`);
  return configuration;
}

function assertFixedBatchConfiguration(configuration) {
  const fixedConfiguration = batchConfiguration(configuration?.id);
  for (const field of Object.keys(fixedConfiguration)) {
    if (configuration[field] !== fixedConfiguration[field]) {
      throw new Error(`batch-configuration-mismatch: ${fixedConfiguration.id}:${field}`);
    }
  }
  return fixedConfiguration;
}

function assertFixedAttachmentStats(configuration, result) {
  if (
    result.attachmentPages !== configuration.attachmentPages
    || result.attachmentLinks !== configuration.attachmentLinks
  ) {
    throw new Error(
      `batch-attachment-stats-mismatch: ${configuration.id} `
      + `${result.attachmentPages}/${result.attachmentLinks}`,
    );
  }
}

function assertCleanVerification(verification) {
  if (
    verification.locationErrors.length !== 0
    || verification.contentMismatches.length !== 0
    || verification.missingAttachments.length !== 0
  ) {
    throw new Error(`verification-failed: ${JSON.stringify({
      locationErrors: verification.locationErrors,
      contentMismatches: verification.contentMismatches,
      missingAttachments: verification.missingAttachments,
    })}`);
  }
}

function assertExactBatchState({ root, manifestPath, configuration, expectedTotal = 238 }) {
  const controlled = controlledRoot(root);
  const manifest = readManifest(controlled, manifestPath, expectedTotal);
  const { sourceRoot, targetRoots } = controlledVaultPaths(controlled);
  const configurations = Object.values(BATCHES);
  const currentIndex = configurations.findIndex((candidate) => candidate.id === configuration.id);
  const expectedMoved = new Set();

  for (const batch of configurations.slice(0, currentIndex + 1)) {
    const candidates = manifest.entries.filter((entry) => entry.target === batch.target);
    const selected = candidates.slice(batch.offset, batch.offset + batch.limit);
    if (selected.length !== batch.limit) {
      throw new Error(`batch-state-mismatch: ${configuration.id}`);
    }
    for (const entry of selected) expectedMoved.add(entry.filename);
  }
  if (
    expectedMoved.size !== configuration.movedTotal
    || manifest.entries.length - expectedMoved.size !== configuration.inboxRemaining
  ) {
    throw new Error(`batch-state-mismatch: ${configuration.id}`);
  }

  for (const entry of manifest.entries) {
    const sourcePath = path.join(sourceRoot, entry.filename);
    const targetPath = path.join(targetRoots[entry.target], entry.filename);
    const sourceExists = controlledRegularFileExists(controlled, sourcePath);
    const targetExists = controlledRegularFileExists(controlled, targetPath);
    if (
      (expectedMoved.has(entry.filename) && (!targetExists || sourceExists))
      || (!expectedMoved.has(entry.filename) && (!sourceExists || targetExists))
    ) {
      throw new Error(`batch-state-mismatch: ${configuration.id}`);
    }
  }
}

function helpText() {
  const lines = [
    'Usage: classify-logseq-pages.mjs <baseline|final-baseline|verify|batch|report> [options]',
    '',
    `Default migration baseline: ${DEFAULT_BASELINE}`,
    `Default final-state baseline: ${DEFAULT_FINAL_STATE_BASELINE}`,
    '',
    'Fixed batches:',
  ];
  for (const configuration of Object.values(BATCHES)) {
    lines.push([
      configuration.id,
      configuration.target,
      configuration.offset,
      configuration.limit,
      `${configuration.attachmentPages}/${configuration.attachmentLinks}`,
      configuration.movedTotal,
      configuration.inboxRemaining,
      configuration.report,
    ].join(' '));
  }
  return `${lines.join('\n')}\n`;
}

function runCli(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (command === '--help' || command === 'help') {
    process.stdout.write(helpText());
    return;
  }

  if (command === 'baseline') {
    const options = parseCliOptions(args, { values: ['--manifest', '--output'] });
    const result = createBaseline({
      root: CLI_ROOT,
      manifestPath: resolveCliPath(options['--manifest'], DEFAULT_MANIFEST),
      baselinePath: resolveCliPath(options['--output'], DEFAULT_BASELINE),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'final-baseline') {
    const options = parseCliOptions(args, { values: ['--manifest', '--output'] });
    const result = createStateBaseline({
      root: CLI_ROOT,
      manifestPath: resolveCliPath(options['--manifest'], DEFAULT_MANIFEST),
      baselinePath: resolveCliPath(options['--output'], DEFAULT_FINAL_STATE_BASELINE),
      requireFinalState: true,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'verify') {
    const options = parseCliOptions(args, { values: ['--manifest', '--baseline'] });
    const result = verifyState({
      root: CLI_ROOT,
      manifestPath: resolveCliPath(options['--manifest'], DEFAULT_MANIFEST),
      baselinePath: options['--baseline']
        ? resolveCliPath(options['--baseline'])
        : defaultVerifyBaseline(),
    });
    assertCleanVerification(result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'batch') {
    const options = parseCliOptions(args, {
      values: ['--manifest', '--baseline', '--batch'],
      flags: ['--dry-run'],
    });
    const configuration = batchConfiguration(requireOption(options, '--batch'));
    const parameters = {
      root: CLI_ROOT,
      manifestPath: resolveCliPath(options['--manifest'], DEFAULT_MANIFEST),
      baselinePath: resolveCliPath(options['--baseline'], DEFAULT_BASELINE),
      target: configuration.target,
      offset: configuration.offset,
      limit: configuration.limit,
    };
    const preflight = applyBatch({ ...parameters, dryRun: true });
    assertFixedAttachmentStats(configuration, preflight);
    const result = options['--dry-run']
      ? preflight
      : applyBatch({ ...parameters, dryRun: false });
    assertFixedAttachmentStats(configuration, result);
    process.stdout.write(`${JSON.stringify({ batch: configuration.id, ...result }, null, 2)}\n`);
    return;
  }

  if (command === 'report') {
    const options = parseCliOptions(args, {
      values: ['--manifest', '--baseline', '--batch', '--output'],
    });
    const configuration = batchConfiguration(requireOption(options, '--batch'));
    const outputPath = resolveCliPath(requireOption(options, '--output'));
    const expectedOutputPath = path.join(CLI_ROOT, REPORT_DIRECTORY, configuration.report);
    if (outputPath !== expectedOutputPath) {
      throw new Error(`report-path-mismatch: ${REPORT_DIRECTORY}/${configuration.report}`);
    }
    const cliRoot = controlledRoot(CLI_ROOT);
    controlledPath(cliRoot, outputPath, { allowMissing: true, type: 'file' });
    const verification = verifyState({
      root: CLI_ROOT,
      manifestPath: resolveCliPath(options['--manifest'], DEFAULT_MANIFEST),
      baselinePath: resolveCliPath(options['--baseline'], DEFAULT_BASELINE),
    });
    assertCleanVerification(verification);
    assertExactBatchState({
      root: CLI_ROOT,
      manifestPath: resolveCliPath(options['--manifest'], DEFAULT_MANIFEST),
      configuration,
    });
    if (
      verification.moved !== configuration.movedTotal
      || verification.source !== configuration.inboxRemaining
    ) {
      throw new Error(`batch-state-mismatch: ${configuration.id}`);
    }
    writeBatchReport({ configuration, verification, outputPath });
    controlledPath(cliRoot, outputPath, { type: 'file' });
    return;
  }

  throw new Error(`unknown-command: ${command ?? ''}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
~~~

### Phase 3 清单、批次、附件、报告和最终基线测试

源文件：80-Archive/logseq-migration/checks/classify-logseq-pages.test.mjs

~~~js
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyBatch,
  createBaseline,
  createStateBaseline,
  parseManifest,
  verifyState,
  writeBatchReport,
} from '../scripts/classify-logseq-pages.mjs';

const SAMPLE_MANIFEST = [
  '# Sample',
  '### 00-Inbox（1）', '', '- inbox.md', '',
  '### 10-Notes（1）', '', '- note.md', '',
  '### 20-Projects（1）', '', '- project.md', '',
  '### 30-Areas（1）', '', '- area.md', '',
  '### 40-Resources（1）', '', '- resource.md', '',
  '### 50-MOCs（1）', '', '- moc.md', '',
  '## 跨页和迁移约束',
].join('\n');

const BATCH_016_CONFIGURATION = Object.freeze({
  id: '016',
  name: 'classify-notes-001',
  target: '10-Notes',
  offset: 0,
  limit: 33,
  attachmentPages: 12,
  attachmentLinks: 23,
  movedTotal: 34,
  inboxRemaining: 204,
  report: '016-classify-notes-001.md',
  commitMessage: 'migration: classify logseq notes 001',
});
const CLASSIFIER_SCRIPT_PATH = fileURLToPath(
  new URL('../scripts/classify-logseq-pages.mjs', import.meta.url),
);

function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'classify-pages-')));
  const source = path.join(root, '00-Inbox/imported-logseq/pages');
  fs.mkdirSync(source, { recursive: true });
  for (const name of ['inbox.md', 'project.md', 'area.md', 'resource.md', 'moc.md']) {
    fs.writeFileSync(path.join(source, name), '---\ntitle: "' + name + '"\n---\n\nbody\n');
  }
  fs.writeFileSync(
    path.join(source, 'note.md'),
    '---\ntitle: "note"\n---\n\n![x](../../../90-Attachments/logseq-assets/x.png)\n',
  );
  const asset = path.join(root, '90-Attachments/logseq-assets/x.png');
  fs.mkdirSync(path.dirname(asset), { recursive: true });
  fs.writeFileSync(asset, 'asset');
  const manifestPath = path.join(root, 'manifest.md');
  const baselinePath = path.join(root, 'baseline.json');
  fs.writeFileSync(manifestPath, SAMPLE_MANIFEST);
  return { root, source, manifestPath, baselinePath };
}

function temporaryDirectory(prefix) {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function externalizeSource(f) {
  const externalRoot = temporaryDirectory('classify-external-source-');
  const externalSource = path.join(externalRoot, 'pages');
  fs.renameSync(f.source, externalSource);
  fs.symlinkSync(externalSource, f.source, 'dir');
  return { externalRoot, externalSource };
}

function batchVerification(configuration = BATCH_016_CONFIGURATION) {
  return {
    files: 238,
    source: configuration.inboxRemaining,
    moved: configuration.movedTotal,
    locationErrors: [],
    contentMismatches: [],
    missingAttachments: [],
  };
}

function snapshotTree(root) {
  const snapshot = [];

  function walk(directory, relativeDirectory = '') {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)));
    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        snapshot.push({ path: relativePath, type: 'directory' });
        walk(absolutePath, relativePath);
      } else {
        snapshot.push({
          path: relativePath,
          type: 'file',
          bytes: fs.readFileSync(absolutePath),
        });
      }
    }
  }

  walk(root);
  return snapshot;
}

function twoNoteFixture() {
  const f = fixture();
  fs.renameSync(path.join(f.source, 'note.md'), path.join(f.source, 'note-01.md'));
  fs.writeFileSync(path.join(f.source, 'note-02.md'), 'second note\n');
  const manifest = SAMPLE_MANIFEST.replace(
    '### 10-Notes（1）\n\n- note.md',
    '### 10-Notes（2）\n\n- note-01.md\n- note-02.md',
  );
  fs.writeFileSync(f.manifestPath, manifest);
  return { ...f, manifest };
}

function cliFixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'classify-cli-')));
  const scriptPath = path.join(root, '80-Archive/logseq-migration/scripts/classify-logseq-pages.mjs');
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  fs.copyFileSync(CLASSIFIER_SCRIPT_PATH, scriptPath);
  return { root, scriptPath };
}

function approvedManifestFixture(root) {
  const groups = [
    ['00-Inbox', 'inbox', 43],
    ['10-Notes', 'note', 65],
    ['20-Projects', 'project', 51],
    ['30-Areas', 'area', 1],
    ['40-Resources', 'resource', 75],
    ['50-MOCs', 'moc', 3],
  ];
  const manifestLines = ['# Synthetic approved manifest', ''];
  const source = path.join(root, '00-Inbox/imported-logseq/pages');
  fs.mkdirSync(source, { recursive: true });

  for (const [target, prefix, count] of groups) {
    manifestLines.push(`### ${target}（${count}）`, '');
    for (let index = 1; index <= count; index += 1) {
      const filename = `${prefix}-${String(index).padStart(3, '0')}.md`;
      manifestLines.push(`- ${filename}`);
      fs.writeFileSync(path.join(source, filename), `synthetic ${filename}\n`);
    }
    manifestLines.push('');
  }
  manifestLines.push('## Synthetic constraints', '');

  const manifestPath = path.join(root, '80-Archive/logseq-migration/reports/classification-manifest-v2.md');
  const baselinePath = path.join(
    root,
    '80-Archive/logseq-migration/reports/classification-content-baseline-v2.json',
  );
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, manifestLines.join('\n'));
  return { root, source, manifestPath, baselinePath };
}

function moveApprovedEntriesToTargets(root, manifestPath, expectedTotal = 238) {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const source = path.join(root, '00-Inbox/imported-logseq/pages');
  for (const entry of parseManifest(manifest, { expectedTotal })) {
    if (entry.target === '00-Inbox') continue;
    const targetRoot = path.join(root, entry.target);
    fs.mkdirSync(targetRoot, { recursive: true });
    fs.renameSync(path.join(source, entry.filename), path.join(targetRoot, entry.filename));
  }
}

test('parses all approved destination sections exactly once', () => {
  const entries = parseManifest(SAMPLE_MANIFEST, { expectedTotal: 6 });
  assert.equal(entries.length, 6);
  assert.deepEqual(
    entries.map((entry) => entry.target),
    ['00-Inbox', '10-Notes', '20-Projects', '30-Areas', '40-Resources', '50-MOCs'],
  );
  assert.deepEqual(
    entries.map((entry) => [entry.filename, entry.target]),
    [
      ['inbox.md', '00-Inbox'],
      ['note.md', '10-Notes'],
      ['project.md', '20-Projects'],
      ['area.md', '30-Areas'],
      ['resource.md', '40-Resources'],
      ['moc.md', '50-MOCs'],
    ],
  );
});

test('preserves manifest list order when approved sections are reordered', () => {
  const reordered = [
    '# Sample',
    '### 50-MOCs（1）', '', '- moc.md', '',
    '### 00-Inbox（1）', '', '- inbox.md', '',
    '### 10-Notes（1）', '', '- note.md', '',
    '### 20-Projects（1）', '', '- project.md', '',
    '### 30-Areas（1）', '', '- area.md', '',
    '### 40-Resources（1）', '', '- resource.md', '',
  ].join('\n');
  assert.deepEqual(
    parseManifest(reordered, { expectedTotal: 6 }).map((entry) => entry.filename),
    ['moc.md', 'inbox.md', 'note.md', 'project.md', 'area.md', 'resource.md'],
  );
});

test('rejects malformed manifest entries and section declarations', () => {
  assert.throws(() => parseManifest(
    SAMPLE_MANIFEST.replace('- note.md', '- inbox.md'),
    { expectedTotal: 6 },
  ));
  assert.throws(() => parseManifest(
    SAMPLE_MANIFEST.replace('### 50-MOCs（1）', '### 60-Unknown（1）'),
    { expectedTotal: 6 },
  ));
  assert.throws(() => parseManifest(
    SAMPLE_MANIFEST.replace('### 00-Inbox（1）', '### 00-Inbox（2）'),
    { expectedTotal: 6 },
  ));
  assert.throws(() => parseManifest(
    SAMPLE_MANIFEST.replace('- inbox.md', '- inbox.txt'),
    { expectedTotal: 6 },
  ));
  assert.throws(() => parseManifest(
    SAMPLE_MANIFEST.replace('- inbox.md', '- nested/inbox.md'),
    { expectedTotal: 6 },
  ));
  assert.throws(() => parseManifest(
    SAMPLE_MANIFEST.replace('- inbox.md', '- nested\\inbox.md'),
    { expectedTotal: 6 },
  ));
  assert.throws(() => parseManifest(
    `${SAMPLE_MANIFEST}\n### Unapproved commentary\n`,
    { expectedTotal: 6 },
  ));
});

test('baseline rejects an inexact source set before creating output', () => {
  const extra = fixture();
  fs.writeFileSync(path.join(extra.source, 'extra.md'), 'extra\n');
  assert.throws(
    () => createBaseline({ ...extra, expectedTotal: 6 }),
    /source-set-mismatch/,
  );
  assert.equal(fs.existsSync(extra.baselinePath), false);

  const missing = fixture();
  fs.unlinkSync(path.join(missing.source, 'note.md'));
  assert.throws(
    () => createBaseline({ ...missing, expectedTotal: 6 }),
    /source-set-mismatch/,
  );
  assert.equal(fs.existsSync(missing.baselinePath), false);
});

test('rejects symlink roots and state files outside the controlled root', () => {
  const rootAliasCase = fixture();
  const aliasParent = temporaryDirectory('classify-root-alias-');
  const aliasRoot = path.join(aliasParent, 'vault');
  fs.symlinkSync(rootAliasCase.root, aliasRoot, 'dir');
  assert.throws(
    () => createBaseline({
      root: aliasRoot,
      source: path.join(aliasRoot, '00-Inbox/imported-logseq/pages'),
      manifestPath: path.join(aliasRoot, 'manifest.md'),
      baselinePath: path.join(aliasRoot, 'baseline.json'),
      expectedTotal: 6,
    }),
    /unsafe-path/,
  );
  assert.equal(fs.existsSync(rootAliasCase.baselinePath), false);

  const manifestCase = fixture();
  const externalManifestRoot = temporaryDirectory('classify-external-manifest-');
  const externalManifest = path.join(externalManifestRoot, 'manifest.md');
  fs.copyFileSync(manifestCase.manifestPath, externalManifest);
  assert.throws(
    () => createBaseline({
      ...manifestCase,
      manifestPath: externalManifest,
      expectedTotal: 6,
    }),
    /unsafe-path/,
  );
  assert.equal(fs.existsSync(manifestCase.baselinePath), false);

  const baselineCase = fixture();
  const externalBaselineRoot = temporaryDirectory('classify-external-baseline-');
  const externalBaseline = path.join(externalBaselineRoot, 'baseline.json');
  assert.throws(
    () => createBaseline({
      ...baselineCase,
      baselinePath: externalBaseline,
      expectedTotal: 6,
    }),
    /unsafe-path/,
  );
  assert.equal(fs.existsSync(externalBaseline), false);
});

test('rejects a source directory symlink without mutating external files', () => {
  const baselineCase = fixture();
  const baselineExternal = externalizeSource(baselineCase);
  const baselineBefore = snapshotTree(baselineExternal.externalRoot);
  assert.throws(
    () => createBaseline({ ...baselineCase, expectedTotal: 6 }),
    /unsafe-path/,
  );
  assert.deepEqual(snapshotTree(baselineExternal.externalRoot), baselineBefore);
  assert.equal(fs.existsSync(baselineCase.baselinePath), false);

  const applyCase = fixture();
  createBaseline({ ...applyCase, expectedTotal: 6 });
  const applyExternal = externalizeSource(applyCase);
  const applyBefore = snapshotTree(applyExternal.externalRoot);
  assert.throws(
    () => applyBatch({
      ...applyCase,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    }),
    /unsafe-path/,
  );
  assert.deepEqual(snapshotTree(applyExternal.externalRoot), applyBefore);
  assert.equal(fs.existsSync(path.join(applyCase.root, '10-Notes/note.md')), false);

  const verifyCase = fixture();
  createBaseline({ ...verifyCase, expectedTotal: 6 });
  const verifyExternal = externalizeSource(verifyCase);
  const verifyBefore = snapshotTree(verifyExternal.externalRoot);
  assert.throws(
    () => verifyState({ ...verifyCase, expectedTotal: 6 }),
    /unsafe-path/,
  );
  assert.deepEqual(snapshotTree(verifyExternal.externalRoot), verifyBefore);
});

test('rejects a target directory symlink while preserving source and external files', () => {
  const applyCase = fixture();
  createBaseline({ ...applyCase, expectedTotal: 6 });
  const applyExternal = temporaryDirectory('classify-external-target-');
  fs.symlinkSync(applyExternal, path.join(applyCase.root, '10-Notes'), 'dir');
  const applyBefore = snapshotTree(applyExternal);
  assert.throws(
    () => applyBatch({
      ...applyCase,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    }),
    /unsafe-path/,
  );
  assert.deepEqual(snapshotTree(applyExternal), applyBefore);
  assert.equal(fs.existsSync(path.join(applyCase.source, 'note.md')), true);

  const verifyCase = fixture();
  createBaseline({ ...verifyCase, expectedTotal: 6 });
  const verifyExternal = temporaryDirectory('classify-external-target-');
  fs.symlinkSync(verifyExternal, path.join(verifyCase.root, '10-Notes'), 'dir');
  assert.throws(
    () => verifyState({ ...verifyCase, expectedTotal: 6 }),
    /unsafe-path/,
  );
});

test('preserves target scaffolding files during a normal batch', () => {
  const f = fixture();
  createBaseline({ ...f, expectedTotal: 6 });
  const targetRoot = path.join(f.root, '10-Notes');
  fs.mkdirSync(targetRoot);
  fs.writeFileSync(path.join(targetRoot, '.gitkeep'), '');
  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  assert.equal(fs.existsSync(path.join(targetRoot, '.gitkeep')), true);
  assert.equal(fs.existsSync(path.join(targetRoot, 'note.md')), true);
});

test('rejects symlinks in the managed attachment path', () => {
  const rootLinkCase = fixture();
  const rootLinkExternal = temporaryDirectory('classify-external-assets-');
  fs.writeFileSync(path.join(rootLinkExternal, 'x.png'), 'external asset');
  fs.rmSync(path.join(rootLinkCase.root, '90-Attachments/logseq-assets'), {
    recursive: true,
  });
  fs.symlinkSync(
    rootLinkExternal,
    path.join(rootLinkCase.root, '90-Attachments/logseq-assets'),
    'dir',
  );
  assert.throws(
    () => createBaseline({ ...rootLinkCase, expectedTotal: 6 }),
    /unsafe-path/,
  );

  const fileLinkCase = fixture();
  const fileLinkExternal = temporaryDirectory('classify-external-asset-file-');
  const externalFile = path.join(fileLinkExternal, 'x.png');
  fs.writeFileSync(externalFile, 'external asset');
  fs.unlinkSync(path.join(fileLinkCase.root, '90-Attachments/logseq-assets/x.png'));
  fs.symlinkSync(
    externalFile,
    path.join(fileLinkCase.root, '90-Attachments/logseq-assets/x.png'),
    'file',
  );
  assert.throws(
    () => createBaseline({ ...fileLinkCase, expectedTotal: 6 }),
    /unsafe-path/,
  );

  const parentLinkCase = fixture();
  const parentLinkExternal = temporaryDirectory('classify-external-asset-parent-');
  fs.writeFileSync(path.join(parentLinkExternal, 'x.png'), 'external asset');
  fs.symlinkSync(
    parentLinkExternal,
    path.join(parentLinkCase.root, '90-Attachments/logseq-assets/nested'),
    'dir',
  );
  const notePath = path.join(parentLinkCase.source, 'note.md');
  fs.writeFileSync(notePath, fs.readFileSync(notePath, 'utf8').replace('x.png', 'nested/x.png'));
  assert.throws(
    () => createBaseline({ ...parentLinkCase, expectedTotal: 6 }),
    /unsafe-path/,
  );
});

test('rejects report directory symlinks without writing outside the controlled root', () => {
  const apiRoot = temporaryDirectory('classify-report-symlink-');
  const apiExternal = temporaryDirectory('classify-external-report-');
  const apiReportDirectory = path.join(apiRoot, 'reports');
  fs.symlinkSync(apiExternal, apiReportDirectory, 'dir');
  assert.throws(
    () => writeBatchReport({
      configuration: BATCH_016_CONFIGURATION,
      verification: batchVerification(),
      outputPath: path.join(apiReportDirectory, BATCH_016_CONFIGURATION.report),
    }),
    /unsafe-path/,
  );
  assert.deepEqual(fs.readdirSync(apiExternal), []);

  const nestedApiRoot = temporaryDirectory('classify-report-nested-symlink-');
  const nestedExternal = temporaryDirectory('classify-external-nested-report-');
  fs.mkdirSync(path.join(nestedExternal, 'nested'));
  fs.symlinkSync(nestedExternal, path.join(nestedApiRoot, 'reports'), 'dir');
  assert.throws(
    () => writeBatchReport({
      configuration: BATCH_016_CONFIGURATION,
      verification: batchVerification(),
      outputPath: path.join(
        nestedApiRoot,
        'reports/nested',
        BATCH_016_CONFIGURATION.report,
      ),
    }),
    /unsafe-path/,
  );
  assert.deepEqual(fs.readdirSync(path.join(nestedExternal, 'nested')), []);

  const { root, scriptPath } = cliFixture();
  const fixturePaths = approvedManifestFixture(root);
  createBaseline({ ...fixturePaths, expectedTotal: 238 });
  applyBatch({
    ...fixturePaths,
    target: '30-Areas',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 238,
  });
  const cliExternal = temporaryDirectory('classify-external-cli-report-');
  const reportDirectory = path.join(root, '80-Archive/logseq-migration/reports/batches');
  fs.symlinkSync(cliExternal, reportDirectory, 'dir');
  const result = childProcess.spawnSync(
    process.execPath,
    [scriptPath, 'report', '--batch', '015', '--output', '80-Archive/logseq-migration/reports/batches/015-classify-area.md'],
    { encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsafe-path/);
  assert.deepEqual(fs.readdirSync(cliExternal), []);
});

test('baseline normalizes only the approved attachment path prefixes', () => {
  const oldPrefix = fixture();
  const newPrefix = fixture();
  const ordinaryText = fixture();
  const newPrefixPath = path.join(newPrefix.source, 'note.md');
  fs.writeFileSync(
    newPrefixPath,
    fs.readFileSync(newPrefixPath, 'utf8').replace(
      '../../../90-Attachments/logseq-assets/',
      '../90-Attachments/logseq-assets/',
    ),
  );
  const ordinaryTextPath = path.join(ordinaryText.source, 'note.md');
  fs.writeFileSync(
    ordinaryTextPath,
    fs.readFileSync(ordinaryTextPath, 'utf8').replace(
      '../../../90-Attachments/logseq-assets/',
      '__LOGSEQ_ASSET__/',
    ),
  );
  createBaseline({ ...oldPrefix, expectedTotal: 6 });
  createBaseline({ ...newPrefix, expectedTotal: 6 });
  createBaseline({ ...ordinaryText, expectedTotal: 6 });
  const oldBaseline = JSON.parse(fs.readFileSync(oldPrefix.baselinePath, 'utf8'));
  const newBaseline = JSON.parse(fs.readFileSync(newPrefix.baselinePath, 'utf8'));
  const ordinaryTextBaseline = JSON.parse(fs.readFileSync(ordinaryText.baselinePath, 'utf8'));
  assert.equal(oldBaseline.files['note.md'], newBaseline.files['note.md']);
  assert.notEqual(oldBaseline.files['note.md'], ordinaryTextBaseline.files['note.md']);
});

test('normalizes and rewrites only managed attachment link destinations in the body', () => {
  const driftCase = fixture();
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const original = [
    '---',
    `asset_hint: "${oldPrefix}frontmatter.png"`,
    '---',
    '',
    `ordinary text ${oldPrefix}plain.png`,
    `![asset](${oldPrefix}x.png)`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(driftCase.source, 'note.md'), original);
  createBaseline({ ...driftCase, expectedTotal: 6 });
  fs.writeFileSync(
    path.join(driftCase.source, 'note.md'),
    original
      .replace(`${oldPrefix}frontmatter.png`, `${newPrefix}frontmatter.png`)
      .replace(`${oldPrefix}plain.png`, `${newPrefix}plain.png`),
  );
  assert.throws(
    () => applyBatch({
      ...driftCase,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    }),
    /content-sha256-mismatch/,
  );

  const applyCase = fixture();
  fs.writeFileSync(path.join(applyCase.source, 'note.md'), original);
  createBaseline({ ...applyCase, expectedTotal: 6 });
  applyBatch({
    ...applyCase,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  const moved = fs.readFileSync(path.join(applyCase.root, '10-Notes/note.md'), 'utf8');
  assert.equal(moved, original.replace(
    `![asset](${oldPrefix}x.png)`,
    `![asset](${newPrefix}x.png)`,
  ));
});

test('parses supported Markdown attachment destinations without changing their spelling', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  for (const name of [
    'x(1).png',
    'x(2).png',
    'space file.png',
    'percent space.png',
    'hash#file.png',
    'question?file.png',
    'title.png',
  ]) {
    fs.writeFileSync(path.join(assetRoot, name), `asset ${name}`);
  }
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const links = [
    `![normal](${oldPrefix}x.png)`,
    `![plain-parens](${oldPrefix}x(1).png)`,
    `![escaped-parens](${oldPrefix}x\\(2\\).png)`,
    `![angle](<${oldPrefix}space file.png>)`,
    `![percent-space](${oldPrefix}percent%20space.png)`,
    `![percent-hash](${oldPrefix}hash%23file.png)`,
    `![percent-question](${oldPrefix}question%3Ffile.png)`,
    `![title](${oldPrefix}title.png "CommonMark title")`,
  ];
  const content = `---\ntitle: destinations\n---\n\n${links.join('\n')}\n`;
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentPages, 1);
  assert.equal(dryRun.attachmentLinks, links.length);

  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  assert.equal(
    fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
    content.replaceAll(oldPrefix, newPrefix),
  );
});

test('parses quoted and parenthesized titles independently from the link destination', () => {
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const links = [
    `![title](${oldPrefix}title.png "valid title (")`,
    `![title](${oldPrefix}title.png 'valid title (')`,
    `![title](${oldPrefix}title.png (valid title))`,
  ];

  for (const link of links) {
    const f = fixture();
    const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
    fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'title.png'));
    const content = `---\ntitle: quoted title\n---\n\n${link}\n`;
    fs.writeFileSync(path.join(f.source, 'note.md'), content);
    createBaseline({ ...f, expectedTotal: 6 });

    const dryRun = applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    });
    assert.equal(dryRun.attachmentLinks, 1, link);

    applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    });
    assert.equal(
      fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
      content.replace(oldPrefix, newPrefix),
      link,
    );
  }
});

test('ignores indented code and raw HTML blocks while parsing a real titled link', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const realLink = `![real](${oldPrefix}real.png "real title (")`;
  const content = [
    '---',
    'title: block contexts',
    '---',
    '',
    'paragraph before code',
    '',
    `    ![four-space](${oldPrefix}four-space.png)`,
    '    still indented code',
    '',
    `\t![tab](${oldPrefix}tab.png)`,
    '',
    '<pre>',
    `![pre](${oldPrefix}pre.png)`,
    '</pre>',
    '<script type="text/plain">',
    `![script](${oldPrefix}script.png)`,
    '</script>',
    '   <STYLE>',
    `![style](${oldPrefix}style.png)`,
    '   </STYLE>',
    '<textarea>',
    `![textarea](${oldPrefix}textarea.png)`,
    '</textarea>',
    realLink,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentPages, 1);
  assert.equal(dryRun.attachmentLinks, 1);

  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  const moved = fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8');
  assert.equal(moved, content.replace(realLink, realLink.replace(oldPrefix, newPrefix)));
});

test('treats the start of a document as an indented-code block boundary', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const realLink = `![real](${oldPrefix}real.png)`;
  const content = [
    `    ![indented](${oldPrefix}missing-indented.png)`,
    '',
    realLink,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentLinks, 1);
  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  assert.equal(
    fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
    content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
  );
});

test('treats the first body line after frontmatter as an indented-code boundary', () => {
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  for (const indentation of ['\t', '    ']) {
    const f = fixture();
    const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
    fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
    const realLink = `![real](${oldPrefix}real.png)`;
    const content = [
      '---',
      'title: initial body boundary',
      '---',
      `${indentation}![indented](${oldPrefix}missing-body.png)`,
      '',
      realLink,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(f.source, 'note.md'), content);

    createBaseline({ ...f, expectedTotal: 6 });
    const dryRun = applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    });
    assert.equal(dryRun.attachmentLinks, 1, JSON.stringify(indentation));
    applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    });
    assert.equal(
      fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
      content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
      JSON.stringify(indentation),
    );
  }
});

test('honors CommonMark containers, fences, and raw HTML block types', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
  fs.writeFileSync(path.join(assetRoot, 'real2.png'), 'real asset 2');
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const realListLink = `- ![real](${oldPrefix}real.png)`;
  const realQuoteLink = `> ![real2](${oldPrefix}real2.png)`;
  const content = [
    '---',
    'title: block containers',
    '---',
    '',
    '<div>',
    `![div](${oldPrefix}div.png)`,
    '</div>',
    '',
    '<table>',
    `![table](${oldPrefix}table.png)`,
    '</table>',
    '',
    '<?processing',
    `![processing](${oldPrefix}processing.png)`,
    '?>',
    '<!DOCTYPE html [',
    `![declaration](${oldPrefix}declaration.png)`,
    ']>',
    '<![CDATA[',
    `![cdata](${oldPrefix}cdata.png)`,
    ']]>',
    '> ~~~',
    `> ![quote-fence](${oldPrefix}quote-fence.png)`,
    '> ~~~~',
    '- ```js',
    `  ![list-fence](${oldPrefix}list-fence.png)`,
    '  ````',
    '```',
    `![top-fence](${oldPrefix}top-fence.png)`,
    '````',
    realListLink,
    realQuoteLink,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentPages, 1);
  assert.equal(dryRun.attachmentLinks, 2);
  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  const moved = fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8');
  assert.equal(
    moved,
    content
      .replace(realListLink, realListLink.replace(oldPrefix, newPrefix))
      .replace(realQuoteLink, realQuoteLink.replace(oldPrefix, newPrefix)),
  );
});

test('does not let a type 7 HTML tag interrupt an open paragraph', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const realLink = `![real](${oldPrefix}real.png)`;
  const content = [
    '---',
    'title: type 7 paragraph interruption',
    '---',
    '',
    'paragraph continues',
    '<span>',
    realLink,
    '',
    '<span>',
    `![blocked](${oldPrefix}blocked.png)`,
    '</span>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentLinks, 1);
  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  assert.equal(
    fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
    content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
  );
});

for (const [name, precedingBlock] of [
  ['ATX heading', ['# Heading']],
  ['setext heading', ['Heading', '=======']],
  ['thematic break', ['***']],
  ['link reference definition', ['[reference]: https://example.test/asset']],
]) {
  test(`starts a type 7 HTML block after a ${name}`, () => {
    const f = fixture();
    const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
    fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
    const oldPrefix = '../../../90-Attachments/logseq-assets/';
    const newPrefix = '../90-Attachments/logseq-assets/';
    const realLink = `![real](${oldPrefix}real.png)`;
    const content = [
      '---',
      `title: type 7 after ${name}`,
      '---',
      '',
      ...precedingBlock,
      '<span>',
      `![blocked](${oldPrefix}blocked-${name.replaceAll(' ', '-')}.png)`,
      '</span>',
      '',
      realLink,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(f.source, 'note.md'), content);

    createBaseline({ ...f, expectedTotal: 6 });
    const dryRun = applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    });
    assert.equal(dryRun.attachmentLinks, 1);
    applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    });
    assert.equal(
      fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
      content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
    );
  });
}

test('ends unclosed container fences when their block container ends', () => {
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const cases = [
    ['blockquote', ['> ```', '> code', '']],
    ['list', ['- ```', '  code', '']],
  ];
  for (const [label, prefixLines] of cases) {
    const f = fixture();
    const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
    fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
    const realLink = `![real](${oldPrefix}real.png)`;
    const content = [...prefixLines, realLink, ''].join('\n');
    fs.writeFileSync(path.join(f.source, 'note.md'), content);

    createBaseline({ ...f, expectedTotal: 6 });
    const dryRun = applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    });
    assert.equal(dryRun.attachmentLinks, 1, label);
    applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    });
    assert.equal(
      fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
      content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
      label,
    );
  }
});

for (const [name, fencedLines] of [
  ['list', ['- ```md', '  - ![literal](../../../90-Attachments/logseq-assets/list-literal.png)', '  ```']],
  ['blockquote', ['> ```md', '> - ![literal](../../../90-Attachments/logseq-assets/quote-literal.png)', '> ```']],
]) {
  test(`keeps nested markers literal inside an active ${name} fence`, () => {
    const f = fixture();
    const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
    fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
    const oldPrefix = '../../../90-Attachments/logseq-assets/';
    const newPrefix = '../90-Attachments/logseq-assets/';
    const realLink = `![real](${oldPrefix}real.png)`;
    const content = [...fencedLines, '', realLink, ''].join('\n');
    fs.writeFileSync(path.join(f.source, 'note.md'), content);

    createBaseline({ ...f, expectedTotal: 6 });
    const dryRun = applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    });
    assert.equal(dryRun.attachmentLinks, 1);
    applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    });
    assert.equal(
      fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
      content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
    );
  });
}

for (const [name, fencedLines] of [
  [
    'list then blockquote',
    [
      '- > ```md',
      '  > - ![literal](../../../90-Attachments/logseq-assets/list-quote-literal.png)',
      '  > ```',
    ],
  ],
  [
    'blockquote then list',
    [
      '> - ```md',
      '>   - ![literal](../../../90-Attachments/logseq-assets/quote-list-literal.png)',
      '>   ```',
    ],
  ],
]) {
  test(`preserves ordered containers around a ${name} fence`, () => {
    const f = fixture();
    const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
    fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
    const oldPrefix = '../../../90-Attachments/logseq-assets/';
    const newPrefix = '../90-Attachments/logseq-assets/';
    const realLink = `![real](${oldPrefix}real.png)`;
    const content = [...fencedLines, '', realLink, ''].join('\n');
    fs.writeFileSync(path.join(f.source, 'note.md'), content);

    createBaseline({ ...f, expectedTotal: 6 });
    const dryRun = applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    });
    assert.equal(dryRun.attachmentLinks, 1);
    applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    });
    assert.equal(
      fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
      content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
    );
  });
}

test('keeps a list fence active across an unindented blank line', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const realLink = `![real](${oldPrefix}real.png)`;
  const content = [
    '- ```md',
    '',
    `  ![literal](${oldPrefix}blank-line-literal.png)`,
    realLink,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentLinks, 1);
  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  assert.equal(
    fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
    content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
  );
});

for (const [name, htmlLines] of [
  [
    'blockquote type 1',
    ['> <pre>', '> ![literal](../../../90-Attachments/logseq-assets/quote-pre-literal.png)'],
  ],
  [
    'list type 1',
    ['- <pre>', '  ![literal](../../../90-Attachments/logseq-assets/list-pre-literal.png)'],
  ],
  [
    'blockquote type 6',
    ['> <div>', '> ![literal](../../../90-Attachments/logseq-assets/quote-div-literal.png)'],
  ],
]) {
  test(`ends unclosed raw HTML when its ${name} container ends`, () => {
    const f = fixture();
    const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
    fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
    const oldPrefix = '../../../90-Attachments/logseq-assets/';
    const newPrefix = '../90-Attachments/logseq-assets/';
    const realLink = `![real](${oldPrefix}real.png)`;
    const content = [...htmlLines, realLink, ''].join('\n');
    fs.writeFileSync(path.join(f.source, 'note.md'), content);

    createBaseline({ ...f, expectedTotal: 6 });
    const dryRun = applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    });
    assert.equal(dryRun.attachmentLinks, 1);
    applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    });
    assert.equal(
      fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
      content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
    );
  });
}

test('continues tab and four-space list content across blank lines', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'tab.png'));
  fs.writeFileSync(path.join(assetRoot, 'spaces.png'), 'spaces asset');
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const tabLink = `![tab](${oldPrefix}tab.png)`;
  const spacesLink = `![spaces](${oldPrefix}spaces.png)`;
  const content = [
    '- parent item',
    '',
    '',
    `\t${tabLink}`,
    '',
    `    ${spacesLink}`,
    'root paragraph ends the list',
    '',
    `    ![code](${oldPrefix}missing-code.png)`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentLinks, 2);
  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  assert.equal(
    fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
    content
      .replace(tabLink, tabLink.replace(oldPrefix, newPrefix))
      .replace(spacesLink, spacesLink.replace(oldPrefix, newPrefix)),
  );
});

test('continues nested list siblings and content after a blank line', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'nested-list.png'));
  fs.writeFileSync(path.join(assetRoot, 'nested-content.png'), 'nested content asset');
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const siblingLink = `![nested-list](${oldPrefix}nested-list.png)`;
  const continuationLink = `![nested-content](${oldPrefix}nested-content.png)`;
  const content = [
    '- root item',
    '\t- child item',
    '\t\t- first grandchild',
    '',
    `\t\t- ${siblingLink}`,
    '',
    `\t\t  ${continuationLink}`,
    'root paragraph ends every list',
    '',
    `    ![code](${oldPrefix}missing-nested-code.png)`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentLinks, 2);
  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  assert.equal(
    fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
    content
      .replace(siblingLink, siblingLink.replace(oldPrefix, newPrefix))
      .replace(continuationLink, continuationLink.replace(oldPrefix, newPrefix)),
  );
});

for (const [name, codeIndent] of [
  ['six spaces', '      '],
  ['a tab plus two spaces', '\t  '],
]) {
  test(`treats ${name} after a list blank as indented code`, () => {
    const f = fixture();
    const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
    fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
    const oldPrefix = '../../../90-Attachments/logseq-assets/';
    const newPrefix = '../90-Attachments/logseq-assets/';
    const realLink = `![real](${oldPrefix}real.png)`;
    const content = [
      '- parent item',
      '',
      `${codeIndent}![code](${oldPrefix}missing-code.png)`,
      `    ${realLink}`,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(f.source, 'note.md'), content);

    createBaseline({ ...f, expectedTotal: 6 });
    const dryRun = applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: true,
      expectedTotal: 6,
    });
    assert.equal(dryRun.attachmentLinks, 1);
    applyBatch({
      ...f,
      target: '10-Notes',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 6,
    });
    assert.equal(
      fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8'),
      content.replace(realLink, realLink.replace(oldPrefix, newPrefix)),
    );
  });
}

test('ignores attachment-like text outside real Markdown inline links', () => {
  const f = fixture();
  const assetRoot = path.join(f.root, '90-Attachments/logseq-assets');
  fs.renameSync(path.join(assetRoot, 'x.png'), path.join(assetRoot, 'real.png'));
  const oldPrefix = '../../../90-Attachments/logseq-assets/';
  const newPrefix = '../90-Attachments/logseq-assets/';
  const realLink = `![x](${oldPrefix}real.png)`;
  const content = [
    '---',
    'title: scanner states',
    '---',
    '',
    `inline code \`[inline](${oldPrefix}inline.png)\` remains literal`,
    `\\[literal](${oldPrefix}escaped-link.png)`,
    `\\![literal](${oldPrefix}escaped-image.png)`,
    '<!--',
    `![comment](${oldPrefix}comment.png)`,
    '-->',
    '```markdown',
    `![fenced](${oldPrefix}fenced.png)`,
    '```',
    '~~~markdown',
    `![tilde](${oldPrefix}tilde.png)`,
    '~~~',
    realLink,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(f.source, 'note.md'), content);

  createBaseline({ ...f, expectedTotal: 6 });
  const dryRun = applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: true,
    expectedTotal: 6,
  });
  assert.equal(dryRun.attachmentPages, 1);
  assert.equal(dryRun.attachmentLinks, 1);

  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  const moved = fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8');
  assert.equal(moved, content.replace(realLink, `![x](${newPrefix}real.png)`));
});

test('rejects unsafe or unapproved attachment destinations', () => {
  const cases = [
    ['parent traversal', '../../../90-Attachments/logseq-assets/../../secret.txt'],
    ['dot segment', '../../../90-Attachments/logseq-assets/./x.png'],
    ['encoded parent', '../../../90-Attachments/logseq-assets/%2e%2e/secret.txt'],
    ['encoded slash', '../../../90-Attachments/logseq-assets/folder%2Fx.png'],
    ['encoded backslash', '../../../90-Attachments/logseq-assets/folder%5Cx.png'],
    ['raw backslash', '../../../90-Attachments/logseq-assets/folder\\x.png'],
    ['scheme', 'https://example.test/90-Attachments/logseq-assets/x.png'],
    ['authority', '//example.test/90-Attachments/logseq-assets/x.png'],
    ['absolute', '/90-Attachments/logseq-assets/x.png'],
    ['unapproved depth', '../../90-Attachments/logseq-assets/x.png'],
    ['nul', '../../../90-Attachments/logseq-assets/bad\0name.png'],
  ];

  for (const [label, destination] of cases) {
    const f = fixture();
    fs.writeFileSync(path.join(f.root, 'secret.txt'), 'must not be treated as an asset');
    fs.writeFileSync(
      path.join(f.source, 'note.md'),
      `---\ntitle: ${label}\n---\n\n![asset](${destination})\n`,
    );
    assert.throws(
      () => createBaseline({ ...f, expectedTotal: 6 }),
      /invalid-attachment/,
      label,
    );
    assert.equal(fs.existsSync(f.baselinePath), false, label);
  }
});

test('all stateful operations reject manifest drift without updating baseline', () => {
  const f = fixture();
  createBaseline({ ...f, expectedTotal: 6 });
  const baselineBefore = fs.readFileSync(f.baselinePath);
  fs.appendFileSync(f.manifestPath, '\n');

  assert.throws(
    () => createBaseline({ ...f, expectedTotal: 6 }),
    /manifest-sha256-mismatch/,
  );
  assert.throws(
    () => applyBatch({
      ...f, target: '10-Notes', offset: 0, limit: 1, dryRun: true, expectedTotal: 6,
    }),
    /manifest-sha256-mismatch/,
  );
  assert.throws(
    () => verifyState({ ...f, expectedTotal: 6 }),
    /manifest-sha256-mismatch/,
  );
  assert.deepEqual(fs.readFileSync(f.baselinePath), baselineBefore);
});

test('state baseline captures a migrated layout after post-migration content changes', () => {
  const f = fixture();
  createBaseline({ ...f, expectedTotal: 6 });
  applyBatch({
    ...f,
    target: '10-Notes',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 6,
  });
  fs.appendFileSync(path.join(f.root, '10-Notes/note.md'), '\npost-migration cleanup\n');

  const migrationBaselineVerification = verifyState({ ...f, expectedTotal: 6 });
  assert.deepEqual(migrationBaselineVerification.contentMismatches, [
    { filename: 'note.md', location: '10-Notes' },
  ]);

  const finalBaselinePath = path.join(f.root, 'final-state-baseline.json');
  const created = createStateBaseline({
    root: f.root,
    manifestPath: f.manifestPath,
    baselinePath: finalBaselinePath,
    expectedTotal: 6,
  });
  assert.deepEqual(
    {
      files: created.files,
      source: created.source,
      moved: created.moved,
      created: created.created,
    },
    { files: 6, source: 5, moved: 1, created: true },
  );

  const finalVerification = verifyState({
    root: f.root,
    manifestPath: f.manifestPath,
    baselinePath: finalBaselinePath,
    expectedTotal: 6,
  });
  assert.deepEqual(finalVerification.contentMismatches, []);

  const second = createStateBaseline({
    root: f.root,
    manifestPath: f.manifestPath,
    baselinePath: finalBaselinePath,
    expectedTotal: 6,
  });
  assert.equal(second.created, false);
});

test('dry-run does not mutate files and apply rewrites only the asset depth', () => {
  const f = fixture();
  createBaseline({ ...f, expectedTotal: 6 });
  const beforeDryRun = snapshotTree(f.root);
  const dry = applyBatch({
    ...f, target: '10-Notes', offset: 0, limit: 1, dryRun: true, expectedTotal: 6,
  });
  assert.equal(dry.moved, 0);
  assert.deepEqual(snapshotTree(f.root), beforeDryRun);
  assert.equal(fs.existsSync(path.join(f.source, 'note.md')), true);

  const applied = applyBatch({
    ...f, target: '10-Notes', offset: 0, limit: 1, dryRun: false, expectedTotal: 6,
  });
  assert.equal(applied.moved, 1);
  const moved = fs.readFileSync(path.join(f.root, '10-Notes/note.md'), 'utf8');
  assert.match(moved, /\.\.\/90-Attachments\/logseq-assets\/x\.png/);
  assert.doesNotMatch(moved, /\.\.\/\.\.\/\.\.\/90-Attachments/);

  const verified = verifyState({ ...f, expectedTotal: 6 });
  assert.equal(verified.contentMismatches.length, 0);
  assert.equal(verified.missingAttachments.length, 0);
  assert.equal(verified.moved, 1);
});

test('rejects a target conflict before writing any file', () => {
  const f = twoNoteFixture();
  createBaseline({ ...f, expectedTotal: 7 });
  assert.deepEqual(
    parseManifest(f.manifest, { expectedTotal: 7 })
      .filter((entry) => entry.target === '10-Notes')
      .map((entry) => entry.filename),
    ['note-01.md', 'note-02.md'],
  );
  fs.mkdirSync(path.join(f.root, '10-Notes'), { recursive: true });
  const firstSource = path.join(f.source, 'note-01.md');
  const secondSource = path.join(f.source, 'note-02.md');
  const firstTarget = path.join(f.root, '10-Notes/note-01.md');
  const secondTarget = path.join(f.root, '10-Notes/note-02.md');
  const conflictBytes = Buffer.from([0x63, 0x6f, 0x6e, 0x66, 0x6c, 0x69, 0x63, 0x74, 0x00]);
  fs.writeFileSync(secondTarget, conflictBytes);
  assert.throws(
    () => applyBatch({
      ...f, target: '10-Notes', offset: 0, limit: 2, dryRun: false, expectedTotal: 7,
    }),
    /target-conflict/,
  );
  assert.equal(fs.existsSync(firstSource), true);
  assert.equal(fs.existsSync(secondSource), true);
  assert.equal(fs.existsSync(firstTarget), false);
  assert.deepEqual(fs.readFileSync(secondTarget), conflictBytes);
});

test('rejects content drift before writing any file in the batch', () => {
  const f = twoNoteFixture();
  createBaseline({ ...f, expectedTotal: 7 });
  fs.appendFileSync(path.join(f.source, 'note-02.md'), 'drift\n');
  assert.throws(
    () => applyBatch({
      ...f, target: '10-Notes', offset: 0, limit: 2, dryRun: false, expectedTotal: 7,
    }),
    /content-sha256-mismatch/,
  );
  assert.equal(fs.existsSync(path.join(f.root, '10-Notes')), false);
  assert.equal(fs.existsSync(path.join(f.source, 'note-01.md')), true);
  assert.equal(fs.existsSync(path.join(f.source, 'note-02.md')), true);
});

test('rejects a missing attachment before writing any file in the batch', () => {
  const f = twoNoteFixture();
  createBaseline({ ...f, expectedTotal: 7 });
  fs.unlinkSync(path.join(f.root, '90-Attachments/logseq-assets/x.png'));
  assert.throws(
    () => applyBatch({
      ...f, target: '10-Notes', offset: 0, limit: 2, dryRun: false, expectedTotal: 7,
    }),
    /missing-attachment/,
  );
  assert.equal(fs.existsSync(path.join(f.root, '10-Notes')), false);
  assert.equal(fs.existsSync(path.join(f.source, 'note-01.md')), true);
  assert.equal(fs.existsSync(path.join(f.source, 'note-02.md')), true);
});

test('resolves local attachment filenames containing parentheses', () => {
  const f = fixture();
  const oldAsset = path.join(f.root, '90-Attachments/logseq-assets/x.png');
  const parenthesizedAsset = path.join(f.root, '90-Attachments/logseq-assets/x(1).png');
  fs.renameSync(oldAsset, parenthesizedAsset);
  const notePath = path.join(f.source, 'note.md');
  fs.writeFileSync(
    notePath,
    fs.readFileSync(notePath, 'utf8').replace('x.png', 'x(1).png'),
  );
  createBaseline({ ...f, expectedTotal: 6 });
  const result = applyBatch({
    ...f, target: '10-Notes', offset: 0, limit: 1, dryRun: true, expectedTotal: 6,
  });
  assert.equal(result.attachmentPages, 1);
  assert.equal(result.attachmentLinks, 1);
});

test('enforces flat source and movable target directory collections', () => {
  const baselineCase = fixture();
  fs.mkdirSync(path.join(baselineCase.source, 'nested'));
  fs.writeFileSync(path.join(baselineCase.source, 'nested/unlisted.md'), 'nested\n');
  assert.throws(
    () => createBaseline({ ...baselineCase, expectedTotal: 6 }),
    /source-set-mismatch/,
  );
  assert.equal(fs.existsSync(baselineCase.baselinePath), false);

  const f = fixture();
  createBaseline({ ...f, expectedTotal: 6 });
  const directories = [
    ['source', f.source, 'source-child', true],
    ['10-Notes', path.join(f.root, '10-Notes'), 'notes-child', false],
    ['20-Projects', path.join(f.root, '20-Projects'), 'projects-child', true],
    ['30-Areas', path.join(f.root, '30-Areas'), 'areas-child', false],
    ['40-Resources', path.join(f.root, '40-Resources'), 'resources-child', true],
    ['50-MOCs', path.join(f.root, '50-MOCs'), 'mocs-child', false],
  ];
  for (const [, parent, name, withMarkdown] of directories) {
    const child = path.join(parent, name);
    fs.mkdirSync(child, { recursive: true });
    if (withMarkdown) fs.writeFileSync(path.join(child, 'unlisted.md'), 'nested\n');
    fs.writeFileSync(path.join(parent, '.gitkeep'), '');
  }

  const verification = verifyState({ ...f, expectedTotal: 6 });
  assert.deepEqual(
    verification.locationErrors.filter((error) => error.reason === 'unexpected-directory')
      .map((error) => [error.location, error.filename])
      .sort(),
    directories.map(([location, , name]) => [location, name]).sort(),
  );
  for (const [, parent] of directories) {
    assert.equal(fs.existsSync(path.join(parent, '.gitkeep')), true);
  }
});

test('rejects symlink subdirectories in a managed collection', () => {
  const baselineCase = fixture();
  const baselineExternal = temporaryDirectory('classify-external-baseline-child-');
  fs.symlinkSync(baselineExternal, path.join(baselineCase.source, 'external-child'), 'dir');
  assert.throws(
    () => createBaseline({ ...baselineCase, expectedTotal: 6 }),
    /unsafe-path/,
  );
  assert.equal(fs.existsSync(baselineCase.baselinePath), false);

  const f = fixture();
  createBaseline({ ...f, expectedTotal: 6 });
  const external = temporaryDirectory('classify-external-child-');
  fs.mkdirSync(path.join(f.root, '10-Notes'));
  fs.symlinkSync(external, path.join(f.root, '10-Notes/external-child'), 'dir');
  assert.throws(
    () => verifyState({ ...f, expectedTotal: 6 }),
    /unsafe-path/,
  );
});

test('CLI report rejects nested managed directories without creating output', () => {
  const { root, scriptPath } = cliFixture();
  const fixturePaths = approvedManifestFixture(root);
  createBaseline({ ...fixturePaths, expectedTotal: 238 });
  applyBatch({
    ...fixturePaths,
    target: '30-Areas',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 238,
  });
  fs.mkdirSync(path.join(root, '10-Notes/nested'), { recursive: true });
  fs.writeFileSync(path.join(root, '10-Notes/nested/unlisted.md'), 'nested\n');
  const outputRelativePath = '80-Archive/logseq-migration/reports/batches/015-classify-area.md';
  const result = childProcess.spawnSync(
    process.execPath,
    [scriptPath, 'report', '--batch', '015', '--output', outputRelativePath],
    { encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /verification-failed/);
  assert.equal(fs.existsSync(path.join(root, outputRelativePath)), false);
});

test('verify reports unlisted and non-regular Markdown while ignoring scaffolding', () => {
  const f = fixture();
  createBaseline({ ...f, expectedTotal: 6 });
  fs.writeFileSync(path.join(f.source, 'source-extra.md'), 'extra\n');
  fs.mkdirSync(path.join(f.source, 'source-directory.md'));
  const movableTargets = ['10-Notes', '20-Projects', '30-Areas', '40-Resources', '50-MOCs'];
  for (const target of movableTargets) {
    const targetRoot = path.join(f.root, target);
    fs.mkdirSync(targetRoot, { recursive: true });
    fs.writeFileSync(path.join(targetRoot, '.gitkeep'), '');
    fs.writeFileSync(path.join(targetRoot, 'AGENTS.md'), 'agent instructions\n');
    fs.writeFileSync(path.join(targetRoot, `${target}-extra.md`), 'extra\n');
  }
  fs.mkdirSync(path.join(f.root, '10-Notes/target-directory.md'));

  const verification = verifyState({ ...f, expectedTotal: 6 });
  assert.deepEqual(
    verification.locationErrors.filter((error) => error.reason === 'unlisted-file')
      .map((error) => [error.location, error.filename])
      .sort(),
    [
      ['source', 'source-extra.md'],
      ...movableTargets.map((target) => [target, `${target}-extra.md`]),
    ].sort(),
  );
  assert.deepEqual(
    verification.locationErrors.filter((error) => error.reason === 'not-regular-file')
      .map((error) => [error.location, error.filename])
      .sort(),
    [
      ['source', 'source-directory.md'],
      ['10-Notes', 'target-directory.md'],
    ].sort(),
  );
  for (const target of movableTargets) {
    assert.equal(fs.existsSync(path.join(f.root, target, '.gitkeep')), true);
  }
});

test('CLI report rejects extra, missing, and non-regular Markdown entries', () => {
  const cases = [
    ['extra', ({ source }) => fs.writeFileSync(path.join(source, 'extra.md'), 'extra\n')],
    ['missing', ({ source }) => fs.unlinkSync(path.join(source, 'inbox-001.md'))],
    ['non-regular', ({ root }) => fs.mkdirSync(path.join(root, '10-Notes/directory.md'), {
      recursive: true,
    })],
  ];
  for (const [label, mutate] of cases) {
    const { root, scriptPath } = cliFixture();
    const fixturePaths = approvedManifestFixture(root);
    createBaseline({ ...fixturePaths, expectedTotal: 238 });
    applyBatch({
      ...fixturePaths,
      target: '30-Areas',
      offset: 0,
      limit: 1,
      dryRun: false,
      expectedTotal: 238,
    });
    mutate(fixturePaths);
    const outputRelativePath = '80-Archive/logseq-migration/reports/batches/015-classify-area.md';
    const result = childProcess.spawnSync(
      process.execPath,
      [scriptPath, 'report', '--batch', '015', '--output', outputRelativePath],
      { encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0, label);
    assert.match(result.stderr, /verification-failed/, label);
    assert.equal(fs.existsSync(path.join(root, outputRelativePath)), false, label);
  }
});

test('writes a deterministic report from fixed batch statistics', () => {
  const firstRoot = temporaryDirectory('classify-report-');
  const secondRoot = temporaryDirectory('classify-report-');
  const outputPath = path.join(firstRoot, BATCH_016_CONFIGURATION.report);
  const secondOutputPath = path.join(secondRoot, BATCH_016_CONFIGURATION.report);
  const verification = batchVerification();
  writeBatchReport({ configuration: BATCH_016_CONFIGURATION, verification, outputPath });
  writeBatchReport({
    configuration: BATCH_016_CONFIGURATION,
    verification,
    outputPath: secondOutputPath,
  });
  assert.deepEqual(fs.readFileSync(outputPath), fs.readFileSync(secondOutputPath));
  const report = fs.readFileSync(outputPath, 'utf8');
  assert.match(report, /moved: 33/);
  assert.match(report, /moved_total: 34/);
  assert.match(report, /inbox_remaining: 204/);
  assert.match(report, /attachment_links_rewritten: 23/);
});

test('rejects report configuration and verification drift before creating output', () => {
  const root = temporaryDirectory('classify-report-invalid-');
  const verification = batchVerification();
  const write = (configuration, overrides = {}) => writeBatchReport({
    configuration,
    verification: { ...verification, ...overrides },
    outputPath: path.join(root, configuration.report ?? BATCH_016_CONFIGURATION.report),
  });

  assert.throws(
    () => write({ ...BATCH_016_CONFIGURATION, id: '999' }),
    /unknown-batch: 999/,
  );
  for (const [field, value] of [
    ['target', '20-Projects'],
    ['offset', 1],
    ['limit', 32],
    ['attachmentPages', 11],
    ['attachmentLinks', 22],
    ['movedTotal', 35],
    ['inboxRemaining', 203],
  ]) {
    assert.throws(
      () => write({ ...BATCH_016_CONFIGURATION, [field]: value }),
      new RegExp(`batch-configuration-mismatch: 016:${field}`),
    );
  }
  assert.throws(() => write(BATCH_016_CONFIGURATION, {
    contentMismatches: [{ filename: 'note.md' }],
  }), /verification-failed/);
  assert.throws(() => write(BATCH_016_CONFIGURATION, {
    missingAttachments: [{ filename: 'note.md' }],
  }), /verification-failed/);
  assert.throws(
    () => write(BATCH_016_CONFIGURATION, { moved: 35 }),
    /batch-state-mismatch: 016/,
  );
  assert.throws(
    () => write(BATCH_016_CONFIGURATION, { source: 203 }),
    /batch-state-mismatch: 016/,
  );
  assert.deepEqual(fs.readdirSync(root), []);
});

test('does not overwrite an existing batch report', () => {
  const root = temporaryDirectory('classify-report-existing-');
  const outputPath = path.join(root, BATCH_016_CONFIGURATION.report);
  const parameters = {
    configuration: BATCH_016_CONFIGURATION,
    verification: batchVerification(),
    outputPath,
  };
  writeBatchReport(parameters);
  const original = fs.readFileSync(outputPath);

  assert.throws(() => writeBatchReport(parameters), /EEXIST/);
  assert.deepEqual(fs.readFileSync(outputPath), original);
});

test('rejects a non-fixed report basename through the exported API', () => {
  const root = temporaryDirectory('classify-report-name-');
  assert.throws(
    () => writeBatchReport({
      configuration: BATCH_016_CONFIGURATION,
      verification: batchVerification(),
      outputPath: path.join(root, 'renamed.md'),
    }),
    /report-path-mismatch: 016-classify-notes-001\.md/,
  );
  assert.deepEqual(fs.readdirSync(root), []);
});

test('writeBatchReport requires a complete clean verifyState result', () => {
  const root = temporaryDirectory('classify-report-verification-');
  const valid = batchVerification();
  const write = (label, verification) => writeBatchReport({
    configuration: BATCH_016_CONFIGURATION,
    verification,
    outputPath: path.join(root, label, BATCH_016_CONFIGURATION.report),
  });

  for (const field of [
    'files',
    'source',
    'moved',
    'locationErrors',
    'contentMismatches',
    'missingAttachments',
  ]) {
    const incomplete = { ...valid };
    delete incomplete[field];
    assert.throws(() => write(`missing-${field}`, incomplete), /verification-failed/, field);
  }
  assert.throws(
    () => write('location-errors', {
      ...valid,
      locationErrors: [{ filename: 'extra.md', reason: 'unlisted-file' }],
    }),
    /verification-failed/,
  );
  assert.throws(() => write('wrong-files', { ...valid, files: 237 }), /verification-failed/);
  assert.throws(() => write('wrong-source', { ...valid, source: 205 }), /batch-state-mismatch/);
  assert.throws(() => write('wrong-moved', { ...valid, moved: 33 }), /batch-state-mismatch/);
  assert.deepEqual(fs.readdirSync(root), []);
});

test('CLI requires the fixed report path under its own root', () => {
  const { root, scriptPath } = cliFixture();
  const wrongRelativePath = `80-Archive/logseq-migration/elsewhere/${BATCH_016_CONFIGURATION.report}`;
  const result = childProcess.spawnSync(
    process.execPath,
    [scriptPath, 'report', '--batch', '016', '--output', wrongRelativePath],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /report-path-mismatch: 80-Archive\/logseq-migration\/reports\/batches\/016-classify-notes-001\.md/,
  );
  assert.equal(fs.existsSync(path.join(root, wrongRelativePath)), false);
});

test('CLI report rejects an exact-count state containing the wrong batch pages', () => {
  const { root, scriptPath } = cliFixture();
  const fixturePaths = approvedManifestFixture(root);
  createBaseline({ ...fixturePaths, expectedTotal: 238 });
  applyBatch({
    ...fixturePaths,
    target: '30-Areas',
    offset: 0,
    limit: 1,
    dryRun: false,
    expectedTotal: 238,
  });
  applyBatch({
    ...fixturePaths,
    target: '10-Notes',
    offset: 0,
    limit: 33,
    dryRun: false,
    expectedTotal: 238,
  });

  fs.renameSync(
    path.join(root, '10-Notes/note-001.md'),
    path.join(fixturePaths.source, 'note-001.md'),
  );
  fs.renameSync(
    path.join(fixturePaths.source, 'note-034.md'),
    path.join(root, '10-Notes/note-034.md'),
  );
  const verification = verifyState({ ...fixturePaths, expectedTotal: 238 });
  assert.equal(verification.moved, 34);
  assert.equal(verification.source, 204);
  assert.deepEqual(verification.locationErrors, []);
  assert.deepEqual(verification.contentMismatches, []);
  assert.deepEqual(verification.missingAttachments, []);

  const outputRelativePath = `80-Archive/logseq-migration/reports/batches/${BATCH_016_CONFIGURATION.report}`;
  const outputPath = path.join(root, outputRelativePath);
  const result = childProcess.spawnSync(
    process.execPath,
    [scriptPath, 'report', '--batch', '016', '--output', outputRelativePath],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /batch-state-mismatch: 016/);
  assert.equal(fs.existsSync(outputPath), false);
});

test('CLI completes the synthetic baseline through batch 015 report workflow', () => {
  const { root, scriptPath } = cliFixture();
  approvedManifestFixture(root);
  const runJson = (args) => {
    const result = childProcess.spawnSync(process.execPath, [scriptPath, ...args], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };

  const baseline = runJson(['baseline']);
  assert.equal(baseline.files, 238);

  const initial = runJson(['verify']);
  assert.equal(initial.source, 238);
  assert.equal(initial.moved, 0);

  const dryRun = runJson(['batch', '--batch', '015', '--dry-run']);
  assert.equal(dryRun.selected, 1);
  assert.equal(dryRun.written, 0);

  const applied = runJson(['batch', '--batch', '015']);
  assert.equal(applied.moved, 1);

  const after = runJson(['verify']);
  assert.equal(after.source, 237);
  assert.equal(after.moved, 1);

  const reportRelativePath = '80-Archive/logseq-migration/reports/batches/015-classify-area.md';
  const report = childProcess.spawnSync(
    process.execPath,
    [scriptPath, 'report', '--batch', '015', '--output', reportRelativePath],
    { encoding: 'utf8' },
  );
  assert.equal(report.status, 0, report.stderr);
  assert.equal(fs.existsSync(path.join(root, reportRelativePath)), true);
});

test('CLI final-baseline closes a completed classification state for default verify', () => {
  const { root, scriptPath } = cliFixture();
  const fixturePaths = approvedManifestFixture(root);
  const runJson = (args) => {
    const result = childProcess.spawnSync(process.execPath, [scriptPath, ...args], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };

  const migrationBaseline = runJson(['baseline']);
  assert.equal(migrationBaseline.created, true);
  moveApprovedEntriesToTargets(root, fixturePaths.manifestPath);
  fs.appendFileSync(path.join(root, '10-Notes/note-001.md'), '\npost-migration cleanup\n');

  const beforeFinalBaseline = childProcess.spawnSync(
    process.execPath,
    [scriptPath, 'verify'],
    { encoding: 'utf8' },
  );
  assert.notEqual(beforeFinalBaseline.status, 0);
  assert.match(beforeFinalBaseline.stderr, /verification-failed/);
  assert.match(beforeFinalBaseline.stderr, /note-001\.md/);

  const finalBaseline = runJson(['final-baseline']);
  assert.deepEqual(
    {
      files: finalBaseline.files,
      source: finalBaseline.source,
      moved: finalBaseline.moved,
      created: finalBaseline.created,
    },
    { files: 238, source: 43, moved: 195, created: true },
  );

  const finalVerification = runJson(['verify']);
  assert.equal(finalVerification.source, 43);
  assert.equal(finalVerification.moved, 195);
  assert.deepEqual(finalVerification.contentMismatches, []);
});

test('CLI exposes the fixed batch table and rejects user-defined scope', () => {
  const help = childProcess.spawnSync(
    process.execPath,
    [CLASSIFIER_SCRIPT_PATH, '--help'],
    { encoding: 'utf8' },
  );
  assert.equal(help.status, 0, help.stderr);
  const expectedRows = [
    '015 30-Areas 0 1 0/0 1 237 015-classify-area.md',
    '016 10-Notes 0 33 12/23 34 204 016-classify-notes-001.md',
    '017 10-Notes 33 32 10/26 66 172 017-classify-notes-002.md',
    '018 40-Resources 0 25 3/29 91 147 018-classify-resources-001.md',
    '019 40-Resources 25 25 2/2 116 122 019-classify-resources-002.md',
    '020 40-Resources 50 25 6/19 141 97 020-classify-resources-003.md',
    '021 20-Projects 0 17 7/12 158 80 021-classify-projects-001.md',
    '022 20-Projects 17 17 3/20 175 63 022-classify-projects-002.md',
    '023 20-Projects 34 17 5/16 192 46 023-classify-projects-003.md',
    '024 50-MOCs 0 3 0/0 195 43 024-classify-mocs.md',
  ];
  for (const row of expectedRows) assert.match(help.stdout, new RegExp(row.replaceAll('/', '\\/')));

  const unknownBatch = childProcess.spawnSync(
    process.execPath,
    [CLASSIFIER_SCRIPT_PATH, 'batch', '--batch', '999', '--dry-run'],
    { encoding: 'utf8' },
  );
  assert.notEqual(unknownBatch.status, 0);
  assert.match(unknownBatch.stderr, /unknown-batch: 999/);

  const freeStats = childProcess.spawnSync(
    process.execPath,
    [CLASSIFIER_SCRIPT_PATH, 'report', '--batch', '016', '--moved', '33', '--output', 'report.md'],
    { encoding: 'utf8' },
  );
  assert.notEqual(freeStats.status, 0);
  assert.match(freeStats.stderr, /unknown-option: --moved/);
});
~~~

## 报告索引

Phase 2 迁移设计与最终验证：

- 80-Archive/logseq-migration/reports/phase2-design.md
- 80-Archive/logseq-migration/reports/phase2-execution-plan.md
- 80-Archive/logseq-migration/reports/raw-logseq-manifest.json
- 80-Archive/logseq-migration/reports/batches/014-final-verification.md

Phase 3 分类清单、执行计划与最终验证：

- 80-Archive/logseq-migration/reports/classification-manifest-v2.md
- 80-Archive/logseq-migration/reports/classification-content-baseline-v2.json
- 80-Archive/logseq-migration/reports/classification-final-state-baseline-v2.json
- 80-Archive/logseq-migration/reports/phase3-classification-execution-plan.md
- 80-Archive/logseq-migration/reports/classification-batch-index.md
- 80-Archive/logseq-migration/reports/batches/025-classification-final-verification.md
- 80-Archive/logseq-migration/reports/batches/026-migration-closure-final-state.md
