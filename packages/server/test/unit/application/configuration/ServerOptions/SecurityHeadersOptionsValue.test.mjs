// @ts-check
/**
 * @file Contains the unit tests for SecurityHeadersOptionsValue.
 *
 * @module test/unit/configuration/SecurityHeadersOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import SecurityHeadersOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/SecurityHeadersOptions/SecurityHeadersOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the normalized security headers options.
 *
 * @typedef {import('../../../../../source/application/configurations/ServerConfiguration/Options/SecurityHeadersOptions/SecurityHeadersOptionsValue.mjs').SecurityHeadersOptionsData} SecurityHeadersOptionsData
 */

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('SecurityHeadersOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new SecurityHeadersOptionsValue();
      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should apply defaults for an empty object', () => {
      const options = new SecurityHeadersOptionsValue({});

      assert.deepStrictEqual(options.value, {
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: 'same-origin',
        originAgentCluster: '?1',
        permissionsPolicy: false,
        referrerPolicy: 'strict-origin-when-cross-origin',
        strictTransportSecurity: 'max-age=31536000; includeSubDomains',
        xContentTypeOptions: 'nosniff',
        xDnsPrefetchControl: 'off',
        xDownloadOptions: 'noopen',
        xFrameOptions: 'SAMEORIGIN',
        xPermittedCrossDomainPolicies: 'none',
        xXssProtection: '0',
      });
    });

    await sub.test('should override individual headers', () => {
      const options = new SecurityHeadersOptionsValue({
        contentSecurityPolicy: "default-src 'self'",
        xFrameOptions: 'DENY',
        xDnsPrefetchControl: false,
      });

      assert.ok(options.value);
      assert.strictEqual(options.value.contentSecurityPolicy, "default-src 'self'");
      assert.strictEqual(options.value.xFrameOptions, 'DENY');
      assert.strictEqual(options.value.xDnsPrefetchControl, false);
      assert.strictEqual(options.value.crossOriginOpenerPolicy, 'same-origin');
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new SecurityHeadersOptionsValue({});

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should not mutate the input object', () => {
      const input = { xFrameOptions: 'DENY' };
      const snapshot = { ...input };

      new SecurityHeadersOptionsValue(input);

      assert.deepStrictEqual(input, snapshot);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new SecurityHeadersOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_SECURITY_HEADERS_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new SecurityHeadersOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_SECURITY_HEADERS_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Individual header validation
  // ───────────────────────────────────────────────────────────────────────────
  test('Individual header validation', async sub => {
    /**
     * Represents the normalized security headers options.
     *
     * @type {Array<keyof SecurityHeadersOptionsData>}
     */
    const cases = [
      'contentSecurityPolicy',
      'crossOriginEmbedderPolicy',
      'crossOriginOpenerPolicy',
      'crossOriginResourcePolicy',
      'originAgentCluster',
      'permissionsPolicy',
      'referrerPolicy',
      'strictTransportSecurity',
      'xContentTypeOptions',
      'xDnsPrefetchControl',
      'xDownloadOptions',
      'xFrameOptions',
      'xPermittedCrossDomainPolicies',
      'xXssProtection',
    ];

    for (const key of cases) {
      await sub.test(`should reject non-string, non-false ${key}`, () => {
        assert.throws(() => new SecurityHeadersOptionsValue({ [key]: /** @type {any} */ (42) }), {
          name: 'ServerConfigurationError',
          code: 'INVALID_SECURITY_HEADERS_OPTION_TYPE',
        });
      });

      await sub.test(`should accept string for ${key}`, () => {
        const options = new SecurityHeadersOptionsValue({ [key]: 'value' });

        assert.strictEqual(options.value?.[key], 'value');
      });

      await sub.test(`should accept false for ${key}`, () => {
        const options = new SecurityHeadersOptionsValue({ [key]: false });

        assert.strictEqual(options.value?.[key], false);
      });
    }
  });
});
