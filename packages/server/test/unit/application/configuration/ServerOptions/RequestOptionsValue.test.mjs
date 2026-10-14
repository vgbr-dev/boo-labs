// @ts-check
/**
 * @file Contains the unit tests for RequestOptionsValue.
 *
 * @module test/unit/configuration/RequestOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import RequestOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/RequestOptions/RequestOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('RequestOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new RequestOptionsValue();

      assert.strictEqual(options.value, undefined);
    });

    await sub.test('should yield value === undefined when options is explicitly undefined', () => {
      const options = new RequestOptionsValue(undefined);

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should normalize an empty object', () => {
      const options = new RequestOptionsValue({});

      assert.deepStrictEqual(options.value, {
        bodyLimit: undefined,
        trustProxy: undefined,
      });
    });

    await sub.test('should normalize a partial object with only bodyLimit', () => {
      const options = new RequestOptionsValue({ bodyLimit: 1_048_576 });

      assert.deepStrictEqual(options.value, {
        bodyLimit: 1_048_576,
        trustProxy: undefined,
      });
    });

    await sub.test('should normalize a partial object with only trustProxy', () => {
      const options = new RequestOptionsValue({ trustProxy: true });

      assert.deepStrictEqual(options.value, {
        bodyLimit: undefined,
        trustProxy: true,
      });
    });

    await sub.test('should normalize a full object', () => {
      const options = new RequestOptionsValue({
        bodyLimit: 2_097_152,
        trustProxy: 1,
      });

      assert.deepStrictEqual(options.value, {
        bodyLimit: 2_097_152,
        trustProxy: 1,
      });
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new RequestOptionsValue({ bodyLimit: 1024 });

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should not mutate the input object', () => {
      const input = { bodyLimit: 1024, trustProxy: false };
      const snapshot = { ...input };

      new RequestOptionsValue(input);

      assert.deepStrictEqual(input, snapshot);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Valid boundary values
  // ───────────────────────────────────────────────────────────────────────────
  test('Valid boundary values', async sub => {
    await sub.test('should accept bodyLimit as a positive safe integer', () => {
      const options = new RequestOptionsValue({ bodyLimit: 1 });

      assert.strictEqual(options.value?.bodyLimit, 1);
    });

    await sub.test('should accept trustProxy as true', () => {
      const options = new RequestOptionsValue({ trustProxy: true });

      assert.strictEqual(options.value?.trustProxy, true);
    });

    await sub.test('should accept trustProxy as false', () => {
      const options = new RequestOptionsValue({ trustProxy: false });

      assert.strictEqual(options.value?.trustProxy, false);
    });

    await sub.test('should accept trustProxy as 0', () => {
      const options = new RequestOptionsValue({ trustProxy: 0 });

      assert.strictEqual(options.value?.trustProxy, 0);
    });

    await sub.test('should accept trustProxy as a positive integer', () => {
      const options = new RequestOptionsValue({ trustProxy: 2 });

      assert.strictEqual(options.value?.trustProxy, 2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new RequestOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_REQUEST_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new RequestOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_REQUEST_OPTIONS',
      });
    });

    await sub.test('should reject primitive values', () => {
      assert.throws(() => new RequestOptionsValue(/** @type {any} */ ('x')), {
        name: 'ServerConfigurationError',
        code: 'INVALID_REQUEST_OPTIONS',
      });

      assert.throws(() => new RequestOptionsValue(/** @type {any} */ (1)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_REQUEST_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // bodyLimit validation
  // ───────────────────────────────────────────────────────────────────────────
  test('bodyLimit validation', async sub => {
    await sub.test('should reject non-number bodyLimit', () => {
      assert.throws(() => new RequestOptionsValue({ bodyLimit: /** @type {any} */ ('1024') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_BODY_LIMIT_TYPE',
      });
    });

    await sub.test('should reject zero bodyLimit', () => {
      assert.throws(() => new RequestOptionsValue({ bodyLimit: 0 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_BODY_LIMIT_RANGE',
      });
    });

    await sub.test('should reject negative bodyLimit', () => {
      assert.throws(() => new RequestOptionsValue({ bodyLimit: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_BODY_LIMIT_RANGE',
      });
    });

    await sub.test('should reject non-integer bodyLimit', () => {
      assert.throws(() => new RequestOptionsValue({ bodyLimit: 1.5 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_BODY_LIMIT_RANGE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // trustProxy validation
  // ───────────────────────────────────────────────────────────────────────────
  test('trustProxy validation', async sub => {
    await sub.test('should reject non-boolean, non-number trustProxy', () => {
      assert.throws(() => new RequestOptionsValue({ trustProxy: /** @type {any} */ ('true') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_TRUST_PROXY_TYPE',
      });
    });

    await sub.test('should reject negative trustProxy', () => {
      assert.throws(() => new RequestOptionsValue({ trustProxy: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_TRUST_PROXY_RANGE',
      });
    });

    await sub.test('should reject non-integer trustProxy', () => {
      assert.throws(() => new RequestOptionsValue({ trustProxy: 1.5 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_TRUST_PROXY_RANGE',
      });
    });
  });
});
