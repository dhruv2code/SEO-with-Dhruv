// Lazy-loaded only when Download PDF is clicked. Rasterising each logical block
// preserves browser-rendered Unicode queries, charts and typography in the PDF.
export async function createReportPdf(element, report) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: `SEO Report - ${report.hostname}`, subject: 'Search performance from supplied SEO data', author: 'SEO with Dhruv', creator: 'SEO with Dhruv' });
  const margin = 14, pageWidth = 210, pageHeight = 297, width = pageWidth - margin * 2;
  let y = 16;
  const maxHeight = pageHeight - 16 - 16;
  for (const block of element.querySelectorAll('[data-pdf-block]')) {
    if (!block.getBoundingClientRect().height) continue;
    const canvas = await html2canvas(block, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: false, windowWidth: 1200 });
    let imageWidth = width, height = canvas.height / canvas.width * imageWidth;
    // Avoid cutting a table or recommendation across pages. Extremely long
    // individual blocks are scaled to fit an A4 page rather than clipped.
    if (height > maxHeight) { imageWidth *= maxHeight / height; height = maxHeight; }
    if (y + height > pageHeight - 16) { pdf.addPage(); y = 16; }
    pdf.addImage(canvas, 'PNG', margin, y, imageWidth, height, undefined, 'FAST');
    y += height + 4;
    canvas.width = canvas.height = 0;
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(220, 226, 238); pdf.line(margin, 283, pageWidth - margin, 283);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(91, 108, 133);
    pdf.text('SEO with Dhruv | SEO Performance Report', margin, 289);
    pdf.text(`${page} / ${pages}`, pageWidth - margin, 289, { align: 'right' });
  }
  return { blob: pdf.output('blob'), filename: `seo-report-${report.hostname.replace(/[^a-z\d.-]/gi, '-')}-${report.generatedAt.slice(0, 10)}.pdf` };
}

export async function downloadReportPdf(element, report) {
  const { blob, filename } = await createReportPdf(element, report);
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return filename;
}
