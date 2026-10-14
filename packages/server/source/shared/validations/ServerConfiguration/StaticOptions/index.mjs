// @ts-check
/**
 * @file Static options validation utilities.
 *
 * @description Validates static middleware options used by ServerConfiguration,
 * including root presence, index array, cache duration, boolean flags,
 * extensions, and dotfile behavior.
 *
 * @module Validation/ServerConfiguration/StaticOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerConfigurationError from '#shared/errors/ServerConfigurationError';

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Determines whether a value is a non-null plain object.
 *
 * @private
 * @param {unknown} value - Value to inspect.
 * @returns {value is Record<string, unknown>} `true` if the value is a plain object.
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates static middleware options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `root`, when present, must be a non-empty string.
 * 4. `index`, when present, must be an array of non-empty strings.
 * 5. `maxAge`, when present, must be a non-negative integer.
 * 6. `etag`, when present, must be a boolean.
 * 7. `lastModified`, when present, must be a boolean.
 * 8. `fallthrough`, when present, must be a boolean.
 * 9. `extensions`, when present, must be an array of non-empty strings.
 * 10. `dotfiles`, when present, must be a boolean.
 *
 * @param {unknown} options - Static options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateStaticOptions({ root: '/var/www/public' });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateStaticOptions({ root: '' });
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateStaticOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_STATIC_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('root' in options === false) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'MISSING_STATIC_ROOT',
      custom: true,
    });
  }

  if ('root' in options) {
    const { root } = options;

    if (typeof root !== 'string') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_ROOT_TYPE',
        custom: true,
        options: { values: { received: typeof root } },
      });
    }

    if (root.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_ROOT_VALUE',
        custom: true,
        options: { details: { root } },
      });
    }
  }

  if ('index' in options) {
    const { index } = options;

    if (!Array.isArray(index)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_INDEX_TYPE',
        custom: true,
        options: { values: { received: typeof index } },
      });
    }

    for (const item of index) {
      if (typeof item !== 'string' || item.length === 0) {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_STATIC_INDEX_ITEM',
          custom: true,
          options: { details: { item } },
        });
      }
    }
  }

  if ('maxAge' in options) {
    const { maxAge } = options;

    if (typeof maxAge !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_MAX_AGE_TYPE',
        custom: true,
        options: { values: { received: typeof maxAge } },
      });
    }

    if (!Number.isInteger(maxAge) || maxAge < 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_MAX_AGE_VALUE',
        custom: true,
        options: { details: { maxAge } },
      });
    }
  }

  if ('etag' in options) {
    if (typeof options.etag !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_ETAG_TYPE',
        custom: true,
        options: { values: { received: typeof options.etag } },
      });
    }
  }

  if ('lastModified' in options) {
    if (typeof options.lastModified !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_LAST_MODIFIED_TYPE',
        custom: true,
        options: { values: { received: typeof options.lastModified } },
      });
    }
  }

  if ('fallthrough' in options) {
    if (typeof options.fallthrough !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_FALLTHROUGH_TYPE',
        custom: true,
        options: { values: { received: typeof options.fallthrough } },
      });
    }
  }

  if ('extensions' in options) {
    const { extensions } = options;

    if (!Array.isArray(extensions)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_EXTENSIONS_TYPE',
        custom: true,
        options: { values: { received: typeof extensions } },
      });
    }

    for (const item of extensions) {
      if (typeof item !== 'string' || item.length === 0) {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_STATIC_EXTENSIONS_ITEM',
          custom: true,
          options: { details: { item } },
        });
      }
    }
  }

  if ('dotfiles' in options) {
    if (typeof options.dotfiles !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_STATIC_DOTFILES_TYPE',
        custom: true,
        options: { values: { received: typeof options.dotfiles } },
      });
    }
  }

  return Validation.success();
}

/**
 * Asserts that static middleware options are valid.
 *
 * @param {unknown} options - Static options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If `root` is not a non-empty string.
 * @throws {ServerConfigurationError} If `index` is not an array of non-empty strings.
 * @throws {ServerConfigurationError} If `maxAge` is not a non-negative integer.
 * @throws {ServerConfigurationError} If `etag` is not a boolean.
 * @throws {ServerConfigurationError} If `lastModified` is not a boolean.
 * @throws {ServerConfigurationError} If `fallthrough` is not a boolean.
 * @throws {ServerConfigurationError} If `extensions` is not an array of non-empty strings.
 * @throws {ServerConfigurationError} If `dotfiles` is not a boolean.
 * @example
 * ```js
 * assertStaticOptions({ root: '/var/www/public' });
 * ```
 */
export function assertStaticOptions(options) {
  const validation = validateStaticOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}
