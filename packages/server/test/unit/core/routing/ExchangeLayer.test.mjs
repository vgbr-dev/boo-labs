// @ts-check
/**
 * @file Contains the unit tests for ExchangeLayer.
 *
 * @module test/unit/routing/ExchangeLayer
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';

// » IMPORT LOCAL MODULES
import ExchangeLayer from '#routing/ExchangeLayer';
// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @import Exchange from '#Exchange';
 */

/**
 * Options accepted by `makeExchange`.
 *
 * @typedef  {object} MakeExchangeOptions
 * @property {string} [method]            - HTTP method. Defaults to `'GET'`.
 * @property {string} [pathname]          - Request pathname. Defaults to `'/'`.
 */

/**
 * Minimal exchange mock used by `ExchangeLayer`.
 *
 * @typedef  {object} ExchangeMock
 * @property {object} request          - Request descriptor.
 * @property {string} request.method   - HTTP method.
 * @property {string} request.pathname - Request pathname.
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {() => void | Promise<void>} NextFunction
 */

/**
 * Represents a middleware function used by the exchange layer.
 *
 * @typedef {(exchange: ExchangeMock, next: NextFunction) => void | Promise<void>} MiddlewareFunction
 */

/**
 * A single recorded middleware invocation.
 *
 * @typedef  {object}       MiddlewareCall
 * @property {ExchangeMock} exchange       - Exchange passed to the middleware.
 * @property {NextFunction} next           - Next function passed to the middleware.
 */

/**
 * Middleware mock and its recorded invocations.
 *
 * @typedef  {object}                MiddlewareMock
 * @property {MiddlewareFunction}    middleware     - The middleware under test.
 * @property {Array<MiddlewareCall>} calls          - Recorded invocations.
 */
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a minimal exchange mock.
 *
 * @param {MakeExchangeOptions} [options] - Exchange overrides.
 * @returns {Exchange} Exchange mock instance.
 */
function makeExchange({ method = 'GET', pathname = '/' } = {}) {
  return /** @type {Exchange} */ (
    /** @type {unknown} */ ({
      request: { method, pathname },
    })
  );
}

/**
 * Creates a middleware function and records its invocations.
 *
 * @returns {MiddlewareMock} Middleware and its recorded calls.
 */
function makeMiddleware() {
  /** @type {Array<MiddlewareCall>} */
  const calls = [];

  /**
   * Records each invocation and forwards control to the next layer.
   *
   * @type {MiddlewareFunction}
   */
  const middleware = (exchange, next) => {
    calls.push({ exchange, next });
  };

  return { middleware, calls };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('ExchangeLayer', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should expose configured method', () => {
      const { middleware } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      assert.strictEqual(layer.method, 'GET');
    });

    await sub.test('should expose configured pathnamePattern', () => {
      const { middleware } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      assert.strictEqual(layer.pathnamePattern, '/users');
    });

    await sub.test('should preserve undefined matching criteria', () => {
      const { middleware } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: undefined,
        pathnamePattern: undefined,
        middleware,
      });

      assert.strictEqual(layer.method, undefined);
      assert.strictEqual(layer.pathnamePattern, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // handle()
  // ───────────────────────────────────────────────────────────────────────────
  test('handle()', async sub => {
    await sub.test('should execute middleware when the exchange matches', async () => {
      const { middleware, calls } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      const exchange = makeExchange({
        method: 'GET',
        pathname: '/users',
      });

      const next = async () => {};

      await layer.handle(exchange, next);

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].exchange, exchange);
      assert.strictEqual(calls[0].next, next);
    });

    await sub.test('should call next when the exchange does not match', async () => {
      const { middleware, calls } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      const exchange = makeExchange({
        method: 'POST',
        pathname: '/users',
      });

      let nextCalled = false;

      const next = async () => {
        nextCalled = true;
      };

      await layer.handle(exchange, next);

      assert.strictEqual(calls.length, 0);
      assert.strictEqual(nextCalled, true);
    });

    await sub.test(
      'should not invoke middleware when only the pathname does not match',
      async () => {
        const { middleware, calls } = makeMiddleware();

        const layer = new ExchangeLayer({
          method: 'GET',
          pathnamePattern: '/users',
          middleware,
        });

        const exchange = makeExchange({
          method: 'GET',
          pathname: '/posts',
        });

        let nextCalled = false;

        await layer.handle(exchange, async () => {
          nextCalled = true;
        });

        assert.strictEqual(calls.length, 0);
        assert.strictEqual(nextCalled, true);
      },
    );

    await sub.test(
      'should pass next to the middleware without invoking it automatically',
      async () => {
        const { middleware, calls } = makeMiddleware();

        const layer = new ExchangeLayer({
          method: 'GET',
          pathnamePattern: '/users',
          middleware,
        });

        const exchange = makeExchange({
          method: 'GET',
          pathname: '/users',
        });

        let nextCalled = false;

        const next = async () => {
          nextCalled = true;
        };

        await layer.handle(exchange, next);

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].next, next);
        assert.strictEqual(nextCalled, false);
      },
    );

    await sub.test('should propagate middleware errors', async () => {
      const error = new Error('middleware failure');

      const middleware = async () => {
        throw error;
      };

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      await assert.rejects(
        () => layer.handle(makeExchange({ method: 'GET', pathname: '/users' }), async () => {}),
        error,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // toObject()
  // ───────────────────────────────────────────────────────────────────────────
  test('toObject()', async sub => {
    await sub.test('should return the configured layer properties', () => {
      const { middleware } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'POST',
        pathnamePattern: '/users',
        middleware,
      });

      const object = layer.toObject();

      assert.deepStrictEqual(object, {
        method: 'POST',
        pathnamePattern: '/users',
        middleware,
      });
    });

    await sub.test('should return a frozen object', () => {
      const { middleware } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      assert.strictEqual(Object.isFrozen(layer.toObject()), true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // toJSON()
  // ───────────────────────────────────────────────────────────────────────────
  test('toJSON()', async sub => {
    await sub.test('should return the same representation as toObject()', () => {
      const { middleware } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      assert.deepStrictEqual(layer.toJSON(), layer.toObject());
    });

    await sub.test('should be used by JSON.stringify()', () => {
      const middleware = () => {};

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      const json = JSON.stringify(layer);

      assert.strictEqual(
        json,
        JSON.stringify({
          method: 'GET',
          pathnamePattern: '/users',
        }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Symbol.toStringTag
  // ───────────────────────────────────────────────────────────────────────────
  test('Symbol.toStringTag', async sub => {
    await sub.test('should expose ExchangeLayer as its string tag', () => {
      const { middleware } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      assert.strictEqual(layer[Symbol.toStringTag], 'ExchangeLayer');
      assert.strictEqual(Object.prototype.toString.call(layer), '[object ExchangeLayer]');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // inspect.custom
  // ───────────────────────────────────────────────────────────────────────────
  test('inspect.custom', async sub => {
    await sub.test('should produce a readable representation', () => {
      const { middleware } = makeMiddleware();

      const layer = new ExchangeLayer({
        method: 'GET',
        pathnamePattern: '/users',
        middleware,
      });

      const output = inspect(layer);

      assert.ok(output.includes('ExchangeLayer'));
      assert.ok(output.includes('/users'));
      assert.ok(output.includes('GET'));
    });
  });
});
