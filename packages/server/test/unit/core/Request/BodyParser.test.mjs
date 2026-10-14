// @ts-check
/**
 * @file Contains the unit tests for BodyParser.
 *
 * @module test/unit/core/Request/BodyParser
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import BodyParser from '../../../../source/core/Request/BodyParser/BodyParser.mjs';
import JSONParser from '../../../../source/core/Request/BodyParser/JSONParser.mjs';
import { createMockIncomingMessage } from '../../../helpers/createMockIncomingMessage.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the input shape accepted by `createMockIncomingMessage`.
 *
 * @typedef {Parameters<typeof createMockIncomingMessage>[0]} MockIncomingMessageOptions
 */
/**
 * Represents the shape of a normalized `RequestError` for assertions.
 *
 * @typedef {Error & { code: string, cause?: unknown }} RequestErrorLike
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a JSONParser bound to a mock incoming message.
 *
 * @param {MockIncomingMessageOptions} [messageOptions] - Options for the mock message.
 * @param {number} [bodyLimit] - Maximum body size in bytes. Defaults to 10 MiB.
 * @returns {JSONParser} A parser bound to the mock message.
 */
function makeParser(messageOptions = {}, bodyLimit = 10 * 1024 * 1024) {
  const message = createMockIncomingMessage(messageOptions);

  return new JSONParser(/** @type {any} */ (message), bodyLimit);
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('BodyParser', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Abstract contract
  // ───────────────────────────────────────────────────────────────────────────
  test('Abstract contract', async sub => {
    await sub.test('should not allow direct instantiation', () => {
      assert.throws(() => new BodyParser(/** @type {any} */ ({}), 1024), { message: /abstract/i });
    });

    await sub.test('should expose incomingMessage to subclasses', () => {
      const message = createMockIncomingMessage({ headers: {} });
      const parser = new JSONParser(/** @type {any} */ (message), 1024);

      assert.strictEqual(parser.incomingMessage, message);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // readBody()
  // ───────────────────────────────────────────────────────────────────────────
  test('readBody()', async sub => {
    await sub.test('should return an empty buffer when there is no body', async () => {
      const parser = makeParser();

      const buffer = await parser.readBody();

      assert.strictEqual(buffer.length, 0);
    });

    await sub.test('should return the full body', async () => {
      const parser = makeParser({ body: 'hello world' });

      const buffer = await parser.readBody();

      assert.strictEqual(buffer.toString('utf8'), 'hello world');
    });

    await sub.test('should accept a Buffer body directly', async () => {
      const parser = makeParser({ body: Buffer.from([1, 2, 3]) });

      const buffer = await parser.readBody();

      assert.deepStrictEqual(buffer, Buffer.from([1, 2, 3]));
    });

    await sub.test('should reject invalid Content-Length', async () => {
      const parser = makeParser({
        headers: { 'content-length': 'abc' },
      });

      await assert.rejects(() => parser.readBody(), {
        name: 'RequestError',
        code: 'INVALID_CONTENT_LENGTH',
      });
    });

    await sub.test('should reject negative Content-Length', async () => {
      const parser = makeParser({
        headers: { 'content-length': '-1' },
      });

      await assert.rejects(() => parser.readBody(), {
        name: 'RequestError',
        code: 'INVALID_CONTENT_LENGTH',
      });
    });

    await sub.test('should reject when Content-Length exceeds the limit', async () => {
      const parser = makeParser(
        {
          headers: { 'content-length': '100' },
          body: 'x'.repeat(100),
        },
        10,
      );

      await assert.rejects(() => parser.readBody(), {
        name: 'RequestError',
        code: 'BODY_LIMIT_EXCEEDED',
      });
    });

    await sub.test('should reject when the actual body exceeds the limit', async () => {
      const parser = makeParser(
        {
          headers: { 'content-length': '5' },
          body: 'x'.repeat(100),
        },
        10,
      );

      await assert.rejects(() => parser.readBody(), {
        name: 'RequestError',
        code: 'BODY_LIMIT_EXCEEDED',
      });
    });

    await sub.test('should destroy the incoming message when the limit is exceeded', async () => {
      const message = createMockIncomingMessage({
        headers: { 'content-length': '100' },
        body: 'x'.repeat(100),
      });

      let destroyed = false;

      message.destroy = () => {
        destroyed = true;
        return message;
      };

      const parser = new JSONParser(/** @type {any} */ (message), 10);

      await assert.rejects(() => parser.readBody());
      assert.strictEqual(destroyed, true);
    });

    await sub.test('should preserve RequestError instances thrown by the stream', async () => {
      const message = createMockIncomingMessage({ headers: {} });

      /**
       * Simulates a stream failure by throwing a RequestError.
       *
       * @yields {Buffer} Never reached; the generator throws before yielding.
       */
      async function* simulateRequestError() {
        throw new Error('RequestError');

        // eslint-disable-next-line no-unreachable
        yield Buffer.alloc(0);
      }

      /** @type {any} */ (message)[Symbol.asyncIterator] = simulateRequestError;

      const parser = new JSONParser(/** @type {any} */ (message), 1024);

      // The custom error is a plain Error → normalized to BODY_STREAM_ERROR.
      await assert.rejects(() => parser.readBody(), {
        name: 'RequestError',
        code: 'BODY_STREAM_ERROR',
      });
    });

    await sub.test('should normalize stream failures into BODY_STREAM_ERROR', async () => {
      const message = createMockIncomingMessage({ headers: {} });

      /**
       * Simulates a stream failure by throwing a connection reset error.
       *
       * @yields {Buffer} Never reached; the generator throws before yielding.
       */
      async function* simulateStreamFailure() {
        const error = new Error('socket hang up');
        /** @type {any} */ (error).code = 'ECONNRESET';
        throw error;

        // eslint-disable-next-line no-unreachable
        yield Buffer.alloc(0);
      }

      /** @type {any} */ (message)[Symbol.asyncIterator] = simulateStreamFailure;

      const parser = new JSONParser(/** @type {any} */ (message), 1024);

      await assert.rejects(
        () => parser.readBody(),
        error => {
          const requestError = /** @type {RequestErrorLike} */ (error);

          assert.strictEqual(requestError.name, 'RequestError');
          assert.strictEqual(requestError.code, 'BODY_STREAM_ERROR');
          assert.ok(requestError.cause);

          return true;
        },
      );
    });
  });
});
