// @ts-check
/**
 * @file Provides a UUID version 7 implementation.
 *
 * @description Defines the UUIDV7 class for creating, validating, and working
 * with RFC 9562-compliant UUID version 7 identifiers.
 *
 * UUID v7 embeds a 48-bit Unix timestamp in milliseconds in the first
 * six bytes of the identifier, followed by randomly generated bits.
 * This provides identifiers that are practically unique and naturally
 * sortable by creation time.
 *
 * @module UUIDV7
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { randomBytes } from 'node:crypto';

// » IMPORT THIRD PARTY MODULES

// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Matches the canonical hexadecimal representation of a UUID version 7.
 *
 * The expression validates the UUID structure, version field, and RFC 9562
 * variant bits.
 *
 * @type {RegExp}
 */
const UUIDV7_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a UUID version 7.
 *
 * UUID v7 combines a Unix timestamp in milliseconds with randomly generated
 * bits, producing identifiers that are practically unique and chronologically
 * sortable.
 */
class UUIDV7 {
  #uuid;

  /**
   * Creates a UUID v7 instance.
   *
   * When no timestamp is provided, the current time is used. A `Date` instance
   * uses its Unix timestamp, while an existing UUID v7 uses the timestamp
   * encoded in its first 48 bits.
   *
   * @param {Date|string|undefined} inputId - Timestamp source or existing UUID v7.
   * @throws {TypeError} If the input type is invalid.
   * @throws {RangeError} If the input value is invalid.
   *
   * @example
   * ```js
   * const id = new UUIDV7();
   * ```
   *
   * @example
   * ```js
   * const id = new UUIDV7(new Date('2026-09-07T10:00:00Z'));
   * ```
   *
   * @example
   * ```js
   * const source = new UUIDV7();
   * const id = new UUIDV7(source.value);
   * ```
   */
  constructor(inputId = undefined) {
    UUIDV7.assert(inputId);

    const milliseconds = UUIDV7.#normalizeTimestamp(inputId);

    this.#uuid = UUIDV7.#generateUUID(milliseconds);
  }

  /**
   * The UUID value.
   *
   * @readonly
   * @type {string}
   */
  get value() {
    return this.#uuid;
  }

  /**
   * The UUID value without separators.
   *
   * @readonly
   * @type {string}
   */
  get hexadecimal() {
    return this.#uuid.replace(/-/g, '');
  }

  /**
   * The Unix timestamp encoded in the UUID.
   *
   * @readonly
   * @type {number}
   */
  get timestamp() {
    return Number.parseInt(this.hexadecimal.slice(0, 12), 16);
  }

  /**
   * Returns the Unix timestamp encoded in the UUID as a Date instance.
   *
   * @returns {Date} Date represented by the UUID timestamp.
   * @example
   * ```js
   * const id = new UUIDV7();
   * const date = id.toDate();
   * ```
   */
  toDate() {
    return new Date(this.timestamp);
  }

  /**
   * Returns the UUID as a string.
   *
   * @returns {string} UUID in canonical hexadecimal format.
   * @example
   * ```js
   * const id = new UUIDV7();
   * console.log(id.toString());
   * ```
   */
  toString() {
    return this.#uuid;
  }

  /**
   * Returns the UUID as a JSON value.
   *
   * @returns {string} UUID in canonical hexadecimal format.
   *
   * @example
   * ```js
   * const id = new UUIDV7();
   * console.log(JSON.stringify(id));
   * ```
   */
  toJSON() {
    return this.#uuid;
  }

  /**
   * Normalizes a timestamp source into Unix milliseconds.
   *
   * Accepted values are:
   * - `undefined`, which resolves to the current time.
   * - A `Date` instance, which resolves to its Unix timestamp.
   * - A valid UUID v7 string, from which the embedded timestamp is extracted.
   *
   * @param {Date|string|undefined} inputId - Timestamp source.
   * @returns {number} Unix timestamp in milliseconds.
   */
  static #normalizeTimestamp(inputId) {
    if (inputId === undefined) {
      return Date.now();
    }

    if (inputId instanceof Date) {
      return inputId.getTime();
    }

    const hexadecimal = inputId.replace(/-/g, '');

