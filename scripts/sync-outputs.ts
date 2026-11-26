import fs from "node:fs/promises";
import path from "node:path";
import { slug } from "github-slugger";
import matter from "gray-matter";
import { toPosixPath } from "./utils/path";
import { isSafePublishSlug } from "./utils/slug";

export interface OutputLocations {
  contentOutputPath: string;
  imageOutputPath: string;
  reportsPath: string;
}

const collections = ["blog", "notes", "projects"] as const;
const reportNames = [
  "wikilink-warnings.md",
  "asset-warnings.md",
  "sync-report.md",
  "publish-manifest.json",
  "publish-manifest.md",
];
const lockName = ".vault-sync-lock";
const workspacePrefix = ".vault-sync-work-";

type Collection = (typeof collections)[number];

interface ContentEntry {
  file: string;
  collection: Collection;
  basename: string;
  route: string;
  managed: boolean;
}

interface Change {
  target: string;
  previous?: string;
  source?: string;
}

interface RollbackStep {
  description: string;
  restore: () => Promise<void>;
}

async function lstat(file: string) {
  return fs.lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

async function resolveLocation(location: string): Promise<string> {
  const absolute = path.resolve(location);
  // macOS exposes its standard temporary paths through system-owned aliases.
  const alias = process.platform === "darwin" ? /^\/(?:tmp|var)(?=\/|$)/u.exec(absolute)?.[0] : undefined;
  if (alias && await fs.realpath(alias) === `/private${alias}`) return `/private${absolute}`;
  return absolute;
}

async function directoryExists(directory: string): Promise<boolean> {
  const parent = path.dirname(directory);
  if (parent !== directory && !await directoryExists(parent)) return false;
  const info = await lstat(directory);
  if (info && !info.isDirectory()) throw new Error(`输出路径必须是实际目录: ${directory}`);
  return Boolean(info);
}

function nameKey(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

function canOwnImageDirectory(name: string): boolean {
  const key = nameKey(name);
  return isSafePublishSlug(name) && key !== lockName && !key.startsWith(workspacePrefix);
}

async function resolveLocations(prepared: OutputLocations, destination: OutputLocations) {
  const roots = await Promise.all([
    prepared.contentOutputPath, prepared.imageOutputPath, prepared.reportsPath,
    destination.contentOutputPath, destination.imageOutputPath, destination.reportsPath,
  ].map(resolveLocation));
  const rootKeys = roots.map(nameKey);
  if (rootKeys.some((root, i) => rootKeys.some((other, j) =>
    i !== j && (root === other || other.startsWith(`${root}${root.endsWith(path.sep) ? "" : path.sep}`)),
  ))) throw new Error("暂存和目标输出目录必须彼此独立");

  const [preparedContent, preparedImages, preparedReports, content, images, reports] = roots;
  return {
    prepared: { contentOutputPath: preparedContent, imageOutputPath: preparedImages, reportsPath: preparedReports },
    destination: { contentOutputPath: content, imageOutputPath: images, reportsPath: reports },
  };
}

function staticRoutePath(collection: Collection, parameter: string): string {
  // Astro's spread route trims the parameter and escapes query and fragment markers.
  const segment = parameter.replace(/^\/|\/$/gu, "").normalize()
    .replaceAll("#", "%23").replaceAll("?", "%3F").replace(/^\/+/u, "");
  const pathname = new URL(`/${collection}/${segment}/`, "https://example.invalid").pathname;
  // Astro decodes URI escapes before looking up prerendered params, while preserving encoded separators.
  let decoded = pathname;
  for (let depth = 0; depth <= 10; depth++) {
    try {
      const next = decodeURI(decoded);
      if (next === decoded) break;
      decoded = depth === 10 ? pathname : next;
    } catch {
      break;
    }
  }
  return decoded.normalize().replace(/\/+$/u, "");
}

async function collectContent(root: string) {
  const entries: ContentEntry[] = [];
  const links: string[] = [];
  for (const collection of collections) {
    const collectionPath = path.join(root, collection);
    if (await directoryExists(collectionPath)) await visit(collectionPath, []);

    async function visit(directory: string, segments: string[]) {
      for (const item of await fs.readdir(directory, { withFileTypes: true })) {
        if (item.name === lockName || item.name.startsWith(workspacePrefix)) continue;
        const file = path.join(directory, item.name);
        if (item.isSymbolicLink()) {
          // The content glob follows visible links. Their entries and slugs cannot be checked safely.
          if (![...segments, item.name].some((name) => name.startsWith("."))) {
            links.push(toPosixPath(path.relative(root, file)));
          }
          continue;
        }
        const extension = path.extname(item.name);
        if (item.isDirectory()) await visit(file, [...segments, item.name]);
        if (!/^\.mdx?$/iu.test(extension)) continue;
        const data = item.isFile() ? matter(await fs.readFile(file, "utf8"), {}).data : {};
        const basename = path.basename(item.name, extension);
        // Match Astro's glob loader, including folder/index and an explicit frontmatter slug.
        const parameter = typeof data.slug === "string" && data.slug
          ? data.slug
          : [...segments, basename].map((segment) => slug(segment)).join("/").replace(/\/index$/u, "");
        entries.push({ file, collection, basename, route: staticRoutePath(collection, parameter), managed: data.managedBy === "vault-sync" });
      }
    }
  }
  return { entries, links };
}

async function isRegularTree(directory: string): Promise<boolean> {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!await isRegularTree(path.join(directory, entry.name))) return false;
    } else if (!entry.isFile()) {
      return false;
    }
  }
  return true;
}

