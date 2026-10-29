import { useMemo, useState } from 'react';
import { createDemoData, demoSites, latestDate, addDays } from '../services/demoData';
import { compareKeywords, getPages, groupTime, inRange, previousRange, recommendations, summarize } from '../lib/analytics';
import { usePersistentState } from './usePersistentState';
import { useReportSource } from './useReportSource';
import { deriveReport } from '../services/reportImport';
export function useDashboard() {
  const [siteId, setSiteId] = useState('dhruv');
  const sourceSite = demoSites.find(s => s.id === siteId);
  const reports = useReportSource(siteId);
  const report = reports.report;
  const isImported = !!report;
  const site = report?.siteName ? { ...sourceSite, name: report.siteName } : sourceSite;
  const sourceId = `${siteId}:${reports.activeId || 'demo'}`;
  const defaultRange = report?.range || { start: addDays(latestDate, -27), end: latestDate };
  const [rangeState, setRangeState] = useState(null);
  const range = rangeState?.sourceId === sourceId ? rangeState.range : defaultRange;
  const setRange = next => setRangeState({ sourceId, range: next });
  const [compareRequested, setCompare] = useState(true);
  const [interval, setInterval] = useState('daily');
  const [tracked, setTracked, storageError] = usePersistentState('dhruv-tracked-v1', {});
  const [statuses, setStatuses, statusError] = usePersistentState('dhruv-recommendations-v1', {});
  const data = useMemo(() => report ? {
    records: report.queryRows.filter(row => row.date), traffic: [], latestDate: report.range?.end || 'not provided',
  } : createDemoData(sourceSite), [report, sourceSite]);
  const derived = useMemo(() => {
    if (report) return deriveReport(report, range, interval);
    const previous = previousRange(range);
    const all = [...data.records, ...data.traffic];
    const current = summarize(all.filter(r => inRange(r.date, range)));
    const prior = summarize(all.filter(r => inRange(r.date, previous)));
    const keywords = compareKeywords(data.records, range);
    return { current, prior, previous, comparisonAvailable: true, keywords, pages: getPages(data.records, data.traffic, range), recommendations: recommendations(keywords, current, prior), series: groupTime(data.records, data.traffic, range, interval) };
  }, [data, report, range.start, range.end, interval]);
  const compare = compareRequested && derived.comparisonAvailable;
  const trackedKeywords = Array.isArray(tracked?.[siteId]) ? tracked[siteId] : [];
  const toggleTrack = query => setTracked(prev => {
    const current = Array.isArray(prev?.[siteId]) ? prev[siteId] : [];
    return { ...prev, [siteId]: current.includes(query) ? current.filter(q => q !== query) : [...current, query] };
  });
  const clearTracked = () => setTracked(prev => ({ ...prev, [siteId]: [] }));
  const recommendationStatus = id => statuses?.[`${siteId}:${id}`] || 'Pending';
  const setRecommendationStatus = (id, status) => setStatuses(prev => ({ ...prev, [`${siteId}:${id}`]: status }));
  return { ...derived, data, site, siteId, sourceSite, setSiteId, range, setRange, compare, setCompare, interval, setInterval, trackedKeywords, toggleTrack, clearTracked, recommendationStatus, setRecommendationStatus, storageError: storageError || statusError, reports, report, isImported };
}
