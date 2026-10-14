// @ts-check
/**
 * @file Request options validation utilities.
 *
 * @description Validates request options used by ServerConfiguration,
 * including body limit and proxy trust constraints.
 *
 * @module Validation/ServerConfiguration/RequestOptions
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
 * Validates request options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `bodyLimit`, if defined, must be a positive safe integer.
 * 4. `trustProxy`, if defined, must be a boolean or a non-negative integer.
 *
 * @param {unknown} options - Request options to validate.
 * @returns {Validation} Validation result.
 */
export function validateRequestOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_REQUEST_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('bodyLimit' in options) {
    const { bodyLimit } = options;

    if (bodyLimit !== undefined) {
      if (typeof bodyLimit !== 'number') {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_BODY_LIMIT_TYPE',
          custom: true,
          options: { values: { received: typeof bodyLimit } },
        });
      }

      if (!Number.isSafeInteger(bodyLimit) || bodyLimit <= 0) {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_BODY_LIMIT_RANGE',
          custom: true,
          options: { details: { bodyLimit } },
        });
      }
    }
  }

  if ('trustProxy' in options) {
    const { trustProxy } = options;

    if (trustProxy !== undefined) {
      const isBoolean = typeof trustProxy === 'boolean';
      const isNumber = typeof trustProxy === 'number';

      if (!isBoolean && !isNumber) {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_TRUST_PROXY_TYPE',
          custom: true,
          options: { values: { received: typeof trustProxy } },
        });
      }

      if (isNumber && (!Number.isInteger(trustProxy) || trustProxy < 0)) {
        return Validation.failure({
          error: ServerConfigurationError,
          code: 'INVALID_TRUST_PROXY_RANGE',
          custom: true,
          options: { details: { trustProxy } },
        });
      }
    }
  }

  return Validation.success();
}

/**
 * Asserts that request options are valid.
 *
 * @param {unknown} options - Request options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If `bodyLimit` is defined and is not a number.
 * @throws {ServerConfigurationError} If `bodyLimit` is defined and is not a positive safe integer.
 * @throws {ServerConfigurationError} If `trustProxy` is defined and is not a boolean or number.
 * @throws {ServerConfigurationError} If numeric `trustProxy` is defined and is negative or not an integer.
 * @example
 * ```js
 * assertRequestOptions({
 *   bodyLimit: 10 * 1024 * 1024,
 *   trustProxy: true,
 * });
 * ```
 */
export function assertRequestOptions(options) {
  const validation = validateRequestOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}
