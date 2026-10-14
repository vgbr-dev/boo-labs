// @ts-check
/**
 * @file Contains the unit tests for Request.
 *
 * @module test/unit/core/Request/Request
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Request from '#Request';
import RequestHeaders from '../../../../source/core/Request/RequestHeaders.mjs';
import { createMockIncomingMessage } from '../../../helpers/createMockIncomingMessage.mjs';

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a Request bound to a mock incoming message.
 *
 * @param {Parameters<typeof createMockIncomingMessage>[0]} [messageOptions] - Mock message options.
 * @param {object} [requestOptions] - Request constructor options.
 * @returns {Request} A Request instance bound to the mock message.
 */
function makeRequest(messageOptions = {}, requestOptions = {}) {
  const message = createMockIncomingMessage({
    headers: { host: 'example.com' },
    ...messageOptions,
  });

  return new Request(/** @type {any} */ (message), requestOptions);
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Request', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should construct with minimal options', () => {
      const request = makeRequest();

      assert.ok(request);
      assert.strictEqual(request.hostname, 'example.com');
    });

    await sub.test('should reject invalid bodyLimit', () => {
      assert.throws(() => makeRequest({}, { bodyLimit: 0 }), { name: 'TypeError' });
      assert.throws(() => makeRequest({}, { bodyLimit: -1 }), { name: 'TypeError' });
      assert.throws(() => makeRequest({}, { bodyLimit: /** @type {any} */ ('1024') }), {
        name: 'TypeError',
      });
    });

    await sub.test('should reject invalid trustProxy', () => {
      assert.throws(() => makeRequest({}, { trustProxy: /** @type {any} */ ('yes') }), {
        name: 'TypeError',
      });
      assert.throws(() => makeRequest({}, { trustProxy: -1 }), { name: 'TypeError' });
      assert.throws(() => makeRequest({}, { trustProxy: 1.5 }), { name: 'TypeError' });
    });

    await sub.test('should accept trustProxy as boolean or non-negative integer', () => {
      assert.doesNotThrow(() => makeRequest({}, { trustProxy: true }));
      assert.doesNotThrow(() => makeRequest({}, { trustProxy: false }));
      assert.doesNotThrow(() => makeRequest({}, { trustProxy: 0 }));
      assert.doesNotThrow(() => makeRequest({}, { trustProxy: 3 }));
    });

    await sub.test('should reject requests without an authority', () => {
      assert.throws(
        () => new Request(/** @type {any} */ (createMockIncomingMessage({ headers: {} }))),
        { name: 'RequestError', code: 'MISSING_HOST' },
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // pathname / method / url
  // ───────────────────────────────────────────────────────────────────────────
  test('pathname / method / url', async sub => {
    await sub.test('should expose the pathname', () => {
      const request = makeRequest({ url: '/users/42' });

      assert.strictEqual(request.pathname, '/users/42');
    });

    await sub.test('should normalize the pathname for OPTIONS *', () => {
      const request = makeRequest({ method: 'OPTIONS', url: '*' });

      assert.strictEqual(request.pathname, '/');
    });

    await sub.test('should uppercase the method', () => {
      const request = makeRequest({ method: 'get' });

      assert.strictEqual(request.method, 'GET');
    });

    await sub.test('should throw MISSING_METHOD when the message lacks method', () => {
      const message = createMockIncomingMessage({ headers: { host: 'example.com' } });

      // Delete the property entirely.
      delete (/** @type {any} */ (message).method);

      const request = new Request(/** @type {any} */ (message));

      assert.throws(() => request.method, { name: 'RequestError', code: 'MISSING_METHOD' });
    });

    await sub.test('should expose the raw url', () => {
      const request = makeRequest({ url: '/users?page=1' });

      assert.strictEqual(request.url, '/users?page=1');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // headers
  // ───────────────────────────────────────────────────────────────────────────
  test('headers', async sub => {
    await sub.test('should expose a RequestHeaders instance', () => {
      const request = makeRequest();

      assert.ok(request.headers instanceof RequestHeaders);
    });

    await sub.test('should resolve headers case-insensitively', () => {
      const request = makeRequest({
        headers: { host: 'example.com', 'content-type': 'application/json' },
      });

      assert.strictEqual(request.getHeader('Content-Type'), 'application/json');
      assert.strictEqual(request.getHeader('CONTENT-TYPE'), 'application/json');
    });

    await sub.test('should filter HTTP/2 pseudo-headers from the public view', () => {
      const request = makeRequest({
        httpVersionMajor: 2,
        httpVersionMinor: 0,
        httpVersion: '2.0',
        scheme: 'https',
        authority: 'example.com',
        headers: {
          ':method': 'GET',
          ':path': '/users',
          ':scheme': 'https',
          ':authority': 'example.com',
          'content-type': 'application/json',
        },
      });

      assert.strictEqual(request.getHeader(':scheme'), undefined);
      assert.strictEqual(request.getHeader('content-type'), 'application/json');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // query
  // ───────────────────────────────────────────────────────────────────────────
  test('query', async sub => {
    await sub.test('should parse the query string', () => {
      const request = makeRequest({ url: '/users?page=1&limit=10' });

      assert.strictEqual(request.query.get('page'), '1');
      assert.strictEqual(request.query.get('limit'), '10');
    });

    await sub.test('should return an empty URLSearchParams when no query is present', () => {
      const request = makeRequest({ url: '/users' });

      assert.strictEqual(request.query.toString(), '');
    });

    await sub.test('should return a defensive copy', () => {
      const request = makeRequest({ url: '/users?page=1' });
      const query = request.query;

      query.set('page', '999');

      assert.strictEqual(request.query.get('page'), '1');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // contentType / mediaType
  // ───────────────────────────────────────────────────────────────────────────
  test('contentType / mediaType', async sub => {
    await sub.test('should expose the raw Content-Type', () => {
      const request = makeRequest({
        headers: { host: 'example.com', 'content-type': 'application/json; charset=utf-8' },
      });

      assert.strictEqual(request.contentType, 'application/json; charset=utf-8');
    });

    await sub.test('should expose the normalized media type', () => {
      const request = makeRequest({
        headers: { host: 'example.com', 'content-type': 'Application/JSON; charset=utf-8' },
      });

      assert.strictEqual(request.mediaType, 'application/json');
    });

    await sub.test('should return null when Content-Type is absent', () => {
      const request = makeRequest();

      assert.strictEqual(request.contentType, null);
      assert.strictEqual(request.mediaType, null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // protocol / isSecure / hostname / httpVersion
  // ───────────────────────────────────────────────────────────────────────────
  test('protocol / isSecure / hostname / httpVersion', async sub => {
    await sub.test('should default to http when no transport hint is present', () => {
      const request = makeRequest();

      assert.strictEqual(request.protocol, 'http');
      assert.strictEqual(request.isSecure, false);
    });

    await sub.test('should resolve https from an encrypted socket', () => {
      const request = makeRequest({ encrypted: true });

      assert.strictEqual(request.protocol, 'https');
      assert.strictEqual(request.isSecure, true);
    });

    await sub.test('should resolve http from an unencrypted socket', () => {
      const request = makeRequest({ encrypted: false });

      assert.strictEqual(request.protocol, 'http');
    });

    await sub.test('should resolve the scheme from HTTP/2 pseudo-headers', () => {
      const request = makeRequest({
        httpVersionMajor: 2,
        httpVersionMinor: 0,
        httpVersion: '2.0',
        scheme: 'https',
        authority: 'example.com',
      });

      assert.strictEqual(request.protocol, 'https');
    });

    await sub.test('should expose the hostname', () => {
      const request = makeRequest({ headers: { host: 'example.com:8080' } });

      assert.strictEqual(request.hostname, 'example.com');
    });

    await sub.test('should expose the HTTP version', () => {
      const request = makeRequest({ httpVersion: '2.0' });

      assert.strictEqual(request.httpVersion, '2.0');
    });

    await sub.test(
      'should derive HTTP version from major/minor when httpVersion is missing',
      () => {
        const request = makeRequest({
          httpVersion: /** @type {any} */ (null),
          httpVersionMajor: 2,
          httpVersionMinor: 0,
        });

        assert.strictEqual(request.httpVersion, '2.0');
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // trustProxy: protocol
  // ───────────────────────────────────────────────────────────────────────────
  test('trustProxy: protocol', async sub => {
    await sub.test('should use X-Forwarded-Proto when trustProxy is true', () => {
      const request = makeRequest(
        { headers: { host: 'example.com', 'x-forwarded-proto': 'https' } },
        { trustProxy: true },
      );

      assert.strictEqual(request.protocol, 'https');
    });

    await sub.test('should use X-Forwarded-Proto when trustProxy is a number', () => {
      const request = makeRequest(
        { headers: { host: 'example.com', 'x-forwarded-proto': 'https' } },
        { trustProxy: 1 },
      );

      assert.strictEqual(request.protocol, 'https');
    });

    await sub.test('should prefer X-Forwarded-Proto over the transport hint', () => {
      const request = makeRequest(
        {
          headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
          encrypted: false,
        },
        { trustProxy: true },
      );

      assert.strictEqual(request.protocol, 'https');
    });

    await sub.test('should ignore X-Forwarded-Proto when trustProxy is false', () => {
      const request = makeRequest({
        headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
        encrypted: false,
      });

      assert.strictEqual(request.protocol, 'http');
    });

    await sub.test('should fall back to transport when X-Forwarded-Proto is invalid', () => {
      const request = makeRequest(
        {
          headers: { host: 'example.com', 'x-forwarded-proto': 'invalid' },
          encrypted: true,
        },
        { trustProxy: true },
      );

      assert.strictEqual(request.protocol, 'https');
    });

    await sub.test('should use the first value of a CSV X-Forwarded-Proto', () => {
      const request = makeRequest(
        { headers: { host: 'example.com', 'x-forwarded-proto': 'https, http' } },
        { trustProxy: true },
      );

      assert.strictEqual(request.protocol, 'https');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // trustProxy: host
  // ───────────────────────────────────────────────────────────────────────────
  test('trustProxy: host', async sub => {
    await sub.test('should use X-Forwarded-Host when trustProxy is true', () => {
      const request = makeRequest(
        {
          headers: { host: 'internal.example.com', 'x-forwarded-host': 'public.example.com' },
        },
        { trustProxy: true },
      );

      assert.strictEqual(request.hostname, 'public.example.com');
    });

    await sub.test('should use X-Forwarded-Host when trustProxy is a number', () => {
      const request = makeRequest(
        {
          headers: { host: 'internal.example.com', 'x-forwarded-host': 'public.example.com' },
        },
        { trustProxy: 1 },
      );

      assert.strictEqual(request.hostname, 'public.example.com');
    });

    await sub.test('should ignore X-Forwarded-Host when trustProxy is false', () => {
      const request = makeRequest({
        headers: { host: 'internal.example.com', 'x-forwarded-host': 'public.example.com' },
      });

      assert.strictEqual(request.hostname, 'internal.example.com');
    });

    await sub.test('should use the first value of a CSV X-Forwarded-Host', () => {
      const request = makeRequest(
        {
          headers: {
            host: 'internal.example.com',
            'x-forwarded-host': 'public.example.com, other',
          },
        },
        { trustProxy: true },
      );

      assert.strictEqual(request.hostname, 'public.example.com');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // trustProxy: ip
  // ───────────────────────────────────────────────────────────────────────────
  test('trustProxy: ip', async sub => {
    await sub.test('should return the socket IP when trustProxy is false', () => {
      const request = makeRequest(
        {
          headers: { host: 'example.com', 'x-forwarded-for': '203.0.113.1' },
          remoteAddress: '10.0.0.1',
        },
        { trustProxy: false },
      );

      assert.strictEqual(request.ip, '10.0.0.1');
    });

    await sub.test('should return the first X-Forwarded-For value when trustProxy is true', () => {
      const request = makeRequest(
        {
          headers: { host: 'example.com', 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
          remoteAddress: '10.0.0.2',
        },
        { trustProxy: true },
      );

      assert.strictEqual(request.ip, '203.0.113.1');
    });

    await sub.test('should select the correct hop when trustProxy is a number', () => {
      const request = makeRequest(
        {
          headers: {
            host: 'example.com',
            'x-forwarded-for': '203.0.113.1, 10.0.0.1, 10.0.0.2',
          },
          remoteAddress: '10.0.0.3',
        },
        { trustProxy: 2 },
      );

      assert.strictEqual(request.ip, '203.0.113.1');
    });

    await sub.test('should fall back to the socket IP when not enough hops are present', () => {
      const request = makeRequest(
        {
          headers: { host: 'example.com', 'x-forwarded-for': '203.0.113.1' },
          remoteAddress: '10.0.0.1',
        },
        { trustProxy: 3 },
      );

      assert.strictEqual(request.ip, '10.0.0.1');
    });

    await sub.test('should fall back to the socket IP when X-Forwarded-For is absent', () => {
      const request = makeRequest(
        { headers: { host: 'example.com' }, remoteAddress: '10.0.0.1' },
        { trustProxy: true },
      );

      assert.strictEqual(request.ip, '10.0.0.1');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // body()
  // ───────────────────────────────────────────────────────────────────────────
  test('body()', async sub => {
    await sub.test('should return null when there is no body', async () => {
      const request = makeRequest();

      assert.strictEqual(await request.body(), null);
    });

    await sub.test('should parse a JSON body', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'content-length': '15',
        },
        body: '{"hello":"world"}',
      });

      assert.deepStrictEqual(await request.body(), { hello: 'world' });
    });

    await sub.test('should parse a URL-encoded body', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/x-www-form-urlencoded',
          'content-length': '15',
        },
        body: 'hello=world&x=1',
      });

      const body = /** @type {URLSearchParams} */ (await request.body());

      assert.strictEqual(body.get('hello'), 'world');
      assert.strictEqual(body.get('x'), '1');
    });

    await sub.test('should parse a JSON variant with +json suffix', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/vnd.api+json',
          'content-length': '2',
        },
        body: '{}',
      });

      assert.deepStrictEqual(await request.body(), {});
    });

    await sub.test('should cache the parsed body', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'content-length': '13',
        },
        body: '{"a":1}',
      });

      const first = await request.body();
      const second = await request.body();

      assert.strictEqual(first, second);
    });

    await sub.test('should coalesce concurrent body() calls', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'content-length': '13',
        },
        body: '{"a":1}',
      });

      const [first, second] = await Promise.all([request.body(), request.body()]);

      assert.strictEqual(first, second);
    });

    await sub.test('should cache body errors', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'content-length': '3',
        },
        body: 'not',
      });

      await assert.rejects(() => request.body(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
      await assert.rejects(() => request.body(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
    });

    await sub.test('should throw UNSUPPORTED_MEDIA_TYPE for unsupported media types', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/octet-stream',
          'content-length': '4',
        },
        body: 'body',
      });

      await assert.rejects(() => request.body(), {
        name: 'RequestError',
        code: 'UNSUPPORTED_MEDIA_TYPE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // #hasBody() — through body()
  // ───────────────────────────────────────────────────────────────────────────
  test('body detection', async sub => {
    await sub.test('should treat chunked transfer encoding as a body', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'transfer-encoding': 'chunked',
        },
        body: '{}',
      });

      assert.deepStrictEqual(await request.body(), {});
    });

    await sub.test('should reject invalid Transfer-Encoding', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'transfer-encoding': 'gzip',
        },
        body: '{}',
      });

      await assert.rejects(() => request.body(), {
        name: 'RequestError',
        code: 'INVALID_TRANSFER_ENCODING',
      });
    });

    await sub.test('should reject duplicate Content-Length', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'content-length': ['1', '2'],
        },
        body: '{}',
      });

      await assert.rejects(() => request.body(), {
        name: 'RequestError',
        code: 'INVALID_CONTENT_LENGTH',
      });
    });

    await sub.test('should reject invalid Content-Length', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'content-length': 'abc',
        },
        body: '{}',
      });

      await assert.rejects(() => request.body(), {
        name: 'RequestError',
        code: 'INVALID_CONTENT_LENGTH',
      });
    });

    await sub.test('should treat Content-Length = 0 as no body', async () => {
      const request = makeRequest({
        headers: {
          host: 'example.com',
          'content-type': 'application/json',
          'content-length': '0',
        },
      });

      assert.strictEqual(await request.body(), null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // URL resolution
  // ───────────────────────────────────────────────────────────────────────────
  test('URL resolution', async sub => {
    await sub.test('should resolve absolute URLs while preserving the authority', () => {
      const request = makeRequest({
        url: 'http://attacker.example.com/users?page=1',
        headers: { host: 'example.com' },
      });

      assert.strictEqual(request.hostname, 'example.com');
      assert.strictEqual(request.pathname, '/users');
      assert.strictEqual(request.query.get('page'), '1');
    });

    await sub.test('should resolve protocol-relative URLs while preserving the authority', () => {
      const request = makeRequest({
        url: '//attacker.example.com/users',
        headers: { host: 'example.com' },
      });

      assert.strictEqual(request.hostname, 'example.com');
      assert.strictEqual(request.pathname, '/users');
    });

    await sub.test('should resolve relative paths', () => {
      const request = makeRequest({
        url: '/users/42',
        headers: { host: 'example.com' },
      });

      assert.strictEqual(request.pathname, '/users/42');
    });

    await sub.test('should reject invalid request targets', () => {
      assert.throws(
        () => makeRequest({ url: 'http://[invalid', headers: { host: 'example.com' } }),
        { name: 'RequestError', code: 'INVALID_REQUEST_URL' },
      );
    });
  });
});
