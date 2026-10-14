// @ts-check
/**
 * @file Contains the unit tests for ExchangeMatcher.
 *
 * @module test/unit/routing/ExchangeMatcher
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import ExchangeMatcher from '../../../../source/core/routing/ExchangeLayer/ExchangeMatcher.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @import Exchange from '#Exchange';
 */

/**
 * Represents the input shape accepted by `makeExchange`.
 *
 * @typedef  {object} MakeExchangeOptions
 * @property {string} [method='GET']      - HTTP method for the fake request.
 * @property {string} [pathname='/']      - Pathname for the fake request.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a minimal exchange mock.
 *
 * @param {MakeExchangeOptions} [options] - Method and pathname for the mock.
 * @returns {Exchange} A minimal exchange usable by the matcher.
 */
function makeExchange({ method = 'GET', pathname = '/' } = {}) {
  return /** @type {Exchange} */ (
    /** @type {unknown} */ ({
      request: {
        method,
        pathname,
      },
    })
  );
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('ExchangeMatcher', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Method matching
  // ───────────────────────────────────────────────────────────────────────────
  test('Method matching', async sub => {
    await sub.test('should match the configured method', () => {
      const matcher = new ExchangeMatcher({
        method: 'GET',
        pathnamePattern: undefined,
      });

      assert.strictEqual(matcher.test(makeExchange({ method: 'GET' })), true);
    });

    await sub.test('should reject a different method', () => {
      const matcher = new ExchangeMatcher({
        method: 'GET',
        pathnamePattern: undefined,
      });

      assert.strictEqual(matcher.test(makeExchange({ method: 'POST' })), false);
    });

    await sub.test('should match methods case-insensitively', () => {
      const matcher = new ExchangeMatcher({
        method: 'GET',
        pathnamePattern: undefined,
      });

      assert.strictEqual(matcher.test(makeExchange({ method: 'get' })), true);
    });

    await sub.test('should accept every method when method is undefined', () => {
      const matcher = new ExchangeMatcher({
        method: undefined,
        pathnamePattern: undefined,
      });

      assert.strictEqual(matcher.test(makeExchange({ method: 'GET' })), true);
      assert.strictEqual(matcher.test(makeExchange({ method: 'POST' })), true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pathname matching
  // ───────────────────────────────────────────────────────────────────────────
  test('Pathname matching', async sub => {
    await sub.test('should match the configured pathname', () => {
      const matcher = new ExchangeMatcher({
        method: undefined,
        pathnamePattern: '/users',
      });

      assert.strictEqual(matcher.test(makeExchange({ pathname: '/users' })), true);
    });

    await sub.test('should reject a non-matching pathname', () => {
      const matcher = new ExchangeMatcher({
        method: undefined,
        pathnamePattern: '/users',
      });

      assert.strictEqual(matcher.test(makeExchange({ pathname: '/posts' })), false);
    });

    await sub.test('should match every pathname when pathnamePattern is undefined', () => {
      const matcher = new ExchangeMatcher({
        method: undefined,
        pathnamePattern: undefined,
      });

      assert.strictEqual(matcher.test(makeExchange({ pathname: '/' })), true);
      assert.strictEqual(matcher.test(makeExchange({ pathname: '/users/123' })), true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Combined matching
  // ───────────────────────────────────────────────────────────────────────────
  test('Combined matching', async sub => {
    await sub.test('should require both method and pathname to match', () => {
      const matcher = new ExchangeMatcher({
        method: 'GET',
        pathnamePattern: '/users',
      });

      assert.strictEqual(matcher.test(makeExchange({ method: 'GET', pathname: '/users' })), true);
      assert.strictEqual(matcher.test(makeExchange({ method: 'POST', pathname: '/users' })), false);
      assert.strictEqual(matcher.test(makeExchange({ method: 'GET', pathname: '/posts' })), false);
    });

    await sub.test(
      'should match any pathname for the configured method when pathname is global',
      () => {
        const matcher = new ExchangeMatcher({
          method: 'POST',
          pathnamePattern: undefined,
        });

        assert.strictEqual(
          matcher.test(makeExchange({ method: 'POST', pathname: '/users' })),
          true,
        );
        assert.strictEqual(
          matcher.test(makeExchange({ method: 'POST', pathname: '/posts' })),
          true,
        );
        assert.strictEqual(
          matcher.test(makeExchange({ method: 'GET', pathname: '/users' })),
          false,
        );
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // URLPattern
  // ───────────────────────────────────────────────────────────────────────────
  test('URLPattern', async sub => {
    await sub.test('should support URLPattern pathname expressions', () => {
      const matcher = new ExchangeMatcher({
        method: 'GET',
        pathnamePattern: '/users/:id',
      });

      assert.strictEqual(
        matcher.test(makeExchange({ method: 'GET', pathname: '/users/123' })),
        true,
      );
      assert.strictEqual(matcher.test(makeExchange({ method: 'GET', pathname: '/users' })), false);
    });
  });
});
