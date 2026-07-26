export function withBase(path: string, baseUrl = import.meta.env.BASE_URL): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/");
}

export function prefixBaseInHtmlImageSources(
  html: string,
  baseUrl = import.meta.env.BASE_URL,
): string {
  const imageBase = withBase("images/", baseUrl);
  return html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*["'])\/images\//giu,
    `$1${imageBase}`,
  );
}
