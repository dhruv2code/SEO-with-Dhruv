import test from 'node:test';
import assert from 'node:assert/strict';
import { compareKeywords, previousRange, summarize, recommendations, groupTime, getPages } from './analytics.js';
import { csvCell } from './export.js';
import { addDays, createDemoData, demoSites, latestDate } from '../services/demoData.js';

test('comparison periods have equal length across leap days and year boundaries', () => {
  assert.deepEqual(previousRange({ start: '2024-03-01', end: '2024-03-28' }), { start: '2024-02-02', end: '2024-02-29' });
  assert.deepEqual(previousRange({ start: '2026-01-01', end: '2026-01-07' }), { start: '2025-12-25', end: '2025-12-31' });
});
test('CTR and position are calculated from totals and impression weights', () => {
  const result = summarize([{ clicks: 10, impressions: 100, position: 2 }, { clicks: 18, impressions: 900, position: 10 }]);
  assert.ok(Math.abs(result.ctr - 2.8) < 1e-10);
  assert.equal(result.position, 9.2);
  assert.equal(summarize([]).position, null);
});
test('missing observations are labeled visibility loss with no fabricated current position', () => {
  const rows = [{ date: '2026-01-01', query: 'test', page: 'https://example.com', clicks: 5, impressions: 50, position: 3 }];
  const [keyword] = compareKeywords(rows, { start: '2026-01-02', end: '2026-01-02' });
  assert.equal(keyword.status, 'Visibility Loss');
  assert.equal(keyword.position, null);
  assert.equal(keyword.change, null);
  assert.equal(keyword.previousClicks, 5);
  assert.ok(keyword.flags.includes('Visibility Loss'));
});
test('position movement and top-three crossing use the correct sign', () => {
  const rows = [
    { date: '2026-01-01', query: 'test', page: 'https://example.com', clicks: 10, impressions: 100, position: 2 },
    { date: '2026-01-02', query: 'test', page: 'https://example.com', clicks: 3, impressions: 100, position: 7 },
  ];
  const [keyword] = compareKeywords(rows, { start: '2026-01-02', end: '2026-01-02' });
  assert.equal(keyword.change, -5);
  assert.ok(keyword.flags.includes('Left top 3'));
  assert.ok(keyword.flags.includes('Ranking Decline'));
  assert.ok(keyword.flags.includes('Click Loss'));
  const rules = recommendations([keyword], {}, {});
  assert.ok(rules.some(r => r.type === 'decline'));
  assert.ok(rules.some(r => r.type === 'near-top'));
});
test('weekly grouping starts Monday and preserves totals', () => {
  const rows = ['2026-10-25', '2026-10-26', '2026-10-27'].map(date => ({ date, clicks: 5, impressions: 100, position: 4 }));
  const weekly = groupTime(rows, [], { start: '2026-10-25', end: '2026-10-27' }, 'weekly');
  assert.deepEqual(weekly.map(r => r.date), ['2026-10-19', '2026-10-26']);
  assert.equal(weekly.reduce((sum, row) => sum + row.clicks, 0), 15);
});
test('all chart aggregations and page totals reconcile with the demo overview', () => {
  const { records, traffic } = createDemoData(demoSites[0]);
  const range = { start: addDays(latestDate, -27), end: latestDate };
  const pages = getPages(records, traffic, range);
  const daily = groupTime(records, traffic, range);
  for (const interval of ['weekly', 'monthly']) {
    const grouped = groupTime(records, traffic, range, interval);
    for (const metric of ['clicks', 'impressions', 'sessions', 'conversions']) assert.equal(grouped.reduce((s, r) => s + r[metric], 0), daily.reduce((s, r) => s + r[metric], 0));
  }
  assert.equal(pages.reduce((s, r) => s + r.clicks, 0), daily.reduce((s, r) => s + r.clicks, 0));
  assert.equal(pages.reduce((s, r) => s + r.sessions, 0), daily.reduce((s, r) => s + r.sessions, 0));
  assert.ok(compareKeywords(records, range).some(k => k.status === 'Visibility Loss'));
});
test('CSV escapes quotes and neutralizes spreadsheet formulas while retaining numeric changes', () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell('=SUM(A1:A2)'), '"\'=SUM(A1:A2)"');
  assert.equal(csvCell(-4), '"-4"');
  assert.equal(csvCell(null), '""');
});
