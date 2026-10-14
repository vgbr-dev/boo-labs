// @ts-check
/**
 * @file Contains the unit tests for ServerConfiguration and its concrete identities.
 *
 * @module test/unit/configuration/ServerConfiguration
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';

// » IMPORT LOCAL MODULES
import ServerConfiguration, { composeConfiguration } from '#configurations/ServerConfiguration';
import HttpServerConfiguration from '#configurations/HttpServerConfiguration';
import HttpsServerConfiguration from '#configurations/HttpsServerConfiguration';
import Http2CleartextServerConfiguration from '#configurations/Http2CleartextServerConfiguration';
import Http2SecureServerConfiguration from '#configurations/Http2SecureServerConfiguration';
import { SERVER_CONFIGURATION_BRAND } from '#shared/constants/symbols/brands';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('ServerConfiguration', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Abstract base
  // ───────────────────────────────────────────────────────────────────────────
  test('Abstract base', async sub => {
    await sub.test('should not allow direct instantiation', () => {
      assert.throws(
        () => {
          // @ts-expect-error - intentional invalid instantiation
          new ServerConfiguration({});
        },
        {
          name: 'TypeError',
          message: /abstract class and cannot be instantiated/i,
        },
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Identities
  // ───────────────────────────────────────────────────────────────────────────
  test('Identities', async sub => {
    await sub.test('HttpServerConfiguration should fix transport=h1 and protocol=http', () => {
      const configuration = new HttpServerConfiguration({});

      assert.strictEqual(configuration.transport, 'h1');
      assert.strictEqual(configuration.protocol, 'http');
    });

    await sub.test('HttpsServerConfiguration should fix transport=h1s and protocol=https', () => {
      const configuration = new HttpsServerConfiguration({});

      assert.strictEqual(configuration.transport, 'h1s');
      assert.strictEqual(configuration.protocol, 'https');
    });

    await sub.test(
      'Http2CleartextServerConfiguration should fix transport=h2c and protocol=http',
      () => {
        const configuration = new Http2CleartextServerConfiguration({});

        assert.strictEqual(configuration.transport, 'h2c');
        assert.strictEqual(configuration.protocol, 'http');
      },
    );

    await sub.test(
      'Http2SecureServerConfiguration should fix transport=h2 and protocol=https',
      () => {
        const configuration = new Http2SecureServerConfiguration({});

        assert.strictEqual(configuration.transport, 'h2');
        assert.strictEqual(configuration.protocol, 'https');
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Brand & toStringTag
  // ───────────────────────────────────────────────────────────────────────────
  test('Brand and toStringTag', async sub => {
    await sub.test('should expose the SERVER_CONFIGURATION_BRAND', () => {
      const configuration = new HttpServerConfiguration({});

      assert.strictEqual(configuration[SERVER_CONFIGURATION_BRAND], true);
    });

    await sub.test('should expose the correct Symbol.toStringTag', () => {
      const http = new HttpServerConfiguration({});
      const https = new HttpsServerConfiguration({});
      const h2c = new Http2CleartextServerConfiguration({});
      const h2 = new Http2SecureServerConfiguration({});

      assert.strictEqual(http[Symbol.toStringTag], 'HttpServerConfiguration');
      assert.strictEqual(https[Symbol.toStringTag], 'HttpsServerConfiguration');
      assert.strictEqual(h2c[Symbol.toStringTag], 'Http2CleartextServerConfiguration');
      assert.strictEqual(h2[Symbol.toStringTag], 'Http2SecureServerConfiguration');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Defaults (no options)
  // ───────────────────────────────────────────────────────────────────────────
  test('Defaults', async sub => {
    await sub.test(
      'should return undefined for all optional getters when no options are provided',
      () => {
        const configuration = new HttpServerConfiguration({});

        assert.strictEqual(configuration.connection, undefined);
        assert.strictEqual(configuration.listen, undefined);
        assert.strictEqual(configuration.request, undefined);
        assert.strictEqual(configuration.response, undefined);
        assert.strictEqual(configuration.static, undefined);
        assert.strictEqual(configuration.cors, undefined);
        assert.strictEqual(configuration.securityHeaders, undefined);
        assert.strictEqual(configuration.rateLimit, undefined);
        assert.strictEqual(configuration.cookie, undefined);
        assert.strictEqual(configuration.csrf, undefined);
        assert.strictEqual(configuration.compress, undefined);
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // toObject()
  // ───────────────────────────────────────────────────────────────────────────
  test('toObject()', async sub => {
    await sub.test('should return an empty object when no options are provided', () => {
      const configuration = new HttpServerConfiguration({});

      assert.deepStrictEqual(configuration.toObject(), {});
    });

    await sub.test('should only include configured options', () => {
      const configuration = new HttpServerConfiguration({
        listen: { port: 3000 },
        cors: { origin: '*' },
      });

      const object = configuration.toObject();

      assert.deepStrictEqual(object.listen, { port: 3000, host: undefined, backlog: undefined });
      assert.ok('cors' in object);

      assert.ok(!('request' in object));
      assert.ok(!('response' in object));
      assert.ok(!('static' in object));
      assert.ok(!('securityHeaders' in object));
      assert.ok(!('rateLimit' in object));
      assert.ok(!('cookie' in object));
      assert.ok(!('csrf' in object));
      assert.ok(!('compress' in object));
      assert.ok(!('connection' in object));
    });

    await sub.test('should include connection when provided', () => {
      const configuration = new HttpsServerConfiguration({
        connection: {
          // minimal placeholder – real cert/key not needed for this unit test
          rejectUnauthorized: false,
        },
      });

      const object = configuration.toObject();

      assert.deepStrictEqual(object.connection, { rejectUnauthorized: false });
    });

    await sub.test('should include csrf and compress when provided', () => {
      const configuration = new HttpServerConfiguration({
        csrf: { cookieName: 'x-csrf' },
        compress: { threshold: 2048 },
      });

      const object = configuration.toObject();

      assert.ok('csrf' in object);
      assert.ok('compress' in object);
    });

    await sub.test('should include cookie with only parser when session is not provided', () => {
      const configuration = new HttpServerConfiguration({
        cookie: { parser: {} },
      });

      const object = configuration.toObject();

      assert.ok('cookie' in object);
      assert.ok(object.cookie);
      assert.ok('parser' in object.cookie);
      assert.ok(!('session' in object.cookie));
    });

    await sub.test('should include cookie with parser and session when both are provided', () => {
      const configuration = new HttpServerConfiguration({
        cookie: {
          parser: {},
          session: { keys: ['test-secret'] },
        },
      });

      const object = configuration.toObject();

      assert.ok('cookie' in object);
      assert.ok(object.cookie);
      assert.ok('parser' in object.cookie);
      assert.ok('session' in object.cookie);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cookie composition
  // ───────────────────────────────────────────────────────────────────────────
  test('Cookie composition', async sub => {
    await sub.test('should return undefined when neither parser nor session is provided', () => {
      const configuration = new HttpServerConfiguration({});

      assert.strictEqual(configuration.cookie, undefined);
    });

    await sub.test('should return only parser when session is not provided', () => {
      const configuration = new HttpServerConfiguration({
        cookie: {
          parser: {},
        },
      });

      const cookie = configuration.cookie;

      assert.ok(cookie);
      assert.ok('parser' in cookie);
      assert.ok(!('session' in cookie));
    });

    await sub.test('should return parser + session when both are provided', () => {
      const configuration = new HttpServerConfiguration({
        cookie: {
          parser: {},
          session: { keys: ['test-secret'] },
        },
      });

      const cookie = configuration.cookie;

      assert.ok(cookie);
      assert.ok('parser' in cookie);
      assert.ok('session' in cookie);
    });

    await sub.test('should throw when session is provided without parser', () => {
      assert.throws(
        () => {
          new HttpServerConfiguration({
            cookie: {
              session: { keys: ['test-secret'] },
            },
          });
        },
        {
          name: 'ServerConfigurationError',
          code: 'COOKIE_SESSION_REQUIRES_COOKIE_PARSER',
        },
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // composeConfiguration()
  // ───────────────────────────────────────────────────────────────────────────
  test('composeConfiguration()', async sub => {
    await sub.test('should throw when value is not a ServerConfiguration instance', () => {
      assert.throws(() => composeConfiguration(/** @type {any} */ ({})), {
        name: 'TypeError',
        message: /Expected a ServerConfiguration instance/i,
      });
    });

    await sub.test('should return serverOptions with correct identity', () => {
      const configuration = new HttpServerConfiguration({
        listen: { port: 3000 },
      });

      const { serverOptions } = composeConfiguration(configuration);

      assert.strictEqual(serverOptions.transport, 'h1');
      assert.strictEqual(serverOptions.protocol, 'http');
      assert.deepStrictEqual(serverOptions.listen, {
        port: 3000,
        host: undefined,
        backlog: undefined,
      });
      assert.strictEqual(serverOptions.request, undefined);
      assert.strictEqual(serverOptions.response, undefined);
      assert.strictEqual(serverOptions.connection, undefined);
    });

    await sub.test('should only include configured middlewares', () => {
      const configuration = new HttpServerConfiguration({
        cors: { origin: '*' },
        rateLimit: { windowMs: 60_000, max: 100 },
      });

      const { middlewareOptions } = composeConfiguration(configuration);

      const names = middlewareOptions.map(m => m.name);

      assert.ok(names.includes('cors'));
      assert.ok(names.includes('rateLimit'));
      assert.ok(!names.includes('static'));
      assert.ok(!names.includes('securityHeaders'));
      assert.ok(!names.includes('cookieParser'));
      assert.ok(!names.includes('cookieSession'));
      assert.ok(!names.includes('csrf'));
      assert.ok(!names.includes('compress'));
    });

    await sub.test('should include cookieParser when only parser is configured', () => {
      const configuration = new HttpServerConfiguration({
        cookie: { parser: {} },
      });

      const { middlewareOptions } = composeConfiguration(configuration);

      const names = middlewareOptions.map(m => m.name);

      assert.ok(names.includes('cookieParser'));
      assert.ok(!names.includes('cookieSession'));
    });

    await sub.test('should include cookieParser and cookieSession when both are configured', () => {
      const configuration = new HttpServerConfiguration({
        cookie: {
          parser: {},
          session: { keys: ['test-secret'] },
        },
      });

      const { middlewareOptions } = composeConfiguration(configuration);

      const names = middlewareOptions.map(m => m.name);

      assert.ok(names.includes('cookieParser'));
      assert.ok(names.includes('cookieSession'));
    });

    await sub.test('should return empty middlewareOptions when no middleware is configured', () => {
      const configuration = new HttpServerConfiguration({
        listen: { port: 3000 },
      });

      const { middlewareOptions } = composeConfiguration(configuration);

      assert.deepStrictEqual(middlewareOptions, []);
    });

    await sub.test('should preserve identity across all four configurations', () => {
      const http = composeConfiguration(new HttpServerConfiguration({})).serverOptions;
      const https = composeConfiguration(new HttpsServerConfiguration({})).serverOptions;
      const h2c = composeConfiguration(new Http2CleartextServerConfiguration({})).serverOptions;
      const h2 = composeConfiguration(new Http2SecureServerConfiguration({})).serverOptions;

      assert.strictEqual(http.transport, 'h1');
      assert.strictEqual(http.protocol, 'http');

      assert.strictEqual(https.transport, 'h1s');
      assert.strictEqual(https.protocol, 'https');

      assert.strictEqual(h2c.transport, 'h2c');
      assert.strictEqual(h2c.protocol, 'http');

      assert.strictEqual(h2.transport, 'h2');
      assert.strictEqual(h2.protocol, 'https');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // inspect.custom
  // ───────────────────────────────────────────────────────────────────────────
  test('inspect.custom', async sub => {
    await sub.test('should produce a readable representation', () => {
      const configuration = new HttpServerConfiguration({
        listen: { port: 3000 },
      });

      const output = inspect(configuration);

      assert.ok(output.includes('HttpServerConfiguration'));
      assert.ok(output.includes('3000'));
    });
  });
});
