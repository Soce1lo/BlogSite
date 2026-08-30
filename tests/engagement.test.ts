import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { buildEngagementFixture } from "./helpers/engagement-fixture";
import {
  counterUrl,
  discussionTerm,
  fetchVisitCount,
  formatVisitCount,
  giscusThemes,
  isGiscusMessage,
  referrerOrigin,
  resolveEngagementConfig,
  shouldTrackVisit,
  trackingPixelUrl,
} from "../src/lib/engagement";

const configured = {
  PUBLIC_GOATCOUNTER_CODE: "fixture-site",
  PUBLIC_GISCUS_REPO: "fixture/comments",
  PUBLIC_GISCUS_REPO_ID: "R_fixture",
  PUBLIC_GISCUS_CATEGORY: "Announcements",
  PUBLIC_GISCUS_CATEGORY_ID: "DIC_fixture",
};

test("未配置或配置不完整时不启用对应第三方服务", () => {
  assert.deepEqual(resolveEngagementConfig({}), { goatcounter: null, giscus: null });
  assert.deepEqual(resolveEngagementConfig({ PUBLIC_GISCUS_REPO: "fixture/comments" }), {
    goatcounter: null,
    giscus: null,
  });
  const result = resolveEngagementConfig(configured);
  assert.equal(result.goatcounter?.endpoint, "https://fixture-site.goatcounter.com/count");
  assert.equal(result.giscus?.repo, "fixture/comments");
});

test("统计站点代码和评论仓库不能注入任意 URL 或脚本", () => {
  for (const code of ["https://example.com", "bad/site", "x.goatcounter.com", "-start", "end-"]) {
    assert.throws(() => resolveEngagementConfig({ PUBLIC_GOATCOUNTER_CODE: code }));
  }
  assert.throws(() => resolveEngagementConfig({ ...configured, PUBLIC_GISCUS_REPO: "https://github.com/fixture/comments" }));
  assert.throws(() => resolveEngagementConfig({ ...configured, PUBLIC_GISCUS_CATEGORY_ID: 'x" onload="alert(1)' }));
});

test("计数请求保留 Pages 前缀并编码完整文章路径，总量使用 TOTAL", () => {
  const { goatcounter } = resolveEngagementConfig(configured);
  assert.ok(goatcounter);
  assert.equal(counterUrl(goatcounter, "/BlogSite/notes/中文/"),
    "https://fixture-site.goatcounter.com/counter/%2FBlogSite%2Fnotes%2F%E4%B8%AD%E6%96%87%2F.json");
  assert.equal(counterUrl(goatcounter, "TOTAL"), "https://fixture-site.goatcounter.com/counter/TOTAL.json");
});

test("计数响应只接受真实非负安全整数，不信任 HTML 或旧 count_unique 字段", () => {
  assert.equal(formatVisitCount({ count: "12,840" }), "12,840");
  assert.equal(formatVisitCount({ count: 328 }), "328");
  assert.equal(formatVisitCount({ count: "0" }), "0");
  for (const payload of [
    null, {}, { count_unique: 100 }, { count: -1 }, { count: 1.5 },
    { count: "1,23" }, { count: "<img src=x onerror=alert(1)>" },
    { count: Number.MAX_SAFE_INTEGER + 1 }, { count: [] },
  ]) {
    assert.equal(formatVisitCount(payload), null);
  }
});

test("公开计数读取不发送凭据或 Referer，返回格式化数字", async () => {
  const fetcher = (async (_url, options) => {
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.referrerPolicy, "no-referrer");
    assert.ok(options?.signal instanceof AbortSignal);
    return new Response(JSON.stringify({ count: "1,024" }));
  }) as typeof fetch;
  assert.equal(await fetchVisitCount("https://fixture-site.goatcounter.com/counter/TOTAL.json", fetcher), "1,024");
});

test("新文章 404、网络失败、超时和异常 JSON 均降级为空，不伪造零访问", async () => {
  for (const status of [404, 403, 429, 500]) {
    assert.equal(await fetchVisitCount("https://fixture.invalid", (async () => new Response("", { status })) as typeof fetch), null);
  }
  assert.equal(await fetchVisitCount("https://fixture.invalid", (async () => new Response("not json")) as typeof fetch), null);
  assert.equal(await fetchVisitCount("https://fixture.invalid", (async () => { throw new TypeError("Network failed"); }) as typeof fetch), null);
  assert.equal(await fetchVisitCount("https://fixture.invalid", (async () => { throw new DOMException("Timed out", "TimeoutError"); }) as typeof fetch), null);
});

