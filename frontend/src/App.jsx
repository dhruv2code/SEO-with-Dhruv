import { Component, Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { CheckCircle2, X, TriangleAlert } from 'lucide-react';
import { useDashboard } from './hooks/useDashboard';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Overview } from './pages/Overview';
const loadPage = (file, name) => lazy(() => file().then(module => ({ default: module[name] })));
const Keywords = loadPage(() => import('./pages/Keywords'), 'Keywords');
const LostKeywords = loadPage(() => import('./pages/LostKeywords'), 'LostKeywords');
const Opportunities = loadPage(() => import('./pages/Opportunities'), 'Opportunities');
const Pages = loadPage(() => import('./pages/Pages'), 'Pages');
const Recommendations = loadPage(() => import('./pages/Recommendations'), 'Recommendations');
const Analytics = loadPage(() => import('./pages/Analytics'), 'Analytics');
const Settings = loadPage(() => import('./pages/Settings'), 'Settings');
const ReportGenerator = loadPage(() => import('./pages/ReportGenerator'), 'ReportGenerator');
class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <div className="fatal-error"><TriangleAlert size={30}/><h1>The workspace could not load</h1><p>Reload to try again. If the problem continues, inspect your browser console.</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Reload workspace</button></div> : this.props.children; }
}
function Loading() { return <div className="loading-skeleton" role="status" aria-label="Loading dashboard"><div/><div className="skeleton-grid">{[1, 2, 3, 4].map(n => <div key={n}/>)}</div><div/></div>; }
function Workspace() {
  const dashboard = useDashboard(), [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  return <><DashboardLayout dashboard={dashboard} notify={setToast}><Suspense fallback={<Loading/>}>{!dashboard.reports.ready ? <Loading/> : <Routes><Route path="/" element={<Overview dashboard={dashboard}/>}/><Route path="/keywords" element={<Keywords key={dashboard.siteId} dashboard={dashboard}/>}/><Route path="/lost-keywords" element={<LostKeywords dashboard={dashboard}/>}/><Route path="/opportunities" element={<Opportunities dashboard={dashboard}/>}/><Route path="/pages" element={<Pages key={dashboard.siteId} dashboard={dashboard}/>}/><Route path="/recommendations" element={<Recommendations dashboard={dashboard}/>}/><Route path="/gsc" element={<Analytics source="gsc" dashboard={dashboard}/>}/><Route path="/ga4" element={<Analytics source="ga4" dashboard={dashboard}/>}/><Route path="/report-generator" element={<ReportGenerator key={dashboard.siteId} dashboard={dashboard}/>}/><Route path="/settings" element={<Settings dashboard={dashboard} notify={setToast}/>}/><Route path="*" element={<div className="panel empty"><h1>Page not found</h1><p>This page isn’t part of your workspace.</p><Link className="btn btn-primary" to="/">Back to overview</Link></div>}/></Routes>}</Suspense></DashboardLayout>{toast && <div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15}/></button></div>}</>;
}
export default function App() { return <ErrorBoundary><Workspace/></ErrorBoundary>; }
