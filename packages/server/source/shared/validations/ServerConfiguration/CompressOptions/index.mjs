// @ts-check
/**
 * @file Compress options validation utilities.
 *
 * @description Validates compression middleware options used by
 * ServerConfiguration, including size threshold, compression level, and
 * compressible media types.
 *
 * @module Validation/ServerConfiguration/CompressOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerConfigurationError from '#shared/errors/ServerConfigurationError';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Minimum valid compression level.
 *
 * `-1` delegates to the zlib default for the selected algorithm.
 *
 * @private
 * @type {number}
 */
const MIN_LEVEL = -1;

/**
 * Maximum valid compression level.
 *
 * Brotli accepts up to `11`; gzip accepts up to `9`. The widest range is
 * used here so that brotli levels are not rejected.
 *
 * @private
 * @type {number}
 */
const MAX_LEVEL = 11;

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
 * Determines whether a value is a non-empty string.
 *
 * @private
 * @param {unknown} value - Value to inspect.
 * @returns {value is string} `true` if the value is a non-empty string.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Determines whether every item in an array is a non-empty string.
 *
 * @private
 * @param {unknown[]} values - Array of values to inspect.
 * @returns {boolean} `true` if every item is a non-empty string.
 */
function everyNonEmptyString(values) {
  return values.every(isNonEmptyString);
}

/**
 * Validates compression options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `threshold`, if present, must be a non-negative integer.
 * 4. `level`, if present, must be an integer between `-1` and `11`.
 * 5. `types`, if present, must be an array of non-empty strings.
 *
 * @param {unknown} options - Compression options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateCompressOptions({ threshold: 1024, level: 6 });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateCompressOptions({ threshold: -1 });
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateCompressOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_COMPRESS_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('threshold' in options) {
    const { threshold } = options;

    if (typeof threshold !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COMPRESS_THRESHOLD_TYPE',
        custom: true,
        options: { values: { received: typeof threshold } },
      });
    }

    if (!Number.isInteger(threshold) || threshold < 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COMPRESS_THRESHOLD_RANGE',
        custom: true,
        options: { details: { threshold } },
      });
    }
  }

  if ('level' in options) {
    const { level } = options;

    if (typeof level !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COMPRESS_LEVEL_TYPE',
        custom: true,
        options: { values: { received: typeof level } },
      });
    }

    if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COMPRESS_LEVEL_RANGE',
        custom: true,
        options: { details: { level } },
      });
    }
  }

  if ('types' in options) {
    const { types } = options;

    if (!Array.isArray(types)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COMPRESS_TYPES_TYPE',
        custom: true,
        options: { values: { received: typeof types } },
      });
    }

    if (!everyNonEmptyString(types)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COMPRESS_TYPES_ITEM',
        custom: true,
        options: { details: { types } },
      });
    }
  }

  return Validation.success();
}

/**
 * Asserts that compression options are valid.
 *
 * @param {unknown} options - Compression options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If `threshold` is not a non-negative integer.
 * @throws {ServerConfigurationError} If `level` is not an integer between `-1` and `11`.
 * @throws {ServerConfigurationError} If `types` is not an array of non-empty strings.
 * @example
 * ```js
 * assertCompressOptions({ threshold: 1024, level: 6 });
 * ```
 */
export function assertCompressOptions(options) {
  const validation = validateCompressOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}
