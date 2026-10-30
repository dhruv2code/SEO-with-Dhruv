const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();

export function brandTerms(text) {
  return [...new Set(String(text ?? '').split(/[,\n]+/).map(normalize).filter(Boolean))];
}

export function createBrandMatcher(text) {
  // Literal words and phrases, never user-supplied regular expressions.
  // Optional spaces also recognise joined domain-style brand spellings.
  const patterns = brandTerms(text).map(term => new RegExp(`(?:^| )${term.split(' ').join(' *')}(?= |$)`, 'u'));
  return query => patterns.some(pattern => pattern.test(normalize(query)));
}
