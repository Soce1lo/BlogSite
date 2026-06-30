import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import publishConfig from "../publish.config";
import { isDailySourcePath, toPosixPath, walkFiles } from "./utils/path";

export interface PublishIssue {
  file: string;
  code: string;
  message: string;
}

export interface CheckPublishOptions {
  contentPath: string;
  publicPath: string;
}

export interface CheckPublishResult {
  scanned: number;
  errors: PublishIssue[];
  warnings: PublishIssue[];
}

function addIssue(
  issues: PublishIssue[],
  file: string,
  code: string,
  message: string,
): void {
  issues.push({ file, code, message });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function imageReferences(markdown: string): string[] {
  return [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/gu)].map((match) =>
    match[1].trim().replace(/^<|>$/gu, "").split(/[?#]/u, 1)[0],
  );
}

export async function checkPublishContent(
  options: CheckPublishOptions,
): Promise<CheckPublishResult> {
  const contentPath = path.resolve(options.contentPath);
  const publicPath = path.resolve(options.publicPath);
  const errors: PublishIssue[] = [];
  const warnings: PublishIssue[] = [];
  const files = await walkFiles(contentPath, { extensions: [".md", ".mdx"] });
  const seenSlugs = new Map<string, string>();

  for (const absolutePath of files) {
    const relativePath = toPosixPath(path.relative(contentPath, absolutePath));
    const source = await readFile(absolutePath, "utf8");
    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(source);
    } catch {
      addIssue(errors, relativePath, "invalid-frontmatter", "frontmatter 无法解析");
      continue;
    }

    for (const field of ["title", "description", "pubDate"] as const) {
      if (!parsed.data[field]) {
        addIssue(errors, relativePath, `missing-${field}`, `缺少 ${field}`);
      }
    }

    if (/!?\[\[[^\]]+\]\]/u.test(parsed.content)) {
      addIssue(errors, relativePath, "residual-wikilink", "仍包含 Obsidian 双链");
    }
    if (/file:\/\//iu.test(source)) {
      addIssue(errors, relativePath, "file-url", "包含 file:// URL");
    }
    if (/\/Users\/|[A-Za-z]:\\/u.test(source)) {
      addIssue(errors, relativePath, "absolute-local-path", "包含本机绝对路径");
    }
    if (/(?:\/|\\)KnowledgeVault(?:\/|\\)/u.test(source)) {
      addIssue(
        errors,
        relativePath,
        "knowledge-vault-path",
        "包含 KnowledgeVault 绝对路径",
      );
    }
    if (/80-Archive[/\\]logseq-raw|(?:^|[/\\])_system[/\\]/iu.test(source)) {
      addIssue(errors, relativePath, "private-source-path", "包含禁止发布的私有路径");
    }
    if (/publish_status\s*:\s*private/iu.test(source)) {
      addIssue(errors, relativePath, "private-publish-status", "包含 private 发布状态");
    }

    const sourceVaultPath = parsed.data.sourceVaultPath;
    if (typeof sourceVaultPath !== "string" || !sourceVaultPath.trim()) {
      addIssue(errors, relativePath, "missing-source-path", "缺少 sourceVaultPath");
    } else {
      if (path.isAbsolute(sourceVaultPath) || /^[A-Za-z]:\\/u.test(sourceVaultPath)) {
        addIssue(
          errors,
          relativePath,
          "absolute-source-path",
          "sourceVaultPath 必须是相对路径",
        );
      }
      if (isDailySourcePath(sourceVaultPath)) {
        addIssue(errors, relativePath, "daily-source", "不得发布 Daily 原文");
      }
    }

    if (
      parsed.data.managedBy === "vault-sync" &&
      parsed.data.draft === false &&
      parsed.data.sourcePublishStatus !== "published"
    ) {
      addIssue(
        errors,
        relativePath,
        "draft-provenance-mismatch",
        "draft: false 必须来自 publish_status: published",
      );
    }

    const slug = path.basename(relativePath, path.extname(relativePath));
    const previousFile = seenSlugs.get(slug);
    if (previousFile) {
      addIssue(
        errors,
        relativePath,
        "duplicate-slug",
        `slug 与 ${previousFile} 重复`,
      );
    } else {
      seenSlugs.set(slug, relativePath);
    }

    for (const reference of imageReferences(parsed.content)) {
      if (/^(?:https?:|data:)/iu.test(reference)) {
        continue;
      }
      let decodedReference = reference;
      try {
        decodedReference = decodeURIComponent(reference);
      } catch {
        // 保留原引用，由不存在检查给出 warning。
      }
      const imagePath = decodedReference.startsWith("/")
        ? path.join(publicPath, decodedReference.replace(/^\/+/, ""))
        : path.resolve(path.dirname(absolutePath), decodedReference);
      if (!(await fileExists(imagePath))) {
        addIssue(warnings, relativePath, "missing-image", `图片不存在: ${reference}`);
      }
    }
  }

  return { scanned: files.length, errors, warnings };
}

function isDirectExecution(): boolean {
  return Boolean(
    process.argv[1] &&
      import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href,
  );
}

if (isDirectExecution()) {
  try {
    const result = await checkPublishContent({
      contentPath: publishConfig.contentOutputPath,
      publicPath: path.dirname(publishConfig.imageOutputPath),
    });
    for (const issue of [...result.errors, ...result.warnings]) {
      const level = result.errors.includes(issue) ? "ERROR" : "WARN";
      console.log(`${level} ${issue.file} [${issue.code}] ${issue.message}`);
    }
    console.log(
      `发布检查完成: scanned=${result.scanned}, errors=${result.errors.length}, warnings=${result.warnings.length}`,
    );
    if (result.errors.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
