// @ts-check
/**
 * @file Contains the unit tests for OptionsMiddleware.
 *
 * @module test/unit/core/routing/OptionsMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import OptionsMiddleware from '../../../../source/core/routing/RouterRegister/OptionsMiddleware.mjs';
// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @import Exchange from '#Exchange';
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {() => void | Promise<void>} NextFunction
 */

/**
 * Represents the state captured by a mock response.
 *
 * @typedef  {object}                 CapturedResponse
 * @property {number|null}            status           - HTTP status recorded via `status()`.
 * @property {Record<string, string>} headers          - Headers recorded via `setHeader()`.
 * @property {boolean}                ended            - Whether `end()` was called.
 */

/**
 * Represents a mock response used in OptionsMiddleware tests.
 *
 * @typedef  {object}                                         MockResponse
 * @property {(code: number) => MockResponse}                 status       - Records the status code.
 * @property {(name: string, value: unknown) => MockResponse} setHeader    - Records a header.
 * @property {() => MockResponse}                             end          - Marks the response as ended.
 */

/**
 * Represents the result of `makeExchange`.
 *
 * @typedef  {object}           MakeExchangeResult
 * @property {Exchange}         exchange           - The mock exchange.
 * @property {CapturedResponse} captured           - The recorded response state.
 */
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a mock exchange that records status, headers, and end calls.
 *
 * @returns {MakeExchangeResult} The mock exchange and its captured state.
 */
function makeExchange() {
  /** @type {CapturedResponse} */
  const captured = {
    status: null,
    headers: {},
    ended: false,
  };

  /** @type {MockResponse} */
  const response = {
    status(code) {
      captured.status = code;
      return response;
    },
    setHeader(name, value) {
      captured.headers[name] = String(value);
      return response;
    },
    end() {
      captured.ended = true;
      return response;
    },
  };

  return {
    exchange: /** @type {Exchange} */ (/** @type {unknown} */ ({ response })),
    captured,
  };
}
// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('OptionsMiddleware', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // methods getter
  // ───────────────────────────────────────────────────────────────────────────
  test('methods getter', async sub => {
    await sub.test('should return all supported methods when none are registered', () => {
      const middleware = new OptionsMiddleware();

      assert.strictEqual(
        middleware.methods,
        'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS, QUERY, TRACE',
      );
    });

    await sub.test('should return registered methods plus OPTIONS', () => {
      const middleware = new OptionsMiddleware();

      middleware.add('GET');
      middleware.add('POST');

      assert.strictEqual(middleware.methods, 'GET, POST, OPTIONS');
    });

    await sub.test('should not duplicate OPTIONS when explicitly registered', () => {
      const middleware = new OptionsMiddleware();

      middleware.add('GET');
      middleware.add('OPTIONS');

      const methods = middleware.methods.split(', ');

      assert.strictEqual(methods.filter(method => method === 'OPTIONS').length, 1);
    });

    await sub.test('should ignore undefined when other methods are registered', () => {
      const middleware = new OptionsMiddleware();

      middleware.add('GET');
      middleware.add(undefined);

      assert.strictEqual(middleware.methods, 'GET, OPTIONS');
    });

    await sub.test('should return all supported methods when only undefined is registered', () => {
      const middleware = new OptionsMiddleware();

      middleware.add(undefined);

      assert.strictEqual(
        middleware.methods,
        'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS, QUERY, TRACE',
      );
    });

    await sub.test('should deduplicate registered methods', () => {
      const middleware = new OptionsMiddleware();

      middleware.add('GET');
      middleware.add('GET');
      middleware.add('POST');

      assert.strictEqual(middleware.methods, 'GET, POST, OPTIONS');
    });

    await sub.test('should cache the resolved methods string', () => {
      const middleware = new OptionsMiddleware();

      middleware.add('GET');

      const first = middleware.methods;
      const second = middleware.methods;

      assert.strictEqual(first, second);
    });

    await sub.test('should invalidate the cache when a method is added', () => {
      const middleware = new OptionsMiddleware();

      middleware.add('GET');

      const first = middleware.methods;
      middleware.add('POST');
      const second = middleware.methods;

      assert.notStrictEqual(first, second);
      assert.strictEqual(second, 'GET, POST, OPTIONS');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // handle()
  // ───────────────────────────────────────────────────────────────────────────
  test('handle()', async sub => {
    await sub.test('should respond with 204 and the resolved methods', () => {
      const middleware = new OptionsMiddleware();

      middleware.add('GET');
      middleware.add('POST');

      const { exchange, captured } = makeExchange();

      middleware.handle(/** @type {any} */ (exchange), () => {});

      assert.strictEqual(captured.status, 204);
      assert.strictEqual(captured.headers['Allow'], 'GET, POST, OPTIONS');
      assert.strictEqual(captured.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
      assert.strictEqual(
        captured.headers['Access-Control-Allow-Headers'],
        'Content-Type, Authorization',
      );
      assert.strictEqual(captured.ended, true);
    });

    await sub.test('should not call next()', () => {
      const middleware = new OptionsMiddleware();
      const { exchange } = makeExchange();

      let nextCalled = false;

      middleware.handle(/** @type {any} */ (exchange), () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
    });

    await sub.test('should use the all-methods default when nothing is registered', () => {
      const middleware = new OptionsMiddleware();
      const { exchange, captured } = makeExchange();

      middleware.handle(/** @type {any} */ (exchange), () => {});

      assert.strictEqual(
        captured.headers['Allow'],
        'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS, QUERY, TRACE',
      );
    });

    await sub.test('should be bound to the instance', () => {
      const middleware = new OptionsMiddleware();
      middleware.add('GET');

      const { exchange, captured } = makeExchange();
      const handle = middleware.handle;

      handle(/** @type {any} */ (exchange), () => {});

      assert.strictEqual(captured.status, 204);
      assert.strictEqual(captured.headers['Allow'], 'GET, OPTIONS');
    });
  });
});
