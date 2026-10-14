// @ts-check
/**
 * @file Contains the unit tests for RateLimitMiddleware.
 *
 * @module test/unit/core/middlewares/RateLimitMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import RateLimitMiddleware from '#middlewares/RateLimitMiddleware';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#middlewares/RateLimitMiddleware').NextFunction} NextFunction
 */

/**
 * Represents normalized Rate Limit middleware configuration.
 *
 * @typedef {import('#middlewares/RateLimitMiddleware').RateLimitOptionsData} RateLimitOptionsData
 */

/**
 * Represents headers and response state captured by the fake response.
 *
 * @typedef  {object}              CapturedResponse
 * @property {Map<string, string>} headers          - Headers set via `setHeader`.
 * @property {number|null}         status           - Status code set via `status()`.
 * @property {unknown}             json             - Body passed to `json()`.
 * @property {boolean}             ended            - Whether `end()` or `json()` was called.
 */

/**
 * Options accepted by the makeExchange helper.
 *
 * @typedef  {object}           MakeExchangeOptions
 * @property {string|undefined} [ip]                - Client IP address (default: `'127.0.0.1'`).
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
 * Creates a fake exchange that records headers and status.
 *
 * @param {MakeExchangeOptions} [options] - Options controlling the fake exchange.
 * @returns {MakeExchangeResult} The fake exchange and its captured state.
 */
