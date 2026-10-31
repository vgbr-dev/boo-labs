// @ts-check
/**
 * @file Validation — Represents successful and failed validation outcomes.
 *
 * @description Provides a generic Validation type that explicitly distinguishes
 * successful validations from failed ones through the `ok` discriminant.
 * A successful validation has no payload. A failed validation exposes `error`.
 * Accessing `error` on a successful validation throws.
 *
 * @module Validation
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * The error associated with a Validation state.
 *
 * @template {boolean} K
 * @template E
 * @typedef {K extends false ? E : undefined} ErrorValue
 */

/**
 * A successful {@link Validation} instance.
 *
 * @typedef {Validation<true, undefined>} SuccessValidation
 */

/**
 * A failed {@link Validation} instance.
 *
 * @template {Error} E
 * @typedef {Validation<false, E>} FailureValidation
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the outcome of a validation operation (pass / fail).
 *
 * @classdesc `Validation` uses the `ok` property as a discriminant to
 * distinguish successful validations from failures. A successful validation
 * has no payload; a failed validation exposes `error`. Accessing `error` on
 * a successful validation throws.
 *
 * @template {boolean} K
 * @template E
 */
class Validation {
  /**
   * Indicates whether the validation succeeded.
   *
   * @type {K}
   */
  #ok;

  /**
   * Stores the error associated with a failed validation.
   *
   * @type {ErrorValue<K, E>}
   */
  #error;

  /**
   * Creates a Validation instance.
   *
   * The `ok` flag determines whether an error is required: no error on success,
   * a required error instance on failure.
   *
   * @param {K} ok - Whether the validation succeeded.
   * @param {ErrorValue<K, E>} error - The error instance, required when ok is false.
   *
   * @example
   * ```js
   * const validation = new Validation(true, undefined);
   * ```
   *
   * @example
   * ```js
   * const validation = new Validation(false, new TypeError('Expected a string.'));
   * ```
   */
  constructor(ok, error) {
    this.#ok = ok;
    this.#error = error;
  }

  /**
   * Indicates whether the validation succeeded.
   *
   * @readonly
   * @type {K}
   */
  get ok() {
    return this.#ok;
  }

  /**
   * The error instance of the failed validation.
   *
   * @readonly
   * @type {ErrorValue<K, E>}
   * @throws {Error} If the validation succeeded.
   */
  get error() {
    if (this.#ok !== false) {
      throw new Error('Cannot access error of a successful Validation.');
    }
    return this.#error;
  }

  /**
   * Creates a successful {@link Validation}.
   *
   * @returns {SuccessValidation} A successful Validation instance.
   *
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
    return new Validation(true, undefined);
  }

  /**
   * Creates a failed {@link Validation}.
   *
   * @template {Error} E
   * @param {E} error - The error instance describing the failure.
   * @returns {FailureValidation<E>} A failed Validation instance.
   *
   * @example
   * ```js
   * const validation = Validation.failure(new RangeError('Value is out of range.'));
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
