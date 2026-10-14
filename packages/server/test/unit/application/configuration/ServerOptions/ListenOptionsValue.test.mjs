// @ts-check
/**
 * @file Contains the unit tests for ListenOptionsValue.
 *
 * @module test/unit/configuration/ListenOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import ListenOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/ListenOptions/ListenOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('ListenOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new ListenOptionsValue();

      assert.strictEqual(options.value, undefined);
    });

    await sub.test('should yield value === undefined when options is explicitly undefined', () => {
      const options = new ListenOptionsValue(undefined);

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should normalize an empty object', () => {
      const options = new ListenOptionsValue({});

      assert.deepStrictEqual(options.value, {
        port: undefined,
        host: undefined,
        backlog: undefined,
      });
    });

    await sub.test('should normalize a partial object with only port', () => {
      const options = new ListenOptionsValue({ port: 3000 });

      assert.deepStrictEqual(options.value, {
        port: 3000,
        host: undefined,
        backlog: undefined,
      });
    });

    await sub.test('should normalize a full object', () => {
      const options = new ListenOptionsValue({
        port: 8080,
        host: '127.0.0.1',
        backlog: 511,
      });

      assert.deepStrictEqual(options.value, {
        port: 8080,
        host: '127.0.0.1',
        backlog: 511,
      });
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new ListenOptionsValue({ port: 3000 });

      assert.ok(Object.isFrozen(options.value));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Valid boundary values
  // ───────────────────────────────────────────────────────────────────────────
  test('Valid boundary values', async sub => {
    await sub.test('should accept port = 0', () => {
      const options = new ListenOptionsValue({ port: 0 });

      assert.strictEqual(options.value?.port, 0);
    });

    await sub.test('should accept port = 65535', () => {
      const options = new ListenOptionsValue({ port: 65535 });

      assert.strictEqual(options.value?.port, 65535);
    });

    await sub.test('should accept a non-empty host', () => {
      const options = new ListenOptionsValue({ host: 'localhost' });

      assert.strictEqual(options.value?.host, 'localhost');
    });

    await sub.test('should accept a positive integer backlog', () => {
      const options = new ListenOptionsValue({ backlog: 511 });

      assert.strictEqual(options.value?.backlog, 511);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new ListenOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_LISTEN_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new ListenOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_LISTEN_OPTIONS',
      });
    });

    await sub.test('should reject primitive values', () => {
      assert.throws(() => new ListenOptionsValue(/** @type {any} */ ('3000')), {
        name: 'ServerConfigurationError',
        code: 'INVALID_LISTEN_OPTIONS',
      });

      assert.throws(() => new ListenOptionsValue(/** @type {any} */ (3000)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_LISTEN_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // port validation
  // ───────────────────────────────────────────────────────────────────────────
  test('port validation', async sub => {
    await sub.test('should reject non-number port', () => {
      assert.throws(() => new ListenOptionsValue({ port: /** @type {any} */ ('3000') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_PORT_TYPE',
      });
    });

    await sub.test('should reject non-integer port', () => {
      assert.throws(() => new ListenOptionsValue({ port: 3000.5 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_PORT_RANGE',
      });
    });

    await sub.test('should reject port < 0', () => {
      assert.throws(() => new ListenOptionsValue({ port: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_PORT_RANGE',
      });
    });

    await sub.test('should reject port > 65535', () => {
      assert.throws(() => new ListenOptionsValue({ port: 65536 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_PORT_RANGE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // host validation
  // ───────────────────────────────────────────────────────────────────────────
  test('host validation', async sub => {
    await sub.test('should reject non-string host', () => {
      assert.throws(() => new ListenOptionsValue({ host: /** @type {any} */ (123) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_HOST_TYPE',
      });
    });

    await sub.test('should reject empty string host', () => {
      assert.throws(() => new ListenOptionsValue({ host: '' }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_HOST_VALUE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // backlog validation
  // ───────────────────────────────────────────────────────────────────────────
  test('backlog validation', async sub => {
    await sub.test('should reject non-integer backlog', () => {
      assert.throws(() => new ListenOptionsValue({ backlog: 512.5 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_BACKLOG_RANGE',
      });
    });

    await sub.test('should reject zero backlog', () => {
      assert.throws(() => new ListenOptionsValue({ backlog: 0 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_BACKLOG_RANGE',
      });
    });

    await sub.test('should reject negative backlog', () => {
      assert.throws(() => new ListenOptionsValue({ backlog: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_BACKLOG_RANGE',
      });
    });
  });
});
