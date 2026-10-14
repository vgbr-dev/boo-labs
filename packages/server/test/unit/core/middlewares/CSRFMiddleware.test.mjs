// @ts-check
/**
 * @file Contains the unit tests for CSRFMiddleware.
 *
 * @module test/unit/core/middlewares/CSRFMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import CSRFMiddleware from '#middlewares/CSRFMiddleware';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#middlewares/CSRFMiddleware').NextFunction} NextFunction
 */

/**
 * Represents normalized CSRF middleware configuration.
 *
 * @typedef {import('#middlewares/CSRFMiddleware').CSRFOptionsData} CSRFOptionsData
 */

/**
 * Represents the state bag attached to a fake exchange.
 *
 * The middleware populates `csrfToken` by the time `handle` resolves, but it
 * is absent before the middleware runs. Tests narrow it with `assert.ok` or
 * type checks.
 *
 * @typedef  {object} FakeExchangeState
 * @property {string} [csrfToken]       - CSRF token generated or reused by the middleware.
 */

/**
 * Represents headers and response state captured by the fake response.
 *
 * @typedef  {object}                       CapturedResponse
 * @property {Map<string, string|string[]>} headers          - Headers set via `setHeader`.
 * @property {string[]}                     setCookies       - Values captured for Set-Cookie.
 * @property {number|null}                  status           - Status code set via `status()`.
 * @property {boolean}                      ended            - Whether `end()` or `json()` was called.
 */

/**
 * Options accepted by the makeExchange helper.
 *
 * @typedef  {object}                                    MakeExchangeOptions
 * @property {string}                                    [method]            - HTTP method (default: `'GET'`).
 * @property {Record<string, string|string[]|undefined>} [headers]           - Request headers (keys should be lower-case).
 */

/**
 * Represents the result returned by the makeExchange helper.
 *
 * @typedef  {object}            MakeExchangeResult
 * @property {Exchange}          exchange           - Fake exchange.
 * @property {CapturedResponse}  captured           - Headers and response state captured by the fake.
 * @property {FakeExchangeState} state              - The exchange state.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * A no-op next function used to exercise the middleware pipeline.
 *
 * @type {NextFunction}
 */
const noopNext = () => {};

/**
 * Creates a fake exchange that records headers and status.
 *
 * @param {MakeExchangeOptions} [options] - Options controlling the fake exchange.
 * @returns {MakeExchangeResult} The fake exchange and its captured state.
 */
function makeExchange({ method = 'GET', headers = {} } = {}) {
  /** @type {CapturedResponse} */
  const captured = {
    headers: new Map(),
    setCookies: [],
    status: null,
    ended: false,
  };

  const response = {
    /**
     * Records a header in the captured map.
     *
     * @param {string} name - The header name.
     * @param {string|string[]} value - The header value.
     * @returns {object} The response stub, for chaining.
     */
    setHeader(name, value) {
      captured.headers.set(name, value);

      if (name === 'Set-Cookie') {
        captured.setCookies = Array.isArray(value) ? value.map(String) : [String(value)];
      }

      return response;
    },

    /**
     * Appends a header value (used for multiple Set-Cookie).
     *
     * @param {string} name - The header name.
     * @param {string} value - The header value.
     * @returns {object} The response stub, for chaining.
     */
    appendHeader(name, value) {
      if (name === 'Set-Cookie') {
        captured.setCookies.push(String(value));
      }

      return response;
    },

    /**
     * Reads a header from the captured map.
     *
     * @param {string} name - The header name.
     * @returns {string|string[]|undefined} The header value, or `undefined` when absent.
     */
    getHeader(name) {
      return captured.headers.get(name);
    },

    /**
     * Checks whether a header has been set.
     *
     * @param {string} name - The header name.
     * @returns {boolean} `true` when the header is present.
     */
    hasHeader(name) {
      return captured.headers.has(name);
    },

    /**
     * Records the response status code.
     *
     * @param {number} code - The status code.
     * @returns {object} The response stub, for chaining.
     */
    status(code) {
      captured.status = code;
      return response;
    },

    /**
     * Marks the response as ended.
     *
     * @returns {object} The response stub, for chaining.
     */
    json() {
      captured.ended = true;
      return response;
    },

    /**
     * Marks the response as ended.
     *
     * @returns {object} The response stub, for chaining.
     */
    end() {
      captured.ended = true;
      return response;
    },
  };

  /** @type {FakeExchangeState} */
  const state = {};

  return {
    exchange: /** @type {any} */ ({
      request: {
        method,
        /**
         * Returns a header value by name.
         *
         * Header names are looked up in lower-case.
         *
         * @param {string} name - The header name.
         * @returns {string|string[]|undefined} The header value, or `undefined` when absent.
         */
        getHeader(name) {
          return headers[name.toLowerCase()];
        },
      },
      response,
      state,
    }),
    captured,
    state,
  };
}

