import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

test('lazy page loader announces its page and keeps the loading indicator', () => {
  const source = readFileSync(new URL('../src/legacy-app.js', import.meta.url), 'utf8');
  const start = source.indexOf('function PageLoader(');
  const end = source.indexOf('function Skeleton(', start);
  assert.ok(start >= 0 && end > start, 'shared loader exists');
  const context = {
    React: { createElement },
    Loader2: ({ className }) => createElement('span', { className, 'data-testid': 'spinner' }),
  };
  const PageLoader = runInNewContext(`${source.slice(start, end)}; PageLoader`, context);
  const html = renderToStaticMarkup(createElement(PageLoader, { message: 'Loading Reports…' }));
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Loading Reports…/);
  assert.match(html, /data-testid="spinner"/);
  assert.match(html, /animate-spin/);
});
