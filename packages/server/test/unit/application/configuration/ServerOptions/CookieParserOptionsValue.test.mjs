// @ts-check
/**
 * @file Contains the unit tests for CookieParserOptionsValue.
 *
 * @module test/unit/configuration/CookieParserOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import CookieParserOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/CookieParserOptions/CookieParserOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CookieParserOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new CookieParserOptionsValue();

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should apply default decode = true for an empty object', () => {
      const options = new CookieParserOptionsValue({});

      assert.deepStrictEqual(options.value, { decode: true });
    });

    await sub.test('should override decode', () => {
      const options = new CookieParserOptionsValue({ decode: false });

      assert.deepStrictEqual(options.value, { decode: false });
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new CookieParserOptionsValue({});

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should not mutate the input object', () => {
      const input = { decode: false };
      const snapshot = { ...input };

      new CookieParserOptionsValue(input);

      assert.deepStrictEqual(input, snapshot);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new CookieParserOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_PARSER_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new CookieParserOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_PARSER_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // decode validation
  // ───────────────────────────────────────────────────────────────────────────
  test('decode validation', async sub => {
    await sub.test('should reject non-boolean decode', () => {
      assert.throws(() => new CookieParserOptionsValue({ decode: /** @type {any} */ ('true') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_PARSER_DECODE_TYPE',
      });
    });
  });
});
