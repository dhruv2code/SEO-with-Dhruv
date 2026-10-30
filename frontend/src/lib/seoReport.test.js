import test from 'node:test';
import assert from 'node:assert/strict';
import { importTables } from '../services/reportImport.js';
import { buildSeoReport, combineSeoReports, websiteURL } from '../services/seoReport.js';

const queries = () => importTables([{ name: 'Queries', rows: [['Query', 'Clicks', 'Impressions', 'Position'], ['finance course', 100, 10000, 6], ['accounting training', 150, 5000, 12]] }], 'Queries.csv');
const pages = () => importTables([{ name: 'Pages', rows: [['Page', 'Clicks', 'Impressions', 'Position'], ['https://reports.example/course', 250, 15000, 8]] }], 'Pages.csv');
const dates = () => importTables([{ name: 'Dates', rows: [['Date', 'Clicks', 'Impressions', 'Position'], ['2026-09-01', 150, 6000, 7], ['2026-09-02', 100, 9000, 8]] }], 'Dates.csv');

test('report generation rejects missing data and explicitly rejects demo sources', () => {
  assert.throws(() => buildSeoReport({ website: 'example.com', report: null }), /No real SEO data/);
  assert.throws(() => buildSeoReport({ website: 'example.com', report: queries(), sourceKind: 'demo' }), /No real SEO data/);
  assert.throws(() => buildSeoReport({ website: 'example.com', report: { records: [{ clicks: 100 }] } }), /No real SEO data/);
});

test('separate CSV dimensions create one accurate report with real charts and recommendations', () => {
  const report = combineSeoReports([queries(), pages(), dates()]);
  const result = buildSeoReport({ website: 'https://reports.example', report, generatedAt: '2026-10-30T06:00:00Z' });
  assert.equal(result.metrics.clicks, 250);
  assert.equal(result.metrics.impressions, 15000);
  assert.ok(Math.abs(result.metrics.ctr - 250 / 15000 * 100) < 1e-10);
  assert.equal(result.metrics.position, 7.6);
  assert.equal(result.keywords[0].query, 'accounting training');
  assert.equal(result.pages[0].page, 'https://reports.example/course');
  assert.equal(result.series.length, 2);
  assert.deepEqual(result.period, { start: '2026-09-01', end: '2026-09-02' });
  assert.ok(result.recommendations.some(row => row.type === 'ctr' && row.query === 'finance course'));
  assert.equal(result.generatedAt, '2026-10-30T06:00:00Z');
});

test('query-only sources never fabricate dates or landing pages', () => {
  const result = buildSeoReport({ website: 'example.com', report: queries() });
  assert.equal(result.period, null);
  assert.deepEqual(result.series, []);
  assert.deepEqual(result.pages, []);
  assert.equal(result.metrics.clicks, 250);
  assert.ok(result.notes.some(note => note.toLowerCase().includes('no daily dates')));
});

test('mixing websites or duplicate dimension exports is rejected', () => {
  assert.throws(() => combineSeoReports([queries(), queries()]), /only one Queries export/);
  const other = importTables([{ name: 'Pages', rows: [['Page', 'Clicks', 'Impressions'], ['https://other.example/', 5, 100]] }]);
  const knownQuery = { ...queries(), siteName: 'reports.example' };
  assert.throws(() => combineSeoReports([knownQuery, other]), /different websites/);
  assert.throws(() => buildSeoReport({ website: 'wrong.example', report: pages() }), /belongs to reports.example/);
});

test('website URLs accept domains and reject scripts or embedded credentials', () => {
  assert.equal(websiteURL('example.com'), 'https://example.com/');
  assert.equal(websiteURL('https://www.example.com/path#section'), 'https://www.example.com/path');
  for (const invalid of ['', 'not a website', 'javascript:alert(1)', 'ftp://example.com', 'https://user:password@example.com']) assert.throws(() => websiteURL(invalid), /valid website URL/);
});

test('only observed page URLs are aggregated from query/page CSV data', () => {
  const report = importTables([{ name: 'Data', rows: [['Query', 'Page', 'Clicks', 'Impressions', 'Position'], ['first', 'https://example.com/page', 5, 50, 4], ['second', 'https://example.com/page', 10, 100, 10]] }]);
  const result = buildSeoReport({ website: 'example.com', report });
  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0].clicks, 15);
  assert.equal(result.pages[0].position, 8);
});

test('reports cap top tables and recommendations without mutating imported data', () => {
  const report = importTables([{ name: 'Queries', rows: [['Query', 'Clicks', 'Impressions', 'Position'], ...Array.from({ length: 20 }, (_, i) => [`keyword ${i}`, i, 2000, 6])] }]);
  const before = JSON.stringify(report);
  const result = buildSeoReport({ website: 'example.com', report });
  assert.equal(result.keywordCount, 20);
  assert.equal(result.keywords.length, 10);
  assert.equal(result.recommendations.length, 6);
  assert.equal(JSON.stringify(report), before);
});
