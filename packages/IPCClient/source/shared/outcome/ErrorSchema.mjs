/**
 * @file Defines the structured schema used to describe operation errors.
 *
 * @description ErrorSchema normalizes literal-message and code-based error
 * definitions into a consistent schema used to instantiate Error objects.
 *
 * @module ErrorSchema
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { inspect } from 'node:util';

// » IMPORT THIRD PARTY MODULES

// » IMPORT LOCAL MODULES

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
 * @exports ErrorSchemaDefinition
 */

/**
 * Represents the normalized state of an ErrorSchema.
 *
 * @typedef  {object}                  ErrorSchemaState
 * @property {string}                  [message]        - Literal error message.
 * @property {string}                  type             - Error constructor name.
 * @property {Record<string, unknown>} options          - Options passed to the Error constructor.
 * @property {string}                  code             - Error identifier.
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Determines whether a value is a plain object.
 *
 * @private
 * @param {unknown} value - Value to check.
 * @returns {boolean} Whether the value is a plain object.
 */
const isObject = value => Object.prototype.toString.call(value) === '[object Object]';

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Defines a structured error schema and creates its corresponding Error.
 *
 * @classdesc ErrorSchema accepts either a literal error message or a domain
 * error code. Message-based schemas create errors directly from the message,
 * while code-based schemas preserve the code, values, and details required by
 * the consuming error system.
 */
class ErrorSchema {
  /**
   * Normalized error schema definition.
   *
   * @type {ErrorSchemaState}
   */
  #schema;

  /**
   * Error constructor used to reconstruct the error.
   *
   * @type {typeof Error}
   */
  #error;

  /**
   * Indicates whether the error uses the custom Error flow.
   *
   * @type {boolean}
   */
  #custom;

