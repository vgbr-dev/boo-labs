// @ts-check
/**
 * @file NotFoundHandler validation utilities.
 *
 * @description Validates handlers used to resolve requests that do not match
 * any registered route.
 *
 * @module Validation/Server/NotFoundHandler
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerError from '#shared/errors/ServerError';

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates a not-found handler.
 *
 * A not-found handler must be a function that declares exactly one parameter:
 * `exchange`.
 *
 * @param {unknown} handler - Handler function to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateNotFoundHandler((exchange) => {
 *   exchange.response.status(404).end();
 * });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateNotFoundHandler(() => {});
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateNotFoundHandler(handler) {
  if (typeof handler !== 'function') {
    return Validation.failure({
      error: ServerError,
      code: 'INVALID_NOT_FOUND_HANDLER_TYPE',
      custom: true,
      options: {
        values: {
          expected: 'function',
          received: typeof handler,
        },
      },
    });
  }

  if (handler.length !== 1) {
    return Validation.failure({
      error: ServerError,
      code: 'INVALID_NOT_FOUND_HANDLER_ARITY',
      custom: true,
      options: {
        values: {
          expected: 1,
          received: handler.length,
        },
      },
    });
  }

  return Validation.success();
}

/**
 * Asserts that a not-found handler is valid.
 *
 * @param {unknown} handler - Handler function to validate.
 * @throws {ServerError} If the handler is not a function.
 * @throws {ServerError} If the handler does not declare exactly one parameter.
 * @example
 * ```js
 * assertNotFoundHandler((exchange) => {
 *   exchange.response.status(404).end();
 * });
 * ```
 */
export function assertNotFoundHandler(handler) {
  const validation = validateNotFoundHandler(handler);

  if (!validation.ok) {
    throw validation.error;
  }
}
