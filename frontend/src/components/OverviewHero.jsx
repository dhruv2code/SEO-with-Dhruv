import { Link } from 'react-router-dom';
import { ArrowUpRight, Upload, Sparkles } from 'lucide-react';

export function OverviewHero({ dashboard }) {
  return (
    <section className="overview-hero" aria-labelledby="overview-title">
      <div className="hero-copy">
        <div className="hero-eyebrow"><span/><span>YOUR SEARCH, IN FOCUS</span></div>
        <h1 id="overview-title">A clearer view of<br/><span>your growth.</span></h1>
        <p>Find the signals. Focus your strategy.<br className="hero-mobile-break"/> Make your next SEO move count.</p>
        <div className="hero-actions">
          <Link to="/keywords" className="btn hero-primary">Explore keywords<ArrowUpRight size={16}/></Link>
          <a href="#overview-files" className="hero-secondary"><Upload size={15}/>Import your report</a>
        </div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/>
        <div className="hero-chart-card">
          <div className="hero-chart-label"><span className="hero-chart-dot"/>A little clarity. A lot of possibility.<Sparkles size={15}/></div>
          <svg viewBox="0 0 290 104" fill="none"><defs><linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2dd4bf" stopOpacity=".3"/><stop offset="1" stopColor="#2dd4bf" stopOpacity="0"/></linearGradient></defs><path d="M5 83H285M5 53H285M5 23H285" stroke="#ffffff10" strokeDasharray="3 5"/><path d="M5 85C34 86 30 67 56 70S85 81 112 54S143 71 167 43S192 49 217 25S252 35 283 10V103H5Z" fill="url(#hero-fill)"/><path d="M5 85C34 86 30 67 56 70S85 81 112 54S143 71 167 43S192 49 217 25S252 35 283 10" stroke="#5eead4" strokeWidth="3" strokeLinecap="round"/><circle cx="283" cy="10" r="5" fill="#5eead4" stroke="#1e3558" strokeWidth="3"/></svg>
          <div className="hero-chart-caption"><span>VISIBILITY</span><span>INSIGHT</span><span>GROWTH</span></div>
        </div>
        <div className="hero-source-chip"><span/>{dashboard.isImported ? 'Your report. Your insights.' : 'Your next opportunity starts here.'}</div>
      </div>
    </section>
  );
}
