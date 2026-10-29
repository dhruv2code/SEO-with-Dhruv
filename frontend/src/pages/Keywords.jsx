import { useSearchParams } from 'react-router-dom';
import { KeywordTable } from '../components/KeywordTable';
export function Keywords({ dashboard }) {
  const [params] = useSearchParams();
  return <><div className="page-heading"><div><div className="eyebrow">KEYWORD INTELLIGENCE</div><h1>Every search tells a story<span className="purple">.</span></h1><p>Understand what’s working, follow the movement, and find your next win.</p></div></div><KeywordTable key={params.get('tab') || 'all'} dashboard={dashboard} initialTab={params.get('tab') === 'improving' ? 'Improving' : 'All keywords'}/><div className="data-note">{dashboard.isImported ? "Source: your uploaded report." : "Sample data only."} GSC average position describes observed search appearances, not a fixed keyword rank. Query data may be omitted by Google privacy thresholds.</div></>;
}
