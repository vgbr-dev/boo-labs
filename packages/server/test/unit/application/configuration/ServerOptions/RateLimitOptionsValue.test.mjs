// @ts-check
/**
 * @file Contains the unit tests for RateLimitOptionsValue.
 *
 * @module test/unit/configuration/RateLimitOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import RateLimitOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/RateLimitOptions/RateLimitOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('RateLimitOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new RateLimitOptionsValue();

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should apply defaults for an empty object', () => {
      const options = new RateLimitOptionsValue({});

      assert.deepStrictEqual(options.value, {
        windowMs: 60_000,
        max: 100,
        statusCode: 429,
        message: { error: 'Too Many Requests' },
        standardHeaders: true,
        legacyHeaders: false,
      });
    });

    await sub.test('should override windowMs and max', () => {
      const options = new RateLimitOptionsValue({ windowMs: 30_000, max: 50 });

      assert.ok(options.value);
      assert.strictEqual(options.value.windowMs, 30_000);
      assert.strictEqual(options.value.max, 50);
    });

    await sub.test('should override message', () => {
      const options = new RateLimitOptionsValue({ message: { error: 'Slow down' } });

      assert.deepStrictEqual(options.value?.message, { error: 'Slow down' });
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new RateLimitOptionsValue({});

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should freeze the message object', () => {
      const options = new RateLimitOptionsValue({});

      assert.ok(Object.isFrozen(options.value?.message));
    });

    await sub.test('should not mutate the input message object', () => {
      const inputMessage = { error: 'Custom' };
      const options = new RateLimitOptionsValue({ message: inputMessage });

      assert.notStrictEqual(options.value?.message, inputMessage);
      assert.deepStrictEqual(inputMessage, { error: 'Custom' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new RateLimitOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new RateLimitOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // windowMs validation
  // ───────────────────────────────────────────────────────────────────────────
  test('windowMs validation', async sub => {
    await sub.test('should reject non-number windowMs', () => {
      assert.throws(() => new RateLimitOptionsValue({ windowMs: /** @type {any} */ ('60000') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_WINDOW_MS_TYPE',
      });
    });

    await sub.test('should reject zero windowMs', () => {
      assert.throws(() => new RateLimitOptionsValue({ windowMs: 0 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_WINDOW_MS_RANGE',
      });
    });

    await sub.test('should reject negative windowMs', () => {
      assert.throws(() => new RateLimitOptionsValue({ windowMs: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_WINDOW_MS_RANGE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // max validation
  // ───────────────────────────────────────────────────────────────────────────
  test('max validation', async sub => {
    await sub.test('should reject non-number max', () => {
      assert.throws(() => new RateLimitOptionsValue({ max: /** @type {any} */ ('100') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_MAX_TYPE',
      });
    });

    await sub.test('should reject zero max', () => {
      assert.throws(() => new RateLimitOptionsValue({ max: 0 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_MAX_RANGE',
      });
    });

    await sub.test('should reject negative max', () => {
      assert.throws(() => new RateLimitOptionsValue({ max: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_MAX_RANGE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // statusCode validation
  // ───────────────────────────────────────────────────────────────────────────
  test('statusCode validation', async sub => {
    await sub.test('should reject non-number statusCode', () => {
      assert.throws(() => new RateLimitOptionsValue({ statusCode: /** @type {any} */ ('429') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_STATUS_CODE_TYPE',
      });
    });

    await sub.test('should reject statusCode below 400', () => {
      assert.throws(() => new RateLimitOptionsValue({ statusCode: 399 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_STATUS_CODE_RANGE',
      });
    });

    await sub.test('should reject statusCode above 599', () => {
      assert.throws(() => new RateLimitOptionsValue({ statusCode: 600 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_STATUS_CODE_RANGE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // message validation
  // ───────────────────────────────────────────────────────────────────────────
  test('message validation', async sub => {
    await sub.test('should reject non-object message', () => {
      assert.throws(() => new RateLimitOptionsValue({ message: /** @type {any} */ ('too many') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_MESSAGE_TYPE',
      });
    });

    await sub.test('should reject array message', () => {
      assert.throws(() => new RateLimitOptionsValue({ message: /** @type {any} */ ([]) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RATE_LIMIT_MESSAGE_TYPE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Boolean options validation
  // ───────────────────────────────────────────────────────────────────────────
  test('Boolean options validation', async sub => {
    await sub.test('should reject non-boolean standardHeaders', () => {
      assert.throws(
        () => new RateLimitOptionsValue({ standardHeaders: /** @type {any} */ ('true') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_RATE_LIMIT_STANDARD_HEADERS_TYPE',
        },
      );
    });

    await sub.test('should reject non-boolean legacyHeaders', () => {
      assert.throws(
        () => new RateLimitOptionsValue({ legacyHeaders: /** @type {any} */ ('false') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_RATE_LIMIT_LEGACY_HEADERS_TYPE',
        },
      );
    });
  });
});
