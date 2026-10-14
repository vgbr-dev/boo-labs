// @ts-check
/**
 * @file Cookie parser options validation utilities.
 *
 * @description Validates cookie parser middleware options used by
 * ServerConfiguration.
 *
 * @module Validation/ServerConfiguration/CookieParserOptions
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
 * Validates cookie parser options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `decode`, if present, must be a boolean.
 *
 * @param {unknown} options - Cookie parser options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateCookieParserOptions({ decode: true });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateCookieParserOptions({ decode: 'yes' });
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateCookieParserOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_COOKIE_PARSER_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('decode' in options) {
    const { decode } = options;

    if (typeof decode !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_PARSER_DECODE_TYPE',
        custom: true,
        options: { values: { received: typeof decode } },
      });
    }
  }

  return Validation.success();
}

/**
 * Asserts that cookie parser options are valid.
 *
 * @param {unknown} options - Cookie parser options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If `decode` is not a boolean.
 * @example
 * ```js
 * assertCookieParserOptions({ decode: true });
 * ```
 */
export function assertCookieParserOptions(options) {
  const validation = validateCookieParserOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}
