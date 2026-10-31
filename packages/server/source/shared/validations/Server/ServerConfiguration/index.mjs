// @ts-check
/**
 * @file ServerConfiguration validation utilities.
 *
 * @description Validates objects that implement the ServerConfiguration contract.
 *
 * @module Validation/Server/ServerConfiguration
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { SERVER_CONFIGURATION_BRAND } from '#shared/constants/symbols/brands';
import Validation from '#shared/outcome/Validation';
import ServerError from '#shared/errors/ServerError';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * A successful {@link Validation} instance.
 *
 * @typedef {import('#shared/outcome/Validation').SuccessValidation} SuccessValidation
 */

/**
 * A failed {@link Validation} instance.
 *
 * @template {Error} E
 * @typedef {import('#shared/outcome/Validation').FailureValidation<E>} FailureValidation
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates that a value implements the ServerConfiguration contract.
 *
 * @param {unknown} value - Value to validate.
 * @returns {SuccessValidation|FailureValidation<ServerError>} Validation result.
 *
 * @example
 * ```js
 * const validation = validateServerConfiguration(configuration);
 *
 * console.log(validation.ok);
 * // => true
 * ```
 */
export function validateServerConfiguration(value) {
  if (value === null || typeof value !== 'object') {
    return Validation.failure(
      new ServerError('INVALID_SERVER_CONFIGURATION_TYPE', {
        values: { received: value === null ? 'null' : typeof value },
      }),
    );
  }

  if (Reflect.get(value, SERVER_CONFIGURATION_BRAND) !== true) {
    return Validation.failure(new ServerError('INVALID_SERVER_CONFIGURATION_INSTANCE'));
  }

  return Validation.success();
}

/**
 * Asserts that a value implements the ServerConfiguration contract.
 *
 * @param {unknown} value - Value to assert.
 * @throws {ServerError} If the value does not implement the ServerConfiguration contract.
 *
 * @example
 * ```js
 * assertServerConfiguration(configuration);
 * ```
 */
export function assertServerConfiguration(value) {
  const validation = validateServerConfiguration(value);

  if (!validation.ok) {
    throw validation.error;
  }
}
