// @ts-check
/**
 * @file Owns the IPC subsystem and its application-facing API.
 *
 * @description IPCMain owns IPC handlers, event listeners, active WebSocket
 * connections, lifecycle state, and the default IPC endpoint.
 *
 * It resolves the transport's WebSocket capability through WebSocketAdapter
 * and creates one IPCServerChannel for each accepted connection.
 *
 * IPCMain does not expose transport details, WebSocket framing, or IPC wire
 * serialization to its consumers.
 *
 * @module IPCMain
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES

// » IMPORT THIRD PARTY MODULES

// » IMPORT LOCAL MODULES
import WebSocketAdapter from './WebSocketAdapter.mjs';
import IPCServerChannel from './IPCServerChannel.mjs';
import IPCError from '#shared/errors/IPCError';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a permitted transport identity.
 *
 * @typedef {import('#adapters/TransportAdapter').TransportIdentity} TransportIdentity
 */

/**
 * Represents a transport adapter capable of managing a permitted transport.
 *
 * @typedef {import('#adapters/TransportAdapter').default<TransportIdentity>} TransportAdapter
 */

/**
 * Represents a decoded IPC request.
 *
 * @typedef {import('./IPCProtocol.mjs').IPCRequest} IPCRequest
 */

/**
 * Represents a decoded IPC invocation request.
 *
 * @typedef {import('./IPCProtocol.mjs').IPCInvokeRequest} IPCInvokeRequest
 */

/**
 * Represents an established WebSocket connection contract.
 *
 * @typedef {import('#adapters/TransportAdapter').WebSocketConnection} WebSocketConnection
 */

/**
 * Listener for incoming WebSocket messages.
 *
 * @callback WebSocketMessageListener
 * @param {string|Buffer} data - Incoming text or binary message.
 * @returns {void}
 */

/**
 * Listener for WebSocket close events.
 *
 * @callback WebSocketCloseListener
 * @returns {void}
 */

/**
 * Listener for WebSocket error events.
 *
 * @callback WebSocketErrorListener
 * @param {Error} error - Error reported by the WebSocket connection.
 * @returns {void}
 */

/**
 * Registers a WebSocket event listener.
 *
 * @typedef {(
 * ((event: 'message', listener: WebSocketMessageListener) => void) &
 * ((event: 'close', listener: WebSocketCloseListener) => void) &
 * ((event: 'error', listener: WebSocketErrorListener) => void)
 * )} WebSocketOn
 */

/**
 * Handles an IPC invoke request.
 *
 * @callback IPCHandler
 * @param {unknown} data
 * @returns {unknown|Promise<unknown>}
 */

/**
 * Handles an IPC event.
 *
 * @callback IPCEventListener
 * @param {unknown} data
 * @returns {void}
 */

/**
 * Configuration for IPCMain.
 *
 * @typedef  {object} IPCMainOptions
 * @property {string} [path='/ipc']  - WebSocket endpoint owned by the IPC subsystem.
 */

/**
 * Represents a response payload supplied by the IPC host.
 *
 * @typedef {import('./IPCServerChannel.mjs').IPCResponsePayload} IPCResponsePayload
 */

/**
 * Internal response capability provided to IPCServerChannel.
 *
 * Errors remain raw until IPCServerChannel passes them to IPCProtocol for wire
 * normalization.
 *
 * @callback IPCRespond
 * @param {IPCResponsePayload} payload
 * @returns {void}
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Owns the IPC subsystem and its application-facing API.
 *
 * @classdesc IPCMain owns IPC handlers, event listeners, active WebSocket
 * connections, lifecycle state, and the default IPC endpoint.
 */
class IPCMain {
  /**
   * Registered invoke handlers indexed by channel name.
   *
   * @type {Map<string, IPCHandler>}
   */
  #handlers = new Map();

  /**
   * Registered event listeners indexed by channel name.
   *
   * @type {Map<string, Set<IPCEventListener>>}
   */
  #listeners = new Map();

  /**
   * WebSocket connections currently managed by the IPC subsystem.
   *
   * @type {Set<WebSocketConnection>}
   */
  #connections = new Set();

  /**
   * WebSocket adapter used by the IPC subsystem.
   *
   * @type {WebSocketAdapter}
   */
  #webSocket;

  /**
   * WebSocket endpoint path owned by the IPC subsystem.
   *
   * @type {string}
   */
  #path;

