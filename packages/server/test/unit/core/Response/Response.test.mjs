// @ts-check

/**
 * @file Contains the unit tests for Response.
 *
 * @module test/unit/core/Response/Response
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Transform } from 'node:stream';

// » IMPORT LOCAL MODULES
import Response from '#Response';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * A single recorded call to `writeHead`.
 *
 * @typedef  {object}                  WriteHeadCall
 * @property {number}                  statusCode    - HTTP status code passed to `writeHead`.
 * @property {Record<string, unknown>} headers       - Headers passed to `writeHead`.
 */

/**
 * Array of recorded `writeHead` calls.
 *
 * @typedef {Array<WriteHeadCall>} WriteHeadCalls
 */

/**
 * Array of recorded `end` call arguments.
 *
 * @typedef {Array<unknown>} EndCalls
 */

/**
 * Observable state of a mock `ServerResponse`.
 *
 * @typedef  {object}         ServerResponseState
 * @property {WriteHeadCalls} writeHeadCalls      - Recorded `writeHead` calls.
 * @property {EndCalls}       endCalls            - Recorded `end` arguments.
 */

/**
 * Mock `ServerResponse` plus its observable state.
 *
 * @typedef  {object}              ServerResponseMock
 * @property {object}              serverResponse     - Mock `ServerResponse` instance.
 * @property {ServerResponseState} state              - Recorded interactions.
 */

/**
 * A `Response` instance paired with the mock's observable state.
 *
 * @typedef  {object}              ResponseMock
 * @property {Response}            response     - The `Response` under test.
 * @property {ServerResponseState} state        - Recorded interactions.
 */
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a mock `ServerResponse` that records the interactions made by
 * the `Response` instance.
 *
 * The mock exposes only the operations that `Response` uses:
 * `writeHead(statusCode, headers)` and `end(body?)`. It intentionally
 * does not expose a `stream` property, which routes the internal
 * `#writeHead` through its default branch.
 *
 * @returns {ServerResponseMock} Mock server response and its state.
 */
function makeServerResponse() {
  const state = {
    /** @type {Array<{ statusCode: number, headers: Record<string, unknown> }>} */
    writeHeadCalls: [],
    /** @type {unknown[]} */
    endCalls: [],
  };

  const serverResponse = {
    /**
     * Records a `writeHead` call and returns the mock itself.
     *
     * @param {number} statusCode - HTTP status code.
     * @param {Record<string, unknown>} headers - Response headers.
     * @returns {typeof serverResponse} The mock instance.
     */
    writeHead(statusCode, headers) {
      state.writeHeadCalls.push({ statusCode, headers });

      return serverResponse;
    },

    /**
     * Records an `end` call and returns the mock itself.
     *
     * @param {unknown} [body] - Optional body passed to `end`.
     * @returns {typeof serverResponse} The mock instance.
     */
    end(body) {
      state.endCalls.push(body);

      return serverResponse;
    },

    /**
     * No-op `on` stub to satisfy the stream-like contract.
     *
     * @returns {void}
     */
    on() {},

    /**
     * No-op `once` stub to satisfy the stream-like contract.
     *
     * @returns {void}
     */
    once() {},

    /**
     * No-op `off` stub to satisfy the stream-like contract.
     *
     * @returns {void}
     */
    off() {},
  };

  return { serverResponse, state };
}

/**
 * Creates a `Response` bound to a fresh mock server response.
 *
 * @param {object} [options] - Response constructor options.
 * @returns {ResponseMock} Response under test and mock state.
 */
function makeResponse(options = {}) {
  const { serverResponse, state } = makeServerResponse();
  const response = new Response(/** @type {any} */ (serverResponse), options);

  return { response, state };
}

/**
 * Creates a pass-through transform stream.
 *
 * @returns {Transform} A transform stream.
 */
function makeTransform() {
  return new Transform({
    transform(chunk, _encoding, callback) {
      callback(null, chunk);
    },
  });
}

/**
 * Creates a transform stream that discards its input.
 *
 * @returns {Transform} A transform stream.
 */
