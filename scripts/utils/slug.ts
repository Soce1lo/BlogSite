import path from "node:path";

export function normalizeLookupKey(value: string): string {
  const normalizedPath = value.trim().replaceAll("\\", "/");
  const basename = path.posix.basename(normalizedPath).replace(/\.md$/i, "");
  return basename.normalize("NFKC").toLocaleLowerCase("en-US");
}

export function isSafePublishSlug(value: string): boolean {
  const slug = value.trim();
  return (
    slug.length > 0 &&
    slug !== "." &&
    slug !== ".." &&
    !slug.includes("/") &&
    !slug.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(slug)
  );
}

export function splitWikilink(value: string): {
  target: string;
  alias?: string;
  anchor?: string;
} {
  const aliasSeparator = value.indexOf("|");
  const targetWithAnchor = (
    aliasSeparator >= 0 ? value.slice(0, aliasSeparator) : value
  ).trim();
  const alias = aliasSeparator >= 0 ? value.slice(aliasSeparator + 1).trim() : undefined;
  const anchorSeparator = targetWithAnchor.indexOf("#");
  const target = (
    anchorSeparator >= 0 ? targetWithAnchor.slice(0, anchorSeparator) : targetWithAnchor
  ).trim();
  const anchor =
    anchorSeparator >= 0 ? targetWithAnchor.slice(anchorSeparator + 1).trim() : undefined;

  return { target, alias: alias || undefined, anchor: anchor || undefined };
}
