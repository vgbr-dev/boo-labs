// @ts-check
/**
 * @file Contains the unit tests for RequestHeaders.
 *
 * @module test/unit/core/Request/RequestHeaders
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import RequestHeaders from '../../../../source/core/Request/RequestHeaders.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('RequestHeaders', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should accept an empty header map', () => {
      const headers = new RequestHeaders({});

      assert.deepStrictEqual(headers.getNames(), []);
    });

    await sub.test('should normalize header names to lowercase', () => {
      const headers = new RequestHeaders({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'value',
      });

      assert.strictEqual(headers.get('content-type'), 'application/json');
      assert.strictEqual(headers.get('x-custom-header'), 'value');
    });

    await sub.test('should copy array values on construction', () => {
      const source = { 'set-cookie': ['a=1', 'b=2'] };
      const headers = new RequestHeaders(source);

      source['set-cookie'].push('c=3');

      assert.deepStrictEqual(headers.get('set-cookie'), ['a=1', 'b=2']);
    });

    await sub.test('should filter HTTP/2 pseudo-headers', () => {
      const headers = new RequestHeaders({
        ':scheme': 'https',
        ':authority': 'example.com',
        ':method': 'GET',
        ':path': '/users',
        host: 'example.com',
      });

      assert.deepStrictEqual(headers.getNames(), ['host']);
      assert.strictEqual(headers.get(':scheme'), undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // get()
  // ───────────────────────────────────────────────────────────────────────────
  test('get()', async sub => {
    await sub.test('should return undefined for missing headers', () => {
      const headers = new RequestHeaders({});

      assert.strictEqual(headers.get('content-type'), undefined);
    });

    await sub.test('should be case-insensitive', () => {
      const headers = new RequestHeaders({ 'Content-Type': 'application/json' });

      assert.strictEqual(headers.get('CONTENT-TYPE'), 'application/json');
      assert.strictEqual(headers.get('content-type'), 'application/json');
      assert.strictEqual(headers.get('Content-Type'), 'application/json');
    });

    await sub.test('should return a copy for array values', () => {
      const headers = new RequestHeaders({ 'set-cookie': ['a=1', 'b=2'] });

      const value = /** @type {string[]} */ (headers.get('set-cookie'));
      value.push('c=3');

      assert.deepStrictEqual(headers.get('set-cookie'), ['a=1', 'b=2']);
    });

    await sub.test('should return the value as-is for scalar values', () => {
      const headers = new RequestHeaders({ 'content-type': 'application/json' });

      assert.strictEqual(headers.get('content-type'), 'application/json');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // has()
  // ───────────────────────────────────────────────────────────────────────────
  test('has()', async sub => {
    await sub.test('should return true when the header exists', () => {
      const headers = new RequestHeaders({ 'content-type': 'application/json' });

      assert.strictEqual(headers.has('content-type'), true);
      assert.strictEqual(headers.has('CONTENT-TYPE'), true);
    });

    await sub.test('should return false when the header is missing', () => {
      const headers = new RequestHeaders({});

      assert.strictEqual(headers.has('content-type'), false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // getNames()
  // ───────────────────────────────────────────────────────────────────────────
  test('getNames()', async sub => {
    await sub.test('should return normalized names', () => {
      const headers = new RequestHeaders({
        'Content-Type': 'application/json',
        'X-Custom': 'value',
      });

      assert.deepStrictEqual(headers.getNames().sort(), ['content-type', 'x-custom']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // entries() / Symbol.iterator
  // ───────────────────────────────────────────────────────────────────────────
  test('iteration', async sub => {
    await sub.test('entries() should yield [name, value] pairs', () => {
      const headers = new RequestHeaders({
        'content-type': 'application/json',
        'x-custom': 'value',
      });

      const entries = [.../** @type {any} */ (headers.entries())];

      assert.deepStrictEqual(
        entries.sort((a, b) => a[0].localeCompare(b[0])),
        [
          ['content-type', 'application/json'],
          ['x-custom', 'value'],
        ],
      );
    });

    await sub.test('entries() should copy array values', () => {
      const headers = new RequestHeaders({ 'set-cookie': ['a=1'] });

      const entries = [...headers.entries()];
      const [, value] = /** @type {[string, string[]]} */ (entries[0]);
      value.push('b=2');

      assert.deepStrictEqual(headers.get('set-cookie'), ['a=1']);
    });

    await sub.test('should be iterable with for...of', () => {
      const headers = new RequestHeaders({ 'x-a': '1', 'x-b': '2' });

      const names = [];
      for (const [name] of headers) {
        names.push(name);
      }

      assert.deepStrictEqual(names.sort(), ['x-a', 'x-b']);
    });

    await sub.test('should support Object.fromEntries', () => {
      const headers = new RequestHeaders({ 'x-a': '1', 'x-b': '2' });

      assert.deepStrictEqual(Object.fromEntries(headers), { 'x-a': '1', 'x-b': '2' });
    });
  });
});
