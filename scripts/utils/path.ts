import { readdir } from "node:fs/promises";
import path from "node:path";

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function isPathInside(parentPath: string, candidatePath: string): boolean {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertOutputsOutsideVault(
  vaultPath: string,
  outputPaths: string[],
): void {
  for (const outputPath of outputPaths) {
    if (isPathInside(vaultPath, outputPath)) {
      throw new Error(`输出目录不得位于 Vault 内部: ${outputPath}`);
    }
  }
}

export async function walkFiles(
  rootPath: string,
  options: {
    excludeDirectories?: string[];
    extensions?: string[];
  } = {},
): Promise<string[]> {
  const files: string[] = [];
  const excluded = new Set(options.excludeDirectories ?? []);
  const extensions = options.extensions
    ? new Set(options.extensions.map((extension) => extension.toLowerCase()))
    : undefined;

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!excluded.has(entry.name)) {
          await visit(absolutePath);
        }
      } else if (entry.isFile()) {
        if (!extensions || extensions.has(path.extname(entry.name).toLowerCase())) {
          files.push(absolutePath);
        }
      }
    }
  }

  await visit(rootPath);
  return files;
}

export function isDailySourcePath(sourceVaultPath: string): boolean {
  const dailyDirectoryNames = new Set([
    "daily",
    "daily notes",
    "daily-notes",
    "journal",
    "journals",
  ]);
  const segments = toPosixPath(sourceVaultPath)
    .split("/")
    .slice(0, -1)
    .map((segment) => segment.toLocaleLowerCase("en-US"));
  return segments.some((segment) => dailyDirectoryNames.has(segment));
}
