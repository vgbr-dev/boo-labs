/**
 * @file Defines the base class for structured application errors.
 *
 * @description BaseError serves as the foundation for application-specific errors.
 * It provides a consistent interface for error handling with support for:
 *
 * - Predefined error identifiers and custom error messages.
 * - Message templating with placeholders.
 * - Error chaining via the `cause` property.
 * - Contextual information via `details`.
 * - A consistent error structure across the application.
 *
 * Subclasses should define their own `MESSAGES` map with domain-specific
 * error identifiers and message templates.
 *
 * @private
 * @module BaseError
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * A symbolic identifier used to resolve an application error definition.
 *
 * @typedef {string} ErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  ErrorOptions
 * @property {Record<string, unknown>} [values]     - Values for template placeholders in the error message.
 * @property {unknown}                 [details]    - Additional contextual information about the error.
 * @property {Error}                   [cause]      - The original error that caused this error (for error chaining).
 */

/**
 * Normalized error definition used internally to construct an error instance.
 *
 * @typedef  {object}           ErrorDefinition
 * @property {string}           message         - The final error message.
 * @property {ErrorIdentifier}  [code]          - The resolved error identifier.
 * @property {unknown}          [details]       - Additional error details.
 * @property {{ cause: Error }} [errorOptions]  - Options for the Error constructor (e.g., cause).
 */

// ━━	MODULE	━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Base class for application-specific errors.
 *
 * This class supports predefined error identifiers as well as custom error
 * messages. When a known error identifier is provided, it is automatically
 * resolved to its corresponding message template.
 *
 * @augments Error
 * @private
 */
class BaseError extends Error {
  /**
   * Creates a new {@link BaseError}.
   *
   * @param {ErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {ErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   * class ValidationError extends BaseError {}
   * throw new ValidationError('INVALID_VALUE');
   * ```
   */
  constructor(identifier, options = {}) {
    const definition = new.target.resolveDefinition(identifier, options);

    super(definition.message, definition.errorOptions);

    this.name = new.target.name;

    if (definition.code !== undefined) {
      /**
       * Predefined error identifier, when available.
       *
       * @type {ErrorIdentifier}
       */
      this.code = definition.code;
    }

    if (definition.details !== undefined) {
      /**
       * Additional contextual information about the error.
       *
       * @type {unknown}
       */
      this.details = definition.details;
    }

    Error.captureStackTrace?.(this, new.target);
  }

  /**
   * Replaces placeholder tokens in a predefined message.
   *
   * Placeholders are in the format `{key}` and are replaced with the
   * corresponding value from the `values` object.
   *
   * @private
   * @static
   * @param {string} message - The message template containing placeholders.
   * @param {Record<string, unknown>} [values] - Key-value pairs for placeholder replacement.
   * @returns {string} The formatted message with placeholders replaced.
   */
  static #formatMessage(message, values = {}) {
    return message.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
  }

  /**
   * Resolves an error identifier into a normalized error definition.
   *
   * This method handles both predefined error identifiers and custom error messages.
   * When a predefined identifier is found, it resolves to the corresponding message
   * and applies any placeholders.
   *
   * @private
   * @static
   * @param {ErrorIdentifier} identifier - The error identifier or custom message.
   * @param {ErrorOptions} [options] - Additional error options.
   * @returns {ErrorDefinition} Normalized error definition.
   */
  static resolveDefinition(identifier, options) {
    const entry = this.MESSAGES.get(identifier);

    if (entry === undefined) {
      return {
        message: identifier,
      };
    }

    return {
      message: BaseError.#formatMessage(entry, options.values),
      code: identifier,
      details: options.details,
      errorOptions: options.cause !== undefined ? { cause: options.cause } : undefined,
    };
  }

  /**
   * Message template catalog indexed by error identifier.
   *
   * Subclasses should override this property with their own
   * identifier-to-message mappings.
   *
   * @type {Map<ErrorIdentifier, string>}
   * @private
   * @static
   */
  static MESSAGES = new Map();
}

// ━━	EXPORT MODULE	━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default BaseError;