    return Number.parseInt(hexadecimal.substring(0, 12), 16);
  }

  /**
   * Generates a UUID version 7 from a Unix timestamp.
   *
   * The generated identifier contains:
   * - A 48-bit Unix timestamp in milliseconds.
   * - The UUID version 7 field.
   * - The RFC 9562 variant field.
   * - Random bits filling the remaining identifier space.
   *
   * @param {number} milliseconds - Unix timestamp in milliseconds.
   * @returns {string} UUID v7 in canonical hexadecimal format.
   */
  static #generateUUID(milliseconds) {
    const bytes = randomBytes(16);

    // ━━ 48-bit Unix timestamp (bytes 0-5) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    bytes[0] = Math.floor(milliseconds / 0x10000000000) & 0xff;
    bytes[1] = Math.floor(milliseconds / 0x100000000) & 0xff;
    bytes[2] = Math.floor(milliseconds / 0x1000000) & 0xff;
    bytes[3] = Math.floor(milliseconds / 0x10000) & 0xff;
    bytes[4] = Math.floor(milliseconds / 0x100) & 0xff;
    bytes[5] = milliseconds & 0xff;

    // ━━ Version 7 + random bits ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    bytes[6] = (bytes[6] & 0x0f) | 0x70;

    // ━━ RFC 9562 variant + random bits ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    // ━━ Canonical format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const hexadecimal = bytes.toString('hex');

    return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`;
  }

  /**
   * Creates a new UUID v7 string using the current time.
   *
   * Convenience shortcut equivalent to `new UUIDV7().toString()`.
   *
   * @returns {string} UUID v7 in canonical hexadecimal format.
   *
   * @example
   * ```js
   * const id = UUIDV7.create();
   * ```
   */
  static create() {
    return new UUIDV7().toString();
  }

  /**
   * Validates a value that can be used as a UUID v7 timestamp source.
   *
   * `undefined` represents the current time, a `Date` represents its Unix
   * timestamp, and a UUID v7 string represents the timestamp encoded in that
   * UUID.
   *
   * @param {*} value - Value to validate.
   * @returns {Validation} Validation result.
   * @example
   * ```js
   * const result = UUIDV7.validate();
   * ```
   */
  static validate(value) {
    if (value === undefined) {
      return Validation.success();
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return Validation.failure({
          error: RangeError,
          message: 'Invalid timestamp.',
          code: 'INVALID_TIMESTAMP',
          custom: false,
        });
      }
      return Validation.success();
    }

    if (typeof value === 'string') {
      if (!UUIDV7_REGEXP.test(value)) {
        return Validation.failure({
          error: RangeError,
          message: 'Invalid UUID v7.',
          code: 'INVALID_UUID',
          custom: false,
        });
      }
      return Validation.success();
    }

    return Validation.failure({
      error: TypeError,
      message: 'Timestamp must be a Date, string, or undefined.',
      code: 'INVALID_TIMESTAMP_SOURCE',
      custom: false,
    });
  }

  /**
   * Validates that a value is a valid UUID v7 string.
   *
   * @param {unknown} value - Value to validate.
   * @returns {Validation} Validation result.
   * @example
   * ```js
   * const result = UUIDV7.validateUUIDString('019937f2-1234-7abc-8def-123456789abc');
   * ```
   */
  static validateUUIDString(value) {
    if (value === undefined) {
      return Validation.failure({
        error: ReferenceError,
        message: 'UUID must be a string.',
        custom: false,
        code: 'MISSING_UUID',
      });
    }

    if (typeof value !== 'string') {
      return Validation.failure({
        error: TypeError,
        message: 'UUID must be a string.',
        custom: false,
        code: 'INVALID_UUID_TYPE',
      });
    }

    if (!UUIDV7_REGEXP.test(value)) {
      return Validation.failure({
        error: RangeError,
        message: 'Invalid UUID v7 format.',
        custom: false,
        code: 'INVALID_UUID',
      });
    }

    return Validation.success();
  }

  /**
   * Asserts that a value can be used as a UUID v7 timestamp source.
   *
   * Unlike {@link UUIDV7.validate}, this method throws when validation fails.
   *
   * @param {unknown} value - Value to validate.
   * @throws {TypeError} If the value has an unsupported type.
   * @throws {RangeError} If the value is invalid.
   * @example
   * ```js
   * UUIDV7.assert(new Date());
   * ```
   */
  static assert(value) {
    const validation = UUIDV7.validate(value);

    if (!validation.ok) {
      throw validation.error;
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default UUIDV7;
