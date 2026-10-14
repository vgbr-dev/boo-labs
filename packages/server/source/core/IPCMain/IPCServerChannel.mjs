// @ts-check
/**
 * @file Orchestrates IPC request processing for one WebSocket connection.
 *
 * @description
 * IPCServerChannel binds one established WebSocket connection to the IPCMain
 * dispatch capability. It owns request decoding, response serialization,
 * connection-local state, and transport writes.
 *
 * IPCServerChannel does not own IPC handlers, event listeners, or application
 * dispatch rules. Those responsibilities remain with IPCMain.
 *
 * @module IPCServerChannel
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import IPCProtocol from './IPCProtocol.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an established WebSocket connection contract.
 *
 * @typedef {import('#adapters/TransportAdapter').WebSocketConnection} WebSocketConnection
 */

/**
 * Represents a decoded IPC request.
 *
 * @typedef {import('./IPCProtocol.mjs').IPCRequest} IPCRequest
 */

/**
 * Represents the normalized IPC wire error.
 *
 * @typedef {import('./IPCProtocol.mjs').IPCError} IPCError
 */

/**
 * Represents a successful response payload supplied by the IPC host.
 *
 * @typedef  {object}  IPCSuccessPayload
 * @property {unknown} result            - Handler result returned to the IPC caller.
 */

/**
 * Represents an error response payload supplied by the IPC host.
 *
 * @typedef  {object}  IPCErrorPayload
 * @property {unknown} error           - Error value produced while handling the request.
 */

/**
 * Represents a response payload supplied by the IPC host.
 *
 * @typedef {IPCSuccessPayload|IPCErrorPayload} IPCResponsePayload
 */

/**
 * Dispatches a decoded IPC request and provides a callback for its response.
 *
 * @typedef {(request: IPCRequest, respond: (payload: IPCResponsePayload) => void) => Promise<void>} DispatchFunction
 */

/**
 * Represents the internal capability supplied by IPCMain to dispatch IPC requests.
 *
 * @typedef  {object}           IPCChannelHost
 * @property {DispatchFunction} dispatch       - Dispatches an IPC request and reports its response through the supplied callback.
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Determines whether a value is a non-null plain object.
 *
 * @private
 * @param {unknown} value - Value to inspect.
 * @returns {value is Record<string, unknown>} `true` if the value is a plain object.
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Orchestrates IPC request processing for one WebSocket connection.
 *
 * @classdesc IPCServerChannel binds one established WebSocket connection to the
 * IPCMain dispatch capability. It owns request decoding, response
 * serialization, connection-local state, and transport writes.
 *
 * IPCServerChannel does not own IPC handlers, event listeners, or application
 * dispatch rules. Those responsibilities remain with IPCMain.
 */
class IPCServerChannel {
  /**
   * Established WebSocket connection owned by this IPC channel.
   *
   * @type {WebSocketConnection}
   */
  #connection;

  /**
   * Internal IPC host used to dispatch requests.
   *
   * @type {IPCChannelHost}
   */
  #host;

  /**
   * IPC wire protocol used to decode requests and serialize responses.
   *
   * @type {IPCProtocol}
   */
  #protocol = new IPCProtocol();

  /**
   * Indicates whether this IPC channel is closed.
   *
   * @type {boolean}
   */
  #closed = false;

  /**
   * Creates an IPC channel bound to a WebSocket connection and an IPC host.
   *
   * Registers message, close, and error handlers on the connection. The
   * channel is considered closed once the connection emits either `close`
   * or `error`.
   *
   * @param {WebSocketConnection} connection - Established WebSocket connection.
   * @param {IPCChannelHost} host - IPC host providing the dispatch capability.
   * @example
   * ```js
   * const channel = new IPCServerChannel(connection, {
   *   dispatch: async (request, respond) => {
   *     respond({ result: { ok: true } });
   *   },
   * });
   * ```
   */
  constructor(connection, host) {
    this.#connection = connection;
    this.#host = host;

    connection.on('message', raw => {
      void this.#onMessage(raw);
    });

    connection.on('close', () => {
      this.#closed = true;
    });

    connection.on('error', () => {
      this.#closed = true;
    });
  }

