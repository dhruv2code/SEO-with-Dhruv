import { summarize, compareKeywords, previousRange, inRange, groupTime, recommendations, getPages } from '../lib/analytics.js';

const key = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
  query: ['query', 'queries', 'top queries', 'keyword', 'keywords', 'search query'],
  page: ['page', 'pages', 'top pages', 'landing page', 'landing page url', 'url'],
  date: ['date', 'day'], clicks: ['clicks', 'total clicks'], impressions: ['impressions', 'total impressions'],
  position: ['position', 'average position', 'avg position'],
};

// CSV with quoted delimiters, escaped quotes, embedded newlines, BOM and CRLF.
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const line = text.split(/\r?\n/).find(value => value.trim() && !value.startsWith('#')) || '';
  const delimiter = [',', ';', '\t'].sort((a, b) => line.split(b).length - line.split(a).length)[0];
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('Unclosed quote in CSV. Export the report as CSV again.');
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const text = String(value ?? '').trim().replace(/[\s,]/g, '');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value) {
  if (value instanceof Date) return Number.isNaN(+value) ? null : value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000 && value < 100000) return new Date(Math.round((value - 25569) * 86400000)).toISOString().slice(0, 10);
  const text = String(value ?? '').trim();
  const normalized = /^\d{8}$/.test(text) ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6)}` : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00Z`);
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === normalized ? normalized : null;
}

function validURL(value) {
  try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

function headerMap(row) {
  return Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, row.findIndex(value => names.some(name => key(name) === key(value)))]));
}

export function importTables(tables, filename = 'report') {
  const queryRows = [], pageRows = [], dateRows = [], warnings = [];
  for (const { name, rows } of tables) {
    let headerIndex = -1, columns;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const map = headerMap(rows[i]);
      if (map.clicks >= 0 && map.impressions >= 0 && (map.query >= 0 || map.page >= 0 || map.date >= 0)) { headerIndex = i; columns = map; break; }
    }
    if (headerIndex < 0) continue; // Countries/devices/filters are separate dimensions, not additional traffic.
    const destination = columns.query >= 0 ? queryRows : columns.page >= 0 ? pageRows : dateRows;
    let skipped = 0;
    for (const row of rows.slice(headerIndex + 1)) {
      if (!row.some(value => value !== null && value !== undefined && value !== '')) continue;
      const clicks = numeric(row[columns.clicks]), impressions = numeric(row[columns.impressions]);
      const position = columns.position >= 0 ? numeric(row[columns.position]) : null;
      const date = columns.date >= 0 ? dateValue(row[columns.date]) : null;
      const query = columns.query >= 0 ? String(row[columns.query] ?? '').trim() : '';
      const page = columns.page >= 0 ? validURL(row[columns.page]) : '';
      if (clicks === null || impressions === null || (columns.date >= 0 && !date) || (columns.query >= 0 && !query) || (columns.query < 0 && columns.page >= 0 && !page)) { skipped++; continue; }
      destination.push({ clicks, impressions, position: position > 0 ? position : null, date, query, page });
    }
    if (skipped) warnings.push(`${name}: skipped ${skipped} rows with missing or invalid metrics, dates, or URLs.`);
  }
  if (!queryRows.length && !pageRows.length && !dateRows.length) throw new Error('No supported performance rows found. Use a GSC CSV/XLSX export with Clicks, Impressions, and a Query/Top queries, Page/Top pages, or Date column.');
  // Exact duplicate rows within a report are ignored; independent dimensions remain separate.
  const dedupe = rows => [...new Map(rows.map(row => [JSON.stringify(row), row])).values()];
  const dates = [...queryRows, ...pageRows, ...dateRows].map(row => row.date).filter(Boolean).sort();
  const aggregateQueries = queryRows.some(row => !row.date);
  const range = dates.length ? { start: dates[0], end: dates.at(-1) } : null;
  if (aggregateQueries) warnings.push('Keywords are totals for the full exported report. Daily keyword history and previous-period rankings are not included.');
  if (!dates.length) warnings.push('No daily dates were included. Performance totals are available; time-series charts require a Dates sheet or Date column.');
  if (!queryRows.length) warnings.push('No Queries sheet was included. Export Queries from Search Console to see keywords.');
  const siteURL = [...pageRows, ...queryRows].find(row => row.page)?.page;
  const siteName = siteURL ? new URL(siteURL).hostname : filename.match(/^(.+?\.[a-z]{2,})-Performance/i)?.[1] || null;
  return { filename, siteName, queryRows: dedupe(queryRows), pageRows: dedupe(pageRows), dateRows: dedupe(dateRows), range, aggregateQueries, warnings };
}