test("只有线上生产源站记录访问，开发、预览、未知域名与本地地址不记录", () => {
  const site = "https://soce1lo.github.io";
  assert.equal(shouldTrackVisit(`${site}/BlogSite/blog/example/`, site, true), true);
  assert.equal(shouldTrackVisit(`${site}/BlogSite/`, site, false), false);
  for (const url of ["http://localhost:4321/BlogSite/", "https://preview.example.org/BlogSite/", "not-a-url"]) {
    assert.equal(shouldTrackVisit(url, site, true), false);
  }
  for (const url of ["https://example.com", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://192.168.1.2"]) {
    assert.equal(shouldTrackVisit(url, url, true), false);
  }
});

test("来源只保留域名，不向统计服务发送来源路径、查询或片段", () => {
  assert.equal(referrerOrigin("https://search.example/results?q=private#secret"), "https://search.example");
  for (const referrer of ["", "invalid", "file:///private/file", "javascript:alert(1)"]) {
    assert.equal(referrerOrigin(referrer), "");
  }
});

test("最终计数请求只携带允许字段，不包含页面和来源的敏感 query", () => {
  const url = new URL(trackingPixelUrl(
    "https://fixture-site.goatcounter.com/count",
    "/BlogSite/blog/example/?giscus=secret-session&token=secret-token#private",
    "公开文章标题",
    "https://search.example/private?q=secret-referrer#private",
    "fixture-nonce",
  ));
  assert.deepEqual([...url.searchParams.keys()].sort(), ["p", "r", "rnd", "t"]);
  assert.equal(url.searchParams.get("p"), "/BlogSite/blog/example/");
  assert.equal(url.searchParams.get("r"), "https://search.example");
  assert.equal(url.searchParams.get("t"), "公开文章标题");
  assert.doesNotMatch(url.href, /secret|private|giscus|token|[?&]q=/);
});

test("评论标识由集合与 slug 决定，避免跨集合串帖且不依赖 Pages 前缀", () => {
  assert.equal(discussionTerm("blog", "same-slug"), "blog/same-slug");
  assert.notEqual(discussionTerm("blog", "same-slug"), discussionTerm("notes", "same-slug"));
});

test("评论自定义主题使用公开 HTTPS URL，保留 Pages 子路径并支持根路径", () => {
  assert.deepEqual(giscusThemes(new URL("https://soce1lo.github.io"), "/BlogSite/"), {
    light: "https://soce1lo.github.io/BlogSite/giscus/light.css",
    dark: "https://soce1lo.github.io/BlogSite/giscus/dark.css",
  });
  assert.equal(giscusThemes(new URL("https://example.org"), "/").light, "https://example.org/giscus/light.css");
  assert.deepEqual(giscusThemes(undefined, "/"), { light: "noborder_light", dark: "noborder_dark" });
});

test("评论消息同时核对 origin、具体 iframe 和载荷结构", () => {
  const frame = {} as Window;
  const otherFrame = {} as Window;
  const message = { origin: "https://giscus.app", source: frame, data: { giscus: { resizeHeight: 300 } } } as MessageEvent;
  assert.equal(isGiscusMessage(message, frame), true);
  assert.equal(isGiscusMessage(message, otherFrame), false);
  assert.equal(isGiscusMessage(message, null), false);
  assert.equal(isGiscusMessage({ ...message, origin: "https://giscus.app.example.org" } as MessageEvent, frame), false);
  for (const data of [null, "message", {}, { giscus: null }]) {
    assert.equal(isGiscusMessage({ ...message, data } as MessageEvent, frame), false);
  }
});

test("合成生产构建为三类公开文章接入计数与独立留言，未公开页面不接入", async (t) => {
  const root = await buildEngagementFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const read = (file: string) => readFile(path.join(root, "dist", file), "utf8");
  const home = await read("index.html");
  assert.match(home, /data-visitor-count="https:\/\/blogsite-fixture\.goatcounter\.com\/counter\/TOTAL\.json"/);
  assert.doesNotMatch(home, /data-github-comments/);
  // The vendor scripts must not load directly from generated HTML.
  assert.doesNotMatch(home, /src="https:\/\/gc\.zgo\.at/);

  for (const collection of ["blog", "notes", "projects"]) {
    const html = await read(`${collection}/public-example/index.html`);
    assert.match(html, new RegExp(`data-term="${collection}/public-example"`));
    assert.match(html, new RegExp(`counter/%2FBlogSite%2F${collection}%2Fpublic-example%2F\\.json`));
    assert.match(html, /data-production="true"/);
    assert.match(html, /data-theme-light="https:\/\/soce1lo\.github\.io\/BlogSite\/giscus\/light\.css"/);
    assert.match(html, new RegExp(`name="giscus:backlink" content="https://soce1lo.github.io/BlogSite/${collection}/public-example/"`));
    assert.doesNotMatch(html, /src="https:\/\/giscus\.app\/client\.js"/);
    assert.doesNotMatch(html, /fixtures\//);

    const unlisted = await read(`${collection}/unlisted-example/index.html`);
    assert.doesNotMatch(unlisted, /data-visitor-count=|data-visitor-analytics|data-github-comments|giscus:backlink/);
    assert.equal(existsSync(path.join(root, "dist", collection, "draft-example/index.html")), false);
  }
  assert.doesNotMatch(await read("404.html"), /data-visitor-count=|data-visitor-analytics|data-github-comments/);
  for (const theme of ["light", "dark"]) {
    const css = await read(`giscus/${theme}.css`);
    assert.ok(css.includes(`color-scheme: ${theme};`));
    assert.match(css, /--color-canvas-default: var\(--background\)/);
    assert.match(css, /font-family: var\(--font-body\)/);
  }
});
