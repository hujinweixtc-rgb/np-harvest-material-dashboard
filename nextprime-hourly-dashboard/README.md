# Hourly Alignment Review Copy

Standalone copy of the public NEXT PRIME hourly onsite/offsite alignment review.

## Run locally

```powershell
npm run serve
```

## Refresh from the public source

```powershell
npm run sync
```

The source page is a self-contained HTML application. Its CSS, interaction code,
ECharts configuration, and current `REPORT_DATA` payload are embedded in
`index.html`; it does not call a public data API at runtime.

## Verified data lineage

- Public snapshot source: `https://nextprime-review.pages.dev/hourly-alignment-review`
- Meta hourly table documented in the local repository:
  `advance-rush-406115.dim_meta_ads_performance.raw_np_hourlydata_ads`
- Documented temporary field rule: `add_to_cart_value` is interpreted as
  `add_to_cart_times`; add-to-cart rate is `add_to_cart_value / inline_link_clicks`.

The private report generator, Shopee source configuration, BigQuery credentials,
and deployment credentials are not exposed by the public page or repository.
`scripts/sync-source.mjs` therefore refreshes the complete verified public build
instead of inventing an unverifiable direct warehouse query.