function makeExchange({ ip = '127.0.0.1' } = {}) {
  /** @type {CapturedResponse} */
  const captured = {
    headers: new Map(),
    status: null,
    json: null,
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
     * Records the JSON body and marks the response as ended.
     *
     * @param {unknown} body - The response body.
     * @returns {object} The response stub, for chaining.
     */
    json(body) {
      captured.json = body;
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

  return {
    exchange: /** @type {any} */ ({
      request: { ip },
      response,
    }),
    captured,
  };
}

/**
 * Creates a full normalized rate limit options object.
 *
 * @param {Partial<RateLimitOptionsData>} [overrides] - Fields to override on the defaults.
 * @returns {RateLimitOptionsData} A complete options object.
 */
function makeOptions(overrides = {}) {
  return {
    windowMs: 60_000,
    max: 3,
    statusCode: 429,
    message: { error: 'Too Many Requests' },
    standardHeaders: true,
    legacyHeaders: false,
    ...overrides,
  };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('RateLimitMiddleware', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Under the limit
  // ───────────────────────────────────────────────────────────────────────────
  test('Under the limit', async sub => {
    await sub.test('should call next() when under the limit', async () => {
      const middleware = new RateLimitMiddleware(makeOptions());
      const { exchange } = makeExchange();

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    await sub.test('should set standard RateLimit headers', async () => {
      const middleware = new RateLimitMiddleware(makeOptions());
      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('RateLimit-Limit'), '3');
      assert.strictEqual(captured.headers.get('RateLimit-Remaining'), '2');
      assert.ok(captured.headers.has('RateLimit-Reset'));
    });

    await sub.test('should decrement remaining on each request', async () => {
      const middleware = new RateLimitMiddleware(makeOptions());
      const { exchange: e1, captured: c1 } = makeExchange();
      const { exchange: e2, captured: c2 } = makeExchange();

      await middleware.handle(e1, noopNext);
      await middleware.handle(e2, noopNext);

      assert.strictEqual(c1.headers.get('RateLimit-Remaining'), '2');
      assert.strictEqual(c2.headers.get('RateLimit-Remaining'), '1');
    });

    await sub.test('should not set standard headers when disabled', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ standardHeaders: false }));
      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.has('RateLimit-Limit'), false);
    });

    await sub.test('should set legacy X-RateLimit headers when enabled', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ legacyHeaders: true }));
      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('X-RateLimit-Limit'), '3');
      assert.strictEqual(captured.headers.get('X-RateLimit-Remaining'), '2');
      assert.ok(captured.headers.has('X-RateLimit-Reset'));
    });

    await sub.test('should not set legacy headers when disabled', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ legacyHeaders: false }));
      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.has('X-RateLimit-Limit'), false);
    });

    await sub.test('should set both header sets when both are enabled', async () => {
      const middleware = new RateLimitMiddleware(
        makeOptions({ standardHeaders: true, legacyHeaders: true }),
      );
      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.ok(captured.headers.has('RateLimit-Limit'));
      assert.ok(captured.headers.has('X-RateLimit-Limit'));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Over the limit
  // ───────────────────────────────────────────────────────────────────────────
  test('Over the limit', async sub => {
    await sub.test('should respond with the configured status code and message', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ max: 1 }));

      const { exchange: e1 } = makeExchange();
      await middleware.handle(e1, noopNext);

      const { exchange: e2, captured: c2 } = makeExchange();

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(e2, async () => {
        nextCalled = true;
      });

      assert.strictEqual(c2.status, 429);
      assert.deepStrictEqual(c2.json, { error: 'Too Many Requests' });
      assert.strictEqual(nextCalled, false);
    });

    await sub.test('should use a custom status code and message', async () => {
      const middleware = new RateLimitMiddleware(
        makeOptions({ max: 1, statusCode: 503, message: { error: 'Slow down' } }),
      );

      const { exchange: e1 } = makeExchange();
      await middleware.handle(e1, noopNext);

      const { exchange: e2, captured } = makeExchange();
      await middleware.handle(e2, noopNext);

      assert.strictEqual(captured.status, 503);
      assert.deepStrictEqual(captured.json, { error: 'Slow down' });
    });

    await sub.test('should set Retry-After when over the limit', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ max: 1 }));

      const { exchange: e1 } = makeExchange();
      await middleware.handle(e1, noopNext);

      const { exchange: e2, captured } = makeExchange();
      await middleware.handle(e2, noopNext);

      const retryAfter = captured.headers.get('Retry-After');

      assert.ok(retryAfter);
      assert.ok(Number(retryAfter) >= 1);
    });

    await sub.test('should clamp remaining to zero in headers', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ max: 1 }));

      const { exchange: e1 } = makeExchange();
      await middleware.handle(e1, noopNext);

      const { exchange: e2, captured } = makeExchange();
      await middleware.handle(e2, noopNext);

      assert.strictEqual(captured.headers.get('RateLimit-Remaining'), '0');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Per-IP tracking
  // ───────────────────────────────────────────────────────────────────────────
  test('Per-IP tracking', async sub => {
    await sub.test('should track each IP independently', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ max: 1 }));

      const { exchange: e1 } = makeExchange({ ip: '10.0.0.1' });
      await middleware.handle(e1, noopNext);

      const { exchange: e2, captured: c2 } = makeExchange({ ip: '10.0.0.1' });
      await middleware.handle(e2, noopNext);

      const { exchange: e3, captured: c3 } = makeExchange({ ip: '10.0.0.2' });
      await middleware.handle(e3, noopNext);

      assert.strictEqual(c2.status, 429);
      assert.strictEqual(c3.status, null);
    });

    await sub.test('should skip rate limiting when the IP is not a string', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ max: 0 }));
      const { exchange, captured } = makeExchange({ ip: /** @type {any} */ (null) });

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(captured.status, null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Window expiration
  // ───────────────────────────────────────────────────────────────────────────
  test('Window expiration', async sub => {
    await sub.test('should reset the counter after the window expires', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ max: 1, windowMs: 20 }));

      const { exchange: e1 } = makeExchange();
      await middleware.handle(e1, noopNext);

      // Wait for the window to expire
      await new Promise(resolve => setTimeout(resolve, 30));

      const { exchange: e2, captured } = makeExchange();
      await middleware.handle(e2, noopNext);

      assert.strictEqual(captured.status, null);
      assert.strictEqual(captured.headers.get('RateLimit-Remaining'), '0');
    });

    await sub.test('should compute RateLimit-Reset as seconds remaining', async () => {
      const middleware = new RateLimitMiddleware(makeOptions({ windowMs: 60_000 }));
      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      const reset = Number(captured.headers.get('RateLimit-Reset'));

      assert.ok(reset >= 59 && reset <= 60);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pipeline
  // ───────────────────────────────────────────────────────────────────────────
  test('Pipeline', async sub => {
    await sub.test('should forward errors from next()', async () => {
      const middleware = new RateLimitMiddleware(makeOptions());
      const { exchange } = makeExchange();

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