function makeDiscardTransform() {
  return new Transform({
    transform(_chunk, _encoding, callback) {
      callback();
    },
  });
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Response', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Initial state
  // ───────────────────────────────────────────────────────────────────────────
  test('Initial state', sub => {
    sub.test('should default to status 200 OK', () => {
      const { response } = makeResponse();

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.statusText, 'OK');
    });

    sub.test('should not be committed', () => {
      const { response } = makeResponse();

      assert.strictEqual(response.isCommitted, false);
    });

    sub.test('should have no body', () => {
      const { response } = makeResponse();

      assert.strictEqual(response.bodyKind, 'none');
      assert.strictEqual(response.bodyLength, undefined);
    });

    sub.test('should have no headers', () => {
      const { response } = makeResponse();

      const headers = response.getHeaders();

      assert.strictEqual(Object.keys(headers).length, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // status()
  // ───────────────────────────────────────────────────────────────────────────
  test('status()', sub => {
    sub.test('should set a valid status code', () => {
      const { response } = makeResponse();

      response.status(201);

      assert.strictEqual(response.statusCode, 201);
      assert.strictEqual(response.statusText, 'Created');
    });

    sub.test('should support 204, 205, 304', () => {
      const { response: r1 } = makeResponse();
      const { response: r2 } = makeResponse();
      const { response: r3 } = makeResponse();

      r1.status(204);
      r2.status(205);
      r3.status(304);

      assert.strictEqual(r1.statusCode, 204);
      assert.strictEqual(r2.statusCode, 205);
      assert.strictEqual(r3.statusCode, 304);
    });

    sub.test('should reject unsupported status codes', () => {
      const { response } = makeResponse();

      assert.throws(() => response.status(999), {
        name: 'ResponseError',
        code: 'INVALID_STATUS_CODE',
      });

      assert.throws(() => response.status(100), {
        name: 'ResponseError',
        code: 'INVALID_STATUS_CODE',
      });

      assert.throws(() => response.status(/** @type {any} */ ('200')), {
        name: 'ResponseError',
        code: 'INVALID_STATUS_CODE',
      });
    });

    sub.test('should reject empty-body status after a body is described', () => {
      const { response } = makeResponse();

      response.json({ ok: true });

      assert.throws(() => response.status(204), {
        name: 'ResponseError',
        code: 'BODY_NOT_ALLOWED',
      });
    });

    sub.test('should reject status changes after commit', () => {
      const { response } = makeResponse();

      response.end();

      assert.throws(() => response.status(201), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });

    sub.test('should return the response instance', () => {
      const { response } = makeResponse();

      assert.strictEqual(response.status(201), response);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Headers
  // ───────────────────────────────────────────────────────────────────────────
  test('Headers', sub => {
    sub.test('setHeader() should store a header', () => {
      const { response } = makeResponse();

      response.setHeader('Content-Type', 'application/json');

      assert.strictEqual(response.getHeader('Content-Type'), 'application/json');
      assert.strictEqual(response.hasHeader('Content-Type'), true);
    });

    sub.test('setHeaders() should store multiple headers', () => {
      const { response } = makeResponse();

      response.setHeaders({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });

      assert.strictEqual(response.getHeader('Content-Type'), 'application/json');
      assert.strictEqual(response.getHeader('Cache-Control'), 'no-store');
    });

    sub.test('appendHeader() should append values', () => {
      const { response } = makeResponse();

      response.appendHeader('Set-Cookie', 'a=1');
      response.appendHeader('Set-Cookie', 'b=2');

      assert.deepStrictEqual(response.getHeader('Set-Cookie'), ['a=1', 'b=2']);
    });

    sub.test('removeHeader() should remove an existing header', () => {
      const { response } = makeResponse();

      response.setHeader('X-Debug', 'true');
      response.removeHeader('X-Debug');

      assert.strictEqual(response.hasHeader('X-Debug'), false);
    });

    sub.test('getHeaders() should return a frozen copy', () => {
      const { response } = makeResponse();

      response.setHeader('Content-Type', 'application/json');

      const headers = response.getHeaders();

      assert.strictEqual(Object.isFrozen(headers), true);
      assert.strictEqual(headers['content-type'], 'application/json');
    });

    sub.test('getHeaders() should return a snapshot', () => {
      const { response } = makeResponse();

      response.setHeader('X-Test', 'original');

      const headers = response.getHeaders();

      response.setHeader('X-Test', 'updated');

      assert.strictEqual(headers['x-test'], 'original');
      assert.strictEqual(response.getHeader('X-Test'), 'updated');
    });

    sub.test('should throw when setting headers after commit', () => {
      const { response } = makeResponse();

      response.json({ ok: true }).end();

      assert.throws(() => response.setHeader('X-Late', 'true'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });

    sub.test('should reject header removal after commit', () => {
      const { response } = makeResponse();

      response.setHeader('X-Test', 'true').end();

      assert.throws(() => response.removeHeader('X-Test'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // json()
  // ───────────────────────────────────────────────────────────────────────────
  test('json()', sub => {
    sub.test('should serialize an object as JSON', () => {
      const { response } = makeResponse();

      response.json({ id: 42 });

      assert.strictEqual(response.bodyKind, 'buffer');
      assert.strictEqual(response.getHeader('Content-Type'), 'application/json');
    });

    sub.test('should preserve null as a valid JSON value', () => {
      const { response } = makeResponse();

      assert.doesNotThrow(() => response.json(null));
      assert.strictEqual(response.bodyKind, 'buffer');
    });

    sub.test('should lock Content-Type after json()', () => {
      const { response } = makeResponse();

      response.json({ ok: true });

      assert.throws(() => response.setHeader('Content-Type', 'text/html'), {
        name: 'ResponseError',
        code: 'CONTENT_TYPE_LOCKED',
      });
    });

    sub.test('should throw when a body has already been described', () => {
      const { response } = makeResponse();

      response.json({ ok: true });

      assert.throws(() => response.json({ ok: false }), {
        name: 'ResponseError',
        code: 'BODY_ALREADY_DESCRIBED',
      });
    });

    sub.test('should throw when the status does not allow a body', () => {
      const { response } = makeResponse();

      response.status(204);

      assert.throws(() => response.json({ ok: true }), {
        name: 'ResponseError',
        code: 'BODY_NOT_ALLOWED',
      });
    });

    sub.test('should throw INVALID_JSON when serialization fails', () => {
      const { response } = makeResponse();

      const circular = /** @type {any} */ ({});
      circular.self = circular;

      assert.throws(() => response.json(circular), {
        name: 'ResponseError',
        code: 'INVALID_JSON',
      });
    });

    sub.test('should throw INVALID_JSON for non-serializable values', () => {
      const { response } = makeResponse();

      assert.throws(() => response.json(undefined), {
        name: 'ResponseError',
        code: 'INVALID_JSON',
      });

      assert.throws(() => response.json(() => {}), {
        name: 'ResponseError',
        code: 'INVALID_JSON',
      });
    });

    sub.test('should reject JSON after commit', () => {
      const { response } = makeResponse();

      response.end();

      assert.throws(() => response.json({ ok: true }), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // html() / text() / send()
  // ───────────────────────────────────────────────────────────────────────────
  test('html() / text() / send()', sub => {
    sub.test('html() should set a text/html content type', () => {
      const { response } = makeResponse();

      response.html('<h1>Hello</h1>');

      assert.strictEqual(response.bodyKind, 'buffer');
      assert.strictEqual(response.getHeader('Content-Type'), 'text/html');
    });

    sub.test('text() should set a text/plain content type', () => {
      const { response } = makeResponse();

      response.text('Hello');

      assert.strictEqual(response.bodyKind, 'buffer');
      assert.strictEqual(response.getHeader('Content-Type'), 'text/plain');
    });

    sub.test('send() should accept a string', () => {
      const { response } = makeResponse();

      response.send('Hello');

      assert.strictEqual(response.bodyKind, 'buffer');
      assert.strictEqual(response.bodyLength, 5);
    });

    sub.test('send() should accept a Uint8Array', () => {
      const { response } = makeResponse();

      response.send(new Uint8Array([1, 2, 3]));

      assert.strictEqual(response.bodyKind, 'buffer');
      assert.strictEqual(response.bodyLength, 3);
    });

    sub.test('send() should default to an empty string', () => {
      const { response } = makeResponse();

      response.send();

      assert.strictEqual(response.bodyKind, 'buffer');
      assert.strictEqual(response.bodyLength, 0);
    });

    sub.test('send() should reject invalid body types', () => {
      const { response } = makeResponse();

      assert.throws(() => response.send(/** @type {any} */ (42)), {
        name: 'ResponseError',
        code: 'INVALID_BODY',
      });

      assert.throws(() => response.send(/** @type {any} */ (null)), {
        name: 'ResponseError',
        code: 'INVALID_BODY',
      });
    });

    sub.test('html() should reject non-string bodies', () => {
      const { response } = makeResponse();

      assert.throws(() => response.html(/** @type {any} */ (42)), {
        name: 'ResponseError',
        code: 'INVALID_BODY',
      });
    });

    sub.test('text() should reject non-string bodies', () => {
      const { response } = makeResponse();

      assert.throws(() => response.text(/** @type {any} */ (42)), {
        name: 'ResponseError',
        code: 'INVALID_BODY',
      });
    });

    sub.test('should reject body methods after commit', () => {
      const { response } = makeResponse();

      response.end();

      assert.throws(() => response.send('hello'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });

      assert.throws(() => response.text('hello'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });

      assert.throws(() => response.html('<p>Hello</p>'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // stream()
  // ───────────────────────────────────────────────────────────────────────────
  test('stream()', sub => {
    sub.test('should accept a readable stream', () => {
      const { response } = makeResponse();
      const stream = Readable.from(['hello']);

      response.stream(stream);

      assert.strictEqual(response.bodyKind, 'stream');
      assert.strictEqual(response.bodyLength, undefined);
    });

    sub.test('should apply a content type when provided', () => {
      const { response } = makeResponse();
      const stream = Readable.from(['hello']);

      response.stream(stream, 'application/octet-stream');

      assert.strictEqual(response.getHeader('Content-Type'), 'application/octet-stream');
    });

    sub.test('should not override an existing content type', () => {
      const { response } = makeResponse();
      const stream = Readable.from(['hello']);

      response.setHeader('Content-Type', 'text/plain');
      response.stream(stream, 'application/octet-stream');

      assert.strictEqual(response.getHeader('Content-Type'), 'text/plain');
    });

    sub.test('should reject non-stream inputs', () => {
      const { response } = makeResponse();

      assert.throws(() => response.stream(/** @type {any} */ (null)), {
        name: 'ResponseError',
        code: 'INVALID_STREAM',
      });

      assert.throws(() => response.stream(/** @type {any} */ ('not-a-stream')), {
        name: 'ResponseError',
        code: 'INVALID_STREAM',
      });
    });

    sub.test('should reject when a body has already been described', () => {
      const { response } = makeResponse();

      response.text('hello');

      assert.throws(() => response.stream(Readable.from(['x'])), {
        name: 'ResponseError',
        code: 'BODY_ALREADY_DESCRIBED',
      });
    });

    sub.test('should reject streams after commit', () => {
      const { response } = makeResponse();

      response.end();

      assert.throws(() => response.stream(Readable.from(['hello'])), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // redirect()
  // ───────────────────────────────────────────────────────────────────────────
  test('redirect()', sub => {
    sub.test('should set a Location header and status 302 by default', () => {
      const { response } = makeResponse();

      response.redirect('/login');

      assert.strictEqual(response.statusCode, 302);
      assert.strictEqual(response.getHeader('Location'), '/login');
    });

    sub.test('should support 301, 303, 307, 308', () => {
      for (const code of [301, 303, 307, 308]) {
        const { response } = makeResponse();

        response.redirect('/target', code);

        assert.strictEqual(response.statusCode, code);
      }
    });

    sub.test('should reject empty URLs', () => {
      const { response } = makeResponse();

      assert.throws(() => response.redirect(''), {
        name: 'ResponseError',
        code: 'INVALID_REDIRECT_URL',
      });
    });

    sub.test('should reject unsupported redirect status', () => {
      const { response } = makeResponse();

      assert.throws(() => response.redirect('/target', 200), {
        name: 'ResponseError',
        code: 'INVALID_REDIRECT_STATUS',
      });
    });

    sub.test('should lock Content-Type after redirect', () => {
      const { response } = makeResponse();

      response.redirect('/target');

      assert.throws(() => response.setHeader('Content-Type', 'text/html'), {
        name: 'ResponseError',
        code: 'CONTENT_TYPE_LOCKED',
      });
    });

    sub.test('should reject redirects after commit', () => {
      const { response } = makeResponse();

      response.end();

      assert.throws(() => response.redirect('/target'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });

    sub.test('should return the response instance', () => {
      const { response } = makeResponse();

      assert.strictEqual(response.redirect('/target'), response);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // vary()
  // ───────────────────────────────────────────────────────────────────────────
  test('vary()', sub => {
    sub.test('should set Vary with a single field', () => {
      const { response } = makeResponse();

      response.vary('Accept');

      assert.strictEqual(response.getHeader('Vary'), 'accept');
    });

    sub.test('should combine and deduplicate multiple fields', () => {
      const { response } = makeResponse();

      response.vary('Accept', 'Accept-Encoding', 'accept');

      assert.strictEqual(response.getHeader('Vary'), 'accept, accept-encoding');
    });

    sub.test('should merge with existing Vary values', () => {
      const { response } = makeResponse();

      response.setHeader('Vary', 'Origin');
      response.vary('Accept');

      const value = String(response.getHeader('Vary'));

      assert.ok(value.includes('origin'));
      assert.ok(value.includes('accept'));
    });

    sub.test('should be a no-op when no fields are provided', () => {
      const { response } = makeResponse();

      response.vary();

      assert.strictEqual(response.hasHeader('Vary'), false);
    });

    sub.test('should reject empty field names', () => {
      const { response } = makeResponse();

      assert.throws(() => response.vary(''), {
        name: 'TypeError',
      });

      assert.throws(() => response.vary(/** @type {any} */ (42)), {
        name: 'TypeError',
      });
    });

    sub.test('should reject Vary mutations after commit', () => {
      const { response } = makeResponse();

      response.end();

      assert.throws(() => response.vary('Accept'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // cache() / noCache()
  // ───────────────────────────────────────────────────────────────────────────
  test('cache() / noCache()', sub => {
    sub.test('cache() should set Cache-Control with the given duration', () => {
      const { response } = makeResponse();

      response.cache(3600);

      assert.strictEqual(response.getHeader('Cache-Control'), 'public, max-age=3600');
    });

    sub.test('cache() should accept 0', () => {
      const { response } = makeResponse();

      response.cache(0);

      assert.strictEqual(response.getHeader('Cache-Control'), 'public, max-age=0');
    });

    sub.test('cache() should reject non-integer values', () => {
      const { response } = makeResponse();

      assert.throws(() => response.cache(1.5), {
        name: 'ResponseError',
        code: 'INVALID_CACHE_DURATION',
      });

      assert.throws(() => response.cache(-1), {
        name: 'ResponseError',
        code: 'INVALID_CACHE_DURATION',
      });
    });

    sub.test('cache() should reject non-finite values', () => {
      const { response } = makeResponse();

      for (const duration of [NaN, Infinity, -Infinity]) {
        assert.throws(() => response.cache(duration), {
          name: 'ResponseError',
          code: 'INVALID_CACHE_DURATION',
        });
      }
    });

    sub.test('noCache() should set the no-cache headers', () => {
      const { response } = makeResponse();

      response.noCache();

      assert.strictEqual(
        response.getHeader('Cache-Control'),
        'no-cache, no-store, must-revalidate',
      );
      assert.strictEqual(response.getHeader('Pragma'), 'no-cache');
      assert.strictEqual(response.getHeader('Expires'), '0');
    });

    sub.test('should reject cache mutations after commit', () => {
      const { response } = makeResponse();

      response.end();

      assert.throws(() => response.cache(3600), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });

      assert.throws(() => response.noCache(), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // end()
  // ───────────────────────────────────────────────────────────────────────────
  test('end()', async sub => {
    await sub.test('should call writeHead and end with a buffered body', () => {
      const { response, state } = makeResponse();

      response.json({ ok: true }).end();

      assert.strictEqual(state.writeHeadCalls.length, 1);
      assert.strictEqual(state.writeHeadCalls[0].statusCode, 200);
      assert.strictEqual(state.endCalls.length, 1);
    });

    await sub.test('should end without a body', () => {
      const { response, state } = makeResponse();

      response.end();

      assert.strictEqual(state.writeHeadCalls.length, 1);
      assert.strictEqual(state.endCalls.length, 1);
      assert.strictEqual(response.isCommitted, true);
    });

    await sub.test('should compute Content-Length for a buffered body', () => {
      const { response, state } = makeResponse();

      response.send('Hello').end();

      const headers = state.writeHeadCalls[0].headers;

      assert.strictEqual(headers['content-length'], '5');
    });

    await sub.test('should support empty-body status codes', () => {
      const { response, state } = makeResponse();

      response.status(204).end();

      assert.strictEqual(state.writeHeadCalls.length, 1);
      assert.strictEqual(state.writeHeadCalls[0].statusCode, 204);
      assert.strictEqual(state.endCalls.length, 1);
    });

    await sub.test('should set Content-Length to 0 for status 205', () => {
      const { response, state } = makeResponse();

      response.status(205).end();

      assert.strictEqual(state.writeHeadCalls[0].headers['content-length'], '0');
    });

    await sub.test('should remove Content-Length for status 304', () => {
      const { response, state } = makeResponse();

      response.setHeader('Content-Length', '100');
      response.status(304).end();

      assert.strictEqual('content-length' in state.writeHeadCalls[0].headers, false);
    });

    await sub.test('should be idempotent', () => {
      const { response, state } = makeResponse();

      response.json({ ok: true }).end().end().end();

      assert.strictEqual(state.writeHeadCalls.length, 1);
      assert.strictEqual(state.endCalls.length, 1);
    });

    await sub.test('should mark the response as committed', () => {
      const { response } = makeResponse();

      response.json({ ok: true }).end();

      assert.strictEqual(response.isCommitted, true);
    });

    await sub.test('should return the response instance', () => {
      const { response } = makeResponse();

      assert.strictEqual(response.end(), response);
    });

    await sub.test('should stream a stream body via pipeline', async () => {
      const { response, state } = makeResponse();

      response.stream(Readable.from(['hello']));
      response.end();

      await new Promise(resolve => setImmediate(resolve));

      assert.strictEqual(state.writeHeadCalls.length, 1);
    });

    await sub.test('should generate a weak ETag when enabled', () => {
      const { response, state } = makeResponse({ etag: true });

      response.send('Hello').end();

      const etag = state.writeHeadCalls[0].headers['etag'];

      assert.ok(typeof etag === 'string');
      assert.ok(String(etag).startsWith('W/"'));
    });

    await sub.test('should not override an existing ETag', () => {
      const { response, state } = makeResponse({ etag: true });

      response.setHeader('ETag', 'W/"custom"');
      response.send('Hello').end();

      assert.strictEqual(state.writeHeadCalls[0].headers['etag'], 'W/"custom"');
    });

    await sub.test('should apply the default charset to eligible content types', () => {
      const { response, state } = makeResponse({
        defaultCharset: 'utf-8',
      });

      response.json({ ok: true }).end();

      assert.strictEqual(
        state.writeHeadCalls[0].headers['content-type'],
        'application/json; charset=utf-8',
      );
    });

    await sub.test('should not override an existing charset parameter', () => {
      const { response, state } = makeResponse({
        defaultCharset: 'utf-8',
      });

      response.setHeader('Content-Type', 'text/plain; charset=latin1');
      response.text('Hello').end();

      assert.strictEqual(
        state.writeHeadCalls[0].headers['content-type'],
        'text/plain; charset=latin1',
      );
    });

    sub.test('should not apply the default charset to ineligible content types', () => {
      const { response, state } = makeResponse({
        defaultCharset: 'utf-8',
      });

      response.setHeader('Content-Type', 'application/octet-stream');
      response.send(new Uint8Array([1, 2, 3]));
      response.end();

      assert.strictEqual(
        state.writeHeadCalls[0].headers['content-type'],
        'application/octet-stream',
      );
    });

    await sub.test('should forward commit hook errors to onCommitError', () => {
      /** @type {{ error: Error | null }} */
      const captured = { error: null };

      const { response } = makeResponse({
        onCommit() {
          throw new Error('hook failure');
        },
        /**
         * Captures the commit error for assertion.
         *
         * @param {Error} error - Error thrown by the commit hook.
         * @returns {void}
         */
        onCommitError(error) {
          captured.error = error;
        },
      });

      response.json({ ok: true }).end();

      assert.ok(captured.error instanceof Error);
      assert.strictEqual(captured.error.message, 'hook failure');
      assert.strictEqual(response.isCommitted, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Response.wrapBody()
  // ───────────────────────────────────────────────────────────────────────────
  test('Response.wrapBody()', sub => {
    sub.test('should convert a buffered body into a stream body', () => {
      const { response } = makeResponse();

      response.send('hello');

      Response.wrapBody(response, makeTransform());

      assert.strictEqual(response.bodyKind, 'stream');
      assert.strictEqual(response.bodyLength, undefined);
    });

    sub.test('should remove Content-Length when wrapping a buffered body', () => {
      const { response } = makeResponse();

      response.send('hello').setHeader('Content-Length', '5');

      Response.wrapBody(response, makeTransform());

      assert.strictEqual(response.hasHeader('Content-Length'), false);
    });

    sub.test('should preserve unrelated headers when wrapping', () => {
      const { response } = makeResponse();

      response.setHeader('X-Test', 'value');
      response.send('hello');

      Response.wrapBody(response, makeTransform());

      assert.strictEqual(response.getHeader('X-Test'), 'value');
      assert.strictEqual(response.hasHeader('Content-Length'), false);
    });

    sub.test('should reuse a stream body', () => {
      const { response } = makeResponse();
      const source = Readable.from(['hello']);

      response.stream(source);

      Response.wrapBody(response, makeTransform());

      assert.strictEqual(response.bodyKind, 'stream');
    });

    sub.test('should throw when wrapping twice', () => {
      const { response } = makeResponse();

      response.send('hello');

      Response.wrapBody(response, makeTransform());

      assert.throws(() => Response.wrapBody(response, makeTransform()), {
        name: 'ResponseError',
        code: 'BODY_ALREADY_WRAPPED',
      });
    });

    sub.test('should throw when no body has been described', () => {
      const { response } = makeResponse();

      assert.throws(() => Response.wrapBody(response, makeTransform()), {
        name: 'ResponseError',
        code: 'BODY_NOT_DESCRIBED',
      });
    });

    sub.test('should throw when the transform is not a stream', () => {
      const { response } = makeResponse();

      response.send('hello');

      assert.throws(() => Response.wrapBody(response, /** @type {any} */ ({})), {
        name: 'ResponseError',
        code: 'INVALID_STREAM',
      });
    });

    sub.test('should throw when the response is not a Response instance', () => {
      assert.throws(() => Response.wrapBody(/** @type {any} */ ({}), makeTransform()), {
        name: 'TypeError',
      });
    });

    sub.test('should throw when the response is already committed', () => {
      const { response } = makeResponse();

      response.send('hello').end();

      assert.throws(() => Response.wrapBody(response, makeTransform()), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });

    sub.test('should stream through a transform that discards the body', async () => {
      const { response, state } = makeResponse();

      response.send('hello');

      Response.wrapBody(response, makeDiscardTransform());

      response.end();

      await new Promise(resolve => setImmediate(resolve));

      assert.strictEqual(state.writeHeadCalls.length, 1);
      assert.strictEqual(response.isCommitted, true);
      // El pipeline completó sin errores: no hay onCommitError que reportar.
      assert.strictEqual(state.endCalls.length, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Response.discardUncommittedState()
  // ───────────────────────────────────────────────────────────────────────────
  test('Response.discardUncommittedState()', sub => {
    sub.test('should reset status, headers, and body', () => {
      const { response } = makeResponse();

      response.status(201).setHeader('X-Test', 'value').json({ ok: true });

      Response.discardUncommittedState(response);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.statusText, 'OK');
      assert.strictEqual(response.hasHeader('X-Test'), false);
      assert.strictEqual(response.bodyKind, 'none');
      assert.strictEqual(response.bodyLength, undefined);
      assert.strictEqual(response.isCommitted, false);
    });

    sub.test('should reset the wrapped body state', () => {
      const { response } = makeResponse();

      response.send('hello');

      Response.wrapBody(response, makeTransform());

      Response.discardUncommittedState(response);

      assert.strictEqual(response.bodyKind, 'none');

      // The response can describe a new body after discard.
      assert.doesNotThrow(() => response.send('new'));
    });

    sub.test('should release the Content-Type lock', () => {
      const { response } = makeResponse();

      response.json({ ok: true });

      Response.discardUncommittedState(response);

      assert.doesNotThrow(() => response.setHeader('Content-Type', 'text/plain'));
    });

    sub.test('should clear Content-Length state', () => {
      const { response } = makeResponse();

      response.send('hello').setHeader('Content-Length', '5');

      Response.discardUncommittedState(response);

      assert.strictEqual(response.hasHeader('Content-Length'), false);
    });

    sub.test('should throw when the response is committed', () => {
      const { response } = makeResponse();

      response.send('hello').end();

      assert.throws(() => Response.discardUncommittedState(response), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });

    sub.test('should throw when the value is not a Response instance', () => {
      assert.throws(() => Response.discardUncommittedState(/** @type {any} */ ({})), {
        name: 'TypeError',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // State invariants
  // ───────────────────────────────────────────────────────────────────────────
  test('State invariants', sub => {
    sub.test('should remain uncommitted while describing a body', () => {
      const { response } = makeResponse();

      response.json({ ok: true });

      assert.strictEqual(response.isCommitted, false);
      assert.strictEqual(response.bodyKind, 'buffer');
    });

    sub.test('should commit only when end() is called', () => {
      const { response } = makeResponse();

      response.text('hello');

      assert.strictEqual(response.isCommitted, false);

      response.end();

      assert.strictEqual(response.isCommitted, true);
    });

    sub.test('should preserve status and headers before commit', () => {
      const { response } = makeResponse();

      response.status(201).setHeader('X-Test', 'value').send('hello');

      assert.strictEqual(response.statusCode, 201);
      assert.strictEqual(response.getHeader('X-Test'), 'value');
      assert.strictEqual(response.bodyKind, 'buffer');
      assert.strictEqual(response.isCommitted, false);
    });

    sub.test('should reject state mutation after commit', () => {
      const { response } = makeResponse();

      response.end();

      assert.throws(() => response.status(201), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });

      assert.throws(() => response.setHeader('X-Test', 'value'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });

      assert.throws(() => response.removeHeader('X-Test'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });

      assert.throws(() => response.send('hello'), {
        name: 'ResponseError',
        code: 'RESPONSE_ALREADY_SENT',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Commit / transport contract
  // ───────────────────────────────────────────────────────────────────────────
  test('Commit / transport contract', sub => {
    sub.test('should call writeHead exactly once with statusCode and headers', () => {
      const { response, state } = makeResponse();

      response.status(201).json({ id: 1 }).end();

      assert.strictEqual(state.writeHeadCalls.length, 1);
      assert.strictEqual(state.writeHeadCalls[0].statusCode, 201);
      assert.ok(typeof state.writeHeadCalls[0].headers === 'object');
      assert.strictEqual(state.writeHeadCalls[0].headers['content-type'], 'application/json');
    });

    sub.test('should pass all configured headers to writeHead', () => {
      const { response, state } = makeResponse();

      response
        .setHeaders({
          'X-One': '1',
          'X-Two': '2',
        })
        .send('hello')
        .end();

      const headers = state.writeHeadCalls[0].headers;

      assert.strictEqual(headers['x-one'], '1');
      assert.strictEqual(headers['x-two'], '2');
      assert.strictEqual(headers['content-length'], '5');
    });

    sub.test('should convert array headers to arrays of strings', () => {
      const { response, state } = makeResponse();

      response.setHeader('Set-Cookie', ['a=1', 'b=2']).send('hello').end();

      const cookies = /** @type {string[]} */ (state.writeHeadCalls[0].headers['set-cookie']);

      assert.deepStrictEqual(cookies, ['a=1', 'b=2']);
    });

    sub.test('should not call writeHead before end()', () => {
      const { response, state } = makeResponse();

      response.status(201).json({ id: 1 });

      assert.strictEqual(state.writeHeadCalls.length, 0);
      assert.strictEqual(state.endCalls.length, 0);
    });

    sub.test('should not call writeHead more than once', () => {
      const { response, state } = makeResponse();

      response.send('hello').end().end();

      assert.strictEqual(state.writeHeadCalls.length, 1);
    });
  });
});
