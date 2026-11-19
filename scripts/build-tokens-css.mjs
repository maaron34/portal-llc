// Writes design-system/tokens.css from design-system/tokens.json.
// Run: node scripts/build-tokens-css.mjs
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../design-system/", import.meta.url);
const tokens = JSON.parse(readFileSync(new URL("tokens.json", dir), "utf8"));
const css = (v) => (typeof v === "string" ? v.replace(/\{([^}]+)\}/g, "var(--$1)") : v);
const [first, ...rest] = tokens.color.themes.map((t) => t.id);

const colorBlock = (theme) =>
  tokens.color.tokens
    .filter((t) => theme === first || (typeof t.value === "object" && t.value[theme]))
    .map((t) => `  --${t.name}: ${css(typeof t.value === "string" ? t.value : t.value[theme] ?? t.value[first])};`)
    .join("\n");

const other = ["spacing", "radius", "duration", "opacity"]
  .flatMap((fam) => (tokens[fam]?.tokens ?? []).map((t) => `  --${t.name}: ${t.value};`))
  .concat(Object.entries(tokens.type.families).map(([k, v]) => `  --font-${k}: ${v};`))
  .join("\n");

let out = `/* Portal - generated from tokens.json by scripts/build-tokens-css.mjs. Do not edit by hand. */\n`;
out += `:root, [data-theme="${first}"] {\n${colorBlock(first)}\n}\n`;
for (const theme of rest) out += `[data-theme="${theme}"] {\n${colorBlock(theme)}\n  color-scheme: dark;\n}\n`;
out += `:root {\n${other}\n}\n`;
writeFileSync(new URL("tokens.css", dir), out);
console.log("wrote design-system/tokens.css");
