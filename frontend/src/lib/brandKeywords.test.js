import test from 'node:test';
import assert from 'node:assert/strict';
import { brandTerms, createBrandMatcher, detectBrandTerms } from './brandKeywords.js';

test('brand matching recognises phrases, abbreviations and joined domain spellings', () => {
  const matches = createBrandMatcher('The Wall Street School, TWSS');
  for (const query of ['THE WALL STREET SCHOOL fees', 'thewallstreetschool courses', 'twss reviews', 'the-wall-street-school', 'www.thewallstreetschool.com']) assert.ok(matches(query), query);
  for (const query of ['financial modelling course', 'newtwss course', 'the wall street schooling']) assert.equal(matches(query), false, query);
});

test('website detection excludes spaced domain brands and observed abbreviations with no setup', () => {
  const terms = detectBrandTerms('www.thewallstreetschool.com', ['the wall street school fees', 'twss reviews', 'wall street school course', 'financial modelling']);
  const matches = createBrandMatcher(terms.join('\n'));
  for (const query of ['thewallstreetschool', 'The Wall Street School fees', 'wallstreet school', 'TWSS fees']) assert.ok(matches(query), query);
  for (const query of ['financial modelling', 'wall street news', 'school courses']) assert.equal(matches(query), false, query);
});

test('automatic terms are website-specific and handle country domains and empty sources', () => {
  assert.deepEqual(detectBrandTerms('https://shop.acme.co.in/path'), ['acme']);
  assert.deepEqual(detectBrandTerms('localhost'), []);
  assert.deepEqual(detectBrandTerms('127.0.0.1'), []);
  assert.equal(createBrandMatcher(detectBrandTerms('example.com').join(','))('acme courses'), false);
});

test('brand terms are literal, deduplicated, Unicode aware and empty-safe', () => {
  assert.deepEqual(brandTerms(' Acme, ACME\n, वित्तीय प्रशिक्षण\n'), ['acme', 'वित्तीय प्रशिक्षण']);
  assert.ok(createBrandMatcher('वित्तीय प्रशिक्षण')('वित्तीय प्रशिक्षण कोर्स'));
  assert.ok(createBrandMatcher('C++, finance.example')('finance.example courses'));
  assert.equal(createBrandMatcher('.*')('arbitrary keyword'), false);
  assert.equal(createBrandMatcher(' , \n')('seo services'), false);
});
