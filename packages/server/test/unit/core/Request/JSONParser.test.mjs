// @ts-check
/**
 * @file Contains the unit tests for JSONParser.
 *
 * @module test/unit/core/Request/JSONParser
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import JSONParser from '../../../../source/core/Request/BodyParser/JSONParser.mjs';
import { createMockIncomingMessage } from '../../../helpers/createMockIncomingMessage.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the shape of a normalized `RequestError` for assertions.
 *
 * @typedef {Error & { code: string, cause?: unknown }} RequestErrorLike
 */
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a JSONParser bound to a mock incoming message.
 *
 * @param {string|Buffer} body - Raw JSON body.
 * @param {number} [bodyLimit] - Maximum body size in bytes. Defaults to 10 MiB.
 * @returns {JSONParser} A parser bound to the mock message.
 */
function makeParser(body, bodyLimit = 10 * 1024 * 1024) {
  const message = createMockIncomingMessage({
    headers: { 'content-length': String(Buffer.byteLength(body)) },
    body,
  });

  return new JSONParser(/** @type {any} */ (message), bodyLimit);
}

/**
 * Asserts that an error is a normalized parse failure.
 *
 * @param {unknown} error - The rejection reason.
 * @returns {boolean} Always `true` when assertions pass.
 */
function assertParseError(error) {
  assert.ok(error instanceof Error);
  assert.strictEqual(error.name, 'RequestError');

  const requestError = /** @type {RequestErrorLike} */ (error);

  assert.strictEqual(requestError.code, 'BODY_PARSE_FAILED');
  assert.ok(requestError.cause);

  return true;
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('JSONParser', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // parse()
  // ───────────────────────────────────────────────────────────────────────────
  test('parse()', async sub => {
    await sub.test('should parse a JSON object', async () => {
      const parser = makeParser('{"a":1,"b":"two"}');

      assert.deepStrictEqual(await parser.parse(), { a: 1, b: 'two' });
    });

    await sub.test('should parse a JSON array', async () => {
      const parser = makeParser('[1,2,3]');

      assert.deepStrictEqual(await parser.parse(), [1, 2, 3]);
    });

    await sub.test('should parse a JSON primitive', async () => {
      const parser = makeParser('42');

      assert.strictEqual(await parser.parse(), 42);
    });

    await sub.test('should parse null', async () => {
      const parser = makeParser('null');

      assert.strictEqual(await parser.parse(), null);
    });

    await sub.test('should parse an empty object', async () => {
      const parser = makeParser('{}');

      assert.deepStrictEqual(await parser.parse(), {});
    });

    await sub.test('should reject invalid JSON', async () => {
      const parser = makeParser('{ invalid }');

      await assert.rejects(() => parser.parse(), assertParseError);
    });

    await sub.test('should reject when the body is empty', async () => {
      const message = createMockIncomingMessage({ headers: {} });
      const parser = new JSONParser(/** @type {any} */ (message), 1024);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
    });

    await sub.test('should reject when the body exceeds the limit', async () => {
      const parser = makeParser('{"a":"' + 'x'.repeat(100) + '"}', 10);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_LIMIT_EXCEEDED',
      });
    });
  });
});
