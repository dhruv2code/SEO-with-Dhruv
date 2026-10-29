import { addDays } from '../services/demoData.js';
export function previousRange(range) {
  const days = Math.round((new Date(range.end) - new Date(range.start)) / 86400000) + 1;
  return { start: addDays(range.start, -days), end: addDays(range.start, -1) };
}
export const inRange = (date, range) => date >= range.start && date <= range.end;
export function summarize(rows) {
  const sum = { clicks: 0, impressions: 0, position: null, ctr: 0, sessions: 0, users: 0, engaged: 0, conversions: 0 };
  let weighted = 0, positionImpressions = 0;
  for (const r of rows) {
    for (const key of ['clicks', 'impressions', 'sessions', 'users', 'engaged', 'conversions']) sum[key] += r[key] || 0;
    if (r.position !== null && r.position !== undefined && r.impressions) {
      weighted += r.position * r.impressions;
      positionImpressions += r.impressions;
    }
  }
  sum.ctr = sum.impressions ? sum.clicks / sum.impressions * 100 : 0;
  sum.position = positionImpressions ? weighted / positionImpressions : null;
  return sum;
}
export function compareKeywords(records, range) {
  const previous = previousRange(range), currentMap = new Map(), previousMap = new Map();
  for (const r of records) {
    const map = inRange(r.date, range) ? currentMap : inRange(r.date, previous) ? previousMap : null;
    if (!map) continue;
    if (!map.has(r.query)) map.set(r.query, []);
    map.get(r.query).push(r);
  }
  return [...new Set([...currentMap.keys(), ...previousMap.keys()])].map(query => {
    const currentRows = currentMap.get(query) || [], previousRows = previousMap.get(query) || [];
    const current = summarize(currentRows), prior = summarize(previousRows);
    const pageMap = new Map();
    for (const r of [...currentRows, ...previousRows]) pageMap.set(r.page, (pageMap.get(r.page) || 0) + r.clicks);
    const page = [...pageMap].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const change = current.position !== null && prior.position !== null ? prior.position - current.position : null;
    const status = !current.impressions && prior.impressions ? 'Visibility Loss' : change === null ? 'New visibility' : change > 0.5 ? 'Improving' : change < -0.5 ? 'Declining' : 'Stable';
    const flags = [];
    if (status === 'Visibility Loss') flags.push('Visibility Loss');
    if (change !== null && change < -0.5) flags.push('Ranking Decline');
    if (prior.clicks && current.clicks < prior.clicks * 0.75) flags.push('Click Loss');
    if (prior.impressions && current.impressions < prior.impressions * 0.75) flags.push('Impression Loss');
    for (const boundary of [3, 10, 20]) if (prior.position !== null && current.position !== null && prior.position <= boundary && current.position > boundary) flags.push(`Left top ${boundary}`);
    return { query, page, ...current, previousPosition: prior.position, previousClicks: prior.clicks, previousImpressions: prior.impressions, change, clickChange: current.clicks - prior.clicks, impressionChange: current.impressions - prior.impressions, status, flags };
  });
}
export function groupTime(records, traffic, range, interval = 'daily') {
  const groups = new Map();
  for (const row of [...records, ...traffic]) {
    if (!inRange(row.date, range)) continue;
    let key = row.date;
    if (interval === 'monthly') key = row.date.slice(0, 7) + '-01';
    if (interval === 'weekly') { const day = new Date(row.date + 'T12:00:00Z').getUTCDay(); key = addDays(row.date, -(day + 6) % 7); }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({ date, label: new Date(date + 'T12:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }), ...summarize(rows) }));
}
export function getPages(records, traffic, range) {
  const previous = previousRange(range);
  const urls = [...new Set(records.filter(r => inRange(r.date, range) || inRange(r.date, previous)).map(r => r.page))];
  return urls.map(page => {
    const now = summarize([...records, ...traffic].filter(r => r.page === page && inRange(r.date, range)));
    const prior = summarize(records.filter(r => r.page === page && inRange(r.date, previous)));
    return { page, ...now, clickChange: now.clicks - prior.clicks, impressionChange: now.impressions - prior.impressions, change: prior.position !== null && now.position !== null ? prior.position - now.position : null };
  });
}
export function recommendations(keywords, current, previous) {
  const results = [];
  for (const k of keywords) {
    const common = { query: k.query, page: k.page, clicks: k.clicks, impressions: k.impressions, ctr: k.ctr, position: k.position };
    const add = (type, title, priority, reason, action) => results.push({ ...common, id: `${type}:${k.query}`, type, title, priority, reason, action });
    if (k.impressions > 1000 && k.ctr < 2) add('ctr', 'Turn visibility into more clicks', 'High', `${k.impressions.toLocaleString()} impressions with ${k.ctr.toFixed(2)}% CTR.`, 'Review the title tag and meta description. Align the snippet with search intent and communicate a clear value proposition.');
    if (k.change !== null && k.change < -3) add('decline', 'Investigate a position decline', 'High', `Average position worsened by ${Math.abs(k.change).toFixed(1)} places.`, 'Review content freshness, search intent, internal linking, and changes in competing search results.');
    if (k.position >= 4 && k.position <= 10) add('near-top', 'Move closer to the top three', 'Medium', `Average position ${k.position.toFixed(1)} puts this query near the top results.`, 'Add useful content depth, refresh outdated details, and improve contextual internal links.');
    if (k.position > 10 && k.position <= 20) add('page-two', 'Build momentum toward page one', 'Medium', `Average position is ${k.position.toFixed(1)}.`, 'Review competing pages and intent alignment. Expand useful content, add relevant FAQs, and improve internal links.');
    if (k.impressionChange > Math.max(50, k.previousImpressions * 0.1) && k.clickChange <= 0) add('visibility', 'Convert growing search visibility', 'Medium', `Impressions increased by ${k.impressionChange.toLocaleString()}, while clicks did not increase.`, 'Review the search snippet and CTR, and check whether the page addresses the intent behind these queries.');
  }
  if (previous.sessions && current.sessions < previous.sessions * 0.9 && previous.clicks && Math.abs(current.clicks - previous.clicks) / previous.clicks < 0.05) results.push({ id: 'attribution', type: 'attribution', title: 'Review organic traffic attribution', priority: 'High', reason: 'Organic sessions fell by over 10% while GSC clicks stayed within 5%.', action: 'Review GA4 tracking, consent settings, landing page engagement, and session attribution.', query: 'Site-wide', page: '' });
  return results.sort((a, b) => (a.priority === 'High' ? 0 : 1) - (b.priority === 'High' ? 0 : 1));
}
export function percentChange(current, previous) { return previous ? (current - previous) / previous * 100 : null; }
