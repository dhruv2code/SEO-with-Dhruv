const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();

export function brandTerms(text) {
  return [...new Set(String(text ?? '').split(/[,\n]+/).map(normalize).filter(Boolean))];
}

export function createBrandMatcher(text) {
  // Literal words and phrases, never user-supplied regular expressions.
  // Optional spaces also recognise joined domain-style brand spellings.
  const patterns = brandTerms(text).map(term => new RegExp(`(?:^| )${[...term.replace(/ /g, '')].join(' *')}(?= |$)`, 'u'));
  return query => patterns.some(pattern => pattern.test(normalize(query)));
}

export function detectBrandTerms(website, queries = []) {
  let hostname;
  try { hostname = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.replace(/^www\./, ''); }
  catch { return []; }
  const labels = hostname.split('.');
  if (labels.length < 2 || /^\d+(\.\d+){3}$/.test(hostname)) return [];
  const countrySuffix = labels.at(-1).length === 2 && ['co', 'com', 'org', 'net', 'ac', 'edu', 'gov'].includes(labels.at(-2));
  const root = labels.at(countrySuffix ? -3 : -2);
  if (!root || normalize(root).replace(/ /g, '').length < 2) return [];
  const roots = [normalize(root)];
  if (root.startsWith('the') && root.length > 8) roots.push(normalize(root.slice(3)));
  const detected = new Set(roots);
  // Learn abbreviations only from observed spelled-out brand phrases, rather
  // than guessing initials from an unsegmented domain name.
  for (const term of roots) {
    const pattern = new RegExp(`(?:^| )(${[...term.replace(/ /g, '')].join(' *')})(?= |$)`, 'u');
    for (const query of queries) {
      const phrase = normalize(query).match(pattern)?.[1];
      if (!phrase) continue;
      detected.add(phrase);
      const words = phrase.split(' ');
      if (words.length >= 3 && words.length <= 6 && words.every(word => word.length > 1)) detected.add(words.map(word => word[0]).join(''));
    }
  }
  return [...detected];
}
