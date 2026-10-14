// @ts-check
/**
 * @file Contains the unit tests for CompressMiddleware.
 *
 * @module test/unit/core/middlewares/CompressMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

// » IMPORT LOCAL MODULES
import CompressMiddleware from '#middlewares/CompressMiddleware';
import Response from '#Response';
import { createFakeHttp1Response } from '../../../helpers/fakeServerResponse.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Normalized compression middleware configuration.
 *
 * @typedef {import('#middlewares/CompressMiddleware').CompressOptionsData} CompressOptionsData
 */

/**
 * Identifies the compression encodings supported by the middleware.
 *
 * @typedef {import('#middlewares/CompressMiddleware').CompressionEncoding} CompressionEncoding
 */

/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#middlewares/CompressMiddleware').NextFunction} NextFunction
 */

/**
 * Represents a fake HTTP/1.1 response used by the tests.
 *
 * @typedef {ReturnType<typeof createFakeHttp1Response>} FakeHttp1Response
 */

/**
 * Represents a minimal request stub exposing `getHeader`.
 *
 * @typedef  {object}                                  FakeRequest
 * @property {(name: string) => string|null|undefined} getHeader   - Returns a header value by name.
 */

/**
 * Represents a fake exchange backed by a real Response instance.
 *
 * @typedef  {object}      FakeExchange
 * @property {FakeRequest} request      - Minimal request stub.
 * @property {Response}    response     - Real Response instance.
 */

/**
 * Options accepted by the makeExchange helper.
 *
 * @typedef  {object}                   MakeExchangeOptions
 * @property {string|null}              [acceptEncoding]    - Value returned for Accept-Encoding.
 * @property {'buffer'|'stream'|'none'} [bodyKind]          - Shape of the response body.
 * @property {number}                   [bodyLength]        - Length of the buffered body.
 * @property {string}                   [contentType]       - Value of the Content-Type header.
 */

/**
 * Represents the result returned by the makeExchange helper.
 *
 * @typedef  {object}            FakeExchangeResult
 * @property {Exchange}          exchange           - Fake exchange.
 * @property {Response}          response           - Real Response instance.
 * @property {FakeHttp1Response} serverResponse     - Fake HTTP/1.1 server response.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a fake exchange backed by a real Response instance.
 *
 * The Content-Type header is set before the body is written because
 * `send()` and `stream()` lock the response headers once invoked.
 *
 * @param {MakeExchangeOptions} [options] - Options controlling the fake exchange.
 * @returns {FakeExchangeResult} The fake exchange and its underlying response.
 */
function makeExchange({
  acceptEncoding = 'gzip',
  bodyKind = 'buffer',
  bodyLength = 2048,
  contentType = 'text/plain',
} = {}) {
  const serverResponse = createFakeHttp1Response();
  const response = new Response(/** @type {any} */ (serverResponse), {});

  if (contentType !== '') {
    response.setHeader('Content-Type', contentType);
  }

  if (bodyKind === 'buffer') {
    response.send('x'.repeat(bodyLength));
  } else if (bodyKind === 'stream') {
    response.stream(Readable.from(['stream-body']));
  }
  return {
    /** @type {any} */
    exchange: {
      request: {
        /**
         * Returns a header value by name.
         *
         * @param {string} name - The header name.
         * @returns {string|undefined} The header value, or `undefined` when absent.
         */
        getHeader(name) {
          if (name !== 'accept-encoding') {
            return undefined;
          }

          return acceptEncoding ?? undefined;
        },
      },
      response,
    },
    serverResponse,
    response,
  };
}

/**
 * Creates a full normalized compression options object.
 *
 * Defaults mirror the normalized shape produced by the middleware's
 * configuration layer.
 *
 * @param {Partial<CompressOptionsData>} [overrides] - Fields to override on the defaults.
 * @returns {CompressOptionsData} A complete options object.
 */
function makeOptions(overrides = {}) {
  return {
    threshold: 1024,
    level: 6,
    types: undefined,
    ...overrides,
  };
}

/**
 * Reads a header from the Response as a string.
 *
 * Numeric header values are converted to strings. Missing headers
 * resolve to `undefined`.
 *
 * @param {Response} response - The response to read from.
 * @param {string} name - The header name.
 * @returns {string|undefined} The header value, or `undefined` when absent.
 */
function getHeader(response, name) {
  const value = response.getHeader(name);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}

/**
 * A no-op next function used to exercise the middleware pipeline.
 *
 * @type {NextFunction}
 */
