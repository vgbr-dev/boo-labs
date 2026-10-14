/**
 * @file Defines domain-specific errors for the HTTP Router.
 *
 * @description RouterError extends BaseError to provide structured,
 * identifiable errors specific to routing operations. It centralizes
 * error messages and supports template placeholders for dynamic context.
 *
 * @module RouterError
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
 * Identifies a predefined response error or allows a custom error message.
 *
 * @typedef {LiteralUnion<
 * 'DUPLICATE_ALL_METHOD' |
 * 'DUPLICATE_ROUTE'
 * >} RouterErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  RouterErrorOptions
 * @property {Record<string, unknown>} [values]           - Values for template placeholders in the error message.
 * @property {unknown}                 [details]          - Additional contextual information about the error.
 * @property {Error}                   [cause]            - The original error that caused this error (for error chaining).
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error thrown when a `Router` operation cannot be completed.
 *
 * @classdesc This error type provides identifiable failures related to pathname
 * patterns, route registration, and handler configuration.
 *
 * @augments BaseError
 * @private
 */
class RouterError extends BaseError {
  /**
   * Creates a new {@link RouterError}.
   *
   * @param {RouterErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {RouterErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   *  throw new RouterError('DUPLICATE_ALL', { values: { pathnamePattern } });
   * ```
   *
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Collection of predefined server error messages.
   *
   * Available error identifiers:
   *
   * - `'DUPLICATE_ALL_METHOD'`.
   * - `'ROUTE_ALREADY_REGISTERED'`.
   *
   * @private
   * @static
   * @type {Map<RouterErrorIdentifier, string>}
   */
  static MESSAGES = new Map([
    [
      'DUPLICATE_ALL_METHOD',
      'The "ALL" registration is already defined for pathname pattern "{pathnamePattern}".',
    ],
    [
      'DUPLICATE_ROUTE',
      'The "{mark}" method is already defined for pathname pattern "{pathnamePattern}".',
    ],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RouterError;
