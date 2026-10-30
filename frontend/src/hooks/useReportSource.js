import { useEffect, useState } from 'react';
import { listFiles } from '../services/files';
import { isPerformanceFile, parseReportFile } from '../services/reportImport';

const cache = new Map();
const storageKey = siteId => `dhruv-active-report:${siteId}`;
function persist(siteId, id) { try { localStorage.setItem(storageKey(siteId), id || ''); } catch { /* IndexedDB remains the source of saved files. */ } }

export function useReportSource(siteId) {
  const [refresh, setRefresh] = useState({ version: 0, preferredIds: [] });
  const [state, setState] = useState({ siteId: null, files: [], results: {}, activeId: null, loading: true, ready: false, error: '' });
  useEffect(() => {
    let active = true;
    setState(previous => ({ ...previous, loading: true }));
    async function load() {
      try {
        const files = await listFiles(siteId), results = {};
        for (const file of files) {
          if (!isPerformanceFile(file.name)) { results[file.id] = { attachment: true }; continue; }
          if (!cache.has(file.id)) cache.set(file.id, parseReportFile(file).then(report => ({ report })).catch(error => { cache.delete(file.id); return { error: error.message }; }));
          results[file.id] = await cache.get(file.id);
        }
        if (!active) return;
        let stored;
        try { stored = localStorage.getItem(storageKey(siteId)); } catch { /* Use the newest valid report. */ }
        const candidates = [...refresh.preferredIds, stored, ...files.map(file => file.id)];
        const activeId = candidates.find(id => results[id]?.report) || null;
        persist(siteId, activeId);
        setState({ siteId, files, results, activeId, loading: false, ready: true, error: '' });
      } catch {
        if (active) setState({ siteId, files: [], results: {}, activeId: null, loading: false, ready: true, error: 'Saved reports could not be loaded. Allow browser storage, then try again.' });
      }
    }
    load();
    return () => { active = false; };
  }, [siteId, refresh]);
  const current = state.siteId === siteId;
  const selectedId = current ? state.activeId : null;
  return {
    files: current ? state.files : [], results: current ? state.results : {},
    activeId: selectedId,
    report: current ? state.results[state.activeId]?.report || null : null,
    loading: !current || state.loading, ready: current && state.ready, error: current ? state.error : '',
    reload: (preferredIds = []) => setRefresh(previous => ({ version: previous.version + 1, preferredIds })),
    select: id => { persist(siteId, id); setState(previous => ({ ...previous, activeId: id })); },
  };
}