function cellValue(cell) {
  const value = cell.value;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if ('result' in value) return value.result; // Never evaluate spreadsheet formulas.
    if (value.richText) return value.richText.map(part => part.text).join('');
    if (value.text) return value.text;
  }
  return value;
}

export async function parseReportFile(file) {
  if (/\.csv$/i.test(file.name)) {
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    const encoding = bytes[0] === 255 && bytes[1] === 254 ? 'utf-16le' : bytes[0] === 254 && bytes[1] === 255 ? 'utf-16be' : 'utf-8';
    return importTables([{ name: file.name, rows: parseCSV(new TextDecoder(encoding).decode(bytes)) }], file.name);
  }
  if (/\.xlsx$/i.test(file.name)) {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(await file.blob.arrayBuffer()); }
    catch { throw new Error('This Excel file could not be read. Use an unencrypted .xlsx export from Search Console.'); }
    const tables = workbook.worksheets.map(sheet => {
      const rows = [];
      sheet.eachRow(row => { const values = []; row.eachCell({ includeEmpty: true }, (cell, index) => { values[index - 1] = cellValue(cell); }); rows.push(values); });
      return { name: sheet.name, rows };
    });
    return importTables(tables, file.name);
  }
  throw new Error('Automatic analytics supports .csv and .xlsx performance reports. Other files remain downloadable attachments.');
}

export const missingMetrics = () => ({ clicks: null, impressions: null, ctr: null, position: null, sessions: null, users: null, engaged: null, conversions: null });
const gscSummary = rows => {
  const totals = summarize(rows);
  return { ...totals, ctr: totals.impressions ? totals.ctr : null, sessions: null, users: null, engaged: null, conversions: null };
};

function aggregateKeywords(rows) {
  const queries = new Map();
  rows.forEach(row => { if (!queries.has(row.query)) queries.set(row.query, []); queries.get(row.query).push(row); });
  return [...queries].map(([query, records]) => ({
    query, ...gscSummary(records), page: records.find(row => row.page)?.page || '',
    previousPosition: null, previousClicks: null, previousImpressions: null,
    change: null, clickChange: null, impressionChange: null, status: 'Imported', flags: [],
  }));
}

export function deriveReport(report, range, interval) {
  const allRange = !report.range || report.aggregateQueries;
  const filter = rows => allRange ? rows : rows.filter(row => !row.date || inRange(row.date, range));
  const queryRows = filter(report.queryRows), pageRows = filter(report.pageRows);
  const seriesRows = report.dateRows.length ? report.dateRows : report.queryRows.some(row => row.date) ? report.queryRows : report.pageRows.filter(row => row.date);
  const totalRows = report.dateRows.length ? filter(report.dateRows) : queryRows.length ? queryRows : pageRows;
  const previous = previousRange(range);
  const comparisonAvailable = !!report.range && !report.aggregateQueries && report.range.start <= previous.start && report.range.end >= range.end;
  const keywords = comparisonAvailable ? compareKeywords(report.queryRows, range) : aggregateKeywords(queryRows);
  const totalsSource = report.dateRows.length ? 'Dates sheet' : queryRows.length ? 'exported query rows (partial query coverage possible)' : 'exported page rows';
  const current = totalRows.length ? gscSummary(totalRows) : missingMetrics();
  const prior = comparisonAvailable ? gscSummary(seriesRows.filter(row => inRange(row.date, previous))) : missingMetrics();
  const pages = report.pageRows.length
    ? [...new Set(pageRows.map(row => row.page))].map(page => ({ page, ...gscSummary(pageRows.filter(row => row.page === page)), change: null, clickChange: null, impressionChange: null }))
    : getPages(report.queryRows.filter(row => row.page && row.date), [], range).map(row => ({ ...row, sessions: null, users: null, conversions: null }));
  return {
    current, prior, previous, comparisonAvailable, keywords, pages, totalsSource,
    series: report.range ? groupTime(seriesRows, [], allRange ? report.range : range, interval).map(row => ({ ...row, sessions: null, users: null, engaged: null, conversions: null })) : [],
    recommendations: recommendations(keywords, current, prior),
  };
}
