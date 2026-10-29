import { ArrowDownRight, ArrowUpRight, MousePointer2, Eye, Target, BarChart3, Users, UserRound, Activity, Goal } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { number } from '../lib/utils';
import { percentChange } from '../lib/analytics';
const icons = { clicks: MousePointer2, impressions: Eye, ctr: Target, position: BarChart3, sessions: Users, users: UserRound, engaged: Activity, conversions: Goal };
export const metricDefinitions = [
  { key: 'clicks', label: 'Total clicks', source: 'GSC', color: '#5556e8' },
  { key: 'impressions', label: 'Total impressions', source: 'GSC', color: '#0284c7' },
  { key: 'ctr', label: 'Average CTR', source: 'GSC', color: '#0d9488', suffix: '%', digits: 2 },
  { key: 'position', label: 'Average position', source: 'GSC', color: '#d88b17', digits: 1, inverse: true },
  { key: 'sessions', label: 'Organic sessions', source: 'GA4', color: '#5556e8' },
  { key: 'users', label: 'Organic users', source: 'GA4', color: '#0284c7' },
  { key: 'engaged', label: 'Engaged sessions', source: 'GA4', color: '#0d9488' },
  { key: 'conversions', label: 'Organic conversions', source: 'GA4', color: '#d88b17' },
];
export function MetricCard({ metric, dashboard }) {
  const { current, prior, compare, series } = dashboard;
  const { key, label, color, suffix = '', digits = 0, inverse } = metric;
  const value = current[key], previous = prior[key];
  const change = value !== null && previous !== null ? percentChange(value, previous) : null;
  const good = inverse ? change <= 0 : change >= 0;
  const Icon = icons[key], Trend = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return <article className={`metric-card ${value === null ? "metric-unavailable" : ""}`} style={{ "--metric-color": color }}><div className="metric-top"><span>{label}</span><span className="metric-icon" style={{ color, background: color + '12' }}><Icon size={15}/></span></div><div className="metric-main"><strong>{value === null ? '—' : number(value, digits) + suffix}</strong><div className="sparkline" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series}><defs><linearGradient id={`spark-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.2}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs><Area dataKey={key} stroke={color} fill={`url(#spark-${key})`} strokeWidth={1.8} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div></div><div className="metric-bottom">{compare && <><span className={good ? 'trend positive' : 'trend negative'}>{change === null ? '—' : <><Trend size={13}/>{Math.abs(change).toFixed(1)}%</>}</span><span>vs. {previous === null ? '—' : number(previous, digits) + suffix} previously</span></>}{!compare && <span>{value === null ? 'Not included in this report' : metric.source + ' · selected period'}</span>}</div></article>;
}
