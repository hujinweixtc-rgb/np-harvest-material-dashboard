import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://nextprime-review.pages.dev/hourly-alignment-review";
const outputPath = fileURLToPath(new URL("../index.html", import.meta.url));

const response = await fetch(SOURCE_URL, {
  headers: { "user-agent": "hourly-alignment-review-copy/1.0" },
});

if (!response.ok) {
  throw new Error(`Source request failed: ${response.status} ${response.statusText}`);
}

const sourceHtml = await response.text();
if (!sourceHtml.includes("const REPORT_DATA =") || !sourceHtml.includes("echarts")) {
  throw new Error("Source validation failed: expected report data or chart runtime is missing");
}

const html = sourceHtml
  .replace(
    "<head>",
    '<head>\n  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2212%22 fill=%22%23111%22/><path d=%22M17 45V19h7l16 16V19h7v26h-7L24 29v16z%22 fill=%22white%22/></svg>">',
  )
  .replace(/\s*\.floating-home-link(?::hover)?\s*\{[^}]*\}/g, "")
  .replace(/\s*<a class="floating-home-link"[^>]*>[^<]*<\/a>/, "");

await writeFile(outputPath, html, "utf8");
console.log(`Synced ${html.length.toLocaleString()} characters from ${SOURCE_URL}`);
