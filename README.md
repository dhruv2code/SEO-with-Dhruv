# SEO with Dhruv

A local SEO analytics workspace, built in phases from the supplied project brief.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fdhruv2code%2FSEO-with-Dhruv)

**Current milestone: interactive frontend with automatic report import.** Upload a Google Search Console CSV or XLSX export to populate the dashboard with your own keyword and performance data. Synthetic demonstration data is used only when no valid report is active. The app does **not** connect to Google, run FastAPI, or save to SQLite yet. Google connection status remains disconnected; imported reports are not live synchronization.

## Deploy on Render

The repository includes a `render.yaml` Blueprint for a **Static Site**. Click **Deploy to Render** above, sign in, authorise GitHub repository access if requested, and review/create the Blueprint. Render installs frontend dependencies, runs the tests, builds Vite, and publishes `frontend/dist`. The Blueprint pins Node.js 24.19.0 and rewrites client-side routes to `index.html`, so refreshing `/keywords` and the other dashboard pages works.

After the deployment succeeds, use the HTTPS URL shown in your Render dashboard. Subsequent pushes to `main` automatically deploy. No start command or environment secrets are needed for the current browser-based app.

If setting it up manually, select **New → Static Site**, connect `dhruv2code/SEO-with-Dhruv`, and use:

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Root directory | Leave empty (repository root) |
| Build command | `npm --prefix frontend ci --include=dev && npm --prefix frontend test && npm --prefix frontend run build` |
| Publish directory | `frontend/dist` |
| Environment variable | `NODE_VERSION=24.19.0` |
| Rewrite rule | `/*` → `/index.html`, action **Rewrite** |

Uploads, active report selection, tracked keywords, and recommendation statuses remain in each visitor's browser. Localhost browser data does not transfer to the new Render origin: upload your report again on the deployed site. Visitors do not share uploaded reports. This deployment provides the existing dashboard and file importer; Google OAuth, FastAPI, and server-side database storage are still future phases.

