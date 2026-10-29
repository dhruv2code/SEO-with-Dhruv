import { FileCheck2, Info } from 'lucide-react';

export function ReportNotice({ dashboard }) {
  if (!dashboard.isImported) return null;
  return <section className="report-notice" aria-label="Imported report information">
    <div><FileCheck2 size={18}/><strong>Showing your uploaded performance</strong><span>{dashboard.report.filename}</span></div>
    <p>{dashboard.keywords.length} keywords · {dashboard.pages.length} pages · Totals from {dashboard.totalsSource}. GA4 metrics are not included in this Search Console report.</p>
    {dashboard.report.warnings.map(warning => <p className="report-warning" key={warning}><Info size={13}/>{warning}</p>)}
    {!dashboard.comparisonAvailable && <p className="report-warning"><Info size={13}/>No equivalent previous period is included. Ranking movements and decline detection are unavailable.</p>}
  </section>;
}
