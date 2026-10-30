import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { parseReportFile, deriveReport, isPerformanceFile } from '../services/reportImport.js';

async function archive(files, name = 'thewallstreetschool.com-Performance-on-Search-2026-10-30.zip') {
  const zip = new JSZip();
  Object.entries(files).forEach(([path, contents]) => zip.file(path, contents));
  return { name, blob: new Blob([await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })]) };
}

test('Search Console ZIP imports independent dimensions without inflating totals', async () => {
  const file = await archive({
    'export/Queries.csv': 'Top queries,Clicks,Impressions,CTR,Position\nfinancial modelling,100,10000,1%,6\naccounting course,150,5000,3%,12',
    'export/Pages.csv': 'Top pages,Clicks,Impressions,CTR,Position\nhttps://thewallstreetschool.com/course,240,14500,1.65%,8',
    'export/Chart.csv': 'Date,Clicks,Impressions,CTR,Position\n2026-09-01,150,6000,2.5%,7\n2026-09-02,100,9000,1.11%,8',
    'export/Countries.csv': 'Country,Clicks,Impressions\nIndia,250,15000',
    'export/Devices.csv': 'Device,Clicks,Impressions\nMobile,250,15000',
    'export/Filters.csv': 'Filter,Value\nSearch type,Web',
    '__MACOSX/._Queries.csv': 'not a report',
    'readme.txt': 'Additional export metadata',
  });
  const report = await parseReportFile(file);
  const result = deriveReport(report, report.range, 'daily');
  assert.equal(report.filename, file.name);
  assert.equal(report.siteName, 'thewallstreetschool.com');
  assert.equal(result.keywords.length, 2);
  assert.equal(result.pages.length, 1);
  assert.equal(result.series.length, 2);
  assert.equal(result.current.clicks, 250);
  assert.equal(result.current.impressions, 15000);
  assert.equal(result.current.position, 7.6);
  assert.equal(result.current.sessions, null);
  assert.equal(result.pages[0].clicks, 240);
  assert.ok(result.recommendations.some(row => row.query === 'financial modelling'));
});

test('ZIP accepts UTF-16 CSV and keeps absent daily dates unavailable', async () => {
  const contents = Buffer.concat([Buffer.from([255, 254]), Buffer.from('Query,Clicks,Impressions,Position\nवित्तीय प्रशिक्षण,12,600,7', 'utf16le')]);
  const report = await parseReportFile(await archive({ 'Queries.CSV': contents }));
  assert.equal(report.queryRows[0].query, 'वित्तीय प्रशिक्षण');
  assert.equal(report.queryRows[0].clicks, 12);
  assert.equal(report.range, null);
  assert.equal(report.siteName, 'thewallstreetschool.com');
});

test('ZIP import gives actionable errors for damaged archives and absent data', async () => {
  await assert.rejects(parseReportFile({ name: 'broken.zip', blob: new Blob(['broken']) }), /ZIP could not be read/);
  await assert.rejects(parseReportFile(await archive({ 'notes.txt': 'notes' })), /No CSV files/);
  await assert.rejects(parseReportFile(await archive({ 'Queries.csv': 'Name,Value\nabc,1' })), /No supported performance rows/);
  await assert.rejects(parseReportFile(await archive({ 'Queries.csv': 'Query,Clicks,Impressions\n"unclosed,2,3' })), /Queries.csv: Unclosed quote/);
});

test('ZIP rejects excessive CSV entries and is recognised as an importable report', async () => {
  const files = Object.fromEntries(Array.from({ length: 65 }, (_, index) => [`${index}.csv`, 'Query,Clicks,Impressions\nseo,2,100']));
  await assert.rejects(parseReportFile(await archive(files)), /too many CSV files/);
  for (const name of ['export.zip', 'EXPORT.ZIP', 'queries.csv', 'data.xlsx']) assert.ok(isPerformanceFile(name));
  assert.equal(isPerformanceFile('image.png'), false);
});

test('comparison ZIP pairs current metrics and excludes previous and difference columns', async () => {
  const report = await parseReportFile(await archive({
    'Queries.csv': 'Top queries,Previous 3 months Clicks,Last 3 months Impressions,Clicks Difference,Last 3 months Clicks,Previous 3 months Impressions,Last 3 months Position\nseo course,900,10000,-800,100,90000,8',
    'Pages.csv': 'Top pages,Clicks (Last 3 months),Impressions (Last 3 months),Position (Last 3 months)\nhttps://thewallstreetschool.com/course,110,11000,7',
  }));
  const result = deriveReport(report, { start: '2026-08-01', end: '2026-10-30' }, 'daily');
  assert.equal(result.current.clicks, 100);
  assert.equal(result.current.impressions, 10000);
  assert.equal(result.current.position, 8);
  assert.equal(result.keywords[0].previousClicks, null);
  assert.equal(result.pages[0].clicks, 110);
  assert.ok(report.warnings.some(warning => warning.includes('showing Last 3 months')));
});

test('CSV detects delimiters after metadata and UTF-16 without a BOM', async () => {
  for (const contents of [
    'Search Console performance export\nTop queries;Clicks;Impressions;Position\nseo course;120;12000;6',
    'sep=;\r\n"Top queries";"Clicks";"Impressions";"Position"\r\n"seo, course";120;12000;6',
    Buffer.from('Top queries\tClicks\tImpressions\tPosition\r\nseo course\t120\t12000\t6', 'utf16le'),
  ]) {
    const report = await parseReportFile(await archive({ 'Queries.csv': contents }));
    assert.equal(report.queryRows[0].clicks, 120);
    assert.equal(report.queryRows[0].impressions, 12000);
  }
});

test('incompatible comparison periods are rejected with actual heading diagnostics', async () => {
  await assert.rejects(parseReportFile(await archive({
    'Queries.csv': 'Top queries,Current Clicks,Previous Impressions\nseo course,100,90000',
  })), error => error.message.includes('Queries.csv: headings') && error.message.includes('Current Clicks'));
});