References: [Render Static Sites](https://render.com/docs/static-sites), [Blueprint configuration](https://render.com/docs/blueprint-spec), and [Deploy to Render button](https://render.com/docs/deploy-to-render).

## Run locally

Install Node.js 22.12+ (Node.js 24 is also supported), then open this project in VS Code.

In a PowerShell terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open **http://localhost:5173**. The development server binds only to the local computer. `npm.cmd` works on Windows even when PowerShell's execution policy blocks `npm.ps1`. On macOS/Linux use `npm` instead.

To check and build:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

The production preview uses http://127.0.0.1:4173. Stop a server with Ctrl+C. The generated frontend is in `frontend/dist`.

## Phase 1 features

- All nine navigation sections, responsive sidebar, mobile navigation, accessible dialogs, loading skeletons, error and empty states.
- A “Your files” section in Overview: CSV/XLSX performance reports are automatically read and used for keywords, KPIs, available daily charts, pages, opportunities, and recommendations. Existing saved reports are read on load. Other file types remain attachments. Files are stored per website in IndexedDB (20 MB maximum per file), with download and removal controls. Clearing browser site data removes them.
- Eight KPI cards showing current and previous values, percentage changes, and trends; lower average position is treated as an improvement.
- Six selectable performance charts, with daily, weekly, and monthly aggregation.
- Rolling 7-, 28-, and 90-day presets and custom date ranges. Previous periods always have exactly the same number of days. Turn comparison columns and KPI deltas off with Compare.
- Two isolated sample websites, each with 200 days of deterministic synthetic data. The dataset ends three days before the current date to illustrate a reporting delay.
- Searchable and sortable keyword tables, numerical filters, pagination, seven keyword tabs, filtered CSV and real `.xlsx` Excel downloads.
- Branded keyword filtering: open **Keyword Performance** and click **Exclude branded keywords**. Brand terms are detected from the current website domain, spaced name variants, and abbreviations observed alongside the full brand phrase. Click again to restore all keywords. **More options** includes branded-only filtering and optional extra brand terms. Settings are saved per website in the browser, and CSV/Excel exports follow the filter. Automatic detection can be refined with additional spellings; overview metrics and PDF reports describe the full imported report.
- Click any keyword to inspect its average-position history; open its associated sample landing page separately.
- Bookmark keywords or manually add them to tracking. Manually entered terms without observations display “No data”; tracking never fabricates metrics.
- Loss analysis separates position decline, missing visibility, click loss, impression loss, and top-3/10/20 boundary crossings.
- Opportunities for low CTR, positions 4–10, positions 11–20, and high-impression position declines.
- Page performance with search and organic traffic metrics; select a page to inspect its queries.
- Rule-based recommendations with metrics, reason, suggested action, priority, and editable Pending/In Progress/Completed status.
- Google settings show the integration prerequisites and actual disconnected state.

Tracked keywords and recommendation statuses persist in **browser localStorage**, scoped to the sample website. They are not yet database records. The Settings page can clear the selected site's tracking list after confirmation. Browser storage can be cleared by the browser or lost in private browsing. There is no user authentication in Phase 1; the sidebar profile is a demo identity.

The sample domains and landing page paths are illustrative. A sample link may not resolve to a real page. Exports include `demo` or `imported` in their filenames to identify their source.

## Import your Search Console report

1. Export a Performance report from Google Search Console as Excel (`.xlsx`) or CSV.
2. Open Overview and click **Insert files**, or drop the report into **Your files**.
3. The newest valid uploaded report becomes active automatically. Its keywords appear in Overview and Keyword Performance, and its metrics replace the sample metrics throughout the workspace.
4. Uploaded reports persist and load automatically after a browser refresh. If several reports are saved, click **Use report** beside one to switch to it. Different report files are not added together.

Excel workbooks can contain **Queries**, **Pages**, **Dates** (or Chart), Countries, Devices, and Filters sheets. The importer recognises columns, not just sheet names. Queries populate keywords; Pages populate landing pages; Dates supply the timeline and preferred property totals. Countries and Devices are not added to those totals. Query-only totals may omit anonymized queries and are labeled accordingly.

Supported column names include `Top queries`, `Query`, or `Keyword`; `Top pages`, `Page`, or `Landing Page`; `Clicks`; `Impressions`; `Position` or `Average Position`; and optional `Date` in `YYYY-MM-DD` format. Clicks and Impressions are required, along with a query, page, or date dimension. CTR is calculated from clicks and impressions. Invalid rows are skipped with a visible warning; missing positions and landing pages are not invented. CSV supports commas, semicolons, tabs, quoted cells, and UTF-8/UTF-16.

A standard GSC Queries export contains full-period keyword totals, not daily keyword observations. Those totals are shown automatically, but keyword history and ranking changes remain unavailable. If Dates are included, overall daily charts are available. The date range stays on the full export when keyword rows are aggregated. Query-by-date exports support date filtering and equivalent previous-period comparisons when coverage is available.

GSC exports do not contain GA4 traffic or conversion metrics. Those cards show unavailable values when an imported GSC report is active. Sample traffic is never mixed with imported search data. PDF, images, and legacy `.xls` files are attachments; export CSV or `.xlsx` for automatic analytics. Comparison exports with period-prefixed or suffixed columns (for example, `Last 3 months Clicks`) are supported. The importer pairs metrics from the same period, prefers an explicitly current period, and identifies the selected period in the dashboard warnings. Previous-period and difference columns are excluded. A comparison export without daily dates provides totals, keywords, and pages; daily charts require a separate Dates/Chart export.

### Search Console ZIP exports

You can insert the `.zip` file downloaded from Search Console directly into Overview. It is automatically opened in the browser: Queries, Pages, and Chart/Dates CSV files populate keywords, pages, metrics, recommendations, and available charts. Countries and Devices are treated as separate breakdowns and are not added to property totals. ZIP files already saved as attachments are read when the dashboard reloads; manual extraction or re-upload is not required.

ZIP uploads also work in SEO Report Generator. CSVs may be nested in export folders and use UTF-8 or UTF-16. Unsupported/corrupt archives show an import error instead of generating results. Compressed uploads keep the existing 20 MB file limit; ZIP import allows up to 64 CSV entries and 50 MB of expanded CSV content. Files are read in memory, never extracted to a server or filesystem.

## SEO Report Generator

Open **Tools → SEO Report Generator**, or `/report-generator`.

1. Enter the website URL.
2. Upload CSV/XLSX performance data, or select **Use current report** when a real imported report is active in the dashboard. Multiple CSVs may supply one Queries, one Pages, and one Dates export from the same reporting period. A single full GSC Excel export also works.
3. Click **Generate Report** to preview the metrics, charts, top 10 keywords, top 10 pages, up to six prioritised recommendations, reporting period, source files, and methodology.
4. Click **Download PDF** for an A4 report with automatic pagination and page numbers.

The generator never uses demo dashboard data. It prompts for real data when none is available. Missing page/query/date/position fields are explicitly shown as unavailable; it does not invent landing pages, ranking changes, or a reporting period. Known website mismatches and duplicate dimension exports are rejected. Recommendations reuse the existing metric-based rules.

The current app has no active Google OAuth connection, so the GSC source is marked **Not connected** and links to Settings. Uploaded GSC exports and the existing real imported report are supported now; this tool does not add or pretend to provide live Google integration.

Files selected inside the generator are used only for its current preview. They do not replace the dashboard's active source, upload files to a server, or modify tracked keywords and recommendation statuses. PDF creation runs locally. The PDF uses high-resolution rendered report blocks to preserve charts and Unicode keyword text; its report content is image-based rather than selectable text. Tables/recommendations are kept together when paginating. Very large individual blocks scale down to fit A4.

The new route and PDF libraries are loaded on demand. Existing tools, layout, theme, imports, and analytics remain in place. The PDF dependencies are `jspdf` and `html2canvas`; report parsing, charts, icons, controls, and routing reuse the existing stack.

## Code organization

```text
frontend/
  public/favicon.svg
  src/
    charts/                  # Reusable Recharts views
    components/              # KPI cards, tables, date selector, history
      ui/                    # shadcn-style Button and Radix Dialog primitives
    hooks/                   # Derived dashboard data and browser persistence
    layouts/                 # Sidebar, top bar, connection and property context
    lib/                     # Analytics calculations, exports, unit tests
    pages/                   # Overview and all eight feature sections
    services/
      demoData.js            # Explicitly synthetic fixtures, isolated from the API
      reportImport.js        # CSV/XLSX parsing and source-aware report calculations
      files.js               # Browser-local file persistence
      api.js                 # Axios client reserved for FastAPI integration
    App.jsx                  # Route composition and error boundary
    main.jsx
    styles.css
  components.json            # shadcn/ui configuration
  .env.example
  package.json
  vite.config.js
README.md
```

The frontend uses React, Vite, JavaScript, Tailwind CSS 4, shadcn-style UI components with Radix primitives, Recharts, Lucide, React Router, Axios, and lazy-loaded ExcelJS for Excel export. Route modules are loaded on demand. The Axios client is prepared but deliberately makes no calls until the backend exists.

## SEO calculation rules

- CTR is total clicks divided by total impressions, expressed as a percentage. It is not an average of row CTRs.
- Average position is weighted by impressions. A positive displayed position movement means improvement: previous minus current average position.
- A query missing from the current period has no current position. It is labeled Visibility Loss rather than being assigned an invented rank.
- “Declining” means average position worsened by more than 0.5 places. The recommendation rule uses a drop of more than 3 places. Click/impression loss signals use a decline greater than 25%.
- High impressions means more than 1,000 impressions; low CTR means below 2%. These are transparent starting heuristics, not a universal expected CTR model.
- Weekly charts start Monday; partial weeks/months remain visible. CTR and position are recalculated from the underlying observations for each bucket.
- GSC clicks and GA4 sessions measure different things. GA4 never supplies keyword-level GSC queries.
- Sample GA4 users are illustrative daily counts. Their period sums are not a live deduplicated user count. The GA4 integration must request period-level `totalUsers` separately instead of summing daily users.
- No search volume, keyword difficulty, competitor ranking, or predicted uplift is invented.

Google's query privacy thresholds can omit observations, and query/page reports may not reconcile with property totals. The future live integration must retrieve totals separately and disclose partial coverage.

## Next implementation phases

1. **Frontend — implemented here.** Verify with `npm.cmd test` and `npm.cmd run build`.
2. **FastAPI and SQLite.** Add `backend/app` with SQLAlchemy models, constraints, indexes, Pydantic request schemas, and modular routers/services. Include users, websites, tracked keywords, daily observations, recommendations, and synchronization state.
3. **Frontend/API connection.** Replace the demo adapter with explicit live API responses. Keep demo mode isolated. Configure the Axios base URL with `frontend/.env` using the example provided.
4. **GSC OAuth and data.** Implement server-side OAuth state validation, callback, token refresh, property discovery, paginated Search Analytics ingestion, deduplication, and manual sync with honest timestamps and actionable API errors.
5. **GA4 integration.** Add property discovery through the Analytics Admin API and organic reports through the Analytics Data API. Filter `sessionDefaultChannelGroup` to `Organic Search`; handle date and landing-page dimensions and deduplicated period users.
6. **Durable tracking and comparisons.** Persist tracking in SQLite, join current/previous observations, expose history, and handle omitted/anonymized queries and incomplete reports.
7. **Persistent recommendations.** Move the rule engine to backend services; persist statuses without creating duplicates or overwriting completed work on every fetch.
8. **Integration tests.** Test OAuth failure/refresh paths, pagination, quota/permission errors, idempotent sync, exports, joins, period totals, and frontend interactions. A real Google account is required to verify live data.
9. **Full setup documentation.** Document Google Cloud configuration and validated backend launch instructions once those phases exist.

The requested future service addresses are http://localhost:8000 and http://localhost:8000/docs. Those endpoints are not provided by Phase 1. Do not put OAuth client secrets, access tokens, or refresh tokens in `VITE_*` variables, frontend source, or browser storage.

## Verification scope

The automated tests cover equal period boundaries, impression-weighted position/CTR, missing visibility, direction and top-position crossings, weekly aggregation, reconciliation between charts/pages/totals, and spreadsheet-safe CSV escaping.

A production build checks all frontend route imports and JSX compilation.

Phase 1 verification completed:

- All 32 automated tests passed, including brand phrase/abbreviation matching, GSC XLSX/ZIP parsing, comparison column pairing, CSV quoting/encoding and metadata, missing fields, invalid rows, date comparisons, real-data gating, report-source validation, and report generation.
- The production build passed. Vite reports large bundles for charts and ExcelJS; the Excel library is loaded only when Excel export is requested.
- Headless Chrome loaded all ten views, including SEO Report Generator, without uncaught JavaScript exceptions.
- Browser checks confirmed keyword tracking persists across reloads, keyword history opens, recommendation completion persists, and mobile navigation opens/closes.
- File browser checks cover file selection, drag-and-drop, persistence of actual file contents after reload, website isolation, and removal.
- An actual multi-sheet XLSX upload was verified in Chrome: its exact totals, keywords, pages, and opportunities replace the demo; absent GA4 and comparison metrics stay unavailable; the report remains active after reload.
- Report Generator browser checks verified an empty-data prompt, three-file CSV input, exact preview metrics, Unicode queries, a valid multipage PDF download, unchanged dashboard data, the existing imported source, and responsive mobile preview.
- ZIP browser checks verify automatic import and exact totals, keyword display, reload persistence, PDF preview, and recovery of ZIP files previously stored as attachments.
- Desktop routes and the mobile overview had no document-level horizontal overflow. Wide tables scroll inside their containers.
- Desktop (1440px) and mobile (390px) screenshots were generated and visually reviewed.

To rerun the optional browser smoke check after a build on Windows with Chrome installed:

```powershell
node scripts/browser-check.mjs
```

It starts a temporary loopback-only server and a headless Chrome instance with a separate test profile, then stops both. Screenshots and the test profile are saved in the ignored `frontend/.qa` directory. Set `CHROME_PATH` to use another Chromium executable. The checks exercise demo behavior and a generated GSC-style Excel report; live Google integration is not implemented or verified.
