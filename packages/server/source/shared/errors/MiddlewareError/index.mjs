/**
 * @file Defines domain-specific errors for middleware validation.
 *
 * @description MiddlewareError extends BaseError to provide structured,
 * identifiable errors specific to middleware validation. It centralizes
 * error messages and supports template placeholders for dynamic context.
 *
 * @module MiddlewareError
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import BaseError from '../BaseError/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @template {string} T
 * @typedef {T | (string & {})} LiteralUnion
 */

/**
 * Identifies a predefined middleware error or allows a custom error message.
 *
 * @typedef {LiteralUnion<
 * 'INVALID_MIDDLEWARE_TYPE' |
 * 'INVALID_MIDDLEWARE_ARITY' |
 * 'INVALID_MIDDLEWARES_TYPE'
 * >} MiddlewareErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  MiddlewareErrorOptions
 * @property {Record<string, unknown>} [values]               - Values for template placeholders in the error message.
 * @property {unknown}                 [details]              - Additional contextual information about the error.
 * @property {Error}                   [cause]                - The original error that caused this error (for error chaining).
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error thrown when middleware cannot be validated.
 *
 * @classdesc This error type provides identifiable failures related to
 * middleware validation.
 *
 * @augments BaseError
 * @private
 */
class MiddlewareError extends BaseError {
  /**
   * Creates a new {@link MiddlewareError}.
   *
   * @param {MiddlewareErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {MiddlewareErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   * throw new MiddlewareError('INVALID_MIDDLEWARE_TYPE', {
   *   values: {
   *     expected: 'function',
   *     received: 'string',
   *   },
   * });
   * ```
   * @example
   * ```js
   * throw new MiddlewareError('INVALID_MIDDLEWARE_ARITY', {
   *   values: {
   *     expected: 2,
   *     received: 1,
   *   },
   * });
   * ```
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Collection of predefined middleware error messages.
   *
   * Available error identifiers:
   *
   * - `'INVALID_MIDDLEWARE_TYPE'`.
   * - `'INVALID_MIDDLEWARE_ARITY'`.
   * - `'INVALID_MIDDLEWARES_TYPE'`.
   *
   * @private
   * @static
   * @type {Map<MiddlewareErrorIdentifier, string>}
   */
  static MESSAGES = new Map([
    ['INVALID_MIDDLEWARE_TYPE', 'Expected middleware to be a {expected}, but received {received}.'],
    [
      'INVALID_MIDDLEWARE_ARITY',
      'Middleware must declare exactly {expected} parameters, but received {received}.',
    ],
    [
      'INVALID_MIDDLEWARES_TYPE',
      'Expected middlewares to be an {expected}, but received {received}.',
    ],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default MiddlewareError;