  /**
   * Whether the IPC subsystem has been closed.
   *
   * @type {boolean}
   */
  #closed = false;

  /**
   * Creates the IPC subsystem for a transport.
   *
   * @param {TransportAdapter} transport - Transport used to provide WebSocket connections for the IPC subsystem.
   * @param {IPCMainOptions} [options] - IPC subsystem configuration.
   * @example
   * ```js
   * const ipcMain = new IPCMain(transport);
   * ```
   */
  constructor(transport, options = {}) {
    this.#path =
      typeof options.path === 'string' && options.path.length > 0 ? options.path : '/ipc';

    this.#webSocket = new WebSocketAdapter(transport, {
      accept: url => this.#matchesPath(url),
    });

    this.#webSocket.onConnection(connection => {
      this.#onConnection(connection);
    });
  }

  /**
   * Registers or replaces an invoke handler for a channel.
   *
   * @param {string} channel - Name of the IPC channel.
   * @param {IPCHandler} handler - Function invoked when a request targets the channel.
   * @returns {this} This IPCMain instance.
   * @throws {IPCError} If IPCMain has been closed.
   * @throws {IPCError} If channel or handler is invalid.
   * @example
   * ```js
   * ipcMain.handle('get-user', async (id) => {
   *   return getUser(id);
   * });
   * ```
   */
  handle(channel, handler) {
    this.#assertOpen();
    this.#assertChannel(channel);
    this.#assertFunction(handler, 'handler');

    this.#handlers.set(channel, handler);

    return this;
  }

  /**
   * Removes the invoke handler registered for a channel.
   *
   * @param {string} channel - Name of the IPC channel whose handler is removed.
   * @returns {this} This IPCMain instance.
   * @throws {IPCError} If IPCMain has been closed.
   * @throws {IPCError} If channel is not a non-empty string.
   * @example
   * ```js
   * ipcMain.removeHandler('get-user');
   * ```
   */
  removeHandler(channel) {
    this.#assertOpen();
    this.#assertChannel(channel);
    this.#handlers.delete(channel);

    return this;
  }

  /**
   * Registers an event listener for a channel.
   *
   * Multiple listeners may be registered for the same channel.
   *
   * @param {string} channel - Name of the IPC event channel.
   * @param {IPCEventListener} listener - Function invoked when an event is emitted for the channel.
   * @returns {this} This IPCMain instance.
   * @throws {IPCError} If IPCMain has been closed.
   * @throws {IPCError} If channel or listener is invalid.
   * @example
   * ```js
   * ipcMain.on('notification', (data) => {
   *   console.log(data);
   * });
   * ```
   */
  on(channel, listener) {
    this.#assertOpen();
    this.#assertChannel(channel);
    this.#assertFunction(listener, 'listener');

    this.#ensureListenerSet(channel).add(listener);

    return this;
  }

  /**
   * Removes an event listener from a channel.
   *
   * @param {string} channel - Name of the IPC event channel.
   * @param {IPCEventListener} listener - Listener previously registered for the channel.
   * @returns {this} This IPCMain instance.
   * @throws {IPCError} If IPCMain has been closed.
   * @throws {IPCError} If channel or listener is invalid.
   * @example
   * ```js
   * ipcMain.off('notification', listener);
   * ```
   */
  off(channel, listener) {
    this.#assertOpen();
    this.#assertChannel(channel);
    this.#assertFunction(listener, 'listener');

    const set = this.#listeners.get(channel);

    if (set) {
      set.delete(listener);

      if (set.size === 0) {
        this.#listeners.delete(channel);
      }
    }

    return this;
  }

  /**
   * Closes the IPC subsystem and all active connections.
   *
   * This is an internal lifecycle operation invoked by Kernel and is not part
   * of the public Server IPC API.
   *
   * @example
   * ```js
   * ipcMain.close();
   * ```
   */
  close() {
    if (!this.#closed) {
      this.#closed = true;
      this.#handlers.clear();
      this.#listeners.clear();

      for (const connection of this.#connections) {
        try {
          connection.close();
        } catch {
          // Ignore transport close failures.
        }
      }

      this.#connections.clear();
      this.#webSocket.close();
    }
  }

  /**
   * Returns the listener set for a channel, creating it when absent.
   *
   * @param {string} channel - Channel name whose listener set is resolved.
   * @returns {Set<IPCEventListener>} The listener set associated with the channel.
   */
  #ensureListenerSet(channel) {
    const existing = this.#listeners.get(channel);

    if (existing) {
      return existing;
    }

    const set = new Set();
    this.#listeners.set(channel, set);

    return set;
  }

  /**
   * Registers one established WebSocket connection with the IPC subsystem.
   *
   * @param {WebSocketConnection} connection - Established WebSocket connection assigned to the IPC subsystem.
   */
  #onConnection(connection) {
    if (this.#closed) {
      try {
        connection.close();
      } catch {
        // Ignore transport close failures.
      }
    } else {
      this.#connections.add(connection);

      connection.on('close', () => {
        this.#connections.delete(connection);
      });

      connection.on('error', () => {
        this.#connections.delete(connection);
      });

      new IPCServerChannel(connection, {
        dispatch: (request, respond) => this.#dispatch(request, respond),
      });
    }
  }

  /**
   * Dispatches one decoded IPC request to the appropriate application
   * operation.
   *
   * @param {IPCRequest} request - Decoded IPC request to dispatch.
   * @param {IPCRespond} respond - Function used to send the operation result.
   */
  async #dispatch(request, respond) {
    if (!this.#closed) {
      if (request.type === 'event') {
        this.#emit(request.channel, request.data);
      } else {
        await this.#invoke(request, respond);
      }
    }
  }

  /**
   * Emits an IPC event to every listener registered for its channel.
   *
   * Listener failures are isolated so one listener cannot prevent the
   * remaining listeners from receiving the event.
   *
   * @param {string} channel - Name of the IPC event channel.
   * @param {unknown} data - Event data delivered to registered listeners.
   */
  #emit(channel, data) {
    const set = this.#listeners.get(channel);

    if (set) {
      for (const listener of set) {
        try {
          listener(data);
        } catch {
          // Listener failures are intentionally isolated.
        }
      }
    }
  }

  /**
   * Executes the handler associated with an IPC invoke request.
   *
   * Invokes are intentionally processed concurrently. IPCMain does not
   * serialize requests through a queue or mutex.
   *
   * @param {IPCInvokeRequest} request - Decoded IPC invoke request.
   * @param {IPCRespond} respond - Function used to send the handler result or error back to the requesting connection.
   */
  async #invoke(request, respond) {
    const handler = this.#handlers.get(request.channel);

    if (handler) {
      try {
        const result = await handler(request.data);
        respond({ result });
      } catch (error) {
        // IPCProtocol owns normalization of raw handler errors.
        respond({ error });
      }
    } else {
      respond({
        error: {
          code: 'IPC_CHANNEL_NOT_FOUND',
          message: `No handler registered for channel "${request.channel}"`,
        },
      });
    }
  }

  /**
   * Determines whether a WebSocket upgrade targets the IPC endpoint.
   *
   * @param {string} url - URL presented by the WebSocket upgrade request.
   * @returns {boolean} Whether the URL targets the configured IPC endpoint.
   */
  #matchesPath(url) {
    try {
      return new URL(url, 'http://localhost').pathname === this.#path;
    } catch {
      return url === this.#path || url.startsWith(`${this.#path}?`);
    }
  }

  /**
   * Validates an IPC channel name.
   *
   * @param {string} channel - Channel name to validate.
   * @throws {IPCError} If channel is not a non-empty string.
   */
  #assertChannel(channel) {
    if (typeof channel !== 'string' || channel.length === 0) {
      throw new IPCError('IPC_INVALID_CHANNEL');
    }
  }

  /**
   * Validates a callable IPC API argument.
   *
   * @param {unknown} value - Value to validate as a function.
   * @param {'handler'|'listener'} name - Argument name used in the validation error.
   * @throws {IPCError} If value is not a function.
   */
  #assertFunction(value, name) {
    if (typeof value !== 'function') {
      throw new IPCError(name === 'handler' ? 'IPC_INVALID_HANDLER' : 'IPC_INVALID_LISTENER');
    }
  }

  /**
   * Ensures IPCMain is still available for lifecycle-sensitive operations.
   *
   * @throws {IPCError} If IPCMain has already been closed.
   */
  #assertOpen() {
    if (this.#closed) {
      throw new IPCError('IPC_CLOSED');
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default IPCMain;
