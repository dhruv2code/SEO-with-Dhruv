// Local browser smoke check using Chrome's DevTools protocol and Node 22+.
// Uses a separate profile, binds only to loopback, and never opens a visible window.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('dist');
const qa = resolve('.qa');
await mkdir(qa, { recursive: true });
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const requested = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!requested.startsWith(root)) { res.writeHead(403).end(); return; }
    let file = requested;
    let contents;
    try { contents = await readFile(file); } catch { file = resolve(root, 'index.html'); contents = await readFile(file); }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); res.end(contents);
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${resolve(qa, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Chrome DevTools did not start within 20 seconds.')), 20000);
    browser.on('error', error => { clearTimeout(timer); reject(error); });
    browser.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  const port = new URL(endpoint).port;
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map(), exceptions = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const request = pending.get(message.id); pending.delete(message.id); if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const waitFor = async (expression, attempts = 100) => { for (let i = 0; i < attempts; i++) { if (await evaluate(expression)) return; await delay(100); } throw new Error(`Timed out: ${expression}`); };
  const go = async path => { await call('Page.navigate', { url: base + path }); await waitFor('!!document.querySelector("h1")'); await delay(150); };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await go('/');
  assert.match(await evaluate('document.body.innerText'), /A clearer view of\s+your growth/);
  assert.equal(await evaluate('document.querySelectorAll(".metric-card").length'), 8);
  await waitFor('!!document.querySelector(".overview-files .btn") && !document.querySelector(".overview-files .btn").disabled');
  await evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['keyword,clicks\\nseo services,42'], 'my-seo-report.csv', { type: 'text/csv' }));
    const input = document.querySelector('.overview-file-input');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor('document.querySelectorAll(".file-entry").length === 1');
  await go('/');
  await waitFor('document.querySelectorAll(".file-entry").length === 1');
  assert.match(await evaluate('document.querySelector(".file-entry").innerText'), /my-seo-report.csv/);
  const savedText = await evaluate(`new Promise((resolve, reject) => {
    const request = indexedDB.open('seo-with-dhruv-files', 1);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction('files').objectStore('files').getAll();
      read.onsuccess = async () => { const text = await read.result[0].blob.text(); db.close(); resolve(text); };
      read.onerror = () => reject(read.error);
    };
  })`);
  assert.equal(savedText, 'keyword,clicks\nseo services,42');
  await evaluate(`(() => {
    const select = document.querySelector('.website-selector select');
    select.value = 'journal'; select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor('!!document.querySelector(".overview-files .btn") && !document.querySelector(".overview-files .btn").disabled');
  assert.equal(await evaluate('document.querySelectorAll(".file-entry").length'), 0);
  await evaluate(`(() => {
    const select = document.querySelector('.website-selector select');
    select.value = 'dhruv'; select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor('document.querySelectorAll(".file-entry").length === 1');
  await evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['notes for this website'], 'notes.txt', { type: 'text/plain' }));
    document.querySelector('.file-dropzone').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  })()`);
  await waitFor('document.querySelectorAll(".file-entry").length === 2');
  await evaluate('document.querySelector(".file-entry button[aria-label^=Remove]").click()');
  await waitFor('document.querySelectorAll(".file-entry").length === 1');
  console.log('PASS files: picker upload, persisted content, per-website isolation, drag-and-drop, removal');
  await delay(600);
  const desktop = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(resolve(qa, 'desktop.png'), Buffer.from(desktop.data, 'base64'));
  console.log('PASS overview: eight KPI cards and desktop screenshot');
  for (const route of ['/keywords', '/lost-keywords', '/opportunities', '/pages', '/recommendations', '/gsc', '/ga4', '/settings', '/report-generator']) {
    await go(route);
    assert.equal(await evaluate('document.body.innerText.includes("The workspace could not load")'), false);
    assert.equal(await evaluate('document.body.scrollWidth > innerWidth + 1'), false, `Horizontal overflow: ${route}`);
    console.log('PASS route:', route);
  }
  await go('/report-generator');
  await evaluate(`(() => {
    const input = document.querySelector('#report-website');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'https://reports.example');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await evaluate('document.querySelector(".generator-actions button").click()');
  await waitFor('!!document.querySelector(".generator-error")');
  assert.match(await evaluate('document.querySelector(".generator-error").innerText'), /No real SEO data/);
  assert.equal(await evaluate('document.querySelectorAll(".generator-preview").length'), 0);
  await evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['Query,Clicks,Impressions,Position\\nवित्तीय प्रशिक्षण,100,10000,6\\nfinance training,150,5000,12'], 'Queries.csv', { type: 'text/csv' }));
    transfer.items.add(new File(['Page,Clicks,Impressions,Position\\nhttps://reports.example/course,250,15000,8'], 'Pages.csv', { type: 'text/csv' }));
    transfer.items.add(new File(['Date,Clicks,Impressions,Position\\n2026-09-01,150,6000,7\\n2026-09-02,100,9000,8'], 'Dates.csv', { type: 'text/csv' }));
    const input = document.querySelector('#generator-files'); input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor('document.querySelectorAll(".generator-upload li").length === 3');
  await evaluate('document.querySelector(".generator-actions button").click()');
  await waitFor('!!document.querySelector(".generator-preview .report-cover")');
  assert.equal(await evaluate('document.querySelector(".report-kpi-clicks strong").innerText'), '250');
  assert.match(await evaluate('document.querySelector(".generator-preview").innerText'), /वित्तीय प्रशिक्षण/);
  assert.match(await evaluate('document.querySelector(".generator-preview").innerText'), /reports.example\/course/);
  const downloads = resolve(qa, 'downloads'); await mkdir(downloads, { recursive: true });
  await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await evaluate('document.querySelector(".generator-preview-heading button").click()');
  await waitFor('!!document.querySelector(".generator-success") || !!document.querySelector(".generator-error")', 900);
  assert.equal(await evaluate('document.querySelector(".generator-error")?.innerText || ""'), '');
  let downloaded;
  for (let i = 0; i < 100; i++) { downloaded = (await readdir(downloads)).find(file => file.startsWith('seo-report-reports.example-') && file.endsWith('.pdf')); if (downloaded) break; await delay(100); }
  assert.ok(downloaded, 'A PDF file should be downloaded');
  const pdf = await readFile(resolve(downloads, downloaded));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 10000, 'PDF should contain rendered report content');
  assert.ok((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length >= 2, 'Report should paginate');
  const reportScreenshot = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(resolve(qa, 'report-preview.png'), Buffer.from(reportScreenshot.data, 'base64'));
  await go('/');
  assert.equal(await evaluate('document.querySelector(".metric-main strong").innerText'), '20,502');
  console.log('PASS report generator: no demo fallback, multi-CSV preview, Unicode queries, genuine multipage PDF download, existing dashboard unchanged');
  await go('/keywords');
  await evaluate('document.querySelector(".bookmark").click()');
  await delay(100);
  assert.equal(await evaluate('document.querySelectorAll(".bookmark.tracked").length'), 1);
  await go('/keywords');
  assert.equal(await evaluate('document.querySelectorAll(".bookmark.tracked").length'), 1);
  await evaluate('document.querySelector(".keyword-name").click()');
  await waitFor('!!document.querySelector("[role=dialog]")');
  console.log('PASS keyword tracking persists on reload; history dialog opens');
  await go('/recommendations');
  await evaluate('const select = document.querySelector(".status-select select"); select.value = "Completed"; select.dispatchEvent(new Event("change", { bubbles: true }));');
  await delay(100);
  await go('/recommendations');
  assert.equal(await evaluate('document.querySelector(".status-select select").value'), 'Completed');
  console.log('PASS recommendation completion persists on reload');
  // A genuine multi-sheet GSC workbook must replace every sample metric automatically.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = (name, rows) => { const value = workbook.addWorksheet(name); rows.forEach(row => value.addRow(row)); };
  sheet('Queries', [['Top queries', 'Clicks', 'Impressions', 'CTR', 'Position'], ['accounting course', 100, 2000, 0.05, 6], ['finance training', 50, 1000, 0.05, 12]]);
  sheet('Pages', [['Top pages', 'Clicks', 'Impressions', 'CTR', 'Position'], ['https://thewallstreetschool.com/course', 160, 3200, 0.05, 8]]);
  sheet('Dates', [['Date', 'Clicks', 'Impressions', 'CTR', 'Position'], ['2026-09-01', 80, 1600, 0.05, 7], ['2026-09-02', 100, 2000, 0.05, 8]]);
  const reportPath = resolve(qa, 'thewallstreetschool.com-Performance-on-Search.xlsx');
  await writeFile(reportPath, await workbook.xlsx.writeBuffer());
  await go('/');
  await waitFor('!!document.querySelector(".overview-files .btn") && !document.querySelector(".overview-files .btn").disabled');
  await call('DOM.enable');
  const { root: documentNode } = await call('DOM.getDocument');
  const { nodeId } = await call('DOM.querySelector', { nodeId: documentNode.nodeId, selector: '.overview-file-input' });
  await call('DOM.setFileInputFiles', { nodeId, files: [reportPath] });
  await waitFor('!!document.querySelector(".report-notice")');
  assert.equal(await evaluate('document.querySelector(".metric-main strong").innerText'), '180');
  assert.equal(await evaluate('document.querySelectorAll(".metric-main strong")[4].innerText'), '—');
  assert.match(await evaluate('document.body.innerText'), /accounting course/);
  assert.equal(await evaluate('document.querySelector(".compare-toggle input").disabled'), true);
  await go('/keywords');
  await waitFor('document.querySelectorAll(".keyword-name").length === 2');
  assert.match(await evaluate('document.body.innerText'), /finance training/);
  assert.equal(await evaluate('document.querySelectorAll(".keyword-name").length'), 2);
  await go('/opportunities');
  await evaluate('document.querySelectorAll(".opportunity-type")[1].click()');
  await waitFor('!!document.querySelector(".opportunity-card")');
  assert.match(await evaluate('document.querySelector(".opportunity-card").innerText'), /accounting course/);
  await go('/pages');
  assert.match(await evaluate('document.body.innerText'), /\/course/);
  await go('/lost-keywords');
  assert.match(await evaluate('document.body.innerText'), /does not include previous-period/);
  await go('/');
  await waitFor('!!document.querySelector(".report-notice")');
  assert.equal(await evaluate('document.querySelector(".metric-main strong").innerText'), '180');
  console.log('PASS XLSX auto-import: exact report totals, actual keywords/pages/opportunities, no demo GA4, no invented comparisons, persists on reload');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await go('/');
  assert.equal(await evaluate('document.body.scrollWidth > innerWidth + 1'), false);
  await evaluate('document.querySelector(".mobile-toggle").click()');
  assert.equal(await evaluate('document.querySelector(".sidebar").classList.contains("is-open")'), true);
  await evaluate('document.querySelector(".mobile-overlay").click()');
  await delay(300);
  const mobile = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(resolve(qa, 'mobile.png'), Buffer.from(mobile.data, 'base64'));
  console.log('PASS mobile: menu, no document overflow, and screenshot');
  await go('/report-generator');
  assert.equal(await evaluate('document.querySelector("input[value=existing]").checked'), true);
  await evaluate('document.querySelector(".generator-actions button").click()');
  await waitFor('!!document.querySelector(".generator-preview .report-cover")');
  assert.equal(await evaluate('document.querySelector(".report-kpi-clicks strong").innerText'), '180');
  assert.equal(await evaluate('document.body.scrollWidth > innerWidth + 1'), false);
  const reportMobile = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile(resolve(qa, 'report-mobile.png'), Buffer.from(reportMobile.data, 'base64'));
  console.log('PASS report generator: existing real report source and responsive mobile preview');
  assert.deepEqual(exceptions, [], 'Uncaught browser exceptions');
  console.log('PASS no uncaught browser exceptions');
} finally {
  socket?.close();
  browser.kill();
  server.close();
}
