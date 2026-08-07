import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const TODAY = process.argv[2] || new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Singapore",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const PROJECT = "advance-rush-406115";
const USD_TO_RMB = 6.9;
const MARKET_GMV_TO_RMB = { Indonesia: USD_TO_RMB, Malaysia: 1.65 };
const dashboardPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "index.html");

const query = `
SELECT
  CAST(date_start AS STRING) AS date_start,
  time_segment,
  country,
  SUM(spend) AS spend,
  SUM(purchase_value) AS purchase_value,
  SUM(impressions) AS impressions,
  SUM(inline_link_clicks) AS clicks,
  SUM(purchase_times) AS purchases
FROM \`dim_meta_ads_performance.stg_np_hourlydata_clean\`
WHERE date_start = '${TODAY}'
  AND country IN ('Indonesia', 'Malaysia')
GROUP BY 1, 2, 3
ORDER BY 2, 3`;

const executable = process.platform === "win32" ? "cmd.exe" : "bq";
const args = [
  "query",
  `--project_id=${PROJECT}`,
  "--use_legacy_sql=false",
  "--format=json",
];
if (process.platform === "win32") args.unshift("/d", "/s", "/c", "bq.cmd");
const raw = execFileSync(executable, args, {
  input: query,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
const sourceRows = JSON.parse(raw);
if (!sourceRows.length) throw new Error(`No Meta hourly rows found for ${TODAY}`);

const dashboardRows = sourceRows.map((row) => {
  const hour = Number(row.time_segment.slice(0, 2)) + 1;
  const country = row.country;
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);
  return {
    date: TODAY,
    month: TODAY.slice(0, 7),
    country,
    hour,
    offsite_spend: Number(row.spend || 0) * USD_TO_RMB,
    offsite_gmv: Number(row.purchase_value || 0) * MARKET_GMV_TO_RMB[country],
    offsite_impressions: impressions,
    offsite_clicks: clicks,
    offsite_conversions: Number(row.purchases || 0),
    onsite_spend_rmb: 0,
    conversion_base: 0,
    conversion_users: 0,
    onsite_page_views: 0,
    add_to_cart_users: 0,
    add_to_cart_rate: 0,
    onsite_conversion_rate: 0,
    onsite_gmv_rmb: 0,
  };
});

let html = readFileSync(dashboardPath, "utf8");
const match = html.match(/    const REPORT_DATA = (.*);\r?\n/);
if (!match) throw new Error("REPORT_DATA was not found in index.html");
const report = JSON.parse(match[1]);
report.rows = report.rows.filter((row) => row.date !== TODAY).concat(dashboardRows);

const label = `${Number(TODAY.slice(5, 7))}.${Number(TODAY.slice(8, 10))}`;
const latestPreviousDate = [...new Set(report.rows.map((row) => row.date))]
  .filter((date) => date < TODAY)
  .sort()
  .at(-1);
for (const country of ["ALL", "Indonesia", "Malaysia"]) {
  report.period_contexts[country] = {
    report_month: TODAY.slice(0, 7),
    report_month_label: `${Number(TODAY.slice(5, 7))}月`,
    current_date: TODAY,
    current_date_label: label,
    default_compare_date: latestPreviousDate,
    default_compare_date_label: `${Number(latestPreviousDate.slice(5, 7))}.${Number(latestPreviousDate.slice(8, 10))}`,
  };
  const currentOptions = report.current_date_options[country].filter((option) => option.value !== TODAY);
  report.current_date_options[country] = [{ value: TODAY, label }, ...currentOptions];
  report.compare_date_options[country] = currentOptions;
}

html = html.replace(match[0], `    const REPORT_DATA = ${JSON.stringify(report)};\n`);
writeFileSync(dashboardPath, html, "utf8");

const maxHour = Math.max(...dashboardRows.map((row) => row.hour));
console.log(JSON.stringify({ date: TODAY, rows: dashboardRows.length, maxHour, countries: [...new Set(dashboardRows.map((row) => row.country))] }));