async function planOutputs(prepared: OutputLocations, destination: OutputLocations, includeReports: boolean) {
  const changes: Change[] = [];
  const { entries: current, links: currentLinks } = await collectContent(destination.contentOutputPath);
  const { entries: incoming, links: incomingLinks } = await collectContent(prepared.contentOutputPath);
  const conflicts = new Set([
    ...currentLinks.map((file) => `内容路径为符号链接 ${file}`),
    ...incomingLinks.map((file) => `暂存内容路径为符号链接 ${file}`),
  ]);
  const contentLabel = (file: string) => `内容 ${path.relative(destination.contentOutputPath, file)}`;
  const retired = new Map(current.filter((entry) => entry.managed).map((entry) => [entry.file, entry]));
  const routes = new Set<string>();
  const incomingPaths = new Set<string>();
  const incomingSlugs = new Map<string, string>();

  for (const entry of incoming) {
    const name = `${entry.basename}.md`;
    const relative = path.join(entry.collection, name);
    if (!entry.managed || !canOwnImageDirectory(entry.basename) || entry.file !== path.join(prepared.contentOutputPath, relative)) {
      throw new Error(`暂存内容必须是带同步标记的扁平 Markdown: ${relative}`);
    }
    const target = path.join(destination.contentOutputPath, relative);
    incomingPaths.add(target);
    const route = entry.route;
    const imageKey = nameKey(entry.basename);
    if (routes.has(route) || incomingSlugs.has(imageKey)) conflicts.add(contentLabel(target));
    routes.add(route);
    incomingSlugs.set(imageKey, entry.basename);

    const blocking = current.filter((previous) => !previous.managed && (
      nameKey(previous.file) === nameKey(target) ||
      previous.route === route
    ));
    for (const previous of blocking) conflicts.add(contentLabel(previous.file));
    const previous = retired.get(target);
    if (!previous && blocking.length === 0 && await lstat(target)) {
      const alias = [...retired.values()].find((old) => nameKey(old.file) === nameKey(target));
      if (alias) {
        changes.push({ target, previous: alias.file, source: entry.file });
        retired.delete(alias.file);
        continue;
      }
      conflicts.add(contentLabel(target));
    }
    changes.push({ target, previous: previous?.file, source: entry.file });
    retired.delete(target);
  }
  for (const entry of retired.values()) changes.push({ target: entry.file, previous: entry.file });
  const retiredPages = current
    .filter((entry) => entry.managed && !incomingPaths.has(entry.file))
    .map((entry) => toPosixPath(path.relative(destination.contentOutputPath, entry.file)))
    .sort();

  const currentSlugs = new Map(current.filter((entry) => entry.managed && canOwnImageDirectory(entry.basename))
    .map((entry) => [nameKey(entry.basename), entry.basename]));
  const manualSlugs = new Set(current.filter((entry) => !entry.managed)
    .flatMap((entry) => [nameKey(entry.basename), nameKey(entry.route.replace(/^\/[^/]+\//u, ""))]));
  const imageRootExists = await directoryExists(destination.imageOutputPath);
  await directoryExists(prepared.imageOutputPath);
  for (const key of new Set([...incomingSlugs.keys(), ...currentSlugs.keys()])) {
    const name = incomingSlugs.get(key) ?? currentSlugs.get(key)!;
    const source = incomingSlugs.has(key) ? path.join(prepared.imageOutputPath, name) : undefined;
    const sourceInfo = source && await lstat(source);
    const target = path.join(destination.imageOutputPath, name);
    const oldName = currentSlugs.get(key);
    const previous = path.join(destination.imageOutputPath, oldName ?? name);
    const previousInfo = imageRootExists && await lstat(previous);
    const targetInfo = previous === target ? previousInfo : imageRootExists && await lstat(target);
    const owned = oldName !== undefined && !manualSlugs.has(key);
    if (sourceInfo && (
      !sourceInfo.isDirectory() || !await isRegularTree(source!) ||
      ((previousInfo || targetInfo) && !owned) ||
      (targetInfo && previous !== target && (!previousInfo || previousInfo.ino !== targetInfo.ino || previousInfo.dev !== targetInfo.dev))
    )) {
      conflicts.add(`图片 ${name}`);
      continue;
    }
    if (owned && previousInfo && (!previousInfo.isDirectory() || !await isRegularTree(previous))) {
      conflicts.add(`图片 ${oldName}`);
      continue;
    }
    if (sourceInfo || (owned && previousInfo)) {
      changes.push({ target, previous: owned && previousInfo ? previous : undefined, source: sourceInfo ? source : undefined });
    }
  }

  if (includeReports) await directoryExists(prepared.reportsPath);
  const reportsExist = await directoryExists(destination.reportsPath);
  for (const name of reportNames) {
    const source = path.join(prepared.reportsPath, name);
    if (includeReports && !(await lstat(source))?.isFile()) throw new Error(`暂存报告必须是常规文件: ${name}`);
    const target = path.join(destination.reportsPath, name);
    const previous = reportsExist && await lstat(target);
    if (previous && !previous.isFile()) conflicts.add(`报告 ${name}`);
    changes.push({ target, previous: previous ? target : undefined, source });
  }
  return { changes, conflicts: [...conflicts].sort(), retiredPages };
}

export async function inspectOutputPlan(prepared: OutputLocations, destination: OutputLocations): Promise<{
  conflicts: string[];
  retiredPages: string[];
}> {
  const locations = await resolveLocations(prepared, destination);
  const { conflicts, retiredPages } = await planOutputs(locations.prepared, locations.destination, false);
  return { conflicts, retiredPages };
}

async function createDirectory(directory: string, created: string[]): Promise<void> {
  if (await directoryExists(directory)) return;
  await createDirectory(path.dirname(directory), created);
  try {
    await fs.mkdir(directory);
    created.push(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST" || !await directoryExists(directory)) throw error;
  }
}

export async function applyPreparedOutputs(
  prepared: OutputLocations,
  destination: OutputLocations,
  expectedRetiredPages?: readonly string[],
): Promise<void> {
  const locations = await resolveLocations(prepared, destination);
  const created: string[] = [];
  const locks: string[] = [];
  const workspaces = new Map<string, string>();
  const rollback: RollbackStep[] = [];
  const errors: unknown[] = [];
  const unresolved: string[] = [];
  let committed = false;

  try {
    for (const directory of Object.values(locations.destination).sort()) {
      await createDirectory(directory, created);
      const lock = path.join(directory, lockName);
      try {
        await fs.mkdir(lock);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        throw new Error(`输出目录已锁定: ${lock}`, { cause: error });
      }
      locks.push(lock);
    }

    const { changes, conflicts, retiredPages } = await planOutputs(locations.prepared, locations.destination, true);
    if (conflicts.length) throw new Error(`同步输出冲突:\n${conflicts.join("\n")}`);
    if (expectedRetiredPages) {
      const additionalRetirements = retiredPages.filter((page) => !expectedRetiredPages.includes(page));
      if (additionalRetirements.length) {
        throw new Error(`同步输出包含预演后新增的待退役页面:\n${additionalRetirements.join("\n")}`);
      }
    }
    for (const collection of collections) {
      await createDirectory(path.join(locations.destination.contentOutputPath, collection), created);
    }

    const staged = [];
    for (const [index, change] of changes.entries()) {
      const parent = path.dirname(change.target);
      await createDirectory(parent, created);
      let workspace = workspaces.get(parent);
      if (!workspace) {
        workspace = await fs.mkdtemp(path.join(parent, workspacePrefix));
        workspaces.set(parent, workspace);
      }
      const next = path.join(workspace, `next-${index}`);
      const backup = path.join(workspace, `previous-${index}`);
      if (change.source) await fs.cp(change.source, next, { recursive: true, force: false, errorOnExist: true });
      staged.push({ change, next, backup });
    }

    for (const { change, next, backup } of staged) {
      if (change.previous) {
        const previous = change.previous;
        await fs.rename(previous, backup);
        rollback.push({
          description: `从备份 ${backup} 恢复 ${previous}`,
          restore: () => fs.rename(backup, previous),
        });
      }
      if (change.source) {
        await fs.rename(next, change.target);
        rollback.push({
          description: `移除本次安装的 ${change.target}`,
          restore: () => fs.rm(change.target, { recursive: true }),
        });
      }
    }
    committed = true;
  } catch (error) {
    errors.push(error);
    for (const { description, restore } of rollback.reverse()) {
      try {
        await restore();
      } catch (restoreError) {
        unresolved.push(description);
        errors.push(restoreError);
      }
    }
  }

  if (unresolved.length) {
    throw new AggregateError(errors, [
      "恢复同步输出失败，已保留工作目录和锁",
      ...unresolved,
      ...workspaces.values(),
      ...locks,
    ].join("\n"));
  }

  for (const workspace of workspaces.values()) {
    await fs.rm(workspace, { recursive: true, force: true }).catch((error: unknown) => {
      errors.push(new Error(`无法清理工作目录 ${workspace}`, { cause: error }));
    });
  }
  for (const lock of locks.reverse()) {
    await fs.rmdir(lock).catch((error: unknown) => {
      errors.push(new Error(`无法清理锁 ${lock}`, { cause: error }));
    });
  }
  if (committed) {
    if (errors.length) console.warn("同步输出已安装，临时文件清理失败", ...errors);
    return;
  }
  for (const directory of created.reverse()) {
    await fs.rmdir(directory).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") errors.push(error);
    });
  }
  if (errors.length > 1) throw new AggregateError(errors, "同步输出失败，且临时文件清理失败");
  throw errors[0];
}
