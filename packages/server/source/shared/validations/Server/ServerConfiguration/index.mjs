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

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates that a value implements the ServerConfiguration contract.
 *
 * @param {unknown} value - Value to validate.
 * @returns {Validation} Validation result.
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
    return Validation.failure({
      error: ServerError,
      message: `Expected a ServerConfiguration instance, received: ${value === null ? 'null' : typeof value}.`,
      code: 'INVALID_SERVER_CONFIGURATION_TYPE',
      custom: true,
    });
  }

  if (Reflect.get(value, SERVER_CONFIGURATION_BRAND) !== true) {
    return Validation.failure({
      error: ServerError,
      message: 'Expected a ServerConfiguration instance.',
      code: 'INVALID_SERVER_CONFIGURATION_INSTANCE',
      custom: true,
    });
  }

  return Validation.success();
}

/**
 * Asserts that a value implements the ServerConfiguration contract.
 *
 * @param {unknown} value - Value to assert.
 * @throws {ServerError} If the value does not implement the ServerConfiguration contract.
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
