// @ts-check
/**
 * @file CORS options validation utilities.
 *
 * @description Validates CORS middleware options used by
 * ServerConfiguration, including origin, methods, allowed/exposed headers,
 * credentials, preflight caching, and preflight response behavior.
 *
 * @module Validation/ServerConfiguration/CORSOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerConfigurationError from '#shared/errors/ServerConfigurationError';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Minimum valid HTTP status code for a successful preflight response.
 *
 * @private
 * @type {number}
 */
const MIN_OPTIONS_SUCCESS_STATUS = 100;

/**
 * Maximum valid HTTP status code for a successful preflight response.
 *
 * @private
 * @type {number}
 */
const MAX_OPTIONS_SUCCESS_STATUS = 599;

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
 * Validates CORS options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `origin`, if present, must be `true`, a string, or an array of non-empty strings.
 * 4. `methods`, if present, must be an array of non-empty strings.
 * 5. `allowedHeaders`, if present, must be an array of non-empty strings.
 * 6. `exposedHeaders`, if present, must be an array of non-empty strings.
 * 7. `credentials`, if present, must be a boolean.
 * 8. `maxAge`, if present, must be a non-negative integer.
 * 9. `preflightContinue`, if present, must be a boolean.
 * 10. `optionsSuccessStatus`, if present, must be an integer between 100 and 599.
 *
 * @param {unknown} options - CORS options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateCORSOptions({ origin: true });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateCORSOptions({ origin: 123 });
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateCORSOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_CORS_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('origin' in options) {
    const { origin } = options;

    const isValidOriginType =
      origin === true ||
      typeof origin === 'string' ||
      (Array.isArray(origin) && everyNonEmptyString(origin));

    if (!isValidOriginType) {
      if (Array.isArray(origin)) {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_CORS_ORIGIN_ITEM',
          custom: true,
          options: { details: { origin } },
        });
      }

      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_ORIGIN_TYPE',
        custom: true,
        options: { values: { received: typeof origin } },
      });
    }
  }

  if ('methods' in options) {
    const { methods } = options;

    if (!Array.isArray(methods)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_METHODS_TYPE',
        custom: true,
        options: { values: { received: typeof methods } },
      });
    }

    if (!everyNonEmptyString(methods)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_METHODS_ITEM',
        custom: true,
        options: { details: { methods } },
      });
    }
  }

  if ('allowedHeaders' in options) {
    const { allowedHeaders } = options;

    if (!Array.isArray(allowedHeaders)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_ALLOWED_HEADERS_TYPE',
        custom: true,
        options: { values: { received: typeof allowedHeaders } },
      });
    }

    if (!everyNonEmptyString(allowedHeaders)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_ALLOWED_HEADERS_ITEM',
        custom: true,
        options: { details: { allowedHeaders } },
      });
    }
  }

  if ('exposedHeaders' in options) {
    const { exposedHeaders } = options;

    if (!Array.isArray(exposedHeaders)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_EXPOSED_HEADERS_TYPE',
        custom: true,
        options: { values: { received: typeof exposedHeaders } },
      });
    }

    if (!everyNonEmptyString(exposedHeaders)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_EXPOSED_HEADERS_ITEM',
        custom: true,
        options: { details: { exposedHeaders } },
      });
    }
  }

  if ('credentials' in options) {
    const { credentials } = options;

    if (typeof credentials !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_CREDENTIALS_TYPE',
        custom: true,
        options: { values: { received: typeof credentials } },
      });
    }
  }

  if ('maxAge' in options) {
    const { maxAge } = options;

    if (typeof maxAge !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_MAX_AGE_TYPE',
        custom: true,
        options: { values: { received: typeof maxAge } },
      });
    }

    if (!Number.isInteger(maxAge) || maxAge < 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_MAX_AGE_RANGE',
        custom: true,
        options: { details: { maxAge } },
      });
    }
  }

  if ('preflightContinue' in options) {
    const { preflightContinue } = options;

    if (typeof preflightContinue !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_PREFLIGHT_CONTINUE_TYPE',
        custom: true,
        options: { values: { received: typeof preflightContinue } },
      });
    }
  }

  if ('optionsSuccessStatus' in options) {
    const { optionsSuccessStatus } = options;

    if (typeof optionsSuccessStatus !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_OPTIONS_SUCCESS_STATUS_TYPE',
        custom: true,
        options: { values: { received: typeof optionsSuccessStatus } },
      });
    }

    if (
      !Number.isInteger(optionsSuccessStatus) ||
      optionsSuccessStatus < MIN_OPTIONS_SUCCESS_STATUS ||
      optionsSuccessStatus > MAX_OPTIONS_SUCCESS_STATUS
    ) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CORS_OPTIONS_SUCCESS_STATUS_RANGE',
        custom: true,
        options: { details: { optionsSuccessStatus } },
      });
    }
  }

  return Validation.success();
}

/**
 * Asserts that CORS options are valid.
 *
 * @param {unknown} options - CORS options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If `origin` is not `true`, a string, or an array of non-empty strings.
 * @throws {ServerConfigurationError} If `methods` is not an array of non-empty strings.
 * @throws {ServerConfigurationError} If `allowedHeaders` is not an array of non-empty strings.
 * @throws {ServerConfigurationError} If `exposedHeaders` is not an array of non-empty strings.
 * @throws {ServerConfigurationError} If `credentials` is not a boolean.
 * @throws {ServerConfigurationError} If `maxAge` is not a non-negative integer.
 * @throws {ServerConfigurationError} If `preflightContinue` is not a boolean.
 * @throws {ServerConfigurationError} If `optionsSuccessStatus` is not an integer between 100 and 599.
 * @example
 * ```js
 * assertCORSOptions({ origin: true, credentials: true });
 * ```
 */
export function assertCORSOptions(options) {
  const validation = validateCORSOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}
