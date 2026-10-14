// @ts-check
/**
 * @file Response options validation utilities.
 *
 * @description Validates response options used by ServerConfiguration,
 * including ETag generation and default charset settings.
 *
 * @module Validation/ServerConfiguration/ResponseOptions
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
 * Validates response options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `etag`, if defined, must be a boolean.
 * 4. `defaultCharset`, if defined, must be a non-empty string.
 *
 * @param {unknown} options - Response options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateResponseOptions({ etag: true });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 */
export function validateResponseOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_RESPONSE_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('etag' in options) {
    const { etag } = options;

    if (etag !== undefined) {
      if (typeof etag !== 'boolean') {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_ETAG_TYPE',
          custom: true,
          options: { values: { received: typeof etag } },
        });
      }
    }
  }

  if ('defaultCharset' in options) {
    const { defaultCharset } = options;

    if (defaultCharset !== undefined) {
      if (typeof defaultCharset !== 'string') {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_DEFAULT_CHARSET_TYPE',
          custom: true,
          options: { values: { received: typeof defaultCharset } },
        });
      }

      if (defaultCharset.trim().length === 0) {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_DEFAULT_CHARSET_VALUE',
          custom: true,
          options: { details: { defaultCharset } },
        });
      }
    }
  }

  return Validation.success();
}

/**
 * Asserts that response options are valid.
 *
 * @param {unknown} options - Response options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If `etag` is defined and is not a boolean.
 * @throws {ServerConfigurationError} If `defaultCharset` is defined and is not a string.
 * @throws {ServerConfigurationError} If `defaultCharset` is defined and is an empty string.
 * @example
 * ```js
 * assertResponseOptions({ etag: true, defaultCharset: 'utf-8' });
 * ```
 */
export function assertResponseOptions(options) {
  const validation = validateResponseOptions(options);
  if (!validation.ok) {
    throw validation.error;
  }
}
