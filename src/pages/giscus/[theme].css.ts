import type { APIRoute } from "astro";
import tokens from "../../styles/tokens.css?raw";
import overrides from "../../styles/giscus.css?raw";

export function getStaticPaths() {
  return ["light", "dark"].map((theme) => ({ params: { theme } }));
}

export const GET: APIRoute = ({ params }) => {
  const theme = params.theme === "dark" ? "dark" : "light";
  return new Response([
    `@import url("https://giscus.app/themes/noborder_${theme}.css");`,
    tokens,
    `:root { color-scheme: ${theme}; }`,
    overrides,
  ].join("\n"), { headers: { "Content-Type": "text/css; charset=utf-8" } });
};
