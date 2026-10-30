import test from 'node:test';
import assert from 'node:assert/strict';
import { brandTerms, createBrandMatcher } from './brandKeywords.js';

test('brand matching recognises phrases, abbreviations and joined domain spellings', () => {
  const matches = createBrandMatcher('The Wall Street School, TWSS');
  for (const query of ['THE WALL STREET SCHOOL fees', 'thewallstreetschool courses', 'twss reviews', 'the-wall-street-school', 'www.thewallstreetschool.com']) assert.ok(matches(query), query);
  for (const query of ['financial modelling course', 'newtwss course', 'the wall street schooling']) assert.equal(matches(query), false, query);
});

test('brand terms are literal, deduplicated, Unicode aware and empty-safe', () => {
  assert.deepEqual(brandTerms(' Acme, ACME\n, वित्तीय प्रशिक्षण\n'), ['acme', 'वित्तीय प्रशिक्षण']);
  assert.ok(createBrandMatcher('वित्तीय प्रशिक्षण')('वित्तीय प्रशिक्षण कोर्स'));
  assert.ok(createBrandMatcher('C++, finance.example')('finance.example courses'));
  assert.equal(createBrandMatcher('.*')('arbitrary keyword'), false);
  assert.equal(createBrandMatcher(' , \n')('seo services'), false);
});
