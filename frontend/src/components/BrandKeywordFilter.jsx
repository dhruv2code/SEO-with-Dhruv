import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { usePersistentState } from '../hooks/usePersistentState';
import { brandTerms, createBrandMatcher } from '../lib/brandKeywords';

export function useBrandKeywordFilter(website) {
  const [saved, setSaved, error] = usePersistentState('dhruv-brand-keywords-v1', {});
  const siteKey = String(website || '').toLowerCase().replace(/^www\./, '');
  const settings = saved?.[siteKey];
  const terms = typeof settings?.terms === 'string' ? settings.terms : '';
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
      <label>Brand filter<select aria-label="Brand keyword filter" value={brand.mode} onChange={event => { brand.update({ mode: event.target.value }); onChange(); }}>
        <option value="all">All keywords</option>
        <option value="exclude" disabled={!count}>Exclude branded keywords</option>
        <option value="only" disabled={!count}>Branded keywords only</option>
      </select></label>
      <Button variant="outline" size="sm" onClick={() => { setDraft(brand.terms); setOpen(true); }}>Brand terms{count ? ` (${count})` : ''}</Button>
    </div>
    <p>{count ? `Matches your saved brand terms for ${website}. Search, filters, and exports use this selection.` : 'Add your brand name and variations to filter branded searches.'}</p>
    {brand.error && <p role="alert">{brand.error}</p>}
    <Dialog open={open} onOpenChange={setOpen} title="Set your brand terms" description={`Define branded searches for ${website}. Saved in this browser for this website.`}>
      <form onSubmit={event => { event.preventDefault(); brand.update({ terms: draft.trim(), ...(!brandTerms(draft).length ? { mode: 'all' } : {}) }); onChange(); setOpen(false); }}>
        <label htmlFor="brand-keyword-terms">Brand names and variations</label>
        <textarea id="brand-keyword-terms" className="brand-terms-input" value={draft} onChange={event => setDraft(event.target.value)} rows={5} maxLength={4000} placeholder={'The Wall Street School, TWSS\nthewallstreetschool.com'}/>
        <p className="brand-terms-help">Separate terms with commas or new lines. Matching ignores case, punctuation, and spaces between words. Add abbreviations and alternate spellings explicitly. Clearing this list turns off the filter.</p>
        <Button className="full-width" type="submit">Save brand terms</Button>
      </form>
    </Dialog>
  </div>;
}
