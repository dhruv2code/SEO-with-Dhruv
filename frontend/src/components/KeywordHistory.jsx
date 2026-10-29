import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import { groupTime } from '../lib/analytics';
import { number } from '../lib/utils';
export function KeywordHistory({ keyword, dashboard, onClose }) {
  if (!keyword) return null;
  const rows = dashboard.data.records.filter(r => r.query === keyword.query);
  const series = groupTime(rows, [], dashboard.range);
  const tracked = dashboard.trackedKeywords.includes(keyword.query);
  return <Dialog open={!!keyword} onOpenChange={open => !open && onClose()} title={keyword.query} description={`${dashboard.isImported ? "Uploaded report" : "Sample keyword history"} · GSC average position is not a fixed rank.`}><div className="history-metrics"><div><span>Clicks</span><strong>{number(keyword.clicks)}</strong></div><div><span>Impressions</span><strong>{number(keyword.impressions)}</strong></div><div><span>Avg. position</span><strong>{keyword.position?.toFixed(1) ?? '—'}</strong></div></div><div className="history-chart">{series.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={series}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={35}/><YAxis reversed tick={{ fontSize: 10 }} width={30}/><Tooltip formatter={v => [Number(v).toFixed(1), 'Avg. position']}/><Line dataKey="position" stroke="#7963ec" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer> : <div className="empty"><p>{dashboard.isImported ? "This export has no daily history for this query. Its full-period metrics are shown above. Export query-by-date data to see a history chart." : "No observations in this period. This does not prove the keyword has lost its ranking."}</p></div>}</div><div className="dialog-actions"><Button variant="outline" onClick={() => dashboard.toggleTrack(keyword.query)}>{tracked ? <BookmarkCheck size={15}/> : <Bookmark size={15}/>}{tracked ? 'Untrack keyword' : 'Track keyword'}</Button>{keyword.page && <a className="text-link" href={keyword.page} target="_blank" rel="noreferrer">Landing page <ExternalLink size={13}/></a>}</div></Dialog>;
}