const noopNext = () => {};

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CompressMiddleware', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Negotiation
  // ───────────────────────────────────────────────────────────────────────────
  test('Encoding negotiation', async sub => {
    await sub.test('should skip compression when Accept-Encoding is absent', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: null });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), undefined);
    });

    await sub.test('should skip compression when Accept-Encoding is empty', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: '' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), undefined);
    });

    await sub.test('should pick br when both br and gzip are acceptable', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: 'br, gzip' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'br');
    });

    await sub.test('should pick gzip when only gzip is acceptable', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: 'gzip' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should respect q=0 to exclude an encoding', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: 'br;q=0, gzip' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should pick the encoding with the highest q', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: 'gzip;q=0.5, br;q=0.9' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'br');
    });

    await sub.test('should honor a wildcard', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: '*' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'br');
    });

    await sub.test('should not compress when no supported encoding is acceptable', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: 'deflate' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), undefined);
    });

    await sub.test('should handle a case-insensitive Accept-Encoding value', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: 'GZIP' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Response eligibility
  // ───────────────────────────────────────────────────────────────────────────
  test('Response eligibility', async sub => {
    await sub.test('should skip when the response has no body', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ bodyKind: 'none' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), undefined);
    });

    await sub.test('should skip when a Content-Encoding is already set', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange();

      response.setHeader('Content-Encoding', 'identity');

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'identity');
    });

    await sub.test('should skip when the body is below the threshold', async () => {
      const middleware = new CompressMiddleware(makeOptions({ threshold: 1024 }));
      const { exchange, response } = makeExchange({ bodyLength: 512 });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), undefined);
    });

    await sub.test('should compress when the body meets the threshold', async () => {
      const middleware = new CompressMiddleware(makeOptions({ threshold: 1024 }));
      const { exchange, response } = makeExchange({ bodyLength: 1024 });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should always compress streams', async () => {
      const middleware = new CompressMiddleware(makeOptions({ threshold: 1_000_000 }));
      const { exchange, response } = makeExchange({ bodyKind: 'stream' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should skip when the media type is not compressible', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ contentType: 'image/png' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), undefined);
    });

    await sub.test('should skip when Content-Type is absent', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ contentType: '' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), undefined);
    });

    await sub.test('should compress text/* types', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ contentType: 'text/html' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should compress application/json', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ contentType: 'application/json' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should compress +json suffixed types', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({
        contentType: 'application/vnd.api+json',
      });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should compress +xml suffixed types', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ contentType: 'application/xhtml+xml' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should ignore Content-Type parameters', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({
        contentType: 'text/html; charset=utf-8',
      });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Content-Encoding'), 'gzip');
    });

    await sub.test('should respect a custom types allow-list', async () => {
      const middleware = new CompressMiddleware(
        makeOptions({ types: ['application/octet-stream'] }),
      );

      const { exchange: octetExchange, response: octetResponse } = makeExchange({
        contentType: 'application/octet-stream',
      });

      await middleware.handle(octetExchange, noopNext);

      assert.strictEqual(getHeader(octetResponse, 'Content-Encoding'), 'gzip');

      const { exchange: textExchange, response: textResponse } = makeExchange({
        contentType: 'text/plain',
      });

      await middleware.handle(textExchange, noopNext);

      assert.strictEqual(getHeader(textResponse, 'Content-Encoding'), 'gzip');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Headers
  // ───────────────────────────────────────────────────────────────────────────
  test('Headers', async sub => {
    await sub.test('should set Content-Encoding when compressing', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange();

      await middleware.handle(exchange, async () => {});

      assert.ok(['br', 'gzip'].includes(String(getHeader(response, 'Content-Encoding'))));
    });

    await sub.test('should add Vary: Accept-Encoding when compressing', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange();

      await middleware.handle(exchange, async () => {});

      // Response.vary normalizes to lowercase and joins with ", ".
      assert.strictEqual(getHeader(response, 'Vary'), 'accept-encoding');
    });

    await sub.test('should not add Vary when not compressing', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange, response } = makeExchange({ acceptEncoding: '' });

      await middleware.handle(exchange, async () => {});

      assert.strictEqual(getHeader(response, 'Vary'), undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pipeline
  // ───────────────────────────────────────────────────────────────────────────
  test('Pipeline', async sub => {
    await sub.test('should call next() before compressing', async () => {
      const middleware = new CompressMiddleware(makeOptions());
      const { exchange } = makeExchange();

      /** @type {string[]} */
      const order = [];

      await middleware.handle(exchange, async () => {
        order.push('next');
      });

      order.push('compressed');

      assert.deepStrictEqual(order, ['next', 'compressed']);
    });

    await sub.test('should forward errors from next()', async () => {
      const middleware = new CompressMiddleware(makeOptions());
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
