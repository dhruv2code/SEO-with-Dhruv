import { useMemo } from 'react';
import { Info, TrendingDown, EyeOff, MousePointer2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { KeywordTable } from '../components/KeywordTable';
import { compareKeywords } from '../lib/analytics';
import { addDays } from '../services/demoData';
export function LostKeywords({ dashboard }) {
  const lost = dashboard.keywords.filter(k => k.flags.length);
  const declineSeries = useMemo(() => {
    const days = Math.round((new Date(dashboard.range.end) - new Date(dashboard.range.start)) / 86400000) + 1;
    return Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const end = addDays(dashboard.range.end, i - Math.min(days, 14) + 1);
      const keywords = compareKeywords(dashboard.data.records, { start: addDays(end, -6), end });
      return { date: end.slice(5), count: keywords.filter(k => k.status === 'Declining').length };
    });
  }, [dashboard.range, dashboard.data]);
  if (!dashboard.comparisonAvailable) return <><div className="page-heading"><div><h1>Lost keywords</h1><p>Ranking comparisons need data from two equivalent periods.</p></div></div><div className="notice"><Info size={19}/><p>Your export does not include previous-period keyword observations. Current keyword metrics are available in Keyword Performance; no ranking loss is inferred from this file.</p></div></>;
  return <><div className="page-heading"><div><div className="eyebrow">KEEP AN EYE ON THE CHANGES</div><h1>Catch a decline. Plan a recovery<span className="purple">.</span></h1><p>Investigate changes in position, clicks, and search visibility.</p></div></div><div className="notice"><Info size={19}/><p>Zero impressions means no visibility was observed in this period. It does not confirm a keyword has lost its Google ranking. Privacy thresholds, demand, and reporting delays can affect these observations.</p></div><div className="summary-grid">{[[TrendingDown, 'Ranking declines', dashboard.keywords.filter(k => k.flags.includes('Ranking Decline')).length], [EyeOff, 'Visibility losses', dashboard.keywords.filter(k => k.flags.includes('Visibility Loss')).length], [MousePointer2, 'Significant click losses', dashboard.keywords.filter(k => k.flags.includes('Click Loss')).length]].map(([Icon, label, value]) => <div className="panel summary-card" key={label}><Icon size={19}/><span>{label}</span><strong>{value}</strong></div>)}</div><section className="panel decline-chart"><div className="panel-heading"><div><h2>Declining keywords over time</h2><p>Rolling 7-day averages vs. the preceding 7 days · latest 14 selected dates</p></div></div><div className="short-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={declineSeries} margin={{ right: 20, left: -20 }}><CartesianGrid vertical={false} stroke="#eef0f4"/><XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip formatter={v => [v, 'Declining keywords']}/><Area type="monotone" dataKey="count" stroke="#e38a95" fill="#fceef0" strokeWidth={2}/></AreaChart></ResponsiveContainer></div></section><KeywordTable dashboard={dashboard} rows={lost} lost title="Keywords to investigate"/></>;
}
