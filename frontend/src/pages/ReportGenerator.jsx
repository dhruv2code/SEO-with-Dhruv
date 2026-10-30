import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileDown, FileText, Upload, Link2, CheckCircle2, LoaderCircle, Info, Eye, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ReportDocument } from '../components/seo-report/ReportDocument';
import { isPerformanceFile, parseReportFile } from '../services/reportImport';
import { MAX_FILE_SIZE, fileSize } from '../services/files';
import { buildSeoReport, combineSeoReports } from '../services/seoReport';
import './report-generator.css';

export function ReportGenerator({ dashboard }) {
  const hasExisting = dashboard.isImported && !!dashboard.report;
  const [source, setSource] = useState(hasExisting ? 'existing' : 'upload');
  const [website, setWebsite] = useState(hasExisting && dashboard.report.siteName ? `https://${dashboard.report.siteName}` : '');
  const [uploads, setUploads] = useState([]), [parsed, setParsed] = useState(null);
  const [reading, setReading] = useState(false), [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [generated, setGenerated] = useState(null);
  const pdfStage = useRef(null), preview = useRef(null), selection = useRef(0);
  useEffect(() => { setGenerated(null); setMessage(''); }, [dashboard.reports.activeId, dashboard.range.start, dashboard.range.end]);
  useEffect(() => () => { selection.current++; }, []);
  const invalidate = () => { setGenerated(null); setMessage(''); setError(''); };

  async function uploadFiles(files) {
    if (!files.length) return;
    const version = ++selection.current;
    setReading(true); invalidate(); setParsed(null); setUploads([]);
    try {
      const chosen = Array.from(files);
      if (chosen.some(file => !isPerformanceFile(file.name))) throw new Error('Choose ZIP, CSV, or XLSX performance exports. PDF and image attachments cannot provide SEO metrics.');
      if (chosen.some(file => file.size > MAX_FILE_SIZE)) throw new Error('Each report file must be 20 MB or smaller.');
      const reports = [];
      for (const file of chosen) reports.push(await parseReportFile({ name: file.name, blob: file }));
      const combined = combineSeoReports(reports);
      if (selection.current !== version) return;
      setParsed(combined); setUploads(chosen.map(file => ({ name: file.name, size: file.size })));
      if (combined.siteName) setWebsite(`https://${combined.siteName}`);
    } catch (issue) {
      if (selection.current === version) setError(issue.message || 'The selected report could not be read.');
    } finally {
      if (selection.current === version) setReading(false);
    }
  }

  function generate(event) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      const report = source === 'existing' && hasExisting ? dashboard.report : source === 'upload' ? parsed : null;
      const snapshot = buildSeoReport({ website, report, sourceKind: source === 'existing' ? 'imported' : 'upload', range: source === 'existing' ? dashboard.range : undefined });
      setGenerated(snapshot);
      requestAnimationFrame(() => preview.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
    } catch (issue) {
      setGenerated(null); setError(issue.message || 'The report could not be generated.');
    }
  }

  async function download() {
    if (!generated || !pdfStage.current) return;
    setDownloading(true); setError(''); setMessage('');
    try {
      const { downloadReportPdf } = await import('../services/reportPdf');
      const filename = await downloadReportPdf(pdfStage.current, generated);
      setMessage(`PDF ready: ${filename}`);
    } catch (issue) {
      console.error('PDF export failed', issue);
      setError('The PDF could not be created. Keep this page open, then try Download PDF again.');
    } finally { setDownloading(false); }
  }

  return <div className="seo-generator">
    <div className="page-heading"><div><div className="eyebrow">YOUR INSIGHTS, READY TO SHARE</div><h1>SEO Report Generator<span className="purple">.</span></h1><p>Turn real search data into a professional, downloadable SEO report.</p></div><span className="soft-icon"><FileDown size={22}/></span></div>
    <section className="panel generator-form-panel">
      <div className="panel-heading"><div><h2><FileText size={18}/>Build your report</h2><p>Choose the website and source. Preview everything before downloading.</p></div><span className="generator-real-badge"><ShieldCheck size={13}/>Real data only</span></div>
      <form onSubmit={generate} className="generator-form">
        <label htmlFor="report-website">Website URL<input id="report-website" type="text" inputMode="url" autoComplete="url" placeholder="https://example.com" maxLength={2048} value={website} disabled={downloading} onChange={event => { setWebsite(event.target.value); invalidate(); }} required/></label>
        <fieldset disabled={downloading || reading} className="generator-sources"><legend>SEO data source</legend>
          <label className={source === 'upload' ? 'selected' : ''}><input type="radio" name="report-source" value="upload" checked={source === 'upload'} onChange={() => { setSource('upload'); invalidate(); }}/><Upload size={18}/><span><strong>Upload SEO data</strong><small>ZIP, CSV, or Excel exports</small></span></label>
          <label className={`${source === 'existing' ? 'selected' : ''} ${!hasExisting ? 'unavailable' : ''}`}><input type="radio" name="report-source" value="existing" checked={source === 'existing'} disabled={!hasExisting} onChange={() => { setSource('existing'); if (dashboard.report.siteName) setWebsite(`https://${dashboard.report.siteName}`); invalidate(); }}/><CheckCircle2 size={18}/><span><strong>Use current report</strong><small>{hasExisting ? 'Your imported dashboard data' : 'No real report loaded'}</small></span></label>
          <div className="generator-gsc"><Link2 size={18}/><span><strong>Google Search Console</strong><small>Not connected</small></span><Link to="/settings">Settings ↗</Link></div>
        </fieldset>
        {source === 'upload' ? <div className="generator-upload"><label htmlFor="generator-files"><Upload size={21}/><strong>{reading ? 'Reading your SEO data…' : 'Choose ZIP / CSV / Excel files'}</strong><span>Use a Search Console ZIP, a complete XLSX export, or Queries, Pages, and Dates CSVs from the same reporting period.</span></label><input id="generator-files" type="file" accept=".csv,.xlsx,.zip" multiple disabled={reading || downloading} onChange={event => { uploadFiles(event.target.files); event.target.value = ''; }}/>{uploads.length > 0 && <ul>{uploads.map(file => <li key={file.name}><CheckCircle2 size={14}/><span>{file.name}</span><small>{fileSize(file.size)}</small></li>)}</ul>}<p>20 MB maximum per file. These uploads are used only for this report and do not change existing dashboard data.</p></div> : <div className="generator-existing"><CheckCircle2 size={17}/><div><strong>{hasExisting ? dashboard.report.filename : 'No real report is available'}</strong><p>{hasExisting ? 'Uses the active imported report and the applicable selected reporting period.' : 'Upload a report to generate a PDF. Sample dashboard metrics are never used.'}</p></div></div>}
        {!hasExisting && !parsed && <div className="generator-data-prompt"><Info size={16}/><p>No real SEO data is available yet. Upload your Search Console export, or visit <Link to="/settings">connection settings</Link>. The current app has no active GSC connection.</p></div>}
        {error && !generated && <p className="generator-error" role="alert">{error}</p>}
        <div className="generator-actions"><span><ShieldCheck size={14}/>Processed locally in your browser</span><Button type="submit" disabled={reading || downloading}>{reading ? <LoaderCircle size={15} className="file-spinner"/> : <FileText size={15}/>}Generate Report</Button></div>
      </form>
    </section>
    {generated ? <section ref={preview} className="generator-preview" aria-label="SEO report preview"><div className="generator-preview-heading"><div><h2><Eye size={18}/>Report preview</h2><p>Review the source, metrics, charts, and recommendations below.</p></div><Button onClick={download} disabled={downloading}>{downloading ? <LoaderCircle size={16} className="file-spinner"/> : <FileDown size={16}/>}{downloading ? 'Creating PDF…' : 'Download PDF'}</Button></div>{error && <p className="generator-error" role="alert">{error}</p>}{message && <p className="generator-success" role="status">{message}</p>}<ReportDocument report={generated}/><div className="seo-pdf-stage" ref={pdfStage} aria-hidden="true"><ReportDocument report={generated}/></div></section> : <div className="panel generator-empty"><span className="soft-icon"><FileText size={26}/></span><h2>Your next report starts here</h2><p>Add your website and real SEO data, then select Generate Report to preview it.</p></div>}
  </div>;
}
