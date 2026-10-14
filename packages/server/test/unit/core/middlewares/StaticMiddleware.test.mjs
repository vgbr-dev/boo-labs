// @ts-check
/**
 * @file Contains the contract tests for StaticMiddleware.
 *
 * @module test/unit/core/middlewares/StaticMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import assert from 'node:assert/strict';
import { suite, test, before, after } from 'node:test';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// » IMPORT LOCAL MODULES
import Response from '#Response';
import StaticMiddleware from '#middlewares/StaticMiddleware';
import { createFakeHttp1Response } from '../../../helpers/fakeServerResponse.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#middlewares/StaticMiddleware').NextFunction} NextFunction
 */

/**
 * Represents normalized Static middleware configuration.
 *
 * @typedef {import('#middlewares/StaticMiddleware').StaticOptionsData} StaticOptionsData
 */

/**
 * Options accepted by the makeExchange helper.
 *
 * @typedef  {object}                          MakeExchangeOptions
 * @property {string}                          [method]            - HTTP method (default: `'GET'`).
 * @property {string}                          [pathname]          - Request pathname (default: `'/'`).
 * @property {Record<string, string|string[]>} [headers]           - Request headers (keys should be lower-case).
 */

/**
 * Represents the result returned by the makeExchange helper.
 *
 * @typedef  {object}                                     MakeExchangeResult
 * @property {Exchange}                                   exchange           - Fake exchange.
 * @property {Response}                                   response           - Real Response instance.
 * @property {ReturnType<typeof createFakeHttp1Response>} serverResponse     - Underlying fake server response.
 * @property {AbortController}                            controller         - Abort controller for the exchange signal.
 */

/**
 * Represents a next-handler spy.
 *
 * @typedef  {object}     NextSpy
 * @property {boolean}    called  - Whether the handler has been invoked.
 * @property {() => void} handler - The spy handler function.
 */

// ━━ FIXTURES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FILES = Object.freeze({
  html: '<h1>Static fixture</h1>',
  css: 'body { color: red; }',
  json: '{"ok":true}',
  htm: '<h1>Extension fixture</h1>',
  noExtension: 'plain file',
  hidden: 'hidden file',
  secret: 'secret file',
});

/**
 * Shared mutable fixture state.
 *
 * Using an object keeps the binding immutable while still allowing
 * assignment inside `before` / `after` without `let`.
 *
 * @type {{ root: string }}
 */
const fixtures = {
  root: '',
};

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates an HTTP exchange backed by a real `Response` instance.
 *
 * @param {MakeExchangeOptions} [options] - Options controlling the fake exchange.
 * @returns {MakeExchangeResult} The exchange and its related objects.
 */
