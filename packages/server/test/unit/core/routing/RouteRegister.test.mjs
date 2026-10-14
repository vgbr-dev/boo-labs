// @ts-check
/**
 * @file Contains the unit tests for RouteRegister.
 *
 * @module test/unit/core/routing/RouteRegister
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import RouteRegister from '../../../../source/core/routing/RouterRegister/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @import Exchange from '#Exchange';
 */

/**
 * Represents the headers captured by a mock response.
 *
 * @typedef  {object}                 CapturedHeaders
 * @property {Record<string, string>} headers         - Header name-value pairs.
 */

/**
 * Represents a minimal response mock used to invoke OPTIONS middleware.
 *
 * @typedef  {object}                                         MockResponse
 * @property {() => MockResponse}                             status       - Sets the response status.
 * @property {(name: string, value: unknown) => MockResponse} setHeader    - Sets a response header.
 * @property {() => MockResponse}                             end          - Ends the response.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Casts a partial shape to `Exchange` for middleware invocation in tests.
 *
 * @param {object} value - Partial exchange shape.
 * @returns {Exchange} The value typed as an exchange.
 */
function asExchange(value) {
  return /** @type {Exchange} */ (/** @type {unknown} */ (value));
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('RouteRegister', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // register()
  // ───────────────────────────────────────────────────────────────────────────
  test('register()', async sub => {
    await sub.test('should return OPTIONS layer options for a new pattern', () => {
      const register = new RouteRegister();

      const layerOptions = register.register(['GET', '/users']);

      assert.ok(layerOptions);
      assert.strictEqual(layerOptions.method, 'OPTIONS');
      assert.strictEqual(layerOptions.pathnamePattern, '/users');
      assert.strictEqual(typeof layerOptions.middleware, 'function');
    });

    await sub.test('should return undefined for an already-registered pattern', () => {
      const register = new RouteRegister();

      register.register(['GET', '/users']);

      const layerOptions = register.register(['POST', '/users']);

      assert.strictEqual(layerOptions, undefined);
    });

    await sub.test('should return undefined when pathnamePattern is undefined', () => {
      const register = new RouteRegister();

      const layerOptions = register.register(['GET', undefined]);

      assert.strictEqual(layerOptions, undefined);
    });

    await sub.test(
      'should not return undefined when pathnamePattern is defined and method is undefined',
      () => {
        const register = new RouteRegister();

        const layerOptions = register.register([undefined, '/users']);

        assert.ok(layerOptions);
        assert.strictEqual(layerOptions.pathnamePattern, '/users');
      },
    );

    await sub.test(
      'should share the same OptionsMiddleware instance across registrations of the same pattern',
      () => {
        const register = new RouteRegister();

        const first = register.register(['GET', '/users']);

        assert.ok(first);

        register.register(['POST', '/users']);

        // The middleware function reference stays the same
        const second = register.register([undefined, '/users']);

        assert.strictEqual(second, undefined);

        /** @type {CapturedHeaders} */
        const captured = { headers: {} };

        /** @type {MockResponse} */
        const response = {
          status() {
            return response;
          },
          setHeader(name, value) {
            captured.headers[name] = String(value);
            return response;
          },
          end() {
            return response;
          },
        };

        first.middleware(asExchange({ response }), () => {});

        assert.strictEqual(captured.headers['Allow'], 'GET, POST, OPTIONS');
      },
    );

    await sub.test('should produce distinct middleware instances for distinct patterns', () => {
      const register = new RouteRegister();

      const a = register.register(['GET', '/users']);
      const b = register.register(['GET', '/posts']);

      assert.ok(a);
      assert.ok(b);
      assert.notStrictEqual(a.middleware, b.middleware);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // registerBatch()
  // ───────────────────────────────────────────────────────────────────────────
  test('registerBatch()', async sub => {
    await sub.test('should return empty array for an empty batch', () => {
      const register = new RouteRegister();

      assert.deepStrictEqual(register.registerBatch([]), []);
    });

    await sub.test('should return one OPTIONS layer per new pattern', () => {
      const register = new RouteRegister();

      const layers = register.registerBatch([
        ['GET', '/users'],
        ['POST', '/users'],
        ['GET', '/posts'],
      ]);

      assert.strictEqual(layers.length, 2);
      assert.deepStrictEqual(layers.map(layer => layer.pathnamePattern).sort(), [
        '/posts',
        '/users',
      ]);
      assert.ok(layers.every(layer => layer.method === 'OPTIONS'));
    });

    await sub.test('should skip registrations whose pathnamePattern is undefined', () => {
      const register = new RouteRegister();

      const layers = register.registerBatch([
        ['GET', undefined],
        ['GET', '/users'],
      ]);

      assert.strictEqual(layers.length, 1);
      assert.strictEqual(layers[0].pathnamePattern, '/users');
    });

    await sub.test('should aggregate methods for repeated patterns', () => {
      const register = new RouteRegister();

      const layers = register.registerBatch([
        ['GET', '/users'],
        ['POST', '/users'],
        ['DELETE', '/users'],
      ]);

      assert.strictEqual(layers.length, 1);

      /** @type {CapturedHeaders} */
      const captured = { headers: {} };

      /** @type {MockResponse} */
      const response = {
        status() {
          return response;
        },
        setHeader(name, value) {
          captured.headers[name] = String(value);
          return response;
        },
        end() {
          return response;
        },
      };

      layers[0].middleware(asExchange({ response }), () => {});

      assert.strictEqual(captured.headers['Allow'], 'GET, POST, DELETE, OPTIONS');
    });
  });
});
