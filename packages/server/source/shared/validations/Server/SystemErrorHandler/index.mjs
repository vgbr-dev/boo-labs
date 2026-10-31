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
 * Validates a system error handler.
 *
 * A system error handler must be a function that declares exactly two
 * parameters: `error` and `exchange`.
 *
 * @param {unknown} handler - Handler function to validate.
 * @returns {SuccessValidation|FailureValidation<ServerError>} Validation result.
 *
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
    return Validation.failure(
      new ServerError('INVALID_SYSTEM_ERROR_HANDLER_TYPE', {
        values: {
          expected: 'function',
          received: typeof handler,
        },
      }),
    );
  }

  if (handler.length !== 2) {
    return Validation.failure(
      new ServerError('INVALID_SYSTEM_ERROR_HANDLER_ARITY', {
        values: {
          expected: 2,
          received: handler.length,
        },
      }),
    );
  }

  return Validation.success();
}

/**
 * Asserts that a system error handler is valid.
 *
 * @param {unknown} handler - Handler function to validate.
 * @throws {ServerError} If the handler is not a function.
 * @throws {ServerError} If the handler does not declare exactly two parameters.
 *
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
