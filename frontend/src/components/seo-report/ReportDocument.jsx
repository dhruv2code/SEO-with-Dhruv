import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Tooltip } from 'recharts';
import { number } from '../../lib/utils';

export function ReportDocument({ report }) {
  const format = (value, digits = 0, suffix = '') => value == null ? 'Not available' : number(value, digits) + suffix;
  const generated = new Date(report.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  return <div className="seo-report-document">
    <header className="report-cover" data-pdf-block>
      <div className="report-brand"><span>▥</span>SEO with Dhruv<small>SEARCH INTELLIGENCE</small></div>
      <p className="report-kicker">SEO PERFORMANCE REPORT</p>
      <h2>{report.hostname}</h2><p className="report-website">{report.website}</p>
      <div className="report-cover-meta"><div><span>REPORTING PERIOD</span><strong>{report.period ? `${report.period.start} — ${report.period.end}` : 'Dates not provided in source'}</strong></div><div><span>PREPARED</span><strong>{generated} IST</strong></div></div>
    </header>
    <section className="report-section" data-pdf-block>
      <div className="report-section-title"><span>01</span><h3>Performance at a glance</h3></div>
      <div className="report-kpis">{[['clicks', 'Total clicks', 0, ''], ['impressions', 'Total impressions', 0, ''], ['ctr', 'Average CTR', 2, '%'], ['position', 'Average position', 1, '']].map(([key, label, digits, suffix]) => <div className={`report-kpi report-kpi-${key}`} key={key}><span>{label}</span><strong>{format(report.metrics[key], digits, suffix)}</strong></div>)}</div>
      <p className="report-method">Totals from {report.totalsSource}. {report.keywordCount} observed keywords and {report.pageCount} observed pages. Only supplied SEO observations are included.</p>
    </section>
    <section className="report-section" data-pdf-block>
      <div className="report-section-title"><span>02</span><h3>SEO performance charts</h3></div>
      {report.series.length ? <><p className="report-chart-heading">Search clicks & impressions over time</p><div className="report-chart-legend"><span><i/>Clicks</span><span><i/>Impressions · right axis</span></div><div className="report-line-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={report.series} margin={{ left: 0, right: 5, top: 10, bottom: 5 }}><CartesianGrid vertical={false} stroke="#e4eaf3" strokeDasharray="3 4"/><XAxis dataKey="label" tick={{ fontSize: 10, fill: '#60718a' }} axisLine={false} tickLine={false} minTickGap={45}/><YAxis yAxisId="clicks" width={40} tick={{ fontSize: 10, fill: '#60718a' }} axisLine={false} tickLine={false}/><YAxis yAxisId="impressions" orientation="right" width={48} tick={{ fontSize: 10, fill: '#60718a' }} axisLine={false} tickLine={false}/><Tooltip/><Area yAxisId="clicks" dataKey="clicks" stroke="#5556e8" strokeWidth={2} fill="#eeedff" isAnimationActive={false}/><Line yAxisId="impressions" dataKey="impressions" stroke="#0d9488" strokeWidth={2} dot={false} isAnimationActive={false}/></ComposedChart></ResponsiveContainer></div></> : <p className="report-unavailable">A time-series chart is unavailable because the export contains no daily dates. Include the GSC Dates CSV/sheet to add this chart.</p>}
    </section>
    {report.keywords.length > 0 && <section className="report-section" data-pdf-block><p className="report-chart-heading">Leading keywords by clicks</p><div className="report-bar-chart" style={{ height: Math.max(150, report.keywords.slice(0, 6).length * 36 + 35) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={report.keywords.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 25, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#e4eaf3"/><XAxis type="number" tick={{ fontSize: 10, fill: '#60718a' }} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="query" width={160} tick={{ fontSize: 10, fill: '#374d6c' }} axisLine={false} tickLine={false} tickFormatter={text => text.length > 22 ? text.slice(0, 21) + '…' : text}/><Tooltip/><Bar dataKey="clicks" fill="#5556e8" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}/></BarChart></ResponsiveContainer></div><p className="report-method">Chart labels are shortened where needed; full queries appear in the table.</p></section>}
    <section className="report-section" data-pdf-block>
      <div className="report-section-title"><span>03</span><h3>Top performing keywords</h3></div>
      <p className="report-section-description">Top {report.keywords.length} of {report.keywordCount} observed queries, ordered by clicks.</p>
      {report.keywords.length ? <div className="report-table-wrap"><table><thead><tr><th>Keyword</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Avg. position</th></tr></thead><tbody>{report.keywords.map(row => <tr key={row.query}><td>{row.query}</td><td>{format(row.clicks)}</td><td>{format(row.impressions)}</td><td>{format(row.ctr, 2, '%')}</td><td>{format(row.position, 1)}</td></tr>)}</tbody></table></div> : <p className="report-unavailable">Query data was not included. Add a Queries export to include top keywords.</p>}
    </section>
    <section className="report-section" data-pdf-block>
      <div className="report-section-title"><span>04</span><h3>Top performing pages</h3></div>
      <p className="report-section-description">Top {report.pages.length} of {report.pageCount} observed landing pages, ordered by clicks.</p>
      {report.pages.length ? <div className="report-table-wrap"><table><thead><tr><th>Landing page</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Avg. position</th></tr></thead><tbody>{report.pages.map(row => <tr key={row.page}><td>{row.page}</td><td>{format(row.clicks)}</td><td>{format(row.impressions)}</td><td>{format(row.ctr, 2, '%')}</td><td>{format(row.position, 1)}</td></tr>)}</tbody></table></div> : <p className="report-unavailable">Page data was not included. Add a Pages CSV/sheet, or supply landing-page URLs with query rows. No landing pages have been inferred.</p>}
    </section>
    <section className="report-section report-recommendations">
      {report.recommendations.length ? report.recommendations.map((item, index) => <div key={item.id} className="report-recommendation-block" data-pdf-block>{index === 0 && <div className="report-section-title"><span>05</span><h3>SEO improvement recommendations</h3></div>}<article className="report-recommendation"><div><h4>{index + 1}. {item.title}</h4><span>{item.priority} priority</span></div><strong>{item.query}</strong><p><b>Evidence:</b> {item.reason}</p><p><b>Suggested action:</b> {item.action}</p>{item.page && <p className="report-related-page">Related page: {item.page}</p>}</article></div>) : <div data-pdf-block><div className="report-section-title"><span>05</span><h3>SEO improvement recommendations</h3></div><p className="report-unavailable">No recommendation rules were triggered by the supplied metrics. This does not establish overall SEO health; a full technical review requires additional data.</p></div>}
    </section>
    <section className="report-section report-provenance" data-pdf-block><div className="report-section-title"><span>06</span><h3>Data sources & methodology</h3></div><p><b>Source:</b> {report.sourceName}</p><p><b>Website:</b> supplied by the user; no live crawl was performed.</p><ul>{report.notes.map(note => <li key={note}>{note}</li>)}</ul><p className="report-signoff">Prepared with SEO with Dhruv · Clear insights. Focused action.</p></section>
  </div>;
}
