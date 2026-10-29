export const exportColumns = [ ['query', 'Keyword'], ['clicks', 'Clicks'], ['impressions', 'Impressions'], ['ctr', 'CTR (%)'], ['position', 'Average position'], ['previousPosition', 'Previous position'], ['change', 'Position improvement'], ['clickChange', 'Click change'], ['impressionChange', 'Impression change'], ['page', 'Landing page'], ['status', 'Status'] ];
const download = (blob, filename) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
export function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Prevent formula execution when the exported file is opened in a spreadsheet.
  if (/^[=+\-@\t\r]/.test(text) && typeof value === 'string') text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export async function exportRows(rows, format, name = 'keywords', isImported = false) {
  const filename = `seo-with-dhruv-${isImported ? "imported" : "demo"}-${name}`;
  if (format === 'csv') {
    const csv = [exportColumns.map(([, label]) => csvCell(label)).join(','), ...rows.map(row => exportColumns.map(([key]) => csvCell(row[key])).join(','))].join('\r\n');
    download(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), filename + '.csv');
  } else {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(isImported ? 'Imported keywords' : 'Demo keywords');
    sheet.columns = exportColumns.map(([key, header]) => ({ key, header, width: key === 'query' || key === 'page' ? 40 : 20 }));
    rows.forEach(row => sheet.addRow(Object.fromEntries(exportColumns.map(([key]) => [key, row[key] ?? '']))));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    download(new Blob([await workbook.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename + '.xlsx');
  }
}
