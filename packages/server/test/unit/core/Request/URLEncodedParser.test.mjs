// @ts-check
/**
 * @file Contains the unit tests for URLEncodedParser.
 *
 * @module test/unit/core/Request/URLEncodedParser
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import URLEncodedParser from '../../../../source/core/Request/BodyParser/URLEncodedParser.mjs';
import { createMockIncomingMessage } from '../../../helpers/createMockIncomingMessage.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the input shape accepted by `makeParser`.
 *
 * @typedef {Parameters<typeof createMockIncomingMessage>[0]} MockIncomingMessageOptions
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a URLEncodedParser bound to a mock incoming message.
 *
 * @param {string} body - Raw URL-encoded body.
 * @param {number} [bodyLimit] - Maximum body size in bytes. Defaults to 10 MiB.
 * @returns {URLEncodedParser} A parser bound to the mock message.
 */
function makeParser(body, bodyLimit = 10 * 1024 * 1024) {
  const message = createMockIncomingMessage({
    headers: { 'content-length': String(Buffer.byteLength(body)) },
    body,
  });

  return new URLEncodedParser(/** @type {any} */ (message), bodyLimit);
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('URLEncodedParser', () => {
  test('parse()', async sub => {
    await sub.test('should parse a simple key-value pair', async () => {
      const parser = makeParser('hello=world');

      const body = await parser.parse();

      assert.strictEqual(body.get('hello'), 'world');
    });

    await sub.test('should parse multiple pairs', async () => {
      const parser = makeParser('a=1&b=2&c=3');

      const body = await parser.parse();

      assert.strictEqual(body.get('a'), '1');
      assert.strictEqual(body.get('b'), '2');
      assert.strictEqual(body.get('c'), '3');
    });

    await sub.test('should decode percent-encoded values', async () => {
      const parser = makeParser('name=John%20Doe&city=New%20York');

      const body = await parser.parse();

      assert.strictEqual(body.get('name'), 'John Doe');
      assert.strictEqual(body.get('city'), 'New York');
    });

    await sub.test('should decode + as space', async () => {
      const parser = makeParser('name=John+Doe');

      const body = await parser.parse();

      assert.strictEqual(body.get('name'), 'John Doe');
    });

    await sub.test('should return an empty URLSearchParams for an empty body', async () => {
      const parser = makeParser('');

      const body = await parser.parse();

      assert.strictEqual(body.toString(), '');
    });

    await sub.test('should reject when the body exceeds the limit', async () => {
      const parser = makeParser('a=' + 'x'.repeat(100), 10);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_LIMIT_EXCEEDED',
      });
    });
  });
});
