// @ts-check
/**
 * @file SystemErrorHandler validation utilities.
 *
 * @description Validates handlers used to resolve errors that propagate during
 * request processing.
 *
 * @module Validation/Server/SystemErrorHandler
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerError from '#shared/errors/ServerError';

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates a system error handler.
 *
 * A system error handler must be a function that declares exactly two
 * parameters: `error` and `exchange`.
 *
 * @param {unknown} handler - Handler function to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateSystemErrorHandler((error, exchange) => {
 *   exchange.response.status(500).end();
 * });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateSystemErrorHandler((error) => {});
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateSystemErrorHandler(handler) {
  if (typeof handler !== 'function') {
    return Validation.failure({
      error: ServerError,
      code: 'INVALID_SYSTEM_ERROR_HANDLER_TYPE',
      custom: true,
      options: {
        values: {
          expected: 'function',
          received: typeof handler,
        },
      },
    });
  }

  if (handler.length !== 2) {
    return Validation.failure({
      error: ServerError,
      code: 'INVALID_SYSTEM_ERROR_HANDLER_ARITY',
      custom: true,
      options: {
        values: {
          expected: 2,
          received: handler.length,
        },
      },
    });
  }

  return Validation.success();
}

/**
 * Asserts that a system error handler is valid.
 *
 * @param {unknown} handler - Handler function to validate.
 * @throws {ServerError} If the handler is not a function.
 * @throws {ServerError} If the handler does not declare exactly two parameters.
 * @example
 * ```js
 * assertSystemErrorHandler((error, exchange) => {
 *   exchange.response.status(500).end();
 * });
 * ```
 */
export function assertSystemErrorHandler(handler) {
  const validation = validateSystemErrorHandler(handler);

  if (!validation.ok) {
    throw validation.error;
  }
}
