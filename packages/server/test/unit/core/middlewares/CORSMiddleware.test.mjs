// @ts-check
/**
 * @file Contains the unit tests for CorsMiddleware.
 *
 * @module test/unit/core/middlewares/CorsMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import CorsMiddleware from '#middlewares/CORSMiddleware';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#middlewares/CORSMiddleware').NextFunction} NextFunction
 */

/**
 * Represents normalized CORS middleware configuration.
 *
 * @typedef {import('#middlewares/CORSMiddleware').CorsOptionsData} CorsOptionsData
 */

/**
 * Represents headers and response state captured by the fake response.
 *
 * @typedef  {object}              CapturedResponse
 * @property {Map<string, string>} headers          - Headers set via `setHeader`.
 * @property {string[]}            varyHeaders      - Values passed to `vary()`.
 * @property {number|null}         status           - Status code set via `status()`.
 * @property {boolean}             ended            - Whether `end()` or `json()` was called.
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
 * @typedef  {object}           MakeExchangeResult
 * @property {Exchange}         exchange           - Fake exchange.
 * @property {CapturedResponse} captured           - Headers and response state captured by the fake.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * A no-op next function used to exercise the middleware pipeline.
 *
 * @type {NextFunction}
 */
const noopNext = () => {};

/**
 * Creates a fake exchange that records headers, status, and end calls.
 *
 * @param {MakeExchangeOptions} [options] - Options controlling the fake exchange.
 * @returns {MakeExchangeResult} The fake exchange and its captured state.
 */
function makeExchange({ method = 'GET', headers = {} } = {}) {
  /** @type {CapturedResponse} */
  const captured = {
    headers: new Map(),
    varyHeaders: [],
    status: null,
    ended: false,
  };

  const response = {
    /**
     * Records a header in the captured map.
     *
     * @param {string} name - The header name.
     * @param {string|number|boolean} value - The header value.
     * @returns {object} The response stub, for chaining.
     */
    setHeader(name, value) {
      captured.headers.set(name, String(value));
      return response;
    },

    /**
     * Reads a header from the captured map.
     *
     * @param {string} name - The header name.
     * @returns {string|undefined} The header value, or `undefined` when absent.
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
     * Records a value passed to the `Vary` header helper.
     *
     * @param {string} name - The header name to vary on.
     * @returns {object} The response stub, for chaining.
     */
    vary(name) {
      captured.varyHeaders.push(name);
      return response;
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
    end() {
      captured.ended = true;
      return response;
    },

    /**
     * Marks the response as ended (used by some response helpers).
     *
     * @returns {object} The response stub, for chaining.
     */
    json() {
      captured.ended = true;
      return response;
    },
  };

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
    }),
    captured,
  };
}

/**
 * Creates a full normalized CORS options object.
 *
 * @param {Partial<CorsOptionsData>} [overrides] - Fields to override on the defaults.
 * @returns {CorsOptionsData} A complete options object.
 */
