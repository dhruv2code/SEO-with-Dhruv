import { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { addDays, latestDate } from '../services/demoData';

export function DateRange({ dashboard }) {
  const [open, setOpen] = useState(false), [custom, setCustom] = useState(dashboard.range), [error, setError] = useState('');
  const imported = dashboard.isImported;
  const locked = imported && (!dashboard.report.range || dashboard.report.aggregateQueries);
  const max = imported ? dashboard.report.range?.end : latestDate;
  const min = imported ? dashboard.report.range?.start : addDays(latestDate, -99);
  const days = Math.round((new Date(dashboard.range.end) - new Date(dashboard.range.start)) / 86400000) + 1;
  // Undated/aggregate reports cannot use date presets. Do not evaluate those
  // hidden controls: addDays(undefined) throws even when the dialog is closed.
  if (locked) return <Button variant="outline" className="date-button" disabled title="This export contains full-period totals. Export daily data to filter dates."><CalendarDays size={15}/>{dashboard.report.range ? `${min} – ${max}` : 'Full report · dates not included'}</Button>;
  const apply = range => {
    if (!range.start || !range.end || range.start > range.end) { setError('Choose a valid start and end date.'); return; }
    if (range.end > max || range.start < min) { setError(`Choose dates between ${min} and ${max}.`); return; }
    dashboard.setRange(range); setError(''); setOpen(false);
  };
  const label = locked ? dashboard.report.range ? `${min} – ${max}` : 'Full report · dates not included' : !imported && dashboard.range.end === latestDate && [7, 28, 90].includes(days) ? `Last ${days} days` : `${dashboard.range.start} – ${dashboard.range.end}`;
  return <><Button variant="outline" className="date-button" disabled={locked} title={locked ? 'This export contains full-period keyword totals. Export daily query data to filter keyword dates.' : 'Choose date range'} onClick={() => { setCustom(dashboard.range); setOpen(true); }}><CalendarDays size={15}/>{label}{!locked && <ChevronDown size={14}/>}</Button><Dialog open={open} onOpenChange={setOpen} title="Choose your date range" description={imported ? 'Only dates present in your report can be selected. Comparisons require data covering the previous period.' : 'Compare with the immediately preceding, equally long period. Sample data ends three days before today.'}><div className="date-presets">{[7, 28, 90].map(n => <Button variant="outline" key={n} disabled={addDays(max, 1 - n) < min} onClick={() => apply({ start: addDays(max, 1 - n), end: max })}>Last {n} days</Button>)}</div><form onSubmit={event => { event.preventDefault(); apply(custom); }}><div className="two-fields"><label>Start date<input type="date" min={min} max={custom.end} value={custom.start} onChange={event => setCustom({ ...custom, start: event.target.value })} required/></label><label>End date<input type="date" min={custom.start} max={max} value={custom.end} onChange={event => setCustom({ ...custom, end: event.target.value })} required/></label></div>{error && <p className="error-text" role="alert">{error}</p>}<Button className="full-width" type="submit">Apply date range</Button></form></Dialog></>;
}