  /**
   * Decodes and dispatches one incoming WebSocket message.
   *
   * @param {string|Buffer} raw - Raw WebSocket message received from the connection.
   * @returns {Promise<void>} Resolves once the message has been dispatched.
   */
  async #onMessage(raw) {
    if (!this.#closed) {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8');
      const request = this.#decodeOrHandleFailure(text);

      if (request !== null) {
        await this.#dispatchRequest(request);
      }
    }
  }

  /**
   * Decodes an IPC request and handles decoding failures.
   *
   * @param {string} text - Raw IPC payload to decode.
   * @returns {IPCRequest|null} Decoded IPC request, or null when decoding fails.
   */
  #decodeOrHandleFailure(text) {
    try {
      return this.#protocol.decode(text);
    } catch (error) {
      this.#handleDecodeFailure(text, error);
      return null;
    }
  }

  /**
   * Dispatches a decoded IPC request to the IPC host.
   *
   * @param {IPCRequest} request - Decoded IPC request to dispatch.
   * @returns {Promise<void>} Resolves once the request has been dispatched.
   */
  async #dispatchRequest(request) {
    if (request.type === 'event') {
      try {
        await this.#host.dispatch(request, () => {});
      } catch {
        // Event dispatch errors are intentionally isolated from the connection.
      }
    } else {
      const id = request.id;
      let responded = false;

      /**
       * Responds to the current invocation once.
       *
       * Subsequent invocations are ignored to preserve the one-response
       * contract of IPC invocations.
       *
       * @param {IPCResponsePayload} payload - Response payload supplied by the IPC host.
       */
      const respond = payload => {
        if (!responded) {
          responded = true;
          this.#sendResponse(id, payload);
        }
      };

      try {
        await this.#host.dispatch(request, respond);
      } catch (error) {
        respond({ error });
      }
    }
  }

  /**
   * Handles a message that could not be decoded as a valid IPC request.
   *
   * A second lightweight parse is intentionally used to recover an invocation
   * identifier when possible, allowing the peer to correlate the protocol
   * error with its original request.
   *
   * @param {string} text - Raw IPC payload that failed to decode.
   * @param {unknown} error - Error raised while decoding the payload.
   */
  #handleDecodeFailure(text, error) {
    const id = this.#peekInvokeId(text);

    if (id !== null) {
      const reason = error instanceof Error ? error.message : 'Invalid IPC message';

      this.#sendRaw(this.#protocol.badMessage(id, reason));
    }
  }

  /**
   * Attempts to recover an invocation identifier without validating the full
   * IPC request a second time.
   *
   * @param {string} text - Raw IPC payload to inspect.
   * @returns {string|null} Recovered invocation identifier, or null when absent.
   */
  #peekInvokeId(text) {
    try {
      const value = JSON.parse(text);

      if (
        isPlainObject(value) &&
        value.type === 'invoke' &&
        typeof value.id === 'string' &&
        value.id.length > 0
      ) {
        return value.id;
      }
    } catch {
      // Ignore recovery failures.
    }

    return null;
  }

  /**
   * Encodes and sends an IPC response.
   *
   * Raw errors are deliberately forwarded to IPCProtocol, which owns their
   * normalization into the IPC wire representation.
   *
   * @param {string} id - Invocation identifier associated with the request.
   * @param {IPCResponsePayload} payload - Response payload supplied by the IPC host.
   */
  #sendResponse(id, payload) {
    if (!this.#closed) {
      const encoded =
        'error' in payload
          ? this.#protocol.error(id, payload.error)
          : this.#protocol.success(id, payload.result);

      this.#sendRaw(encoded);
    }
  }

  /**
   * Sends an already encoded IPC message through the WebSocket connection.
   *
   * @param {string} encoded - Encoded IPC message to send.
   */
  #sendRaw(encoded) {
    if (!this.#closed) {
      try {
        this.#connection.send(encoded);
      } catch {
        this.#forceClose();
      }
    }
  }

  /**
   * Marks the channel closed and attempts to close its transport connection.
   *
   * Invoked when the transport reports a failure that prevents further
   * writes. Errors thrown while closing the connection are ignored, since
   * the channel is already considered closed.
   */
  #forceClose() {
    this.#closed = true;

    try {
      this.#connection.close();
    } catch {
      // Ignore transport close failures.
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default IPCServerChannel;
