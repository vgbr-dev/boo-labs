// @ts-check
/**
 * @file Contains the unit tests for StaticOptionsValue.
 *
 * @module test/unit/configuration/StaticOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

// » IMPORT LOCAL MODULES
import StaticOptionsValue from '../../../../../source/application/configurations/ServerConfiguration/Options/StaticOptions/StaticOptionsValue.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('StaticOptionsValue', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Defaults / undefined
  // ───────────────────────────────────────────────────────────────────────────
  test('undefined options', async sub => {
    await sub.test('should yield value === undefined when options is omitted', () => {
      const options = new StaticOptionsValue();

      assert.strictEqual(options.value, undefined);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Normalization
  // ───────────────────────────────────────────────────────────────────────────
  test('Normalization', async sub => {
    await sub.test('should resolve root and apply defaults', () => {
      const options = new StaticOptionsValue({ root: './public' });

      assert.ok(options.value);
      assert.strictEqual(options.value.root, resolve('./public'));
      assert.deepStrictEqual(options.value.index, ['index.html']);
      assert.strictEqual(options.value.maxAge, 0);
      assert.strictEqual(options.value.etag, true);
      assert.strictEqual(options.value.lastModified, true);
      assert.strictEqual(options.value.fallthrough, true);
      assert.strictEqual(options.value.extensions, undefined);
      assert.strictEqual(options.value.dotfiles, false);
    });

    await sub.test('should override each option', () => {
      const options = new StaticOptionsValue({
        root: './public',
        index: ['a.html', 'b.html'],
        maxAge: 3600,
        etag: false,
        lastModified: false,
        fallthrough: false,
        extensions: ['html', 'htm'],
        dotfiles: true,
      });

      assert.ok(options.value);
      assert.deepStrictEqual(options.value.index, ['a.html', 'b.html']);
      assert.strictEqual(options.value.maxAge, 3600);
      assert.strictEqual(options.value.etag, false);
      assert.strictEqual(options.value.lastModified, false);
      assert.strictEqual(options.value.fallthrough, false);
      assert.deepStrictEqual(options.value.extensions, ['html', 'htm']);
      assert.strictEqual(options.value.dotfiles, true);
    });

    await sub.test('should freeze the normalized value', () => {
      const options = new StaticOptionsValue({ root: './public' });

      assert.ok(Object.isFrozen(options.value));
    });

    await sub.test('should freeze index array', () => {
      const options = new StaticOptionsValue({ root: './public', index: ['a.html'] });

      assert.ok(Object.isFrozen(options.value?.index));
    });

    await sub.test('should freeze extensions array when provided', () => {
      const options = new StaticOptionsValue({ root: './public', extensions: ['html'] });

      assert.ok(Object.isFrozen(options.value?.extensions));
    });

    await sub.test('should not mutate the input object', () => {
      const input = { root: './public', index: ['a.html'] };
      const snapshot = { root: './public', index: ['a.html'] };

      new StaticOptionsValue(input);

      assert.deepStrictEqual(input.root, snapshot.root);
      assert.deepStrictEqual(input.index, snapshot.index);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid options shape
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid options shape', async sub => {
    await sub.test('should reject null', () => {
      assert.throws(() => new StaticOptionsValue(/** @type {any} */ (null)), {
        name: 'ServerConfigurationError',
        code: 'INVALID_STATIC_OPTIONS',
      });
    });

    await sub.test('should reject arrays', () => {
      assert.throws(() => new StaticOptionsValue(/** @type {any} */ ([])), {
        name: 'ServerConfigurationError',
        code: 'INVALID_STATIC_OPTIONS',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // root validation
  // ───────────────────────────────────────────────────────────────────────────
  test('root validation', async sub => {
    await sub.test('should reject missing root', () => {
      assert.throws(() => new StaticOptionsValue(/** @type {any} */ ({})), {
        name: 'ServerConfigurationError',
      });
    });

    await sub.test('should reject non-string root', () => {
      assert.throws(() => new StaticOptionsValue({ root: /** @type {any} */ (123) }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_STATIC_ROOT_TYPE',
      });
    });

    await sub.test('should reject empty string root', () => {
      assert.throws(() => new StaticOptionsValue({ root: '' }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_STATIC_ROOT_VALUE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // index validation
  // ───────────────────────────────────────────────────────────────────────────
  test('index validation', async sub => {
    await sub.test('should reject non-array index', () => {
      assert.throws(
        () =>
          new StaticOptionsValue({ root: './public', index: /** @type {any} */ ('index.html') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_STATIC_INDEX_TYPE',
        },
      );
    });

    await sub.test('should reject index items that are not non-empty strings', () => {
      assert.throws(() => new StaticOptionsValue({ root: './public', index: [''] }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_STATIC_INDEX_ITEM',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // maxAge validation
  // ───────────────────────────────────────────────────────────────────────────
  test('maxAge validation', async sub => {
    await sub.test('should reject non-number maxAge', () => {
      assert.throws(
        () => new StaticOptionsValue({ root: './public', maxAge: /** @type {any} */ ('1') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_STATIC_MAX_AGE_TYPE',
        },
      );
    });

    await sub.test('should reject negative maxAge', () => {
      assert.throws(() => new StaticOptionsValue({ root: './public', maxAge: -1 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_STATIC_MAX_AGE_VALUE',
      });
    });

    await sub.test('should reject non-integer maxAge', () => {
      assert.throws(() => new StaticOptionsValue({ root: './public', maxAge: 1.5 }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_STATIC_MAX_AGE_VALUE',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Boolean options validation
  // ───────────────────────────────────────────────────────────────────────────
  test('Boolean options validation', async sub => {
    await sub.test('should reject non-boolean etag', () => {
      assert.throws(
        () => new StaticOptionsValue({ root: './public', etag: /** @type {any} */ ('true') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_STATIC_ETAG_TYPE',
        },
      );
    });

    await sub.test('should reject non-boolean lastModified', () => {
      assert.throws(
        () =>
          new StaticOptionsValue({ root: './public', lastModified: /** @type {any} */ ('true') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_STATIC_LAST_MODIFIED_TYPE',
        },
      );
    });

    await sub.test('should reject non-boolean fallthrough', () => {
      assert.throws(
        () =>
          new StaticOptionsValue({ root: './public', fallthrough: /** @type {any} */ ('true') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_STATIC_FALLTHROUGH_TYPE',
        },
      );
    });

    await sub.test('should reject non-boolean dotfiles', () => {
      assert.throws(
        () => new StaticOptionsValue({ root: './public', dotfiles: /** @type {any} */ ('false') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_STATIC_DOTFILES_TYPE',
        },
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // extensions validation
  // ───────────────────────────────────────────────────────────────────────────
  test('extensions validation', async sub => {
    await sub.test('should reject non-array extensions', () => {
      assert.throws(
        () => new StaticOptionsValue({ root: './public', extensions: /** @type {any} */ ('html') }),
        {
          name: 'ServerConfigurationError',
          code: 'INVALID_STATIC_EXTENSIONS_TYPE',
        },
      );
    });

    await sub.test('should reject extensions items that are not non-empty strings', () => {
      assert.throws(() => new StaticOptionsValue({ root: './public', extensions: [''] }), {
        name: 'ServerConfigurationError',
        code: 'INVALID_STATIC_EXTENSIONS_ITEM',
      });
    });
  });
});