function makeOptions(overrides = {}) {
  return {
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: undefined,
    exposedHeaders: undefined,
    credentials: false,
    maxAge: undefined,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    ...overrides,
  };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CorsMiddleware', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Origin handling
  // ───────────────────────────────────────────────────────────────────────────
  test('Origin handling', async sub => {
    await sub.test('should return `*` for origin `*`', async () => {
      const middleware = new CorsMiddleware(makeOptions({ origin: '*' }));
      const { exchange, captured } = makeExchange({
        headers: { origin: 'https://example.com' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('Access-Control-Allow-Origin'), '*');
    });

    await sub.test('should reflect the request origin when origin is `true`', async () => {
      const middleware = new CorsMiddleware(makeOptions({ origin: true }));
      const { exchange, captured } = makeExchange({
        headers: { origin: 'https://example.com' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(
        captured.headers.get('Access-Control-Allow-Origin'),
        'https://example.com',
      );
    });

    await sub.test(
      'should not set the header when origin is `true` and no request origin is present',
      async () => {
        const middleware = new CorsMiddleware(makeOptions({ origin: true }));
        const { exchange, captured } = makeExchange();

        /** @type {boolean} */
        let nextCalled = false;

        await middleware.handle(exchange, async () => {
          nextCalled = true;
        });

        assert.strictEqual(captured.headers.has('Access-Control-Allow-Origin'), false);
        assert.strictEqual(nextCalled, true);
      },
    );

    await sub.test('should match a fixed origin string', async () => {
      const middleware = new CorsMiddleware(makeOptions({ origin: 'https://example.com' }));
      const { exchange, captured } = makeExchange({
        headers: { origin: 'https://example.com' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(
        captured.headers.get('Access-Control-Allow-Origin'),
        'https://example.com',
      );
    });

    await sub.test('should reject a non-matching fixed origin', async () => {
      const middleware = new CorsMiddleware(makeOptions({ origin: 'https://example.com' }));
      const { exchange, captured } = makeExchange({
        headers: { origin: 'https://evil.com' },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.has('Access-Control-Allow-Origin'), false);
    });

    await sub.test('should match an origin from the allow-list', async () => {
      const middleware = new CorsMiddleware(
        makeOptions({ origin: ['https://a.com', 'https://b.com'] }),
      );
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://b.com' } });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('Access-Control-Allow-Origin'), 'https://b.com');
    });

    await sub.test('should reject an origin not in the allow-list', async () => {
      const middleware = new CorsMiddleware(
        makeOptions({ origin: ['https://a.com', 'https://b.com'] }),
      );
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://evil.com' } });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.has('Access-Control-Allow-Origin'), false);
    });

    await sub.test('should not set headers when no origin is allowed', async () => {
      const middleware = new CorsMiddleware(makeOptions({ origin: 'https://a.com' }));
      const { exchange, captured } = makeExchange();

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(captured.headers.size, 0);
      assert.strictEqual(nextCalled, true);
    });

    await sub.test('should add Vary: Origin when origin is `true`', async () => {
      const middleware = new CorsMiddleware(makeOptions({ origin: true }));
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://a.com' } });

      await middleware.handle(exchange, noopNext);

      assert.deepStrictEqual(captured.varyHeaders, ['Origin']);
    });

    await sub.test('should add Vary: Origin when origin is an array', async () => {
      const middleware = new CorsMiddleware(makeOptions({ origin: ['https://a.com'] }));
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://a.com' } });

      await middleware.handle(exchange, noopNext);

      assert.deepStrictEqual(captured.varyHeaders, ['Origin']);
    });

    await sub.test('should not add Vary: Origin when origin is `*`', async () => {
      const middleware = new CorsMiddleware(makeOptions({ origin: '*' }));
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://a.com' } });

      await middleware.handle(exchange, noopNext);

      assert.deepStrictEqual(captured.varyHeaders, []);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Actual requests (non-OPTIONS)
  // ───────────────────────────────────────────────────────────────────────────
  test('Actual requests', async sub => {
    await sub.test('should set Access-Control-Allow-Credentials when enabled', async () => {
      const middleware = new CorsMiddleware(makeOptions({ credentials: true }));
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://a.com' } });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('Access-Control-Allow-Credentials'), 'true');
    });

    await sub.test('should not set Access-Control-Allow-Credentials when disabled', async () => {
      const middleware = new CorsMiddleware(makeOptions({ credentials: false }));
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://a.com' } });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.has('Access-Control-Allow-Credentials'), false);
    });

    await sub.test('should set Access-Control-Expose-Headers when provided', async () => {
      const middleware = new CorsMiddleware(
        makeOptions({ exposedHeaders: ['X-Request-Id', 'X-Trace-Id'] }),
      );
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://a.com' } });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(
        captured.headers.get('Access-Control-Expose-Headers'),
        'X-Request-Id, X-Trace-Id',
      );
    });

    await sub.test('should not set Access-Control-Expose-Headers when undefined', async () => {
      const middleware = new CorsMiddleware(makeOptions({ exposedHeaders: undefined }));
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://a.com' } });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.has('Access-Control-Expose-Headers'), false);
    });

    await sub.test('should not set Access-Control-Expose-Headers when empty', async () => {
      const middleware = new CorsMiddleware(makeOptions({ exposedHeaders: [] }));
      const { exchange, captured } = makeExchange({ headers: { origin: 'https://a.com' } });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.has('Access-Control-Expose-Headers'), false);
    });

    await sub.test('should call next()', async () => {
      const middleware = new CorsMiddleware(makeOptions());
      const { exchange } = makeExchange({ headers: { origin: 'https://a.com' } });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Preflight requests
  // ───────────────────────────────────────────────────────────────────────────
  test('Preflight requests', async sub => {
    await sub.test('should respond to a valid preflight', async () => {
      const middleware = new CorsMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: {
          origin: 'https://a.com',
          'access-control-request-method': 'POST',
        },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('Access-Control-Allow-Origin'), 'https://a.com');
      assert.strictEqual(captured.headers.get('Access-Control-Allow-Methods'), 'GET, POST');
      assert.strictEqual(captured.status, 204);
      assert.strictEqual(captured.ended, true);
    });

    await sub.test('should call next() when the requested method is not allowed', async () => {
      const middleware = new CorsMiddleware(makeOptions({ methods: ['GET'] }));
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: {
          origin: 'https://a.com',
          'access-control-request-method': 'DELETE',
        },
      });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(captured.ended, false);
    });

    await sub.test('should call next() when Access-Control-Request-Method is missing', async () => {
      const middleware = new CorsMiddleware(makeOptions());
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: { origin: 'https://a.com' },
      });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(captured.ended, false);
    });

    await sub.test('should set Access-Control-Allow-Headers when configured', async () => {
      const middleware = new CorsMiddleware(
        makeOptions({ allowedHeaders: ['Content-Type', 'Authorization'] }),
      );
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: {
          origin: 'https://a.com',
          'access-control-request-method': 'POST',
        },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(
        captured.headers.get('Access-Control-Allow-Headers'),
        'Content-Type, Authorization',
      );
    });

    await sub.test(
      'should reflect Access-Control-Request-Headers when allowedHeaders is undefined',
      async () => {
        const middleware = new CorsMiddleware(makeOptions({ allowedHeaders: undefined }));
        const { exchange, captured } = makeExchange({
          method: 'OPTIONS',
          headers: {
            origin: 'https://a.com',
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'X-Custom-Header',
          },
        });

        await middleware.handle(exchange, noopNext);

        assert.strictEqual(captured.headers.get('Access-Control-Allow-Headers'), 'X-Custom-Header');
        assert.ok(captured.varyHeaders.includes('Access-Control-Request-Headers'));
      },
    );

    await sub.test('should set Access-Control-Max-Age when maxAge is defined', async () => {
      const middleware = new CorsMiddleware(makeOptions({ maxAge: 86400 }));
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: {
          origin: 'https://a.com',
          'access-control-request-method': 'POST',
        },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('Access-Control-Max-Age'), '86400');
    });

    await sub.test('should not set Access-Control-Max-Age when maxAge is undefined', async () => {
      const middleware = new CorsMiddleware(makeOptions({ maxAge: undefined }));
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: {
          origin: 'https://a.com',
          'access-control-request-method': 'POST',
        },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.has('Access-Control-Max-Age'), false);
    });

    await sub.test('should call next() when preflightContinue is true', async () => {
      const middleware = new CorsMiddleware(makeOptions({ preflightContinue: true }));
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: {
          origin: 'https://a.com',
          'access-control-request-method': 'POST',
        },
      });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(captured.ended, false);
    });

    await sub.test('should use the configured optionsSuccessStatus', async () => {
      const middleware = new CorsMiddleware(makeOptions({ optionsSuccessStatus: 200 }));
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: {
          origin: 'https://a.com',
          'access-control-request-method': 'POST',
        },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.status, 200);
      assert.strictEqual(captured.ended, true);
    });

    await sub.test('should set credentials on preflight when enabled', async () => {
      const middleware = new CorsMiddleware(makeOptions({ credentials: true }));
      const { exchange, captured } = makeExchange({
        method: 'OPTIONS',
        headers: {
          origin: 'https://a.com',
          'access-control-request-method': 'POST',
        },
      });

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('Access-Control-Allow-Credentials'), 'true');
    });
  });
});
