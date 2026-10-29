// Deterministic synthetic data, isolated from the future Google API data source.
// Never present this fixture as a connected property or a successful synchronization.
export const demoSites = [
  { id: 'dhruv', name: 'dhruvseo.com', url: 'https://dhruvseo.com', label: 'Dhruv SEO' },
  { id: 'journal', name: 'growthjournal.example', url: 'https://growthjournal.example', label: 'Growth Journal' },
];
const fixtures = [
  ['seo services', '/seo-services', 920, 4.2, -1.8],
  ['seo consultant india', '/seo-consultant', 680, 2.8, -1.2],
  ['technical seo checklist', '/blog/technical-seo-checklist', 760, 6.4, -2.4],
  ['keyword research tools', '/blog/keyword-research-tools', 1240, 8.6, -1.6],
  ['local seo services', '/local-seo', 540, 3.1, -0.7],
  ['how to improve website ranking', '/blog/improve-rankings', 1450, 12.3, -2.2],
  ['on page seo guide', '/blog/on-page-seo', 870, 7.8, 4.3],
  ['seo audit services', '/seo-audit', 620, 4.6, -1.3],
  ['google search console guide', '/blog/search-console', 1560, 9.4, 2.3],
  ['organic traffic growth', '/blog/organic-traffic', 1100, 14.2, -3.4],
  ['ecommerce seo strategy', '/blog/ecommerce-seo', 820, 18.1, 8.4],
  ['seo with dhruv', '/', 310, 1.2, -0.1],
  ['seo expert mumbai', '/seo-consultant', 350, 3.5, -0.8],
  ['website seo audit checklist', '/seo-audit', 940, 11.6, 4.8],
  ['internal linking strategy', '/blog/internal-linking', 690, 7.3, -2.4],
  ['best seo practices', '/blog/on-page-seo', 1120, 16.2, 5.1],
  ['seo content optimization', '/blog/content-optimization', 610, 5.7, -1.4],
  ['mobile seo tips', '/blog/mobile-seo', 440, 24.2, 8.9],
  ['core web vitals guide', '/blog/core-web-vitals', 720, 8.2, -2.1],
  ['wordpress seo setup', '/blog/wordpress-seo', 590, 10.4, 1.2],
  ['seo reporting template', '/blog/seo-reporting', 520, 6.8, -1.5],
  ['search intent optimization', '/blog/search-intent', 640, 13.4, -2.3],
  ['seo training workshop', '/seo-training', 380, 19.4, 3.5],
  ['free seo consultation', '/seo-consultant', 260, 6.3, -0.6],
];
export const todayISO = () => new Date().toLocaleDateString('en-CA');
export function addDays(iso, days) { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export const latestDate = addDays(todayISO(), -3);
export function createDemoData(site) {
  const records = [], traffic = [];
  const scale = site.id === 'journal' ? 0.64 : 1;
  const pages = [...new Set(fixtures.map(f => f[1]))];
  for (let day = 0; day < 200; day++) {
    const date = addDays(latestDate, day - 199);
    const phase = day / 199;
    fixtures.forEach(([query, path, base, position, movement], i) => {
      // One fixture deliberately disappears; this signifies missing visibility, never a proven deindexing.
      if (i === 22 && day > 164) return;
      const wobble = 0.9 + Math.sin(day * 0.62 + i) * 0.16 + Math.cos(day * 0.19) * 0.09;
      const impressions = Math.max(0, Math.round(base * scale * (0.62 + phase * 0.5) * wobble));
      const avgPosition = Math.max(1, position + movement * ((day - 185) / 28) + Math.sin(day * 0.3 + i) * 0.28);
      const ctr = (i === 3 || i === 8 || i === 5) ? 0.009 + i * 0.0002 : Math.min(0.3, 0.27 / Math.pow(avgPosition, 0.88));
      records.push({ date, query, page: site.url + path, impressions, clicks: Math.round(impressions * ctr), position: avgPosition });
    });
    pages.forEach((path, i) => {
      const sessions = Math.round((105 + i * 9) * scale * (0.72 + phase * 0.5) * (1 + Math.sin(day * 0.3 + i) * 0.18));
      traffic.push({ date, page: site.url + path, sessions, users: Math.round(sessions * 0.81), engaged: Math.round(sessions * 0.71), conversions: Math.round(sessions * (i === 4 ? 0.002 : 0.024)) });
    });
  }
  return { records, traffic, latestDate };
}
