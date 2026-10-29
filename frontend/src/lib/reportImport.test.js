import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseCSV, importTables, parseReportFile, deriveReport } from '../services/reportImport.js';

test('CSV handles BOM, escaped quotes, commas and newlines inside queries', () => {
  const rows = parseCSV('\uFEFFTop queries,Clicks,Impressions,CTR,Position\r\n"seo, \"\"india\"\"\nconsultant",42,"1,200",3.5%,4.2');
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'seo, "india"\nconsultant');
  const report = importTables([{ name: 'Queries', rows }]);
  const result = deriveReport(report, { start: '2026-01-01', end: '2026-01-28' }, 'daily');
  assert.equal(result.keywords[0].clicks, 42);
  assert.equal(result.keywords[0].impressions, 1200);
  assert.equal(result.keywords[0].ctr, 3.5000000000000004);
  assert.equal(result.series.length, 0);
  assert.equal(result.comparisonAvailable, false);
  assert.equal(result.current.sessions, null);
  assert.equal(result.keywords[0].page, '');
});

test('GSC XLSX export reads Queries, Pages and Dates without adding dimensions together', async () => {
  const workbook = new ExcelJS.Workbook();
  const add = (name, rows) => { const sheet = workbook.addWorksheet(name); rows.forEach(row => sheet.addRow(row)); };
  add('Queries', [['Top queries', 'Clicks', 'Impressions', 'CTR', 'Position'], ['accounting course', 100, 2000, 0.05, 6], ['finance training', 50, 1000, 0.05, 12]]);
  add('Pages', [['Top pages', 'Clicks', 'Impressions', 'CTR', 'Position'], ['https://thewallstreetschool.com/course', 160, 3200, 0.05, 8]]);
  add('Dates', [['Date', 'Clicks', 'Impressions', 'CTR', 'Position'], ['2026-09-01', 80, 1600, 0.05, 7], ['2026-09-02', 100, 2000, 0.05, 8]]);
  add('Countries', [['Country', 'Clicks', 'Impressions'], ['India', 180, 3600]]);
  add('Devices', [['Device', 'Clicks', 'Impressions'], ['Mobile', 180, 3600]]);
  add('Filters', [['Filter', 'Value'], ['Search type', 'Web']]);
  const report = await parseReportFile({ name: 'thewallstreetschool.com-Performance-on-Search.xlsx', blob: new Blob([await workbook.xlsx.writeBuffer()]) });
  const result = deriveReport(report, report.range, 'daily');
  assert.equal(report.siteName, 'thewallstreetschool.com');
  assert.equal(result.current.clicks, 180);
  assert.equal(result.current.impressions, 3600);
  assert.equal(result.keywords.length, 2);
  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0].clicks, 160);
  assert.equal(result.series.length, 2);
  assert.equal(result.current.position, (7 * 1600 + 8 * 2000) / 3600);
  assert.equal(result.keywords[0].previousPosition, null);
  assert.equal(result.keywords[0].change, null);
  assert.equal(result.pages[0].sessions, null);
  assert.equal(result.comparisonAvailable, false);
  assert.ok(result.recommendations.some(row => row.query === 'accounting course'));
});

test('missing positions, missing URLs and missing GA4 metrics stay unavailable', () => {
  const report = importTables([{ name: 'Queries', rows: [['Keyword', 'Clicks', 'Impressions'], ['example', 10, 100]] }]);
  const result = deriveReport(report, { start: '2026-01-01', end: '2026-01-28' }, 'daily');
  assert.equal(result.current.position, null);
  assert.equal(result.keywords[0].position, null);
  assert.deepEqual(result.pages, []);
  assert.equal(result.current.users, null);
});

test('invalid numbers and dates are skipped with visible warnings', () => {
  const report = importTables([{ name: 'Dates', rows: [['Date', 'Clicks', 'Impressions'], ['2026-02-30', 10, 100], ['2026-03-01', -4, 100], ['2026-03-02', 5, 100]] }]);
  assert.equal(report.dateRows.length, 1);
  assert.match(report.warnings.join(' '), /skipped 2 rows/);
});

test('query-by-date files support equivalent comparisons when coverage exists', () => {
  const report = importTables([{ name: 'Data', rows: [['Date', 'Query', 'Clicks', 'Impressions', 'Position'], ['2026-10-01', 'keyword', 10, 100, 9], ['2026-10-02', 'keyword', 20, 100, 5]] }]);
  const result = deriveReport(report, { start: '2026-10-02', end: '2026-10-02' }, 'daily');
  assert.equal(result.comparisonAvailable, true);
  assert.equal(result.keywords[0].change, 4);
  assert.equal(result.prior.clicks, 10);
  assert.equal(result.current.clicks, 20);
});

test('semicolon separated reports, repeated rows and UTF-16 CSV are handled', async () => {
  const text = 'Query;Clicks;Impressions;Position\nexample;10;200;4\nexample;10;200;4';
  const buffer = Buffer.concat([Buffer.from([255, 254]), Buffer.from(text, 'utf16le')]);
  const report = await parseReportFile({ name: 'queries.csv', blob: new Blob([buffer]) });
  assert.equal(report.queryRows.length, 1);
  assert.equal(report.queryRows[0].clicks, 10);
});

test('unrecognised data and damaged spreadsheets produce actionable import errors', async () => {
  assert.throws(() => importTables([{ name: 'notes', rows: [['name', 'value'], ['abc', 1]] }]), /No supported performance rows/);
  await assert.rejects(parseReportFile({ name: 'broken.xlsx', blob: new Blob(['broken']) }), /could not be read/);
  assert.throws(() => parseCSV('Query,Clicks\n"unclosed,4'), /Unclosed quote/);
});
