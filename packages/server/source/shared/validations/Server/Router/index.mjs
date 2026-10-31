// @ts-check
/**
 * @file Router validation utilities.
 *
 * @description Validates objects that implement the Router contract.
 *
 * @module Validation/Router
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { ROUTER_BRAND } from '#shared/constants/symbols/brands';
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
 * Validates that a value implements the Router contract.
 *
 * @param {unknown} value - Value to validate.
 * @returns {SuccessValidation|FailureValidation<ServerError>} Validation result.
 *
 * @example
 * ```js
 * const validation = validateRouter(router);
 *
 * console.log(validation.ok);
 * // => true
 * ```
 */
export function validateRouter(value) {
  if (value === null || typeof value !== 'object') {
    return Validation.failure(
      new ServerError('INVALID_ROUTER_TYPE', {
        values: { received: value === null ? 'null' : typeof value },
      }),
    );
  }

  if (Reflect.get(value, ROUTER_BRAND) !== true) {
    return Validation.failure(new ServerError('INVALID_ROUTER_INSTANCE'));
  }

  return Validation.success();
}

/**
 * Asserts that a value implements the Router contract.
 *
 * @param {unknown} value - Value to assert.
 * @throws {ServerError} If the value does not implement the Router contract.
 *
 * @example
 * ```js
 * assertRouter(router);
 * ```
 */
export function assertRouter(value) {
  const validation = validateRouter(value);

  if (!validation.ok) {
    throw validation.error;
  }
}
