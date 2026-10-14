// @ts-check
/**
 * @file Contains the unit tests for SecurityHeadersMiddleware.
 *
 * @module test/unit/core/middlewares/SecurityHeadersMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import SecurityHeadersMiddleware from '#middlewares/SecurityHeadersMiddleware';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#middlewares/SecurityHeadersMiddleware').NextFunction} NextFunction
 */

/**
 * Represents normalized Security Headers middleware configuration.
 *
 * @typedef {import('#middlewares/SecurityHeadersMiddleware').SecurityHeadersOptionsData} SecurityHeadersOptionsData
 */

/**
 * Represents headers captured by the fake response.
 *
 * @typedef  {object}              CapturedResponse
 * @property {Map<string, string>} headers          - Headers set via `setHeader`.
 */

/**
 * Represents the result returned by the makeExchange helper.
 *
 * @typedef  {object}           MakeExchangeResult
 * @property {Exchange}         exchange           - Fake exchange.
 * @property {CapturedResponse} captured           - Headers captured by the fake.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * A no-op next function used to exercise the middleware pipeline.
 *
 * @type {NextFunction}
 */
const noopNext = () => {};

/**
 * Creates a fake exchange that records the headers written to the response.
 *
 * @returns {MakeExchangeResult} The fake exchange and its captured headers.
 */
function makeExchange() {
  /** @type {CapturedResponse} */
  const captured = {
    headers: new Map(),
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
  };

  return {
    exchange: /** @type {any} */ ({
      response,
      state: {},
    }),
    captured,
  };
}

/**
 * Creates a full options object with every header disabled.
 *
 * @returns {SecurityHeadersOptionsData} An options object with all headers set to `false`.
 */
function makeAllDisabledOptions() {
  return {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
    permissionsPolicy: false,
    referrerPolicy: false,
    strictTransportSecurity: false,
    xContentTypeOptions: false,
    xDnsPrefetchControl: false,
    xDownloadOptions: false,
    xFrameOptions: false,
    xPermittedCrossDomainPolicies: false,
    xXssProtection: false,
  };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('SecurityHeadersMiddleware', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // handle()
  // ───────────────────────────────────────────────────────────────────────────
  test('handle()', async sub => {
    await sub.test('should set every header when all options are strings', async () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: "default-src 'self'",
        crossOriginEmbedderPolicy: 'require-corp',
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: 'same-origin',
        originAgentCluster: '?1',
        permissionsPolicy: 'geolocation=()',
        referrerPolicy: 'no-referrer',
        strictTransportSecurity: 'max-age=31536000',
        xContentTypeOptions: 'nosniff',
        xDnsPrefetchControl: 'off',
        xDownloadOptions: 'noopen',
        xFrameOptions: 'DENY',
        xPermittedCrossDomainPolicies: 'none',
        xXssProtection: '0',
      });

      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.size, 14);
      assert.strictEqual(captured.headers.get('Content-Security-Policy'), "default-src 'self'");
      assert.strictEqual(captured.headers.get('X-Frame-Options'), 'DENY');
      assert.strictEqual(captured.headers.get('Strict-Transport-Security'), 'max-age=31536000');
    });

    await sub.test('should skip headers whose value is false', async () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
        permissionsPolicy: false,
        referrerPolicy: 'no-referrer',
        strictTransportSecurity: false,
        xContentTypeOptions: 'nosniff',
        xDnsPrefetchControl: false,
        xDownloadOptions: false,
        xFrameOptions: 'DENY',
        xPermittedCrossDomainPolicies: false,
        xXssProtection: false,
      });

      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.size, 4);
      assert.strictEqual(captured.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
      assert.strictEqual(captured.headers.get('Referrer-Policy'), 'no-referrer');
      assert.strictEqual(captured.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.strictEqual(captured.headers.get('X-Frame-Options'), 'DENY');
    });

    await sub.test('should set no headers when all options are disabled', async () => {
      const middleware = new SecurityHeadersMiddleware(makeAllDisabledOptions());
      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.size, 0);
    });

    await sub.test('should call next() after setting headers', async () => {
      const middleware = new SecurityHeadersMiddleware({
        ...makeAllDisabledOptions(),
        xFrameOptions: 'DENY',
      });

      const { exchange } = makeExchange();

      /** @type {boolean} */
      let nextCalled = false;

      await middleware.handle(exchange, async () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    await sub.test('should set headers before calling next()', async () => {
      const middleware = new SecurityHeadersMiddleware({
        ...makeAllDisabledOptions(),
        xFrameOptions: 'DENY',
      });

      const { exchange, captured } = makeExchange();

      /** @type {number} */
      let headersAtNext = 0;

      await middleware.handle(exchange, async () => {
        headersAtNext = captured.headers.size;
      });

      assert.strictEqual(headersAtNext, 1);
    });

    await sub.test('should set the correct HTTP header names', async () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: 'a',
        crossOriginEmbedderPolicy: 'b',
        crossOriginOpenerPolicy: 'c',
        crossOriginResourcePolicy: 'd',
        originAgentCluster: 'e',
        permissionsPolicy: 'f',
        referrerPolicy: 'g',
        strictTransportSecurity: 'h',
        xContentTypeOptions: 'i',
        xDnsPrefetchControl: 'j',
        xDownloadOptions: 'k',
        xFrameOptions: 'l',
        xPermittedCrossDomainPolicies: 'm',
        xXssProtection: 'n',
      });

      const { exchange, captured } = makeExchange();

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(captured.headers.get('Content-Security-Policy'), 'a');
      assert.strictEqual(captured.headers.get('Cross-Origin-Embedder-Policy'), 'b');
      assert.strictEqual(captured.headers.get('Cross-Origin-Opener-Policy'), 'c');
      assert.strictEqual(captured.headers.get('Cross-Origin-Resource-Policy'), 'd');
      assert.strictEqual(captured.headers.get('Origin-Agent-Cluster'), 'e');
      assert.strictEqual(captured.headers.get('Permissions-Policy'), 'f');
      assert.strictEqual(captured.headers.get('Referrer-Policy'), 'g');
      assert.strictEqual(captured.headers.get('Strict-Transport-Security'), 'h');
      assert.strictEqual(captured.headers.get('X-Content-Type-Options'), 'i');
      assert.strictEqual(captured.headers.get('X-DNS-Prefetch-Control'), 'j');
      assert.strictEqual(captured.headers.get('X-Download-Options'), 'k');
      assert.strictEqual(captured.headers.get('X-Frame-Options'), 'l');
      assert.strictEqual(captured.headers.get('X-Permitted-Cross-Domain-Policies'), 'm');
      assert.strictEqual(captured.headers.get('X-XSS-Protection'), 'n');
    });

    await sub.test('should not end the response', async () => {
      const middleware = new SecurityHeadersMiddleware({
        ...makeAllDisabledOptions(),
        xFrameOptions: 'DENY',
      });

      const { exchange } = makeExchange();

      /** @type {boolean} */
      let endCalled = false;

      // @ts-expect-error - we are intentionally spying on end()
      exchange.response.end = () => {
        endCalled = true;
      };

      await middleware.handle(exchange, noopNext);

      assert.strictEqual(endCalled, false);
    });

    await sub.test('should forward errors from next()', async () => {
      const middleware = new SecurityHeadersMiddleware(makeAllDisabledOptions());
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
