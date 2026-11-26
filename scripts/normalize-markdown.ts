import path from "node:path";
import { isMarkdownSourcePath } from "./copy-assets";
import { resolveWikilinkTarget, type VaultIndex } from "./utils/vault-index";
import { splitFencedCodeSegments } from "./utils/markdown";
import { splitWikilink, withoutMarkdownExtension } from "./utils/slug";

export interface WikilinkWarning {
  file: string;
  line: number;
  link: string;
  target: string;
  action: "converted-to-text" | "anchor-dropped";
  reason:
    | "target-ambiguous"
    | "target-not-published"
    | "target-not-found"
    | "heading-anchor-dropped"
    | "block-anchor-dropped";
}

export interface NormalizeMarkdownOptions {
  markdown: string;
  index: VaultIndex;
  outputPath: string;
  sourceVaultPath?: string;
  assetHandler?: AssetHandler;
}

export interface AssetWarning {
  file: string;
  asset: string;
  action: "copied" | "converted-to-text";
  reason: "missing-asset" | "size-attribute-dropped" | "unsupported-markdown-source";
}

export interface AssetRequest {
  reference: string;
  alt: string;
  original: string;
  sizeAttribute?: string;
}

export interface AssetReplacement {
  markdown: string;
  warnings: AssetWarning[];
}

export type AssetHandler = (request: AssetRequest) => Promise<AssetReplacement>;

export interface NormalizeMarkdownResult {
  markdown: string;
  wikilinkWarnings: WikilinkWarning[];
  assetWarnings: AssetWarning[];
}

const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/gu;
const obsidianEmbedPattern = /!\[\[(?<embed>[^\]]+)\]\]/gu;
const wikilinkPattern = /(?<!!)\[\[(?<wikilink>[^\]]+)\]\]/gu;
const wikilinkAndEmbedPattern = new RegExp(
  `${obsidianEmbedPattern.source}|${wikilinkPattern.source}`,
  "gu",
);
const wikilinkAndImagePattern = new RegExp(
  `${markdownImagePattern.source}|${wikilinkAndEmbedPattern.source}`,
  "gu",
);

async function replaceAsync(
  source: string,
  pattern: RegExp,
  replacement: (match: RegExpExecArray, line: number) => Promise<string>,
  firstLine: number,
): Promise<string> {
  let output = "";
  let cursor = 0;
  let line = firstLine;
  let previousMatchIndex = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index;
    line += countLineBreaks(source.slice(previousMatchIndex, index));
    previousMatchIndex = index;
    output += source.slice(cursor, index);
    output += await replacement(match, line);
    cursor = index + match[0].length;
  }
  return output + source.slice(cursor);
}

function countLineBreaks(source: string): number {
  return (source.match(/\n/gu) ?? []).length;
}

async function replaceOutsideFencedCode(
  source: string,
  pattern: RegExp,
  replacement: (match: RegExpExecArray, line: number) => Promise<string>,
): Promise<string> {
  let output = "";
  let line = 1;
  for (const segment of splitFencedCodeSegments(source)) {
    output += segment.fencedCode
      ? segment.content
      : await replaceAsync(segment.content, pattern, replacement, line);
    line += countLineBreaks(segment.content);
  }
  return output;
}

function wikilinkLabel(target: string, alias?: string): string {
  if (alias) {
    return alias;
  }
  return withoutMarkdownExtension(path.posix.basename(target.replaceAll("\\", "/")));
}

function calloutLabel(type: string, title?: string): string {
  if (title?.trim()) {
    return title.trim();
  }

  const labels: Record<string, string> = {
    summary: "摘要",
    note: "说明",
    info: "信息",
    tip: "提示",
    warning: "注意",
    caution: "注意",
    danger: "警告",
  };
  return labels[type.toLowerCase()] ?? type;
}

function relativePublishedUrl(outputPath: string, targetUrl: string): string {
  const normalizedOutputPath = outputPath
    .replaceAll("\\", "/")
    .replace(/^src\/content\//u, "")
    .replace(/\.mdx?$/iu, "")
    .replace(/^\/+|\/+$/gu, "");
  const normalizedTargetPath = targetUrl
    .split(/[?#]/u, 1)[0]
    .replace(/^\/+|\/+$/gu, "");
  const relativePath = path.posix.relative(normalizedOutputPath, normalizedTargetPath);
  return `${relativePath || "."}/`;
}

export async function normalizeMarkdown(
  options: NormalizeMarkdownOptions,
): Promise<NormalizeMarkdownResult> {
  const wikilinkWarnings: WikilinkWarning[] = [];
  const assetWarnings: AssetWarning[] = [];
  const assetHandler = options.assetHandler;

  // Resolve links while source line positions are intact. Image references remain opaque.
  let markdown = await replaceOutsideFencedCode(
    options.markdown,
    assetHandler ? wikilinkAndImagePattern : wikilinkAndEmbedPattern,
    async (match, line) => {
      const embed = match.groups?.embed;
      const wikilink = match.groups?.wikilink ?? embed;
      if (!wikilink) {
        return match[0];
      }

      const { target, alias, anchor } = splitWikilink(wikilink);
      if (embed && path.posix.extname(target.replaceAll("\\", "/")) && !isMarkdownSourcePath(target)) {
        return match[0];
      }
      const label = wikilinkLabel(target, alias);
      const resolution = resolveWikilinkTarget(options.index, target, options.sourceVaultPath);

      if (resolution.reason) {
        wikilinkWarnings.push({
          file: options.outputPath,
          line,
          link: match[0],
          target,
          action: "converted-to-text",
          reason: resolution.reason,
        });
        return label;
      }

      if (anchor) {
        wikilinkWarnings.push({
          file: options.outputPath,
          line,
          link: match[0],
          target,
          action: "anchor-dropped",
          reason: anchor.startsWith("^")
            ? "block-anchor-dropped"
            : "heading-anchor-dropped",
        });
      }
      return `[${label}](${relativePublishedUrl(options.outputPath, resolution.url)})`;
    },
  );

  if (assetHandler) {
    markdown = await replaceOutsideFencedCode(markdown, markdownImagePattern, async (match) => {
      const reference = match[2].trim().replace(/^<|>$/g, "");
      if (/^(?:https?:|data:)/i.test(reference)) {
        return match[0];
      }
      const result = await assetHandler({
        reference,
        alt: match[1].trim(),
        original: match[0],
      });
      assetWarnings.push(...result.warnings);
      return result.markdown;
    });

    markdown = await replaceOutsideFencedCode(markdown, obsidianEmbedPattern, async (match) => {
      const [referencePart, modifierPart] = match[1].split("|", 2);
      const reference = referencePart.trim();
      const modifier = modifierPart?.trim();
      const isSize = modifier ? /^\d+(?:x\d+)?$/i.test(modifier) : false;
      const defaultAlt = path.posix.basename(reference).replace(/\.[^.]+$/, "");
      const result = await assetHandler({
        reference,
        alt: modifier && !isSize ? modifier : defaultAlt,
        original: match[0],
        ...(isSize ? { sizeAttribute: modifier } : {}),
      });
      assetWarnings.push(...result.warnings);
      return result.markdown;
    });
  }

  markdown = await replaceOutsideFencedCode(
    markdown,
    /^>[ \t]*\[!([A-Za-z0-9_-]+)\](?:[+-])?(?:[ \t]+([^\r\n]+))?[ \t]*$/gmu,
    async (match) => `> **${calloutLabel(match[1], match[2])}**\n>`,
  );

  return { markdown, wikilinkWarnings, assetWarnings };
}
