/**
 * @file Defines the internal error type used for `Server`
 * lifecycle failures.
 *
 * @description This class supports predefined error identifiers as well
 * as custom error messages. When a known error identifier is provided,
 * it is automatically resolved to its corresponding message.
 *
 * @private
 * @module ServerError
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
 * 'SERVER_LISTEN_FAILED' |
 * 'SERVER_CLOSE_FAILED' |
 * 'SERVER_ADAPTER_INIT_FAILED' |
 * 'SERVER_ALREADY_STARTING' |
 * 'SERVER_ALREADY_LISTENING' |
 * 'SERVER_ALREADY_STOPPING' |
 * 'SERVER_ALREADY_CLOSED' |
 * 'SERVER_NOT_LISTENING' |
 * 'SERVER_STOPPING' |
 * 'SERVER_CLOSED' |
 * 'SERVER_ERROR' |
 * 'SERVER_INVALID_STATE_TRANSITION' |
 * 'SERVER_EXCHANGE_INIT_FAILED'
 * >} ServerErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  ServerErrorOptions
 * @property {Record<string, unknown>} [values]           - Values for template placeholders in the error message.
 * @property {unknown}                 [details]          - Additional contextual information about the error.
 * @property {Error}                   [cause]            - The original error that caused this error (for error chaining).
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error thrown when a `HttpServer` operation cannot be completed.
 *
 * This error type covers failures related to `HttpServer` lifecycle
 * and `HttpServer` state transitions.
 *
 * @augments BaseError
 * @private
 */
class ServerError extends BaseError {
  /**
   * Creates a new {@link ServerError}.
   * @param {ServerErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {ServerErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   * if (server.listening) {
   *   throw new ServerError('SERVER_ALREADY_LISTENING');
   * }
   *
   * await server.listen();
   * ```
   * @example
   * ```js
   * throw new ServerError('SERVER_INVALID_STATE_TRANSITION', {
   *   values: {
   *     from: 'closed',
   *     to: 'listening',
   *   },
   * });
   * ```
   *
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Collection of predefined server error messages.
   *
   * Available error identifiers.
   *
   * - `SERVER_LISTEN_FAILED`.
   * - `SERVER_CLOSE_FAILED`.
   * - `SERVER_ALREADY_LISTENING`.
   * - `SERVER_ALREADY_CLOSED`.
   * - `SERVER_INVALID_STATE_TRANSITION`.
   *
   * @private
   * @static
   * @type {Map<ServerErrorIdentifier, string>}
   */
  static MESSAGES = new Map([
    // Lifecycle
    ['SERVER_LISTEN_FAILED', 'Failed to start the server.'],
    ['SERVER_CLOSE_FAILED', 'Failed to close the server.'],
    ['SERVER_ADAPTER_INIT_FAILED', 'Failed to initialize the transport adapter.'],

    // State guards
    ['SERVER_ALREADY_STARTING', 'The server is already starting.'],
    ['SERVER_ALREADY_LISTENING', 'The server is already listening.'],
    ['SERVER_ALREADY_STOPPING', 'The server is already stopping.'],
    ['SERVER_ALREADY_CLOSED', 'The server is already closed.'],
    ['SERVER_NOT_LISTENING', 'The server is not listening.'],
    ['SERVER_STOPPING', 'The server is stopping.'],
    ['SERVER_CLOSED', 'The server is closed.'],
    ['SERVER_ERROR', 'The server is in an error state.'],

    // Transitions
    ['SERVER_INVALID_STATE_TRANSITION', 'Cannot transition from "{from}" to "{to}".'],

    // Exchange
    ['SERVER_EXCHANGE_INIT_FAILED', 'Failed to create the exchange for the incoming request.'],
  ]);
}
// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ServerError;
