// @ts-check
/**
 * @file Rate limit options validation utilities.
 *
 * @description Validates rate limit middleware options used by
 * ServerConfiguration, including window duration, request budget,
 * rejection response, and header emission.
 *
 * @module Validation/ServerConfiguration/RateLimitOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerConfigurationError from '#shared/errors/ServerConfigurationError';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Minimum valid HTTP status code for a rate-limit rejection.
 *
 * @private
 * @type {number}
 */
const MIN_STATUS_CODE = 400;

/**
 * Maximum valid HTTP status code for a rate-limit rejection.
 *
 * @private
 * @type {number}
 */
const MAX_STATUS_CODE = 599;

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
 * Validates rate limit options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `windowMs`, if present, must be a number.
 * 4. `windowMs`, if present, must be a positive integer.
 * 5. `max`, if present, must be a number.
 * 6. `max`, if present, must be a positive integer.
 * 7. `statusCode`, if present, must be a number.
 * 8. `statusCode`, if present, must be an integer between 400 and 599.
 * 9. `message`, if present, must be a plain object.
 * 10. `standardHeaders`, if present, must be a boolean.
 * 11. `legacyHeaders`, if present, must be a boolean.
 *
 * @param {unknown} options - Rate limit options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateRateLimitOptions({ windowMs: 60_000, max: 100 });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateRateLimitOptions({ windowMs: -1 });
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateRateLimitOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_RATE_LIMIT_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('windowMs' in options) {
    const { windowMs } = options;

    if (typeof windowMs !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_WINDOW_MS_TYPE',
        custom: true,
        options: { values: { received: typeof windowMs } },
      });
    }

    if (!Number.isInteger(windowMs) || windowMs <= 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_WINDOW_MS_RANGE',
        custom: true,
        options: { details: { windowMs } },
      });
    }
  }

  if ('max' in options) {
    const { max } = options;

    if (typeof max !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_MAX_TYPE',
        custom: true,
        options: { values: { received: typeof max } },
      });
    }

    if (!Number.isInteger(max) || max <= 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_MAX_RANGE',
        custom: true,
        options: { details: { max } },
      });
    }
  }

  if ('statusCode' in options) {
    const { statusCode } = options;

    if (typeof statusCode !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_STATUS_CODE_TYPE',
        custom: true,
        options: { values: { received: typeof statusCode } },
      });
    }

    if (
      !Number.isInteger(statusCode) ||
      statusCode < MIN_STATUS_CODE ||
      statusCode > MAX_STATUS_CODE
    ) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_STATUS_CODE_RANGE',
        custom: true,
        options: { details: { statusCode } },
      });
    }
  }

  if ('message' in options) {
    const { message } = options;

    if (!isPlainObject(message)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_MESSAGE_TYPE',
        custom: true,
        options: { values: { received: typeof message } },
      });
    }
  }

  if ('standardHeaders' in options) {
    const { standardHeaders } = options;

    if (typeof standardHeaders !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_STANDARD_HEADERS_TYPE',
        custom: true,
        options: { values: { received: typeof standardHeaders } },
      });
    }
  }

  if ('legacyHeaders' in options) {
    const { legacyHeaders } = options;

    if (typeof legacyHeaders !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_RATE_LIMIT_LEGACY_HEADERS_TYPE',
        custom: true,
        options: { values: { received: typeof legacyHeaders } },
      });
    }
  }

  return Validation.success();
}

/**
 * Asserts that rate limit options are valid.
 *
 * @param {unknown} options - Rate limit options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If `windowMs` is not a positive integer.
 * @throws {ServerConfigurationError} If `max` is not a positive integer.
 * @throws {ServerConfigurationError} If `statusCode` is not an integer between 400 and 599.
 * @throws {ServerConfigurationError} If `message` is not a plain object.
 * @throws {ServerConfigurationError} If `standardHeaders` is not a boolean.
 * @throws {ServerConfigurationError} If `legacyHeaders` is not a boolean.
 * @example
 * ```js
 * assertRateLimitOptions({ windowMs: 60_000, max: 100 });
 * ```
 */
export function assertRateLimitOptions(options) {
  const validation = validateRateLimitOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}
