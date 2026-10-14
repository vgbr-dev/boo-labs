// @ts-check
/**
 * @file Middleware validation utilities.
 *
 * @description Validates middleware functions used by the HTTP server.
 *
 * @module Validation/Middleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import MiddlewareError from '#shared/errors/MiddlewareError';

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates a middleware function.
 *
 * A middleware must be a function that declares exactly two parameters:
 * `context` and `next`.
 *
 * @param {unknown} middleware - Middleware function to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateMiddleware((context, next) => {
 *   next();
 * });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateMiddleware((context) => {
 *   return context;
 * });
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateMiddleware(middleware) {
  if (typeof middleware !== 'function') {
    return Validation.failure({
      error: MiddlewareError,
      code: 'INVALID_MIDDLEWARE_TYPE',
      custom: true,
      options: {
        values: {
          expected: 'function',
          received: typeof middleware,
        },
      },
    });
  }

  if (middleware.length !== 2) {
    return Validation.failure({
      error: MiddlewareError,
      code: 'INVALID_MIDDLEWARE_ARITY',
      custom: true,
      options: {
        values: {
          expected: 2,
          received: middleware.length,
        },
      },
    });
  }

  return Validation.success();
}

/**
 * Asserts that a middleware function is valid.
 *
 * @param {unknown} middleware - Middleware function to validate.
 * @throws {MiddlewareError} If the middleware is not a function.
 * @throws {MiddlewareError} If the middleware does not declare exactly two parameters.
 * @example
 * ```js
 * assertMiddleware((context, next) => {
 *   next();
 * });
 * ```
 */
export function assertMiddleware(middleware) {
  const validation = validateMiddleware(middleware);

  if (!validation.ok) {
    throw validation.error;
  }
}

/**
 * Validates an array of middleware functions.
 *
 * @param {unknown} middlewares - Middleware functions to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateMiddlewares([
 *   (context, next) => next(),
 *   (context, next) => next(),
 * ]);
 *
 * console.log(validation.ok);
 * // => true
 * ```
 */
export function validateMiddlewares(middlewares) {
  if (!Array.isArray(middlewares)) {
    return Validation.failure({
      error: MiddlewareError,
      code: 'INVALID_MIDDLEWARES_TYPE',
      custom: true,
      options: {
        values: {
          expected: 'array',
          received: typeof middlewares,
        },
      },
    });
  }

  for (const middleware of middlewares) {
    const validation = validateMiddleware(middleware);

    if (!validation.ok) {
      return validation;
    }
  }

  return Validation.success();
}

/**
 * Asserts that all middleware functions are valid.
 *
 * @param {unknown} middlewares - Middleware functions to validate.
 * @throws {MiddlewareError} If the middleware collection is not an array.
 * @throws {MiddlewareError} If a middleware is not a function.
 * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
 * @example
 * ```js
 * assertMiddlewares([
 *   (context, next) => next(),
 *   (context, next) => next(),
 * ]);
 * ```
 */
export function assertMiddlewares(middlewares) {
  const validation = validateMiddlewares(middlewares);

  if (!validation.ok) {
    throw validation.error;
  }
}
