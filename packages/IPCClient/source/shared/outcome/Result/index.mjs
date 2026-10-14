// @ts-check
/**
 * @file Core result module for representing strict operation outcomes.
 *
 * @description Provides the {@link Result} class for explicitly representing
 * successful and failed operations without relying on ambiguous `undefined`
 * states.
 *
 * @module Result
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import ErrorSchema from '../ErrorSchema.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
 * @property {typeof Error}       error             - Error constructor used to create the error.
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
 * @property {typeof Error}       error             - Error constructor used to create the error.
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
 * Represents the successful state of a {@link Result} instance.
 *
 * @template T
 * @typedef  {object}    ResultSuccess
 * @property {true}      ok            - Indicates that the operation succeeded.
 * @property {T}         value         - Successful value produced by the operation.
 * @property {undefined} [error]       - Always undefined for a successful result.
 */

/**
 * Represents the failed state of a {@link Result} instance.
 *
 * @typedef  {object}      ResultFailure
 * @property {false}       ok            - Indicates that the operation failed.
 * @property {undefined}   [value]       - Always undefined for a failed result.
 * @property {ErrorSchema} error         - Error schema describing the operation failure.
 */

/**
 * Represents the internal state of a {@link Result} instance.
 *
 * @template T
 * @typedef {ResultSuccess<T>|ResultFailure} ResultState
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the strict outcome of an operation that may yield a value or an
 * error.
 *
 * @template T
 */
class Result {
  /**
   * Stores the internal result state.
   *
   * @type {ResultState<T>}
   */
  #result;

  /**
   * Creates a Result instance.
   *
   * @param {boolean} ok - Whether the operation succeeded.
   * @param {T} [value] - The successful value.
   * @param {ErrorSchemaDefinition} [error] - Required when ok is false.
   * @throws {TypeError} If the combination of ok, value, and error is invalid.
   * @example
   * ```js
   * const result = new Result(true, { id: '123' });
   * ```
   *
   * @example
   * ```js
   * const result = new Result(false, undefined, {
   *   error: RangeError,
   *   message: 'Value is out of range.',
   *   custom: false,
   *   code: 'ERR_RANGE',
   * });
   * ```
   */
  constructor(ok, value, error) {
    if (typeof ok !== 'boolean') {
      throw new TypeError('Result status (ok) must be a boolean.');
    }

    if (ok === true) {
      if (value === undefined) {
        throw new TypeError('A successful Result must contain a value.');
      }
      if (error !== undefined) {
        throw new TypeError('A successful Result cannot contain an error.');
      }

      this.#result = { ok, value, error };
    } else {
      if (error === undefined) {
        throw new TypeError('A failed Result must contain an error.');
      }

      if (value !== undefined) {
        throw new TypeError('A failed Result cannot contain a value.');
      }

      this.#result = {
        ok,
        value: undefined,
        error: new ErrorSchema(error),
      };
    }
  }

  /**
   * Indicates whether the operation succeeded.
   *
   * @readonly
   * @type {boolean}
   */
  get ok() {
    return this.#result.ok;
  }

  /**
   * The successful value of the operation.
   *
   * @readonly
   * @type {T}
   * @throws {Error} If the result is not ok.
   */
  get value() {
    if (this.#result.ok === false) {
      throw new Error('Cannot access value of a failed Result.');
    }

    return this.#result.value;
  }

  /**
   * The instantiated error of the failed operation.
   *
   * @readonly
   * @type {Error}
   * @throws {Error} If the result is ok.
   */
  get error() {
    if (this.#result.ok === true) {
      throw new Error('Cannot access error of a successful Result.');
    }

    return this.#result.error.error;
  }

  /**
   * Creates a successful {@link Result}.
   *
   * @template U
   * @param {U} [value] - The successful value.
   * @returns {Result<U>} A successful Result instance.
   * @example
   * ```js
   * const result = Result.success({ id: '123' });
   *
   * if (result.ok) {
   *   console.log(result.value.id);
   * }
   * ```
   */
  static success(value) {
    return new Result(true, value);
  }

  /**
   * Creates a failed {@link Result}.
   *
   * @param {ErrorSchemaDefinition} error - The error details describing the failure.
   * @returns {Result<never>} A failed Result instance.
   * @example
   * ```js
   * const result = Result.failure({
   *   error: RangeError,
   *   message: 'Value is out of range.',
   *   custom: false,
   *   code: 'ERR_RANGE',
   * });
   *
   * if (!result.ok) {
   *   console.log(result.error);
   * }
   * ```
   */
  static failure(error) {
    return /** @type {Result<never>} */ (new Result(false, undefined, error));
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Result;
