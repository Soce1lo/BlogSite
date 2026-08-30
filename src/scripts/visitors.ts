import { fetchVisitCount, shouldTrackVisit, trackingPixelUrl } from "../lib/engagement";

export function initializeVisitors(): void {
  const settings = document.querySelector<HTMLElement>("[data-visitor-analytics]");
  if (!settings || settings.dataset.initialized) return;
  settings.dataset.initialized = "true";

  for (const element of document.querySelectorAll<HTMLElement>("[data-visitor-count]")) {
    void fetchVisitCount(element.dataset.visitorCount ?? "").then((count) => {
      const value = element.querySelector<HTMLElement>("[data-visitor-value]");
      if (count === null || !value) return;
      value.textContent = count;
      element.hidden = false;
    });
  }

  if (!shouldTrackVisit(location.href, settings.dataset.site ?? "", settings.dataset.production === "true")) {
    return;
  }
  if (window.self !== window.top || navigator.webdriver) return;
  const record = () => {
    if (document.visibilityState !== "visible") return;
    document.removeEventListener("visibilitychange", record);
    const pixel = document.createElement("img");
    pixel.hidden = true;
    pixel.alt = "";
    pixel.width = 1;
    pixel.height = 1;
    pixel.referrerPolicy = "no-referrer";
    pixel.addEventListener("load", () => pixel.remove(), { once: true });
    pixel.addEventListener("error", () => pixel.remove(), { once: true });
    // The official stable pixel API lets us allowlist fields. count.js also sends
    // location.search in a separate `q` field, even when its `path` is overridden.
    pixel.src = trackingPixelUrl(
      settings.dataset.endpoint ?? "",
      settings.dataset.path ?? "/",
      document.title,
      document.referrer,
    );
    document.body.append(pixel);
  };
  if (document.visibilityState === "visible") record();
  else document.addEventListener("visibilitychange", record);
}
