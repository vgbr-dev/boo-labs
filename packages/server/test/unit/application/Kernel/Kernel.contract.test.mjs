// @ts-check
/**
 * @file Contains the contract tests for Kernel.
 *
 * @module test/unit/application/Kernel/Kernel.contract
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Kernel from '#Kernel';
import Router from '#routing/Router';
import HttpServerConfiguration from '#configurations/HttpServerConfiguration';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Data emitted with the listen event.
 *
 * @typedef {import('#Kernel').ListenEventData} ListenEventData
 */

/**
 * Data emitted with the close event.
 *
 * @typedef {import('#Kernel').CloseEventData} CloseEventData
 */

/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#Kernel').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#routing/ExchangeLayer').NextFunction} NextFunction
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a Kernel with a minimal HTTP configuration.
 *
 * @returns {Kernel} A kernel instance.
 */
function makeKernel() {
  const configuration = new HttpServerConfiguration({
    listen: { port: 0 },
  });

  return new Kernel(configuration);
}

/**
 * No-op middleware used only to exercise the fluent API.
 *
 * @type {MiddlewareFunction}
 */
const noopMiddleware = (_exchange, next) => next();

/**
 * Creates a router instance for fluent API contract tests.
 *
 * A real Router is used instead of a stub because `registerMountEntry`
 * delegates to the routing system, which may validate the router instance.
 *
 * @returns {Router} A router instance.
 */
function makeRouter() {
  return new Router();
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Kernel (contract)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should expose listening as false before listen()', () => {
      const kernel = makeKernel();

      assert.strictEqual(kernel.listening, false);
    });

    await sub.test('should expose the IPC subsystem', () => {
      const kernel = makeKernel();

      assert.ok(kernel.ipc);
      assert.strictEqual(typeof kernel.ipc, 'object');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Fluent API
  // ───────────────────────────────────────────────────────────────────────────
  test('Fluent API', async sub => {
    /**
     * Methods that must return the kernel instance to preserve the fluent API.
     *
     * @type {Array<[keyof Kernel, unknown[]]>}
     */
    const methods = [
      ['on', ['event', () => {}]],
      ['once', ['event', () => {}]],
      ['off', ['event', () => {}]],
      ['onListen', [() => {}]],
      ['onClose', [() => {}]],
      ['onError', [() => {}]],
      ['onExchangeStart', [() => {}]],
      ['onExchangeEnd', [() => {}]],
      ['onExchangeError', [() => {}]],
      ['registerRouteEntry', ['GET', '/users', [noopMiddleware]]],
      ['registerMountEntry', ['/api', makeRouter()]],
      ['notFound', [() => {}]],
      ['systemError', [() => {}]],
    ];

    for (const [method, args] of methods) {
      await sub.test(`${method}() should return the kernel instance`, () => {
        const kernel = makeKernel();

        // Dynamic dispatch over the fluent API: each entry provides the
        // arguments expected by the corresponding method.
        // @ts-expect-error - dynamic dispatch over keyof Kernel.
        const result = kernel[method](...args);

        assert.strictEqual(result, kernel);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // listen() and close()
  // ───────────────────────────────────────────────────────────────────────────
  test('listen() and close()', async sub => {
    await sub.test('listen() should return a promise', async () => {
      const kernel = makeKernel();

      const result = kernel.listen();

      assert.ok(result instanceof Promise);

      await result;
      await kernel.close();
    });

    await sub.test('close() should return a promise before listen()', async () => {
      const kernel = makeKernel();

      const result = kernel.close();

      assert.ok(result instanceof Promise);

      await result;
    });

    await sub.test('close() after listen() should return a promise', async () => {
      const kernel = makeKernel();

      await kernel.listen();

      const result = kernel.close();

      assert.ok(result instanceof Promise);

      await result;
    });
  });
});