function makeExchange({ method = 'GET', pathname = '/', headers = {} } = {}) {
  const serverResponse = createFakeHttp1Response();
  const response = new Response(
    /** @type {import('node:http').ServerResponse} */ (/** @type {unknown} */ (serverResponse)),
  );
  const controller = new AbortController();

  const exchange = /** @type {Exchange} */ ({
    request: {
      method,
      pathname,
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
    signal: controller.signal,
  });

  return { exchange, response, serverResponse, controller };
}

/**
 * Creates a middleware instance using the shared fixture root.
 *
 * @param {Partial<StaticOptionsData>} [overrides] - Fields to override on the defaults.
 * @returns {StaticMiddleware} A configured StaticMiddleware instance.
 */
function makeMiddleware(overrides = {}) {
  return new StaticMiddleware({
    root: fixtures.root,
    index: ['index.html'],
    maxAge: 0,
    etag: true,
    lastModified: true,
    fallthrough: true,
    extensions: undefined,
    dotfiles: false,
    ...overrides,
  });
}

/**
 * Executes the middleware with an optional next handler.
 *
 * @param {StaticMiddleware} middleware - The middleware under test.
 * @param {MakeExchangeResult} context - The exchange context.
 * @param {NextFunction} [next] - Optional next handler (defaults to a no-op).
 * @returns {Promise<void>}
 */
async function run(middleware, context, next = async () => {}) {
  await middleware.handle(context.exchange, next);
}

/**
 * Creates a next-handler spy.
 *
 * @returns {NextSpy} A spy object with a `called` flag and a handler function.
 */
function createNextSpy() {
  /** @type {NextSpy} */
  const spy = {
    called: false,
    handler() {
      spy.called = true;
    },
  };

  return spy;
}

/**
 * Returns true when the given error is a platform limitation that prevents
 * symlink creation (common on some CI / restricted environments).
 *
 * @param {unknown} error - The error to inspect.
 * @returns {boolean} `true` when the error indicates symlink creation is unsupported.
 */
function isSymlinkUnsupported(error) {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  const code = error.code;
  return code === 'EPERM' || code === 'EACCES' || code === 'ENOTSUP';
}

// ━━ SUITE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('StaticMiddleware', () => {
  before(async () => {
    fixtures.root = await mkdtemp(join(tmpdir(), 'static-middleware-'));

    await Promise.all([
      writeFile(join(fixtures.root, 'index.html'), FILES.html),
      writeFile(join(fixtures.root, 'style.css'), FILES.css),
      writeFile(join(fixtures.root, 'data.json'), FILES.json),
      writeFile(join(fixtures.root, 'page.htm'), FILES.htm),
      writeFile(join(fixtures.root, 'noext'), FILES.noExtension),
      writeFile(join(fixtures.root, '.hidden'), FILES.hidden),
      mkdir(join(fixtures.root, '.secrets')),
      mkdir(join(fixtures.root, 'subdir')),
    ]);

    await Promise.all([
      writeFile(join(fixtures.root, 'subdir', 'index.html'), '<h1>Subdirectory</h1>'),
      writeFile(join(fixtures.root, '.secrets', 'token.txt'), FILES.secret),
      writeFile(join(fixtures.root, 'default.htm'), '<h1>Custom index</h1>'),
    ]);
  });

  after(async () => {
    await rm(fixtures.root, { recursive: true, force: true });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // HTTP methods
  // ───────────────────────────────────────────────────────────────────────────
  test('HTTP methods', async sub => {
    await sub.test('GET describes a stream response for a matching file', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({ pathname: '/style.css' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
      assert.strictEqual(context.response.getHeader('content-type'), 'text/css; charset=utf-8');
      assert.strictEqual(context.response.getHeader('content-length'), String(FILES.css.length));
    });

    await sub.test('HEAD returns representation headers without a body', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({
        method: 'HEAD',
        pathname: '/style.css',
      });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'none');
      assert.strictEqual(context.response.getHeader('content-type'), 'text/css; charset=utf-8');
      assert.strictEqual(context.response.getHeader('content-length'), String(FILES.css.length));
    });

    await sub.test('unsupported methods delegate to the next middleware', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({
        method: 'POST',
        pathname: '/style.css',
      });
      const next = createNextSpy();

      await run(middleware, context, next.handler);

      assert.strictEqual(next.called, true);
      assert.strictEqual(context.response.isCommitted, false);
      assert.strictEqual(context.response.bodyKind, 'none');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // File resolution
  // ───────────────────────────────────────────────────────────────────────────
  test('file resolution', async sub => {
    await sub.test('serves the root index file', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({ pathname: '/' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
      assert.strictEqual(context.response.getHeader('content-type'), 'text/html; charset=utf-8');
      assert.strictEqual(context.response.getHeader('content-length'), String(FILES.html.length));
    });

    await sub.test('serves a subdirectory index file with a trailing slash', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({ pathname: '/subdir/' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
    });

    await sub.test('serves a subdirectory index file without a trailing slash', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({ pathname: '/subdir' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
    });

    await sub.test('supports a custom index filename', async () => {
      const middleware = makeMiddleware({ index: ['default.htm'] });
      const context = makeExchange({ pathname: '/' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.getHeader('content-type'), 'text/html; charset=utf-8');
      assert.strictEqual(
        context.response.getHeader('content-length'),
        String('<h1>Custom index</h1>'.length),
      );
    });

    await sub.test('resolves a configured extension when the pathname has none', async () => {
      const middleware = makeMiddleware({ extensions: ['htm'] });
      const context = makeExchange({ pathname: '/page' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
      assert.strictEqual(context.response.getHeader('content-length'), String(FILES.htm.length));
    });

    await sub.test('does not resolve extensions when extension fallback is disabled', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({ pathname: '/page' });
      const next = createNextSpy();

      await run(middleware, context, next.handler);

      assert.strictEqual(next.called, true);
      assert.strictEqual(context.response.bodyKind, 'none');
    });

    await sub.test('supports extensions with a leading dot', async () => {
      const middleware = makeMiddleware({ extensions: ['.css'] });
      const context = makeExchange({ pathname: '/style' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.getHeader('content-type'), 'text/css; charset=utf-8');
    });

    await sub.test('does not append an extension when the pathname already has one', async () => {
      const middleware = makeMiddleware({ extensions: ['html'] });
      const context = makeExchange({ pathname: '/page.htm' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.getHeader('content-length'), String(FILES.htm.length));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Content types
  // ───────────────────────────────────────────────────────────────────────────
  test('content types', async sub => {
    for (const [pathname, contentType] of [
      ['/index.html', 'text/html; charset=utf-8'],
      ['/page.htm', 'text/html; charset=utf-8'],
      ['/style.css', 'text/css; charset=utf-8'],
      ['/data.json', 'application/json; charset=utf-8'],
      ['/noext', 'application/octet-stream'],
    ]) {
      await sub.test(`uses ${contentType} for ${pathname}`, async () => {
        const middleware = makeMiddleware();
        const context = makeExchange({ pathname });

        await run(middleware, context);

        assert.strictEqual(context.response.getHeader('content-type'), contentType);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Path confinement
  // ───────────────────────────────────────────────────────────────────────────
  test('path confinement', async sub => {
    for (const pathname of ['/../outside.txt', '/../../etc/passwd']) {
      await sub.test(`rejects lexical traversal: ${pathname}`, async () => {
        const middleware = makeMiddleware();
        const context = makeExchange({ pathname });
        const next = createNextSpy();

        await run(middleware, context, next.handler);

        assert.strictEqual(next.called, true);
        assert.strictEqual(context.response.bodyKind, 'none');
      });
    }

    /**
     * This test verifies that a symlink pointing outside the configured root
     * is rejected. On platforms/environments that do not allow symlink
     * creation the test is skipped (it is still registered as a test).
     */
    await sub.test('rejects a symlink that points outside the configured root', async t => {
      const outsideRoot = await mkdtemp(join(tmpdir(), 'static-outside-'));
      const outsideFile = join(outsideRoot, 'private.txt');
      const linkPath = join(fixtures.root, 'outside-link.txt');

      try {
        await writeFile(outsideFile, 'private');
        await symlink(outsideFile, linkPath);

        const middleware = makeMiddleware();
        const context = makeExchange({ pathname: '/outside-link.txt' });
        const next = createNextSpy();

        await run(middleware, context, next.handler);

        assert.strictEqual(next.called, true);
        assert.strictEqual(context.response.bodyKind, 'none');
      } catch (error) {
        if (isSymlinkUnsupported(error)) {
          const code =
            error !== null && typeof error === 'object' && 'code' in error
              ? String(error.code)
              : 'unknown';
          t.skip(`Symlink creation is not permitted in this environment (${code})`);
        } else {
          throw error;
        }
      } finally {
        await rm(linkPath, { force: true });
        await rm(outsideRoot, { recursive: true, force: true });
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Dotfiles
  // ───────────────────────────────────────────────────────────────────────────
  test('dotfiles', async sub => {
    await sub.test('does not serve dotfiles by default', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({ pathname: '/.hidden' });
      const next = createNextSpy();

      await run(middleware, context, next.handler);

      assert.strictEqual(next.called, true);
      assert.strictEqual(context.response.bodyKind, 'none');
    });

    await sub.test('does not serve files inside dot-prefixed directories by default', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({ pathname: '/.secrets/token.txt' });
      const next = createNextSpy();

      await run(middleware, context, next.handler);

      assert.strictEqual(next.called, true);
      assert.strictEqual(context.response.bodyKind, 'none');
    });

    await sub.test('serves dotfiles when explicitly enabled', async () => {
      const middleware = makeMiddleware({ dotfiles: true });
      const context = makeExchange({ pathname: '/.hidden' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
    });

    await sub.test(
      'serves files inside dot-prefixed directories when explicitly enabled',
      async () => {
        const middleware = makeMiddleware({ dotfiles: true });
        const context = makeExchange({ pathname: '/.secrets/token.txt' });

        await run(middleware, context);

        assert.strictEqual(context.response.statusCode, 200);
        assert.strictEqual(context.response.bodyKind, 'stream');
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cache metadata
  // ───────────────────────────────────────────────────────────────────────────
  test('cache metadata', async sub => {
    await sub.test('generates an ETag when enabled', async () => {
      const middleware = makeMiddleware({ etag: true });
      const context = makeExchange({ pathname: '/style.css' });

      await run(middleware, context);

      assert.match(String(context.response.getHeader('etag')), /^W\/".+"$/);
    });

    await sub.test('does not generate an ETag when disabled', async () => {
      const middleware = makeMiddleware({ etag: false });
      const context = makeExchange({ pathname: '/style.css' });

      await run(middleware, context);

      assert.strictEqual(context.response.getHeader('etag'), undefined);
    });

    await sub.test('sets Last-Modified when enabled', async () => {
      const middleware = makeMiddleware({ lastModified: true });
      const context = makeExchange({ pathname: '/style.css' });

      await run(middleware, context);

      const header = context.response.getHeader('last-modified');
      assert.strictEqual(typeof header, 'string');
      assert.strictEqual(Number.isNaN(Date.parse(String(header))), false);
    });

    await sub.test('does not set Last-Modified when disabled', async () => {
      const middleware = makeMiddleware({ lastModified: false });
      const context = makeExchange({ pathname: '/style.css' });

      await run(middleware, context);

      assert.strictEqual(context.response.getHeader('last-modified'), undefined);
    });

    await sub.test('sets public max-age caching when maxAge is positive', async () => {
      const middleware = makeMiddleware({ maxAge: 120 });
      const context = makeExchange({ pathname: '/style.css' });

      await run(middleware, context);

      assert.strictEqual(context.response.getHeader('cache-control'), 'public, max-age=120');
    });

    await sub.test('disables caching when maxAge is zero', async () => {
      const middleware = makeMiddleware({ maxAge: 0 });
      const context = makeExchange({ pathname: '/style.css' });

      await run(middleware, context);

      assert.strictEqual(
        context.response.getHeader('cache-control'),
        'no-cache, no-store, must-revalidate',
      );
      assert.strictEqual(context.response.getHeader('pragma'), 'no-cache');
      assert.strictEqual(context.response.getHeader('expires'), '0');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Conditional requests
  // ───────────────────────────────────────────────────────────────────────────
  test('conditional requests', async sub => {
    await sub.test('returns 304 when If-None-Match matches the generated ETag', async () => {
      const middleware = makeMiddleware();
      const initial = makeExchange({ pathname: '/style.css' });

      await run(middleware, initial);

      const etag = String(initial.response.getHeader('etag'));
      const context = makeExchange({
        pathname: '/style.css',
        headers: { 'if-none-match': etag },
      });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 304);
      assert.strictEqual(context.response.bodyKind, 'none');
    });

    await sub.test('supports weak comparison and multiple If-None-Match values', async () => {
      const middleware = makeMiddleware();
      const initial = makeExchange({ pathname: '/style.css' });

      await run(middleware, initial);

      const etag = String(initial.response.getHeader('etag'));
      const strongTag = etag.replace(/^W\//, '');
      const context = makeExchange({
        pathname: '/style.css',
        headers: { 'if-none-match': `"different", ${strongTag}` },
      });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 304);
    });

    await sub.test('returns 304 when If-None-Match is the wildcard', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({
        pathname: '/style.css',
        headers: { 'if-none-match': '*' },
      });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 304);
    });

    await sub.test('returns 200 when If-None-Match does not match', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({
        pathname: '/style.css',
        headers: { 'if-none-match': '"different-tag"' },
      });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
    });

    await sub.test(
      'returns 304 when If-Modified-Since is later than the modification time',
      async () => {
        const middleware = makeMiddleware();
        const context = makeExchange({
          pathname: '/style.css',
          headers: { 'if-modified-since': new Date(Date.now() + 60_000).toUTCString() },
        });

        await run(middleware, context);

        assert.strictEqual(context.response.statusCode, 304);
        assert.strictEqual(context.response.bodyKind, 'none');
      },
    );

    await sub.test(
      'returns 200 when If-Modified-Since is earlier than the modification time',
      async () => {
        const middleware = makeMiddleware();
        const context = makeExchange({
          pathname: '/style.css',
          headers: { 'if-modified-since': new Date(0).toUTCString() },
        });

        await run(middleware, context);

        assert.strictEqual(context.response.statusCode, 200);
        assert.strictEqual(context.response.bodyKind, 'stream');
      },
    );

    await sub.test('gives If-None-Match precedence over If-Modified-Since', async () => {
      const middleware = makeMiddleware();
      const initial = makeExchange({ pathname: '/style.css' });

      await run(middleware, initial);

      const context = makeExchange({
        pathname: '/style.css',
        headers: {
          'if-none-match': '"different-tag"',
          'if-modified-since': new Date(Date.now() + 60_000).toUTCString(),
        },
      });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
    });

    await sub.test('ignores malformed If-Modified-Since values', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({
        pathname: '/style.css',
        headers: { 'if-modified-since': 'not-a-date' },
      });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 200);
      assert.strictEqual(context.response.bodyKind, 'stream');
    });

    await sub.test(
      'does not evaluate If-Modified-Since when Last-Modified is disabled',
      async () => {
        const middleware = makeMiddleware({ lastModified: false });
        const context = makeExchange({
          pathname: '/style.css',
          headers: { 'if-modified-since': new Date(Date.now() + 60_000).toUTCString() },
        });

        await run(middleware, context);

        assert.strictEqual(context.response.statusCode, 200);
        assert.strictEqual(context.response.bodyKind, 'stream');
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Fallthrough and cancellation
  // ───────────────────────────────────────────────────────────────────────────
  test('fallthrough and cancellation', async sub => {
    await sub.test('delegates missing files when fallthrough is enabled', async () => {
      const middleware = makeMiddleware({ fallthrough: true });
      const context = makeExchange({ pathname: '/missing.txt' });
      const next = createNextSpy();

      await run(middleware, context, next.handler);

      assert.strictEqual(next.called, true);
      assert.strictEqual(context.response.isCommitted, false);
      assert.strictEqual(context.response.bodyKind, 'none');
    });

    await sub.test('describes a 404 response when fallthrough is disabled', async () => {
      const middleware = makeMiddleware({ fallthrough: false });
      const context = makeExchange({ pathname: '/missing.txt' });

      await run(middleware, context);

      assert.strictEqual(context.response.statusCode, 404);
      assert.strictEqual(context.response.bodyKind, 'buffer');
      assert.strictEqual(context.response.getHeader('content-type'), 'application/json');
    });

    await sub.test('does not process an exchange whose signal is already aborted', async () => {
      const middleware = makeMiddleware();
      const context = makeExchange({ pathname: '/style.css' });
      const next = createNextSpy();

      context.controller.abort();

      await run(middleware, context, next.handler);

      assert.strictEqual(next.called, false);
      assert.strictEqual(context.response.bodyKind, 'none');
      assert.strictEqual(context.response.isCommitted, false);
    });

    await sub.test('forwards errors thrown by the next middleware', async () => {
      const middleware = makeMiddleware({ fallthrough: true });
      const context = makeExchange({ pathname: '/missing.txt' });
      const expected = new Error('Next middleware failed');

      await assert.rejects(
        run(middleware, context, () => {
          throw expected;
        }),
        error => error === expected,
      );
    });
  });
});