/**
 * Creates a full normalized CSRF options object.
 *
 * @param {Partial<CSRFOptionsData>} [overrides] - Fields to override on the defaults.
 * @returns {CSRFOptionsData} A complete options object.
 */
function makeOptions(overrides = {}) {
  return {
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
    safeMethods: ['GET', 'HEAD', 'OPTIONS'],
    tokenBytes: 32,
    path: '/',
    domain: undefined,
    secure: true,
    sameSite: 'Lax',
    ...overrides,
  };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CSRFMiddleware', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Safe methods
  // ───────────────────────────────────────────────────────────────────────────
  test('Safe methods', async sub => {
    await sub.test('should generate a token for GET when no cookie is present', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured, state } = makeExchange({ method: 'GET' });

      await middleware.handle(exchange, noopNext);

      assert.ok(typeof state.csrfToken === 'string');
      assert.ok(state.csrfToken.length > 0);
      assert.strictEqual(captured.setCookies.length, 1);
      assert.ok(captured.setCookies[0].startsWith('csrf-token='));
    });

    await sub.test('should reuse an existing cookie token for GET', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured, state } = makeExchange({
        method: 'GET',
        headers: { cookie: 'csrf-token=existing-token' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(state.csrfToken, 'existing-token');
      assert.strictEqual(captured.setCookies.length, 0);
    });

    await sub.test('should not append a Set-Cookie when the cookie already exists', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({
        method: 'GET',
        headers: { cookie: 'csrf-token=existing-token' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.setCookies.length, 0);
    });

    await sub.test('should call next() on safe methods', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange } = makeExchange({ method: 'GET' });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    await sub.test('should treat HEAD and OPTIONS as safe', async () => {
      for (const method of ['HEAD', 'OPTIONS']) {
        const middleware = new CSRFMiddleware(makeOptions());
        const { exchange, state } = makeExchange({ method });

        await middleware.handle(exchange, noopNext);

        assert.ok(typeof state.csrfToken === 'string');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Unsafe methods
  // ───────────────────────────────────────────────────────────────────────────
  test('Unsafe methods', async sub => {
    await sub.test('should reject POST without a CSRF cookie', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({ method: 'POST' });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(captured.status, 403);
      assert.strictEqual(captured.ended, true);
      assert.strictEqual(nextCalled, false);
    });

    await sub.test('should reject POST without the CSRF header', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({
        method: 'POST',
        headers: { cookie: 'csrf-token=abc' },
      });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(captured.status, 403);
      assert.strictEqual(captured.ended, true);
      assert.strictEqual(nextCalled, false);
    });

    await sub.test('should reject POST with mismatching tokens', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({
        method: 'POST',
        headers: {
          cookie: 'csrf-token=abc',
          'x-csrf-token': 'def',
        },
      });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(captured.status, 403);
      assert.strictEqual(captured.ended, true);
      assert.strictEqual(nextCalled, false);
    });

    await sub.test('should accept POST with matching tokens', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured, state } = makeExchange({
        method: 'POST',
        headers: {
          cookie: 'csrf-token=abc',
          'x-csrf-token': 'abc',
        },
      });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(captured.status, null);
      assert.strictEqual(nextCalled, true);
      assert.strictEqual(state.csrfToken, 'abc');
    });

    await sub.test('should reject when the header token is empty', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({
        method: 'POST',
        headers: {
          cookie: 'csrf-token=abc',
          'x-csrf-token': '',
        },
      });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(captured.status, 403);
      assert.strictEqual(nextCalled, false);
    });

    await sub.test('should apply to PUT, PATCH, and DELETE', async () => {
      for (const method of ['PUT', 'PATCH', 'DELETE']) {
        const middleware = new CSRFMiddleware(makeOptions());
        const { exchange, captured } = makeExchange({ method });

        await middleware.handle(exchange, noopNext);

        assert.strictEqual(captured.status, 403);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cookie parsing
  // ───────────────────────────────────────────────────────────────────────────
  test('Cookie parsing', async sub => {
    await sub.test('should reject duplicate CSRF cookies as ambiguous', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({
        method: 'GET',
        headers: { cookie: 'csrf-token=abc; csrf-token=def' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.status, 403);
    });

    await sub.test('should unquote a quoted cookie value', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, state } = makeExchange({
        method: 'GET',
        headers: { cookie: 'csrf-token="quoted-value"' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(state.csrfToken, 'quoted-value');
    });

    await sub.test('should treat an empty cookie value as absent', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, state, captured } = makeExchange({
        method: 'GET',
        headers: { cookie: 'csrf-token=' },
      });

      await middleware.handle(exchange, noopNext);

      // Generates a new token and sets the cookie
      assert.ok(typeof state.csrfToken === 'string');
      assert.strictEqual(captured.setCookies.length, 1);
    });

    await sub.test('should ignore other cookies', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, state } = makeExchange({
        method: 'GET',
        headers: { cookie: 'session=abc; csrf-token=my-token; theme=dark' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(state.csrfToken, 'my-token');
    });

    await sub.test('should handle repeated cookies joined in the header string', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, state } = makeExchange({
        method: 'GET',
        headers: { cookie: 'session=abc; csrf-token=my-token' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(state.csrfToken, 'my-token');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Set-Cookie attributes
  // ───────────────────────────────────────────────────────────────────────────
  test('Set-Cookie attributes', async sub => {
    await sub.test('should include Path', async () => {
      const middleware = new CSRFMiddleware(makeOptions({ path: '/app' }));
      const { exchange, captured } = makeExchange({ method: 'GET' });

      await middleware.handle(exchange, noopNext);

      assert.ok(captured.setCookies[0].includes('Path=/app'));
    });

    await sub.test('should include Domain when configured', async () => {
      const middleware = new CSRFMiddleware(makeOptions({ domain: 'example.com' }));
      const { exchange, captured } = makeExchange({ method: 'GET' });

      await middleware.handle(exchange, noopNext);

      assert.ok(captured.setCookies[0].includes('Domain=example.com'));
    });

    await sub.test('should include Secure when enabled', async () => {
      const middleware = new CSRFMiddleware(makeOptions({ secure: true }));
      const { exchange, captured } = makeExchange({ method: 'GET' });

      await middleware.handle(exchange, noopNext);

      assert.ok(captured.setCookies[0].includes('Secure'));
    });

    await sub.test('should not include Secure when disabled', async () => {
      const middleware = new CSRFMiddleware(makeOptions({ secure: false }));
      const { exchange, captured } = makeExchange({ method: 'GET' });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.setCookies[0].includes('Secure'), false);
    });

    await sub.test('should include SameSite when configured', async () => {
      const middleware = new CSRFMiddleware(makeOptions({ sameSite: 'Strict' }));
      const { exchange, captured } = makeExchange({ method: 'GET' });

      await middleware.handle(exchange, noopNext);

      assert.ok(captured.setCookies[0].includes('SameSite=Strict'));
    });

    await sub.test('should not mark the cookie HttpOnly', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({ method: 'GET' });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.setCookies[0].includes('HttpOnly'), false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pipeline
  // ───────────────────────────────────────────────────────────────────────────
  test('Pipeline', async sub => {
    await sub.test('should forward errors from next() on safe methods', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange } = makeExchange({ method: 'GET' });

      await assert.rejects(
        () =>
          middleware.handle(exchange, async () => {
            throw new Error('next failed');
          }),
        /next failed/,
      );
    });

    await sub.test('should forward errors from next() on unsafe methods', async () => {
      const middleware = new CSRFMiddleware(makeOptions());
      const { exchange } = makeExchange({
        method: 'POST',
        headers: { cookie: 'csrf-token=abc', 'x-csrf-token': 'abc' },
      });

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
