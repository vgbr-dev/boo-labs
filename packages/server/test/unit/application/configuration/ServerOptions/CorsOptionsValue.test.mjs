// @ts-check
/**
 * @file Contains the unit tests for CORSOptionsValue.
 *
 * @module test/unit/configuration/CORSOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import CORSOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/CORSOptions/CORSOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('CORSOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new CORSOptionsValue();

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should apply defaults for an empty object', () => {
      const options = new CORSOptionsValue({});

      assert.deepStrictEqual(options.value, {
        origin: '*',
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        allowedHeaders: undefined,
        exposedHeaders: undefined,
        credentials: false,
        maxAge: undefined,
        preflightContinue: false,
        optionsSuccessStatus: 204,
      });
    });

    await sub.test('should override each option', () => {
      const options = new CORSOptionsValue({
        origin: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        exposedHeaders: ['X-Request-Id'],
        credentials: true,
        maxAge: 86_400,
        preflightContinue: true,
        optionsSuccessStatus: 200,
      });

      assert.ok(options.value);
      assert.strictEqual(options.value.origin, true);
      assert.deepStrictEqual(options.value.methods, ['GET', 'POST']);
      assert.deepStrictEqual(options.value.allowedHeaders, ['Content-Type']);
      assert.deepStrictEqual(options.value.exposedHeaders, ['X-Request-Id']);
      assert.strictEqual(options.value.credentials, true);
      assert.strictEqual(options.value.maxAge, 86_400);
      assert.strictEqual(options.value.preflightContinue, true);
      assert.strictEqual(options.value.optionsSuccessStatus, 200);
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new CORSOptionsValue({});

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should freeze methods array', () => {
      const options = new CORSOptionsValue({});

      assert.ok(Object.isFrozen(options.value?.methods));
    });

    await sub.test('should freeze allowedHeaders array when provided', () => {
      const options = new CORSOptionsValue({ allowedHeaders: ['Content-Type'] });

      assert.ok(Object.isFrozen(options.value?.allowedHeaders));
    });

    await sub.test('should freeze exposedHeaders array when provided', () => {
      const options = new CORSOptionsValue({ exposedHeaders: ['X-Request-Id'] });

      assert.ok(Object.isFrozen(options.value?.exposedHeaders));
    });

    await sub.test('should not mutate the input arrays', () => {
      const methods = ['GET'];
      const options = new CORSOptionsValue({ methods });

      assert.notStrictEqual(options.value?.methods, methods);
      assert.deepStrictEqual(methods, ['GET']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new CORSOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new CORSOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // origin validation
  // ───────────────────────────────────────────────────────────────────────────
  test('origin validation', async sub => {
    await sub.test('should accept true', () => {
      const options = new CORSOptionsValue({ origin: true });

      assert.strictEqual(options.value?.origin, true);
    });

    await sub.test('should accept a string', () => {
      const options = new CORSOptionsValue({ origin: 'https://example.com' });

      assert.strictEqual(options.value?.origin, 'https://example.com');
    });

    await sub.test('should accept an array of non-empty strings', () => {
      const options = new CORSOptionsValue({ origin: ['https://a.com', 'https://b.com'] });

      assert.deepStrictEqual(options.value?.origin, ['https://a.com', 'https://b.com']);
    });

    await sub.test('should reject a number', () => {
      assert.throws(() => new CORSOptionsValue({ origin: /** @type {any} */ (123) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_ORIGIN_TYPE',
      });
    });

    await sub.test('should reject an array with non-string items', () => {
      assert.throws(() => new CORSOptionsValue({ origin: /** @type {any} */ ([123]) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_ORIGIN_ITEM',
      });
    });

    await sub.test('should reject an array with empty strings', () => {
      assert.throws(() => new CORSOptionsValue({ origin: [''] }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_ORIGIN_ITEM',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // methods validation
  // ───────────────────────────────────────────────────────────────────────────
  test('methods validation', async sub => {
    await sub.test('should reject non-array methods', () => {
      assert.throws(() => new CORSOptionsValue({ methods: /** @type {any} */ ('GET') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_METHODS_TYPE',
      });
    });

    await sub.test('should reject items that are not non-empty strings', () => {
      assert.throws(() => new CORSOptionsValue({ methods: [''] }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_METHODS_ITEM',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // allowedHeaders / exposedHeaders validation
  // ───────────────────────────────────────────────────────────────────────────
  test('allowedHeaders validation', async sub => {
    await sub.test('should reject non-array allowedHeaders', () => {
      assert.throws(
        () => new CORSOptionsValue({ allowedHeaders: /** @type {any} */ ('Content-Type') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_CORS_ALLOWED_HEADERS_TYPE',
        },
      );
    });

    await sub.test('should reject empty string items', () => {
      assert.throws(() => new CORSOptionsValue({ allowedHeaders: [''] }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_ALLOWED_HEADERS_ITEM',
      });
    });
  });

  test('exposedHeaders validation', async sub => {
    await sub.test('should reject non-array exposedHeaders', () => {
      assert.throws(
        () => new CORSOptionsValue({ exposedHeaders: /** @type {any} */ ('X-Request-Id') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_CORS_EXPOSED_HEADERS_TYPE',
        },
      );
    });

    await sub.test('should reject empty string items', () => {
      assert.throws(() => new CORSOptionsValue({ exposedHeaders: [''] }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_EXPOSED_HEADERS_ITEM',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // credentials validation
  // ───────────────────────────────────────────────────────────────────────────
  test('credentials validation', async sub => {
    await sub.test('should reject non-boolean credentials', () => {
      assert.throws(() => new CORSOptionsValue({ credentials: /** @type {any} */ ('true') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_CREDENTIALS_TYPE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // maxAge validation
  // ───────────────────────────────────────────────────────────────────────────
  test('maxAge validation', async sub => {
    await sub.test('should reject non-number maxAge', () => {
      assert.throws(() => new CORSOptionsValue({ maxAge: /** @type {any} */ ('3600') }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_MAX_AGE_TYPE',
      });
    });

    await sub.test('should reject negative maxAge', () => {
      assert.throws(() => new CORSOptionsValue({ maxAge: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_MAX_AGE_RANGE',
      });
    });

    await sub.test('should reject non-integer maxAge', () => {
      assert.throws(() => new CORSOptionsValue({ maxAge: 1.5 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_MAX_AGE_RANGE',
      });
    });

    await sub.test('should accept maxAge = 0', () => {
      const options = new CORSOptionsValue({ maxAge: 0 });

      assert.strictEqual(options.value?.maxAge, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // preflightContinue validation
  // ───────────────────────────────────────────────────────────────────────────
  test('preflightContinue validation', async sub => {
    await sub.test('should reject non-boolean preflightContinue', () => {
      assert.throws(
        () => new CORSOptionsValue({ preflightContinue: /** @type {any} */ ('true') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_CORS_PREFLIGHT_CONTINUE_TYPE',
        },
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // optionsSuccessStatus validation
  // ───────────────────────────────────────────────────────────────────────────
  test('optionsSuccessStatus validation', async sub => {
    await sub.test('should reject non-number optionsSuccessStatus', () => {
      assert.throws(
        () => new CORSOptionsValue({ optionsSuccessStatus: /** @type {any} */ ('204') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_CORS_OPTIONS_SUCCESS_STATUS_TYPE',
        },
      );
    });

    await sub.test('should reject optionsSuccessStatus below 100', () => {
      assert.throws(() => new CORSOptionsValue({ optionsSuccessStatus: 99 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_OPTIONS_SUCCESS_STATUS_RANGE',
      });
    });

    await sub.test('should reject optionsSuccessStatus above 599', () => {
      assert.throws(() => new CORSOptionsValue({ optionsSuccessStatus: 600 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_CORS_OPTIONS_SUCCESS_STATUS_RANGE',
      });
    });
  });
});
