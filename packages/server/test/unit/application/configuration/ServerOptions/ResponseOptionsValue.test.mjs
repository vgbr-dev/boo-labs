// @ts-check
/**
 * @file Contains the unit tests for ResponseOptionsValue.
 *
 * @module test/unit/configuration/ResponseOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import ResponseOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/ResponseOptions/ResponseOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('ResponseOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new ResponseOptionsValue();

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should normalize an empty object', () => {
      const options = new ResponseOptionsValue({});

      assert.deepStrictEqual(options.value, {
        etag: undefined,
        defaultCharset: undefined,
      });
    });

    await sub.test('should normalize a partial object with only etag', () => {
      const options = new ResponseOptionsValue({ etag: false });

      assert.deepStrictEqual(options.value, {
        etag: false,
        defaultCharset: undefined,
      });
    });

    await sub.test('should normalize a partial object with only defaultCharset', () => {
      const options = new ResponseOptionsValue({ defaultCharset: 'latin1' });

      assert.deepStrictEqual(options.value, {
        etag: undefined,
        defaultCharset: 'latin1',
      });
    });

    await sub.test('should normalize a full object', () => {
      const options = new ResponseOptionsValue({
        etag: false,
        defaultCharset: 'latin1',
      });

      assert.deepStrictEqual(options.value, {
        etag: false,
        defaultCharset: 'latin1',
      });
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new ResponseOptionsValue({});

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should not mutate the input object', () => {
      const input = { etag: false };
      const snapshot = { ...input };

      new ResponseOptionsValue(input);

      assert.deepStrictEqual(input, snapshot);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new ResponseOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RESPONSE_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new ResponseOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_RESPONSE_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // etag validation
  // ───────────────────────────────────────────────────────────────────────────
  test('etag validation', async sub => {
    await sub.test('should reject non-boolean etag', () => {
      assert.throws(() => new ResponseOptionsValue({ etag: /** @type {any} */ ('true') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_ETAG_TYPE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // defaultCharset validation
  // ───────────────────────────────────────────────────────────────────────────
  test('defaultCharset validation', async sub => {
    await sub.test('should reject non-string defaultCharset', () => {
      assert.throws(() => new ResponseOptionsValue({ defaultCharset: /** @type {any} */ (123) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_DEFAULT_CHARSET_TYPE',
      });
    });

    await sub.test('should reject empty string defaultCharset', () => {
      assert.throws(() => new ResponseOptionsValue({ defaultCharset: '' }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_DEFAULT_CHARSET_VALUE',
      });
    });
  });
});
