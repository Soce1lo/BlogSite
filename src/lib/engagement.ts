import { withBase } from "./site";

export interface EngagementEnvironment {
  PUBLIC_GOATCOUNTER_CODE?: string;
  PUBLIC_GISCUS_REPO?: string;
  PUBLIC_GISCUS_REPO_ID?: string;
  PUBLIC_GISCUS_CATEGORY?: string;
  PUBLIC_GISCUS_CATEGORY_ID?: string;
}

export interface GoatCounterConfig {
  origin: string;
  endpoint: string;
}

export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

export function resolveEngagementConfig(env: EngagementEnvironment) {
  const code = env.PUBLIC_GOATCOUNTER_CODE?.trim().toLowerCase();
  let goatcounter: GoatCounterConfig | null = null;
  if (code) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(code)) {
      throw new Error("PUBLIC_GOATCOUNTER_CODE 只能填写 GoatCounter 站点代码，不是 URL 或 API 密钥。");
    }
    const origin = `https://${code}.goatcounter.com`;
    goatcounter = { origin, endpoint: `${origin}/count` };
  }

  const repo = env.PUBLIC_GISCUS_REPO?.trim();
  const repoId = env.PUBLIC_GISCUS_REPO_ID?.trim();
  const category = env.PUBLIC_GISCUS_CATEGORY?.trim();
  const categoryId = env.PUBLIC_GISCUS_CATEGORY_ID?.trim();
  let giscus: GiscusConfig | null = null;
  // Incomplete setup is disabled; never render a broken widget or placeholder IDs.
  if (repo && repoId && category && categoryId) {
    if (!/^[a-z0-9-]+\/[a-z0-9_.-]+$/i.test(repo)) {
      throw new Error("PUBLIC_GISCUS_REPO 必须是 owner/repository。");
    }
    if (![repoId, categoryId].every((id) => /^[a-z0-9_=-]+$/i.test(id))) {
      throw new Error("giscus 配置需要公开的仓库 ID 和分类 ID，不是访问令牌。");
    }
    giscus = { repo, repoId, category, categoryId };
  }
  return { goatcounter, giscus };
}

export function counterUrl(config: GoatCounterConfig, path: string): string {
  return `${config.origin}/counter/${encodeURIComponent(path)}.json`;
}

export function formatVisitCount(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("count" in payload)) return null;
  const count = payload.count;
  if (typeof count !== "string" && typeof count !== "number") return null;
  const value = String(count);
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value)) return null;
  const number = Number(value.replaceAll(",", ""));
  return Number.isSafeInteger(number) && number >= 0
    ? number.toLocaleString("zh-CN")
    : null;
}

export async function fetchVisitCount(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetcher(url, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(5000),
    });
    // New paths return 404; network errors and disabled counters are not zero visits.
    return response.ok ? formatVisitCount(await response.json()) : null;
  } catch {
    return null;
  }
}

export function shouldTrackVisit(currentUrl: string, siteUrl: string, production: boolean): boolean {
  if (!production) return false;
  try {
    const current = new URL(currentUrl);
    const site = new URL(siteUrl);
    const localHost = site.hostname === "localhost"
      || site.hostname.endsWith(".localhost")
      || site.hostname.endsWith(".local")
      || site.hostname.startsWith("[")
      || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(site.hostname);
    return current.protocol === "https:"
      && current.origin === site.origin
      && site.hostname !== "example.com"
      && !localHost;
  } catch {
    return false;
  }
}

export function referrerOrigin(referrer: string): string {
  try {
    const url = new URL(referrer);
    return ["https:", "http:"].includes(url.protocol) ? url.origin : "";
  } catch {
    return "";
  }
}

export function trackingPixelUrl(
  endpoint: string,
  pathname: string,
  title: string,
  referrer: string,
  nonce = Math.random().toString(36).slice(2),
): string {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    p: new URL(pathname, "https://path.invalid").pathname,
    t: title,
    r: referrerOrigin(referrer),
    rnd: nonce,
  }).toString();
  return url.href;
}

export function discussionTerm(collection: string, id: string): string {
  // Deliberately independent of domain, Pages base path, article title and query strings.
  return `${collection}/${id}`;
}

export function giscusThemes(site: URL | undefined, base: string) {
  if (!site || site.protocol !== "https:" || site.hostname === "example.com") {
    return { light: "noborder_light", dark: "noborder_dark" };
  }
  return {
    light: new URL(withBase("giscus/light.css", base), site).href,
    dark: new URL(withBase("giscus/dark.css", base), site).href,
  };
}

export function isGiscusMessage(event: MessageEvent, frame: Window | null): boolean {
  return frame !== null
    && event.origin === "https://giscus.app"
    && event.source === frame
    && typeof event.data === "object"
    && event.data !== null
    && typeof event.data.giscus === "object"
    && event.data.giscus !== null;
}
