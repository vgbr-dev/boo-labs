// @ts-check
/**
 * @file Contains the unit tests for CookieSessionOptionsValue.
 *
 * @module test/unit/configuration/CookieSessionOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import CookieSessionOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/CookieSessionOptions/CookieSessionOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the normalized cookie session options.
 *
 * @typedef {import('../../../../../source/application/configurations/ServerConfiguration/Options/CookieSessionOptions/CookieSessionOptionsValue.mjs').CookieSessionOptionsData} CookieSessionOptionsData
 */
// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CookieSessionOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new CookieSessionOptionsValue(undefined, true);

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // hasParser dependency
  // ───────────────────────────────────────────────────────────────────────────
  test('hasParser dependency', async sub => {
    await sub.test('should reject session when hasParser is false', () => {
      assert.throws(() => new CookieSessionOptionsValue({ keys: ['secret'] }, false), {
        name: 'ServerConfigurationError',
        code: 'COOKIE_SESSION_REQUIRES_COOKIE_PARSER',
      });
    });

    await sub.test('should reject session when hasParser is undefined', () => {
      assert.throws(() => new CookieSessionOptionsValue({ keys: ['secret'] }), {
        name: 'ServerConfigurationError',
        code: 'COOKIE_SESSION_REQUIRES_COOKIE_PARSER',
      });
    });

    await sub.test('should accept session when hasParser is true', () => {
      const options = new CookieSessionOptionsValue({ keys: ['secret'] }, true);

      assert.ok(options.value);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should apply defaults when only keys are provided', () => {
      const options = new CookieSessionOptionsValue({ keys: ['secret'] }, true);

      assert.deepStrictEqual(options.value, {
        name: 'session',
        keys: ['secret'],
        maxAge: undefined,
        path: '/',
        domain: undefined,
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
        overwrite: true,
      });
    });

    await sub.test('should override each option', () => {
      const options = new CookieSessionOptionsValue(
        {
          name: 'sid',
          keys: ['k1', 'k2'],
          maxAge: 86_400_000,
          path: '/app',
          domain: 'example.com',
          secure: false,
          httpOnly: false,
          sameSite: 'Strict',
          overwrite: false,
        },
        true,
      );

      assert.ok(options.value);
      assert.strictEqual(options.value.name, 'sid');
      assert.deepStrictEqual(options.value.keys, ['k1', 'k2']);
      assert.strictEqual(options.value.maxAge, 86_400_000);
      assert.strictEqual(options.value.path, '/app');
      assert.strictEqual(options.value.domain, 'example.com');
      assert.strictEqual(options.value.secure, false);
      assert.strictEqual(options.value.httpOnly, false);
      assert.strictEqual(options.value.sameSite, 'Strict');
      assert.strictEqual(options.value.overwrite, false);
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new CookieSessionOptionsValue({ keys: ['secret'] }, true);

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should freeze keys array', () => {
      const options = new CookieSessionOptionsValue({ keys: ['secret'] }, true);

      assert.ok(Object.isFrozen(options.value?.keys));
    });

    await sub.test('should not mutate the input keys array', () => {
      const keys = ['secret'];
      const options = new CookieSessionOptionsValue({ keys }, true);

      assert.notStrictEqual(options.value?.keys, keys);
      assert.deepStrictEqual(keys, ['secret']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new CookieSessionOptionsValue(/** @type {any} */ (null), true), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_SESSION_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new CookieSessionOptionsValue(/** @type {any} */ ([]), true), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_SESSION_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // name validation
  // ───────────────────────────────────────────────────────────────────────────
  test('name validation', async sub => {
    await sub.test('should reject non-string name', () => {
      assert.throws(
        () => new CookieSessionOptionsValue({ name: /** @type {any} */ (42), keys: ['k'] }, true),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_NAME_TYPE',
        },
      );
    });

    await sub.test('should reject empty name', () => {
      assert.throws(() => new CookieSessionOptionsValue({ name: '', keys: ['k'] }, true), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_SESSION_NAME_VALUE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // keys validation
  // ───────────────────────────────────────────────────────────────────────────
  test('keys validation', async sub => {
    await sub.test('should reject missing keys', () => {
      assert.throws(() => new CookieSessionOptionsValue(/** @type {any} */ ({}), true), {
        name: 'ServerConfigurationError',
        code: 'MISSING_COOKIE_SESSION_KEYS',
      });
    });

    await sub.test('should reject non-array keys', () => {
      assert.throws(
        () => new CookieSessionOptionsValue({ keys: /** @type {any} */ ('secret') }, true),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_KEYS_TYPE',
        },
      );
    });

    await sub.test('should reject empty keys array', () => {
      assert.throws(() => new CookieSessionOptionsValue({ keys: [] }, true), {
        name: 'ServerConfigurationError',
        code: 'MISSING_COOKIE_SESSION_KEYS',
      });
    });

    await sub.test('should reject non-string keys items', () => {
      assert.throws(
        () => new CookieSessionOptionsValue({ keys: /** @type {any} */ ([42]) }, true),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_KEYS_ITEM',
        },
      );
    });

    await sub.test('should reject empty string keys items', () => {
      assert.throws(() => new CookieSessionOptionsValue({ keys: [''] }, true), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_SESSION_KEYS_ITEM',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // maxAge validation
  // ───────────────────────────────────────────────────────────────────────────
  test('maxAge validation', async sub => {
    await sub.test('should reject non-number maxAge', () => {
      assert.throws(
        () =>
          new CookieSessionOptionsValue({ keys: ['k'], maxAge: /** @type {any} */ ('1000') }, true),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_MAX_AGE_TYPE',
        },
      );
    });

    await sub.test('should reject zero maxAge', () => {
      assert.throws(() => new CookieSessionOptionsValue({ keys: ['k'], maxAge: 0 }, true), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_SESSION_MAX_AGE_RANGE',
      });
    });

    await sub.test('should reject negative maxAge', () => {
      assert.throws(() => new CookieSessionOptionsValue({ keys: ['k'], maxAge: -1 }, true), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_SESSION_MAX_AGE_RANGE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // path / domain validation
  // ───────────────────────────────────────────────────────────────────────────
  test('path validation', async sub => {
    await sub.test('should reject non-string path', () => {
      assert.throws(
        () => new CookieSessionOptionsValue({ keys: ['k'], path: /** @type {any} */ (42) }, true),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_PATH_TYPE',
        },
      );
    });

    await sub.test('should reject empty string path', () => {
      assert.throws(() => new CookieSessionOptionsValue({ keys: ['k'], path: '' }, true), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_SESSION_PATH_VALUE',
      });
    });
  });

  test('domain validation', async sub => {
    await sub.test('should reject non-string domain', () => {
      assert.throws(
        () => new CookieSessionOptionsValue({ keys: ['k'], domain: /** @type {any} */ (42) }, true),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_DOMAIN_TYPE',
        },
      );
    });

    await sub.test('should reject empty string domain', () => {
      assert.throws(() => new CookieSessionOptionsValue({ keys: ['k'], domain: '' }, true), {
        name: 'ServerConfigurationError',
        code: 'INVALID_COOKIE_SESSION_DOMAIN_VALUE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Boolean options validation
  // ───────────────────────────────────────────────────────────────────────────
  test('Boolean options validation', async sub => {
    await sub.test('should reject non-boolean secure', () => {
      assert.throws(
        () =>
          new CookieSessionOptionsValue({ keys: ['k'], secure: /** @type {any} */ ('true') }, true),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_SECURE_TYPE',
        },
      );
    });

    await sub.test('should reject non-boolean httpOnly', () => {
      assert.throws(
        () =>
          new CookieSessionOptionsValue(
            { keys: ['k'], httpOnly: /** @type {any} */ ('true') },
            true,
          ),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_HTTP_ONLY_TYPE',
        },
      );
    });

    await sub.test('should reject non-boolean overwrite', () => {
      assert.throws(
        () =>
          new CookieSessionOptionsValue(
            { keys: ['k'], overwrite: /** @type {any} */ ('true') },
            true,
          ),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_OVERWRITE_TYPE',
        },
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // sameSite validation
  // ───────────────────────────────────────────────────────────────────────────
  test('sameSite validation', async sub => {
    await sub.test('should reject invalid sameSite', () => {
      assert.throws(
        () =>
          new CookieSessionOptionsValue(
            { keys: ['k'], sameSite: /** @type {any} */ ('Invalid') },
            true,
          ),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_COOKIE_SESSION_SAME_SITE_VALUE',
        },
      );
    });

    await sub.test('should reject sameSite=None with secure=false', () => {
      assert.throws(
        () => new CookieSessionOptionsValue({ keys: ['k'], sameSite: 'None', secure: false }, true),
        {
          name: 'ServerConfigurationError',
          code: 'COOKIE_SESSION_NONE_REQUIRES_SECURE',
        },
      );
    });

    await sub.test('should accept sameSite=None with default secure=true', () => {
      const options = new CookieSessionOptionsValue({ keys: ['k'], sameSite: 'None' }, true);

      assert.strictEqual(options.value?.sameSite, 'None');
    });
  });
});
