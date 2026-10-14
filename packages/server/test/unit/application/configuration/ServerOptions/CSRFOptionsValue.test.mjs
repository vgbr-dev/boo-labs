// @ts-check
/**
 * @file Contains the unit tests for CSRFOptionsValue.
 *
 * @module test/unit/configuration/CSRFOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import CSRFOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/CSRFOptions/CSRFOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CSRFOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new CSRFOptionsValue();

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should apply defaults for an empty object', () => {
      const options = new CSRFOptionsValue({});

      assert.deepStrictEqual(options.value, {
        cookieName: 'csrf-token',
        headerName: 'x-csrf-token',
        safeMethods: ['GET', 'HEAD', 'OPTIONS'],
        tokenBytes: 32,
        path: '/',
        domain: undefined,
        secure: true,
        sameSite: 'Lax',
      });
    });

    await sub.test('should override each option', () => {
      const options = new CSRFOptionsValue({
        cookieName: 'x-csrf',
        headerName: 'x-custom-csrf',
        safeMethods: ['GET'],
        tokenBytes: 64,
        path: '/app',
        domain: 'example.com',
        secure: false,
        sameSite: 'Strict',
      });

      assert.ok(options.value);
      assert.strictEqual(options.value.cookieName, 'x-csrf');
      assert.strictEqual(options.value.headerName, 'x-custom-csrf');
      assert.deepStrictEqual(options.value.safeMethods, ['GET']);
      assert.strictEqual(options.value.tokenBytes, 64);
      assert.strictEqual(options.value.path, '/app');
      assert.strictEqual(options.value.domain, 'example.com');
      assert.strictEqual(options.value.secure, false);
      assert.strictEqual(options.value.sameSite, 'Strict');
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new CSRFOptionsValue({});

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should freeze safeMethods array', () => {
      const options = new CSRFOptionsValue({});

      assert.ok(Object.isFrozen(options.value?.safeMethods));
    });

    await sub.test('should not mutate the input safeMethods array', () => {
      const safeMethods = ['GET'];
      const options = new CSRFOptionsValue({ safeMethods });

      assert.notStrictEqual(options.value?.safeMethods, safeMethods);
      assert.deepStrictEqual(safeMethods, ['GET']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new CSRFOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new CSRFOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // cookieName / headerName validation
  // ───────────────────────────────────────────────────────────────────────────
  test('cookieName validation', async sub => {
    await sub.test('should reject non-string cookieName', () => {
      assert.throws(() => new CSRFOptionsValue({ cookieName: /** @type {any} */ (42) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_COOKIE_NAME_TYPE',
      });
    });

    await sub.test('should reject empty cookieName', () => {
      assert.throws(() => new CSRFOptionsValue({ cookieName: '' }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_COOKIE_NAME_VALUE',
      });
    });
  });

  test('headerName validation', async sub => {
    await sub.test('should reject non-string headerName', () => {
      assert.throws(() => new CSRFOptionsValue({ headerName: /** @type {any} */ (42) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_HEADER_NAME_TYPE',
      });
    });

    await sub.test('should reject empty headerName', () => {
      assert.throws(() => new CSRFOptionsValue({ headerName: '' }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_HEADER_NAME_VALUE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // safeMethods validation
  // ───────────────────────────────────────────────────────────────────────────
  test('safeMethods validation', async sub => {
    await sub.test('should reject non-array safeMethods', () => {
      assert.throws(() => new CSRFOptionsValue({ safeMethods: /** @type {any} */ ('GET') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_SAFE_METHODS_TYPE',
      });
    });

    await sub.test('should reject empty string items', () => {
      assert.throws(() => new CSRFOptionsValue({ safeMethods: [''] }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_SAFE_METHODS_ITEM',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // tokenBytes validation
  // ───────────────────────────────────────────────────────────────────────────
  test('tokenBytes validation', async sub => {
    await sub.test('should reject non-number tokenBytes', () => {
      assert.throws(() => new CSRFOptionsValue({ tokenBytes: /** @type {any} */ ('32') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_TOKEN_BYTES_TYPE',
      });
    });

    await sub.test('should reject zero tokenBytes', () => {
      assert.throws(() => new CSRFOptionsValue({ tokenBytes: 0 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_TOKEN_BYTES_RANGE',
      });
    });

    await sub.test('should reject negative tokenBytes', () => {
      assert.throws(() => new CSRFOptionsValue({ tokenBytes: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_TOKEN_BYTES_RANGE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // path / domain validation
  // ───────────────────────────────────────────────────────────────────────────
  test('path / domain validation', async sub => {
    await sub.test('should reject non-string path', () => {
      assert.throws(() => new CSRFOptionsValue({ path: /** @type {any} */ (42) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_PATH_TYPE',
      });
    });

    await sub.test('should reject empty path', () => {
      assert.throws(() => new CSRFOptionsValue({ path: '' }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_PATH_VALUE',
      });
    });

    await sub.test('should reject non-string domain', () => {
      assert.throws(() => new CSRFOptionsValue({ domain: /** @type {any} */ (42) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_DOMAIN_TYPE',
      });
    });

    await sub.test('should reject empty domain', () => {
      assert.throws(() => new CSRFOptionsValue({ domain: '' }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_DOMAIN_VALUE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // secure / sameSite validation
  // ───────────────────────────────────────────────────────────────────────────
  test('secure validation', async sub => {
    await sub.test('should reject non-boolean secure', () => {
      assert.throws(() => new CSRFOptionsValue({ secure: /** @type {any} */ ('true') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_SECURE_TYPE',
      });
    });
  });

  test('sameSite validation', async sub => {
    await sub.test('should reject invalid sameSite', () => {
      assert.throws(() => new CSRFOptionsValue({ sameSite: /** @type {any} */ ('Invalid') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CSRF_SAME_SITE_VALUE',
      });
    });

    await sub.test('should reject sameSite=None with secure=false', () => {
      assert.throws(() => new CSRFOptionsValue({ sameSite: 'None', secure: false }), {
        name: 'ServerConfigurationError',
        code: 'CSRF_NONE_REQUIRES_SECURE',
      });
    });

    await sub.test('should accept sameSite=None with default secure=true', () => {
      const options = new CSRFOptionsValue({ sameSite: 'None' });

      assert.strictEqual(options.value?.sameSite, 'None');
    });
  });
});
