import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { usePersistentState } from '../hooks/usePersistentState';
import { brandTerms, createBrandMatcher, detectBrandTerms } from '../lib/brandKeywords';

export function useBrandKeywordFilter(website, keywords) {
  const [saved, setSaved, error] = usePersistentState('dhruv-brand-keywords-v1', {});
  const siteKey = String(website || '').toLowerCase().replace(/^www\./, '');
  const settings = saved?.[siteKey];
  const automatic = useMemo(() => detectBrandTerms(website, keywords.map(row => row.query)).join('\n'), [website, keywords]);
  const terms = brandTerms([automatic, typeof settings?.terms === 'string' ? settings.terms : ''].join('\n')).join('\n');
  const mode = ['exclude', 'only'].includes(settings?.mode) && brandTerms(terms).length ? settings.mode : 'all';
  const matches = useMemo(() => createBrandMatcher(terms), [terms]);
  const update = next => setSaved(previous => ({ ...previous, [siteKey]: { terms, mode, ...next } }));
  return { terms, mode, matches, update, error };
}

export function BrandKeywordFilter({ brand, website, onChange }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState('');
  const count = brandTerms(brand.terms).length;
  return <div className="brand-keyword-filter">
    <div className="brand-filter-controls">
      <Button variant={brand.mode === 'exclude' ? 'default' : 'outline'} size="sm" aria-pressed={brand.mode === 'exclude'} onClick={() => { brand.update({ mode: brand.mode === 'exclude' ? 'all' : 'exclude' }); onChange(); }}>Exclude branded keywords</Button>
      <details className="brand-filter-options"><summary>More options</summary><label className="brand-view-label">View<select aria-label="Brand keyword filter" value={brand.mode} onChange={event => { brand.update({ mode: event.target.value }); onChange(); }}>
        <option value="all">All keywords</option>
        <option value="exclude" disabled={!count}>Exclude branded keywords</option>
        <option value="only" disabled={!count}>Branded keywords only</option>
      </select></label>
      <Button className="brand-edit-terms" variant="ghost" size="sm" onClick={() => { setDraft(brand.terms); setOpen(true); }}>Edit brand terms</Button></details>
    </div>
    <p>{count ? `${brand.mode === 'exclude' ? 'Branded keywords hidden' : 'Brand detected'} for ${website}. Click the button to ${brand.mode === 'exclude' ? 'show all keywords again' : 'exclude them'}.` : 'A website address is needed to detect your brand. You can also add brand terms.'}</p>
    {brand.error && <p role="alert">{brand.error}</p>}
    <Dialog open={open} onOpenChange={setOpen} title="Set your brand terms" description={`Define branded searches for ${website}. Saved in this browser for this website.`}>
      <form onSubmit={event => { event.preventDefault(); brand.update({ terms: draft.trim() }); onChange(); setOpen(false); }}>
        <label htmlFor="brand-keyword-terms">Brand names and variations</label>
        <textarea id="brand-keyword-terms" className="brand-terms-input" value={draft} onChange={event => setDraft(event.target.value)} rows={5} maxLength={4000} placeholder={'The Wall Street School, TWSS\nthewallstreetschool.com'}/>
        <p className="brand-terms-help">Brand terms are detected automatically. Optionally adjust names, abbreviations, or alternate spellings here. Separate terms with commas or new lines. Clearing this list restores automatic detection.</p>
        <Button className="full-width" type="submit">Save brand terms</Button>
      </form>
    </Dialog>
  </div>;
}
