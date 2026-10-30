import { deriveReport } from './reportImport.js';

export function websiteURL(value) {
  const text = String(value || '').trim();
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error();
    url.hash = '';
    return url.href;
  } catch {
    throw new Error('Enter a valid website URL, for example https://example.com.');
  }
}

// Multiple CSV files may represent separate dimensions of the SAME GSC report.
// Never add two independent query exports or mix different websites silently.
export function combineSeoReports(reports) {
  if (!reports.length) throw new Error('Upload SEO data or select an existing report first.');
  for (const [dimension, label] of [['queryRows', 'Queries'], ['pageRows', 'Pages'], ['dateRows', 'Dates']]) {
    if (reports.filter(report => report[dimension].length).length > 1) throw new Error(`Choose only one ${label} export for the reporting period to avoid counting the same data twice.`);
  }
  const sites = [...new Set(reports.map(report => report.siteName?.replace(/^www\./, '')).filter(Boolean))];
  if (sites.length > 1) throw new Error('These files refer to different websites. Choose exports for one website.');
  const queryRows = reports.flatMap(report => report.queryRows);
  const pageRows = reports.flatMap(report => report.pageRows);
  const dateRows = reports.flatMap(report => report.dateRows);
  const dates = [...queryRows, ...pageRows, ...dateRows].map(row => row.date).filter(Boolean).sort();
  const warnings = reports.flatMap(report => report.warnings.filter(warning => /skipped \d+ rows/.test(warning)));
  const aggregateQueries = queryRows.some(row => !row.date);
  if (aggregateQueries) warnings.push('Keyword rows are full-period totals. Daily keyword history and previous-period ranking changes are not included.');
  if (!dates.length) warnings.push('The source contains no daily dates. The reporting period and time-series charts are unavailable.');
  if (!queryRows.length) warnings.push('Query-level data was not included. Top keywords are unavailable.');
  return {
    filename: reports.map(report => report.filename).join(', '),
    siteName: sites[0] || null, queryRows, pageRows, dateRows, aggregateQueries, warnings,
    range: dates.length ? { start: dates[0], end: dates.at(-1) } : null,
  };
}

export function buildSeoReport({ website, report, range, sourceKind = 'upload', generatedAt = new Date().toISOString() }) {
  if (!['upload', 'imported', 'gsc'].includes(sourceKind) || !report || !['queryRows', 'pageRows', 'dateRows'].some(key => report[key]?.length)) {
    throw new Error('No real SEO data is available. Upload a CSV/XLSX report or connect Google Search Console.');
  }
  const url = websiteURL(website);
  if (report.siteName && new URL(url).hostname.replace(/^www\./, '') !== report.siteName.toLowerCase().replace(/^www\./, '')) {
    throw new Error(`This data belongs to ${report.siteName}. Enter that website URL or choose its matching report.`);
  }
  // The shared calculator needs bounds even for aggregate rows; no artificial
  // dates are displayed or assigned to observations when the file lacks dates.
  const today = generatedAt.slice(0, 10);
  const period = report.aggregateQueries ? report.range : range || report.range;
  if (period && (period.start > period.end || report.range && (period.start < report.range.start || period.end > report.range.end))) throw new Error('The selected period is outside the report data.');
  const analysis = deriveReport(report, period || { start: today, end: today }, 'daily');
  const rank = (left, right) => right.clicks - left.clicks || right.impressions - left.impressions;
  let pages = analysis.pages;
  if (!pages.length && report.queryRows.some(row => row.page)) {
    const urls = [...new Set(report.queryRows.map(row => row.page).filter(Boolean))];
    pages = urls.map(page => {
      const rows = report.queryRows.filter(row => row.page === page);
      const clicks = rows.reduce((sum, row) => sum + row.clicks, 0), impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
      const positioned = rows.filter(row => row.position !== null);
      const weight = positioned.reduce((sum, row) => sum + row.impressions, 0);
      return { page, clicks, impressions, ctr: impressions ? clicks / impressions * 100 : null, position: weight ? positioned.reduce((sum, row) => sum + row.position * row.impressions, 0) / weight : null };
    });
  }
  const keywords = [...analysis.keywords].sort(rank);
  const topPages = [...pages].sort(rank);
  return {
    website: url, hostname: new URL(url).hostname, generatedAt, period,
    sourceKind, sourceName: report.filename, totalsSource: analysis.totalsSource,
    metrics: { clicks: analysis.current.clicks, impressions: analysis.current.impressions, ctr: analysis.current.ctr, position: analysis.current.position },
    keywordCount: keywords.length, pageCount: pages.length,
    keywords: keywords.slice(0, 10), pages: topPages.slice(0, 10),
    series: analysis.series, recommendations: analysis.recommendations.slice(0, 6),
    notes: [...new Set([...report.warnings,
      'Average position is an impression-weighted GSC observation, not a fixed keyword rank.',
      'GSC query exports can omit anonymized queries. Query totals may differ from property totals.',
      'Recommendations are rule-based suggestions from the supplied metrics, not a technical crawl or a guarantee of improvement.',
    ])],
  };
}
