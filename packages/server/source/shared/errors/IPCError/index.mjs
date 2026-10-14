/**
 * @file Defines the internal error type used for IPC subsystem failures.
 *
 * @description This class supports predefined error identifiers as well
 * as custom error messages. When a known error identifier is provided,
 * it is automatically resolved to its corresponding message.
 *
 * @private
 * @module IPCError
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
 * @typedef {LiteralUnion<
 * 'IPC_INVALID_CHANNEL' |
 * 'IPC_INVALID_HANDLER' |
 * 'IPC_INVALID_LISTENER' |
 * 'IPC_CLOSED' |
 * 'IPC_CHANNEL_NOT_FOUND'
 * >} IPCErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  IPCErrorOptions
 * @property {Record<string, unknown>} [values]        - Values for template placeholders in the error message.
 * @property {unknown}                 [details]       - Additional contextual information about the error.
 * @property {Error}                   [cause]         - The original error that caused this error (for error chaining).
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error thrown when an IPC subsystem operation cannot be completed.
 *
 * This error type covers failures related to IPC handler registration,
 * listener management, and IPC lifecycle operations.
 *
 * @augments BaseError
 * @private
 */
class IPCError extends BaseError {
  /**
   * Creates a new {@link IPCError}.
   *
   * @param {IPCErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {IPCErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   * throw new IPCError('IPC_INVALID_CHANNEL');
   * ```
   * @example
   * ```js
   * throw new IPCError('IPC_CHANNEL_NOT_FOUND', {
   *   values: { channel: 'get-user' },
   * });
   * ```
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Collection of predefined IPC error messages.
   *
   * Available error identifiers:
   *
   * - `IPC_INVALID_CHANNEL`.
   * - `IPC_INVALID_HANDLER`.
   * - `IPC_INVALID_LISTENER`.
   * - `IPC_CLOSED`.
   * - `IPC_CHANNEL_NOT_FOUND`.
   *
   * @private
   * @static
   * @type {Map<IPCErrorIdentifier, string>}
   */
  static MESSAGES = new Map([
    ['IPC_INVALID_CHANNEL', 'Channel must be a non-empty string.'],
    ['IPC_INVALID_HANDLER', 'Handler must be a function.'],
    ['IPC_INVALID_LISTENER', 'Listener must be a function.'],
    ['IPC_CLOSED', 'IPCMain has been closed.'],
    ['IPC_CHANNEL_NOT_FOUND', 'No handler registered for channel "{channel}".'],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default IPCError;
