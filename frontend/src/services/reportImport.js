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
  const separator = text.match(/^sep=([,;\t])\r?\n/i);
  if (separator) text = text.slice(separator[0].length);
  // Metadata can precede the header. Inspect actual header fields rather than
  // guessing from commas in a report title or inside quoted values.
  const lines = text.split(/\r?\n/, 20).filter(value => value.trim());
  const candidates = [',', ';', '\t'].map(delimiter => {
    let score = 0;
    for (const line of lines) {
      const fields = line.split(new RegExp(`${delimiter === '\t' ? '\t' : delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`)).map(value => value.replace(/^\"|\"$/g, ''));
      const map = headerMap(fields);
      const supported = map.clicks >= 0 && map.impressions >= 0 && (map.query >= 0 || map.page >= 0 || map.date >= 0);
      score = Math.max(score, supported ? 10000 + fields.length : fields.length);
    }
    return { delimiter, score };
  });
  const delimiter = separator?.[1] || candidates.sort((a, b) => b.score - a.score)[0].delimiter;
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
  const exact = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, row.findIndex(value => names.some(name => key(name) === key(value)))]));
  if (exact.clicks >= 0 && exact.impressions >= 0) return exact;
  // Comparison exports attach the period to each metric. Pair metrics only
  // when their period labels agree; never import a Difference column as traffic.
  const periods = new Map();
  row.forEach((value, index) => {
    const heading = String(value ?? '').trim();
    if (/\b(difference|diff|delta|change)\b|%/i.test(heading)) return;
    for (const field of ['clicks', 'impressions', 'position']) {
      for (const alias of [...aliases[field]].sort((a, b) => b.length - a.length)) {
        const match = heading.match(new RegExp(`^(.*?)\\b${alias.replace(/ /g, '\\s+')}\\b(.*?)$`, 'i'));
        if (!match) continue;
        const label = `${match[1]} ${match[2]}`.replace(/[()[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!label) break;
        const id = key(label);
        if (!periods.has(id)) periods.set(id, { label });
        const period = periods.get(id);
        if (period[field] === undefined) period[field] = index;
        break;
      }
    }
  });
  const complete = [...periods.values()].filter(period => period.clicks !== undefined && period.impressions !== undefined);
  // Prefer an explicitly current period even when the previous period comes first.
  const priority = label => /\b(previous|prior)\b/i.test(label) ? 2 : /\b(current|latest|last)\b/i.test(label) ? 0 : 1;
  complete.sort((a, b) => priority(a.label) - priority(b.label));
  const selected = complete[0];
  return selected ? { ...exact, clicks: selected.clicks, impressions: selected.impressions, position: selected.position ?? -1, period: selected.label } : exact;
}

export function importTables(tables, filename = 'report') {
  const queryRows = [], pageRows = [], dateRows = [], warnings = [], diagnostics = [];
  for (const { name, rows } of tables) {
    let headerIndex = -1, columns;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const map = headerMap(rows[i]);
      if (map.clicks >= 0 && map.impressions >= 0 && (map.query >= 0 || map.page >= 0 || map.date >= 0)) { headerIndex = i; columns = map; break; }
    }
    if (headerIndex < 0) {
      const candidate = rows.slice(0, 20).find(row => { const map = headerMap(row); return map.query >= 0 || map.page >= 0 || map.date >= 0; }) || rows[0];
      if (candidate) diagnostics.push(`${name}: headings ${candidate.slice(0, 12).map(value => String(value ?? '').slice(0, 100)).join(' | ')}`);
      continue; // Countries/devices/filters are separate dimensions, not additional traffic.
    }
    if (columns.period) warnings.push(`${name}: showing ${columns.period}. Other comparison periods and difference columns are excluded.`);
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
    diagnostics.push(`${name}: recognized headings; ${skipped} invalid rows skipped.`);
  }
  if (!queryRows.length && !pageRows.length && !dateRows.length) throw new Error(`No supported performance rows found. Use a GSC export with Clicks, Impressions, and Query/Top queries, Page/Top pages, or Date. ${diagnostics.slice(0, 3).join(' ')}`);
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

export const isPerformanceFile = name => /\.(csv|xlsx|zip)$/i.test(name);

function decodeReportText(bytes) {
  // Some spreadsheet exports omit the UTF-16 BOM. ASCII header characters
  // alternating with NUL bytes still identify the byte order reliably.
  const sample = bytes.slice(0, 200);
  const oddNulls = sample.filter((byte, index) => index % 2 === 1 && byte === 0).length;
  const evenNulls = sample.filter((byte, index) => index % 2 === 0 && byte === 0).length;
  const encoding = bytes[0] === 255 && bytes[1] === 254 || oddNulls > sample.length / 4 ? 'utf-16le' : bytes[0] === 254 && bytes[1] === 255 || evenNulls > sample.length / 4 ? 'utf-16be' : 'utf-8';
  return new TextDecoder(encoding).decode(bytes);
}

// Read archive entries in bounded chunks. Nothing is extracted to the filesystem.
function readCsvEntry(entry, budget) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, stopped = false;
    const stream = entry.internalStream('uint8array');
    stream.on('data', chunk => {
      if (stopped) return;
      size += chunk.length;
      if (size > budget) {
        stopped = true; stream.pause();
        reject(new Error('This ZIP expands beyond the 50 MB import limit. Export a smaller reporting period.'));
      } else chunks.push(chunk);
    });
    stream.on('error', error => { if (!stopped) { stopped = true; reject(error); } });
    stream.on('end', () => {
      if (stopped) return;
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      resolve(bytes);
    });
    stream.resume();
  });
}

async function parseZipReport(file) {
  const { default: JSZip } = await import('jszip');
  let archive;
  try { archive = await JSZip.loadAsync(await file.blob.arrayBuffer()); }
  catch { throw new Error('This ZIP could not be read. Upload an unencrypted Search Console ZIP export, or export it again.'); }
  const entries = Object.values(archive.files).filter(entry => !entry.dir && /\.csv$/i.test(entry.name) && !entry.name.startsWith('__MACOSX/') && !entry.name.split('/').at(-1).startsWith('._'));
  if (!entries.length) throw new Error('No CSV files were found inside this ZIP. Upload the ZIP exported by Search Console, or a CSV/XLSX performance report.');
  if (entries.length > 64) throw new Error('This ZIP contains too many CSV files. Upload one Search Console export at a time.');
  const tables = []; let budget = 50 * 1024 * 1024;
  for (const entry of entries) {
    let bytes;
    try { bytes = await readCsvEntry(entry, budget); }
    catch (error) { throw new Error(`Could not read ${entry.name}: ${error.message || 'export the ZIP again.'}`); }
    budget -= bytes.length;
    try { tables.push({ name: entry.name, rows: parseCSV(decodeReportText(bytes)) }); }
    catch (error) { throw new Error(`${entry.name}: ${error.message}`); }
  }
  // Use the same multi-dimension logic as Excel: query, page, and date reports
  // remain independent, so Countries/Devices do not inflate property totals.
  return importTables(tables, file.name);
}

export async function parseReportFile(file) {
  if (/\.zip$/i.test(file.name)) return parseZipReport(file);
  if (/\.csv$/i.test(file.name)) {
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    return importTables([{ name: file.name, rows: parseCSV(decodeReportText(bytes)) }], file.name);
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
  throw new Error('Automatic analytics supports .csv, .xlsx, and Search Console .zip exports. Other files remain downloadable attachments.');
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
