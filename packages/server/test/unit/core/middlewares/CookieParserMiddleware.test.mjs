// @ts-check
/**
 * @file Contains the unit tests for CookieParserMiddleware.
 *
 * @module test/unit/core/middlewares/CookieParserMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import CookieParserMiddleware from '#middlewares/CookieParserMiddleware';
// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#middlewares/CookieParserMiddleware').NextFunction} NextFunction
 */

/**
 * Options accepted by the makeExchange helper.
 *
 * @typedef  {object}                    MakeExchangeOptions
 * @property {string|string[]|undefined} cookieHeader        - Value returned for the Cookie header.
 */

/**
 * Represents the result returned by the makeExchange helper.
 *
 * @typedef  {object}            MakeExchangeResult
 * @property {Exchange}          exchange           - Fake exchange.
 * @property {FakeExchangeState} state              - The exchange state.
 */

/**
 * Represents the state bag attached to a fake exchange.
 *
 * @typedef  {object}                 FakeExchangeState
 * @property {Record<string, string>} [cookies]         - Parsed cookies, populated by the middleware.
 */
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a fake exchange with a request that returns a Cookie header.
 *
 * @param {string|string[]|undefined} cookieHeader - Value returned for the Cookie header.
 * @returns {MakeExchangeResult} The fake exchange and its state.
 */
function makeExchange(cookieHeader) {
  /** @type {FakeExchangeState} */
  const state = {};

  const response = {};

  return {
    /** @type {any} */
    exchange: {
      request: {
        /**
         * Returns a header value by name.
         *
         * Only the `cookie` header is supported; any other header resolves to
         * `undefined`.
         *
         * @param {string} name - The header name.
         * @returns {string|string[]|undefined} The header value, or `undefined` when absent.
         */
        getHeader(name) {
          return name === 'cookie' ? cookieHeader : undefined;
        },
      },
      response,
      state,
    },
    state,
  };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CookieParserMiddleware', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Missing / empty header
  // ───────────────────────────────────────────────────────────────────────────
  test('Missing or empty header', async sub => {
    await sub.test(
      'should set state.cookies to an empty object when header is absent',
      async () => {
        const middleware = new CookieParserMiddleware({ decode: true });
        const { exchange, state } = makeExchange(undefined);

        await middleware.handle(exchange, async () => {});
        assert.ok(state.cookies);
        assert.deepStrictEqual(Object.keys(state.cookies), []);
        assert.strictEqual(Object.getPrototypeOf(state.cookies), null);
      },
    );

    await sub.test('should set state.cookies to an empty object when header is empty', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.deepStrictEqual(Object.keys(state.cookies), []);
    });

    await sub.test(
      'should set state.cookies to an empty object when header array is empty',
      async () => {
        const middleware = new CookieParserMiddleware({ decode: true });
        const { exchange, state } = makeExchange([]);

        await middleware.handle(exchange, async () => {});
        assert.ok(state.cookies);
        assert.deepStrictEqual(Object.keys(state.cookies), []);
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Parsing
  // ───────────────────────────────────────────────────────────────────────────
  test('Parsing', async sub => {
    await sub.test('should parse a single cookie', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('session=abc');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.session, 'abc');
    });

    await sub.test('should parse multiple cookies', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('session=abc; theme=dark; lang=en');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.session, 'abc');
      assert.strictEqual(state.cookies.theme, 'dark');
      assert.strictEqual(state.cookies.lang, 'en');
    });

    await sub.test('should trim whitespace around names and values', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('  session = abc ;  theme = dark ');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.session, 'abc');
      assert.strictEqual(state.cookies.theme, 'dark');
    });

    await sub.test('should ignore segments without =', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('invalid; session=abc');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.session, 'abc');
      assert.strictEqual(Object.keys(state.cookies).length, 1);
    });

    await sub.test('should ignore segments with an empty name', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('=value; session=abc');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.session, 'abc');
      assert.strictEqual(Object.keys(state.cookies).length, 1);
    });

    await sub.test('should keep the last value when a name is repeated', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('session=first; session=second');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.session, 'second');
    });

    await sub.test('should join repeated headers with "; "', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange(['a=1', 'b=2']);

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.a, '1');
      assert.strictEqual(state.cookies.b, '2');
    });

    await sub.test('should unquote quoted values', async () => {
      const middleware = new CookieParserMiddleware(/** @type {any} */ ({ decode: false }));
      const { exchange, state } = makeExchange('session="quoted value"');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.session, 'quoted value');
    });

    await sub.test('should keep empty values', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('session=');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.session, '');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Decoding
  // ───────────────────────────────────────────────────────────────────────────
  test('Decoding', async sub => {
    await sub.test('should decode percent-encoded values when decode is true', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('name=John%20Doe');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.name, 'John Doe');
    });

    await sub.test('should not decode values when decode is false', async () => {
      const middleware = new CookieParserMiddleware(/** @type {any} */ ({ decode: false }));
      const { exchange, state } = makeExchange('name=John%20Doe');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.name, 'John%20Doe');
    });

    await sub.test('should leave malformed percent-encoding unchanged', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('name=%E0%A4%A');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.name, '%E0%A4%A');
    });

    await sub.test('should decode a value with mixed content', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('redirect=%2Fdashboard%3Ftab%3D1');

      await middleware.handle(exchange, async () => {});
      assert.ok(state.cookies);
      assert.strictEqual(state.cookies.redirect, '/dashboard?tab=1');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pipeline
  // ───────────────────────────────────────────────────────────────────────────
  test('Pipeline', async sub => {
    await sub.test('should populate state before calling next()', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange, state } = makeExchange('session=abc');

      let cookiesAtNext = null;

      await middleware.handle(exchange, async () => {
        cookiesAtNext = { ...state.cookies };
      });

      assert.deepStrictEqual(cookiesAtNext, { session: 'abc' });
    });

    await sub.test('should forward errors from next()', async () => {
      const middleware = new CookieParserMiddleware({ decode: true });
      const { exchange } = makeExchange('session=abc');

      await assert.rejects(
        () =>
          middleware.handle(exchange, async () => {
            throw new Error('next failed');
          }),
        /next failed/,
      );
    });
  });
});
