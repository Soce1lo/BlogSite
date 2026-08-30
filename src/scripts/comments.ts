import { isGiscusMessage } from "../lib/engagement";

export function initializeComments(): void {
  const section = document.querySelector<HTMLElement>("[data-github-comments]");
  const button = section?.querySelector<HTMLButtonElement>("[data-comments-load]");
  const status = section?.querySelector<HTMLElement>("[data-comments-status]");
  const container = section?.querySelector<HTMLElement>("[data-comments-container]");
  if (!section || !button || !status || !container || section.dataset.initialized) return;
  section.dataset.initialized = "true";
  button.hidden = false;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let loading = false;
  let ready = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let client: HTMLScriptElement | undefined;
  let sentTheme = "";
  const theme = () => {
    const preference = document.documentElement.dataset.theme;
    const dark = preference === "dark" || (preference !== "light" && media.matches);
    const fallback = dark ? "noborder_dark" : "noborder_light";
    // Local HTTP previews cannot rely on the custom stylesheet being deployed yet.
    if (window.location.protocol !== "https:") return fallback;
    return (dark ? section.dataset.themeDark : section.dataset.themeLight)
      ?? fallback;
  };
  const updateTheme = () => {
    const frame = container.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    const nextTheme = theme();
    if (!ready || !frame?.contentWindow || sentTheme === nextTheme) return;
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme: nextTheme } } }, "https://giscus.app");
    sentTheme = nextTheme;
  };
  const fail = () => {
    clearTimeout(timeout);
    loading = false;
    section.removeAttribute("aria-busy");
    button.disabled = false;
    button.hidden = false;
    button.textContent = "重试加载";
    status.textContent = "评论暂时无法加载，可稍后重试，或通过上方链接前往 GitHub。";
    status.hidden = false;
  };

  window.addEventListener("message", (event) => {
    const frame = container.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    if (!isGiscusMessage(event, frame?.contentWindow ?? null)) return;
    if (!Number.isFinite(event.data.giscus.resizeHeight) || event.data.giscus.resizeHeight <= 0) return;
    clearTimeout(timeout);
    loading = false;
    ready = true;
    section.removeAttribute("aria-busy");
    button.hidden = true;
    status.hidden = true;
    updateTheme();
  });

  button.addEventListener("click", () => {
    if (loading) return;
    loading = true;
    ready = false;
    sentTheme = "";
    button.disabled = true;
    status.hidden = false;
    status.textContent = "正在加载评论…";
    section.setAttribute("aria-busy", "true");
    client?.remove();
    container.replaceChildren();
    client = document.createElement("script");
    client.src = "https://giscus.app/client.js";
    client.async = true;
    client.crossOrigin = "anonymous";
    client.referrerPolicy = "no-referrer";
    Object.assign(client.dataset, {
      repo: section.dataset.repo,
      repoId: section.dataset.repoId,
      category: section.dataset.category,
      categoryId: section.dataset.categoryId,
      mapping: "specific",
      term: section.dataset.term,
      strict: "1",
      reactionsEnabled: "0",
      emitMetadata: "0",
      inputPosition: "top",
      theme: theme(),
      lang: "zh-CN",
      loading: "eager",
    });
    client.addEventListener("error", fail, { once: true });
    timeout = setTimeout(fail, 15000);
    // Keep the script outside .giscus: the official client replaces that container's contents.
    section.append(client);
  });

  new MutationObserver(updateTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  media.addEventListener("change", updateTheme);
}
