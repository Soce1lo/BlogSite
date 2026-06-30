import { copyFile, mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { AssetHandler, AssetWarning } from "./normalize-markdown";
import { isPathInside, walkFiles } from "./utils/path";

export type AssetCatalog = Map<string, string[]>;

export interface AssetHandlerOptions {
  vaultPath: string;
  sourceAbsolutePath: string;
  imageOutputPath: string;
  publishSlug: string;
  outputPath: string;
  catalog: AssetCatalog;
}

function assetKey(fileName: string): string {
  return fileName.normalize("NFKC").toLocaleLowerCase("en-US");
}

function stripReferenceDecorations(reference: string): string {
  const withoutTitle = reference.trim().split(/\s+["'][^"']*["']\s*$/u, 1)[0];
  const withoutQuery = withoutTitle.split(/[?#]/u, 1)[0];
  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
}

async function safeExistingFile(
  candidatePath: string,
  realVaultPath: string,
): Promise<string | undefined> {
  try {
    const resolvedPath = await realpath(candidatePath);
    if (!isPathInside(realVaultPath, resolvedPath)) {
      return undefined;
    }
    const relativeSegments = path
      .relative(realVaultPath, resolvedPath)
      .split(path.sep);
    if (
      relativeSegments.some((segment) =>
        [".git", ".obsidian", "80-Archive", "_system"].includes(segment),
      )
    ) {
      return undefined;
    }
    const fileStat = await stat(resolvedPath);
    return fileStat.isFile() ? resolvedPath : undefined;
  } catch {
    return undefined;
  }
}

export async function buildAssetCatalog(vaultPath: string): Promise<AssetCatalog> {
  const catalog: AssetCatalog = new Map();
  const files = await walkFiles(vaultPath, {
    excludeDirectories: [".git", ".obsidian", "80-Archive", "_system"],
  });
  for (const file of files) {
    const key = assetKey(path.basename(file));
    const matches = catalog.get(key) ?? [];
    matches.push(file);
    catalog.set(key, matches);
  }
  return catalog;
}

export async function createAssetHandler(
  options: AssetHandlerOptions,
): Promise<AssetHandler> {
  const realVaultPath = await realpath(options.vaultPath);
  const sourceDirectory = path.dirname(options.sourceAbsolutePath);

  return async (request) => {
    const cleanedReference = stripReferenceDecorations(request.reference);
    const fileName = path.basename(cleanedReference.replaceAll("\\", "/"));
    if (/^file:/iu.test(cleanedReference)) {
      return {
        markdown: `[missing image: ${fileName || "local file"}]`,
        warnings: [
          {
            file: options.outputPath,
            asset: request.reference,
            action: "converted-to-text",
            reason: "missing-asset",
          },
        ],
      };
    }
    const explicitCandidates = [
      path.resolve(sourceDirectory, cleanedReference),
      path.resolve(realVaultPath, cleanedReference.replace(/^[/\\]+/u, "")),
    ];
    const indexedCandidates = options.catalog.get(assetKey(fileName)) ?? [];

    let sourceAsset: string | undefined;
    for (const candidate of [...explicitCandidates, ...indexedCandidates]) {
      sourceAsset = await safeExistingFile(candidate, realVaultPath);
      if (sourceAsset) {
        break;
      }
    }

    if (!sourceAsset) {
      const warning: AssetWarning = {
        file: options.outputPath,
        asset: request.reference,
        action: "converted-to-text",
        reason: "missing-asset",
      };
      return {
        markdown: `[missing image: ${fileName || request.reference}]`,
        warnings: [warning],
      };
    }

    const destinationDirectory = path.join(options.imageOutputPath, options.publishSlug);
    const destinationPath = path.join(destinationDirectory, fileName);
    await mkdir(destinationDirectory, { recursive: true });
    await copyFile(sourceAsset, destinationPath);

    const warnings: AssetWarning[] = request.sizeAttribute
      ? [
          {
            file: options.outputPath,
            asset: request.reference,
            action: "copied",
            reason: "size-attribute-dropped",
          },
        ]
      : [];
    const escapedAlt = request.alt.replaceAll("]", "\\]");
    return {
      markdown: `![${escapedAlt}](/images/${encodeURIComponent(options.publishSlug)}/${encodeURIComponent(fileName)})`,
      warnings,
    };
  };
}
