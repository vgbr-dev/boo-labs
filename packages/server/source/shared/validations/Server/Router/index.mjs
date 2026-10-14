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

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates that a value implements the Router contract.
 *
 * @param {unknown} value - Value to validate.
 * @returns {Validation} Validation result.
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
    return Validation.failure({
      error: ServerError,
      message: `Expected a Router instance, received: ${value === null ? 'null' : typeof value}.`,
      code: 'INVALID_ROUTER_TYPE',
      custom: true,
    });
  }

  if (Reflect.get(value, ROUTER_BRAND) !== true) {
    return Validation.failure({
      error: ServerError,
      message: 'Expected a Router instance.',
      code: 'INVALID_ROUTER_INSTANCE',
      custom: true,
    });
  }

  return Validation.success();
}

/**
 * Asserts that a value implements the Router contract.
 *
 * @param {unknown} value - Value to assert.
 * @throws {ServerError} If the value does not implement the Router contract.
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
