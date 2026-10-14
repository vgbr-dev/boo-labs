// @ts-check
/**
 * @file Core validation module for representing strict validation outcomes.
 *
 * @description Provides the {@link Validation} class for explicitly representing
 * successful and failed operations without relying on
 * ambiguous `undefined` states.
 *
 * @module Validation
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import ErrorSchema from '../ErrorSchema.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an Error constructor.
 *
 * @typedef {new (identifier: string, options?: Record<string, unknown>) => Error} ErrorConstructor
 */

/**
 * Represents options passed to a native Error constructor.
 *
 * @typedef  {object}  NativeErrorOptions
 * @property {unknown} [cause]            - Cause associated with the error.
 */

/**
 * Represents a native Error schema definition.
 *
 * @typedef  {object}             NativeErrorSchema
 * @property {ErrorConstructor}   error             - Error constructor used to create the error.
 * @property {string}             message           - Literal error message.
 * @property {NativeErrorOptions} [options]         - Options passed to the Error constructor.
 * @property {false}              custom            - Indicates that the constructor represents a native Error.
 * @property {string}             code              - Error identifier.
 */

/**
 * Represents options passed to a custom Error constructor.
 *
 * @typedef  {object}                  CustomErrorOptions
 * @property {Record<string, unknown>} [values]           - Values used to resolve message placeholders.
 * @property {Record<string, unknown>} [details]          - Additional contextual information about the error.
 * @property {unknown}                 [cause]            - Cause associated with the error.
 */

/**
 * Represents a custom Error schema definition.
 *
 * @typedef  {object}             CustomErrorSchema
 * @property {ErrorConstructor}   error             - Error constructor used to create the error.
 * @property {string}             code              - Error code used to resolve the error message and error identifier.
 * @property {string}             [message]         - Literal error message.
 * @property {CustomErrorOptions} [options]         - Options passed to the Error constructor.
 * @property {true}               custom            - Indicates that the constructor represents a custom Error.
 */

/**
 * Represents a supported Error schema definition.
 *
 * @typedef {NativeErrorSchema|CustomErrorSchema} ErrorSchemaDefinition
 */

/**
 * Represents the successful state of a {@link Validation} instance.
 *
 * @typedef  {object}    ValidationStateSuccess
 * @property {true}      ok                     - Indicates that the validation succeeded.
 * @property {undefined} [error]                - Always undefined for a successful validation.
 */

/**
 * Represents the failed state of a {@link Validation} instance.
 *
 * @typedef  {object}      ValidationStateFailure
 * @property {false}       ok                     - Indicates that the validation failed.
 * @property {ErrorSchema} error                  - Error schema describing the validation failure.
 */

/**
 * Represents the internal state of a {@link Validation} instance.
 *
 * @typedef {ValidationStateSuccess|ValidationStateFailure} ValidationState
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the strict outcome of a validation operation (pass/fail).
 *
 * Unlike Result, it does not carry a successful payload, only an error on failure.
 */
class Validation {
  /**
   * Internal validation state.
   *
   * @type {ValidationState}
   */
  #validation;

  /**
   * Creates a Validation instance.
   *
   * @param {boolean} ok - Whether the validation succeeded.
   * @param {ErrorSchemaDefinition} [error] - Required when ok is false.
   * @throws {TypeError} If the combination of ok and error is invalid.
   * @example
   * ```js
   * const validation = new Validation(true);
   * ```
   *
   * @example
   * ```js
   * const validation = new Validation(false, {
   *   error: TypeError,
   *   message: 'Expected a string.',
   *   code: 'INVALID_TYPE',
   * });
   * ```
   */
  constructor(ok, error) {
    if (typeof ok !== 'boolean') {
      throw new TypeError('Validation status (ok) must be a boolean.');
    }

    if (ok === true) {
      if (error !== undefined) {
        throw new TypeError('A successful Validation cannot contain an error.');
      }

      this.#validation = { ok, error };
    } else {
      if (error === undefined) {
        throw new TypeError('A failed Validation must contain an error.');
      }
      this.#validation = { ok, error: new ErrorSchema(error) };
    }
  }

  /**
   * Indicates whether the validation succeeded.
   *
   * @readonly
   * @type {boolean}
   */
  get ok() {
    return this.#validation.ok;
  }

  /**
   * The instantiated error of the failed validation.
   *
   * @readonly
   * @type {Error}
   * @throws {Error} If the validation succeeded.
   */
  get error() {
    if (this.#validation.ok === true) {
      throw new Error('Cannot access error of a successful Validation.');
    }

    return this.#validation.error.error;
  }

  /**
   * Creates a successful {@link Validation}.
   *
   * @returns {Validation} A successful Validation instance.
   * @example
   * ```js
   * const validation = Validation.success();
   *
   * if (validation.ok) {
   *   console.log('Validation passed.');
   * }
   * ```
   */
  static success() {
    return new Validation(true);
  }

  /**
   * Creates a failed {@link Validation}.
   *
   * @param {ErrorSchemaDefinition} error - The error details describing the failure.
   * @returns {Validation} A failed Validation instance.
   * @example
   * ```js
   * const validation = Validation.failure({
   *   error: RangeError,
   *   message: 'Value is out of range.',
   *   code: 'VALUE_OUT_OF_RANGE',
   * });
   *
   * if (!validation.ok) {
   *   console.log(validation.error);
   * }
   * ```
   */
  static failure(error) {
    return new Validation(false, error);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Validation;
