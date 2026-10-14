/**
 * @file Defines domain-specific errors for pathname pattern validation.
 *
 * @description PathnamePatternError extends BaseError to provide structured,
 * identifiable errors specific to pathname pattern validation. It centralizes
 * error messages and supports template placeholders for dynamic context.
 *
 * @module PathnamePatternError
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
 * Identifies a predefined pathname pattern error or allows a custom error message.
 *
 * @typedef {LiteralUnion<
 * 'INVALID_PATTERN_TYPE' |
 * 'EMPTY_PATTERN' |
 * 'PATTERN_TOO_LONG' |
 * 'INVALID_PATHNAME_PATTERN' |
 * 'DUPLICATE_PARAMETER_NAME'
 * >} PathnamePatternErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  PathnamePatternErrorOptions
 * @property {Record<string, unknown>} [values]                    - Values for template placeholders in the error message.
 * @property {unknown}                 [details]                   - Additional contextual information about the error.
 * @property {Error}                   [cause]                     - The original error that caused this error (for error chaining).
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error thrown when a pathname pattern cannot be validated.
 *
 * @classdesc This error type provides identifiable failures related to pathname
 * pattern syntax and validation.
 *
 * @augments BaseError
 * @private
 */
class PathnamePatternError extends BaseError {
  /**
   * Creates a new {@link PathnamePatternError}.
   *
   * @param {PathnamePatternErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {PathnamePatternErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   * throw new PathnamePatternError('INVALID_PATHNAME_PATTERN', {
   *   values: {
   *     pattern: '/users/:id',
   *   },
   * });
   * ```
   * @example
   * ```js
   * throw new PathnamePatternError('EMPTY_PATTERN');
   * ```
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Collection of predefined pathname pattern error messages.
   *
   * Available error identifiers:
   *
   * - `'INVALID_PATTERN_TYPE'`.
   * - `'EMPTY_PATTERN'`.
   * - `'PATTERN_TOO_LONG'`.
   * - `'INVALID_PATHNAME_PATTERN'`.
   * - `'DUPLICATE_PARAMETER_NAME'`.
   *
   * @private
   * @static
   * @type {Map<PathnamePatternErrorIdentifier, string>}
   */
  static MESSAGES = new Map([
    ['INVALID_PATTERN_TYPE', 'Expected pattern to be a {expected}, but received {received}.'],
    ['EMPTY_PATTERN', 'Pathname pattern must not be empty.'],
    [
      'PATTERN_TOO_LONG',
      'Pathname pattern length ({actualLength}) exceeds the maximum allowed limit of {maxLength} characters.',
    ],
    ['INVALID_PATHNAME_PATTERN', 'Invalid pathname pattern: "{pattern}".'],
    ['DUPLICATE_PARAMETER_NAME', 'Duplicate parameter name: "{name}" in pattern.'],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default PathnamePatternError;
