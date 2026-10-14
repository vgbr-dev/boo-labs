// @ts-check
/**
 * @file Contains the unit tests for CompressOptionsValue.
 *
 * @module test/unit/configuration/CompressOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import CompressOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/CompressOptions/CompressOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CompressOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new CompressOptionsValue();

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should apply defaults for an empty object', () => {
      const options = new CompressOptionsValue({});

      assert.deepStrictEqual(options.value, {
        threshold: 1024,
        level: -1,
        types: undefined,
      });
    });

    await sub.test('should override threshold and level', () => {
      const options = new CompressOptionsValue({ threshold: 2048, level: 6 });

      assert.ok(options.value);
      assert.strictEqual(options.value.threshold, 2048);
      assert.strictEqual(options.value.level, 6);
      assert.strictEqual(options.value.types, undefined);
    });

    await sub.test('should accept custom types', () => {
      const options = new CompressOptionsValue({ types: ['text/plain', 'application/json'] });

      assert.deepStrictEqual(options.value?.types, ['text/plain', 'application/json']);
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new CompressOptionsValue({});

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should freeze types array when provided', () => {
      const options = new CompressOptionsValue({ types: ['text/plain'] });

      assert.ok(Object.isFrozen(options.value?.types));
    });

    await sub.test('should not mutate the input types array', () => {
      const types = ['text/plain'];
      const options = new CompressOptionsValue({ types });

      assert.notStrictEqual(options.value?.types, types);
      assert.deepStrictEqual(types, ['text/plain']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new CompressOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new CompressOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // threshold validation
  // ───────────────────────────────────────────────────────────────────────────
  test('threshold validation', async sub => {
    await sub.test('should reject non-number threshold', () => {
      assert.throws(() => new CompressOptionsValue({ threshold: /** @type {any} */ ('1024') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_THRESHOLD_TYPE',
      });
    });

    await sub.test('should reject negative threshold', () => {
      assert.throws(() => new CompressOptionsValue({ threshold: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_THRESHOLD_RANGE',
      });
    });

    await sub.test('should reject non-integer threshold', () => {
      assert.throws(() => new CompressOptionsValue({ threshold: 1.5 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_THRESHOLD_RANGE',
      });
    });

    await sub.test('should accept threshold = 0', () => {
      const options = new CompressOptionsValue({ threshold: 0 });

      assert.strictEqual(options.value?.threshold, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // level validation
  // ───────────────────────────────────────────────────────────────────────────
  test('level validation', async sub => {
    await sub.test('should reject non-number level', () => {
      assert.throws(() => new CompressOptionsValue({ level: /** @type {any} */ ('6') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_LEVEL_TYPE',
      });
    });

    await sub.test('should reject level below -1', () => {
      assert.throws(() => new CompressOptionsValue({ level: -2 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_LEVEL_RANGE',
      });
    });

    await sub.test('should reject level above 11', () => {
      assert.throws(() => new CompressOptionsValue({ level: 12 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_LEVEL_RANGE',
      });
    });

    await sub.test('should accept level = -1', () => {
      const options = new CompressOptionsValue({ level: -1 });

      assert.strictEqual(options.value?.level, -1);
    });

    await sub.test('should accept level = 11', () => {
      const options = new CompressOptionsValue({ level: 11 });

      assert.strictEqual(options.value?.level, 11);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // types validation
  // ───────────────────────────────────────────────────────────────────────────
  test('types validation', async sub => {
    await sub.test('should reject non-array types', () => {
      assert.throws(() => new CompressOptionsValue({ types: /** @type {any} */ ('text/plain') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_TYPES_TYPE',
      });
    });

    await sub.test('should reject empty string items', () => {
      assert.throws(() => new CompressOptionsValue({ types: [''] }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COMPRESS_TYPES_ITEM',
      });
    });

    await sub.test('should accept empty types array', () => {
      const options = new CompressOptionsValue({ types: [] });

      assert.deepStrictEqual(options.value?.types, []);
    });
  });
});