  /**
   * Creates an error schema from an Error definition.
   *
   * The schema must provide an Error constructor. Native Errors require a
   * message and code, while custom Errors require a code and may provide a message.
   *
   * @param {ErrorSchemaDefinition} schema - Error schema configuration.
   * @throws {TypeError} If `error` is not an Error constructor.
   * @throws {TypeError} If a native Error does not provide a message.
   * @throws {TypeError} If message is not a string.
   * @throws {TypeError} If a custom Error provides neither message nor code.
   * @example
   * ```js
   * const schema = new ErrorSchema({
   *   error: TypeError,
   *   message: 'Invalid request.'
   * });
   *
   * schema.error;
   * ```
   *
   * @example
   * ```js
   * const schema = new ErrorSchema({
   *   error: RequestError,
   *   code: 'INVALID_REQUEST',
   *   options: {
   *     values: { field: 'email' },
   *     details: { source: 'RequestValidator' }
   *   },
   *   custom: true
   * });
   *
   * schema.error;
   * ```
   */
  constructor(schema) {
    if (!isObject(schema)) {
      throw new TypeError('Schema options must be an object.');
    }

    if (!('error' in schema)) {
      throw new TypeError('ErrorSchema error constructor is required.');
    }

    if (!ErrorSchema.isErrorConstructor(schema.error)) {
      throw new TypeError('Expected an Error constructor');
    }

    const custom = schema.custom ?? false;

    if (!custom && !('message' in schema)) {
      throw new TypeError('Message is required for a native Error');
    }

    if (!custom && !('code' in schema)) {
      throw new TypeError('Code is required for Error Schema');
    }

    if ('message' in schema && typeof schema.message !== 'string') {
      throw new TypeError('Message must be a string');
    }

    if (custom && !('message' in schema) && !('code' in schema)) {
      throw new TypeError('Message or code is required for a Custom Error');
    }

    this.#error = schema.error;
    this.#custom = custom;

    this.#schema = Object.freeze({
      message: schema.message,
      type: schema.error.name,
      options: schema.options ?? {},
      code: schema.code,
    });
  }

  /**
   * Normalized error schema.
   *
   * @readonly
   * @type {object}
   */
  get schema() {
    return this.#schema;
  }

  /**
   * Creates a new Error instance from the configured schema.
   *
   * @readonly
   * @type {Error}
   */
  get error() {
    const { message, options, code } = this.#schema;

    if (this.#custom) {
      return new this.#error(message ?? code, options);
    }

    return new this.#error(message, options);
  }

  /**
   * Custom string tag for type identification.
   *
   * @readonly
   * @type {string}
   */
  get [Symbol.toStringTag]() {
    return `${this.constructor.name}`;
  }

  /**
   * Creates a plain object representation of the error schema.
   *
   * @returns {ErrorSchemaState} Normalized error schema.
   * @example
   * ```js
   * const schema = new ErrorSchema({
   *   error: TypeError,
   *   message: 'Invalid middleware.',
   *   code: 'INVALID_MIDDLEWARE',
   *   custom: false
   * });
   *
   * console.log(schema.toObject());
   * // {
   * //   message: 'Invalid middleware.',
   * //   type: 'TypeError',
   * //   options: {},
   * //   code: 'INVALID_MIDDLEWARE'
   * // }
   * ```
   */
  toObject() {
    return { ...this.#schema };
  }

  /**
   * Creates a JSON-compatible representation of the error schema.
   *
   * @returns {ErrorSchemaState} Normalized error schema.
   * @example
   * ```js
   * const schema = new ErrorSchema({
   *   error: RequestError,
   *   code: 'INVALID_REQUEST',
   *   options: {
   *     values: { field: 'email' },
   *     details: { source: 'RequestValidator' }
   *   },
   *   custom: true
   * });
   *
   * console.log(JSON.stringify(schema));
   * // {"message":undefined,"type":"RequestError",
   * // "options":{"values":{"field":"email"},
   * // "details":{"source":"RequestValidator"}},
   * // "code":"INVALID_REQUEST"}
   * ```
   */
  toJSON() {
    const schema = this.toObject();
    const options = schema.options;

    const base = {
      message: schema.message,
      type: schema.type,
      code: schema.code,
    };

    if ('cause' in options && options.cause instanceof Error) {
      const { cause, ...rest } = options;

      return {
        ...base,
        options: {
          ...rest,
          cause: {
            name: cause.name,
            message: cause.message,
            stack: cause.stack,
          },
        },
      };
    }

    return {
      ...base,
      options,
    };
  }

  /**
   * Custom inspect implementation for Node.js `util.inspect()`.
   *
   * @returns {string} Custom string representation for debugging.
   * @example
   * ```js
   * const schema = new ErrorSchema({
   *   error: TypeError,
   *   message: 'Invalid middleware.',
   *   code: 'INVALID_MIDDLEWARE',
   *   custom: false
   * });
   *
   * console.log(inspect(schema));
   * // ErrorSchema({
   * //   message: 'Invalid middleware.',
   * //   type: 'TypeError',
   * //   options: {},
   * //   code: 'INVALID_MIDDLEWARE'
   * // })
   * ```
   */
  [inspect.custom]() {
    return `${this.constructor.name}(${inspect(this.toObject(), { colors: true, depth: 2 })})`;
  }

  /**
   * Determines whether a value is an Error constructor.
   *
   * @param {unknown} error - Value to check.
   * @returns {boolean} Whether `error` is a constructor that inherits from `Error`.
   * @example
   * ```js
   * ErrorSchema.isErrorConstructor(TypeError); // true
   * ErrorSchema.isErrorConstructor(RangeError); // true
   * ErrorSchema.isErrorConstructor(Math); // false
   * ```
   */
  static isErrorConstructor(error) {
    if (error === Error) return true;
    if (typeof error !== 'function') return false;
    return Object.prototype.isPrototypeOf.call(Error.prototype, error.prototype);
  }
}
// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ErrorSchema;
