// @ts-check
/**
 * @file Result — Represents successful and failed operation outcomes.
 *
 * @description Provides a generic Result type that explicitly distinguishes
 * successful operations from failed ones through the `ok` discriminant.
 * The discriminant determines which value is available: `value` on success
 * or `error` on failure. Accessing the property for the opposite state throws.
 *
 * @module Result
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * The value associated with a Result state.
 *
 * @template {boolean} K
 * @template T
 * @typedef {K extends true ? T : undefined } Value
 */

/**
 * The error associated with a Result state.
 *
 * @template {boolean} K
 * @template E
 * @typedef {K extends false ? E : undefined} ErrorValue
 */

/**
 * A successful {@link Result} instance.
 *
 * @template T
 * @typedef {Result<true, T, undefined>} SuccessResult
 */

/**
 * A failed {@link Result} instance.
 *
 * @template E
 * @typedef {Result<false, undefined, E>} FailureResult
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Represents the outcome of an operation.
 *
 * @classdesc `Result` uses the `ok` property as a discriminant to distinguish
 * successful outcomes from failures. A successful result exposes `value`,
 * while a failed result exposes `error`. Accessing the property associated
 * with the opposite state throws an error.
 *
 * @template {boolean} K
 * @template T
 * @template E
 */
class Result {
  /**
   * Indicates whether the operation succeeded.
   *
   * @type {K}
   */
  #ok;

  /**
   * Stores the value associated with a successful operation.
   *
   * @type {Value<K, T>}
   */
  #value;

  /**
   * Stores the error associated with a failed operation.
   *
   * @type {ErrorValue<K, E>}
   */
  #error;

  /**
   * Creates a Result instance with the specified outcome.
   *
   * The `ok` flag determines which argument represents the meaningful
   * result: `value` for success or `error` for failure.
   *
   * @param {K} ok - Whether the operation succeeded.
   * @param {Value<K, T>} value - The successful value, if applicable.
   * @param {ErrorValue<K, E>} error - The failure value, if applicable.
   *
   * @example
   * ```js
   * const result = new Result(true, { id: '123' }, undefined);
   * ```
   *
   * @example
   * ```js
   * const result = new Result(false, undefined, new RangeError('Value is out of range.'));
   * ```
   */
  constructor(ok, value, error) {
    this.#ok = ok;
    this.#value = value;
    this.#error = error;
  }

  /**
   * Indicates whether the operation succeeded.
   *
   * @readonly
   * @type {K}
   */
  get ok() {
    return this.#ok;
  }

  /**
   * The successful value of the operation.
   *
   * @readonly
   * @type {Value<K, T>}
   * @throws {Error} If the result is not ok.
   */
  get value() {
    if (this.#ok !== true) {
      throw new Error('Cannot access value of a failed Result.');
    }
    return this.#value;
  }

  /**
   * The error instance of the failed operation.
   *
   * @readonly
   * @type {ErrorValue<K, E>}
   * @throws {Error} If the result is ok.
   */
  get error() {
    if (this.#ok !== false) {
      throw new Error('Cannot access error of a successful Result.');
    }
    return this.#error;
  }

  /**
   * Creates a successful {@link Result}.
   *
   * @template V
   * @param {V} value - The successful value.
   * @returns {SuccessResult<V>} A successful Result instance.
   *
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
    return new Result(true, value, undefined);
  }

  /**
   * Creates a failed {@link Result}.
   *
   * @template {Error} E
   * @param {E} error - The error instance describing the failure.
   * @returns {FailureResult<E>} A failed Result instance.
   *
   * @example
   * ```js
   * const result = Result.failure(new RangeError('Value is out of range.'));
   *
   * if (!result.ok) {
   *   console.log(result.error);
   * }
   * ```
   */
  static failure(error) {
    return new Result(false, undefined, error);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Result;
