// @ts-check
/**
 * @file Orchestrates IPC message processing for one client WebSocket connection.
 *
 * @module IPCClientChannel
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import IPCProtocol from './IPCProtocol.mjs';
import IPCError from '#shared/errors/IPCError';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the WebSocket transport used by the IPC client channel.
 *
 * @typedef {import('./WebSocketClient.mjs').default} WebSocketClient
 */

/**
 * Represents an IPC response transmitted through the wire protocol.
 *
 * @typedef {import('./IPCProtocol.mjs').IPCResponse} IPCResponse
 */

/**
 * Represents an IPC invocation request.
 *
 * @typedef {import('./IPCProtocol.mjs').IPCInvokeRequest} IPCInvokeRequest
 */

/**
 * Represents an IPC event request.
 *
 * @typedef {import('./IPCProtocol.mjs').IPCEventRequest} IPCEventRequest
 */

/**
 * Handles invocation requests received from the remote endpoint.
 *
 * @callback IPCClientInvokeHandler
 * @param {unknown} data - Application-defined invocation payload.
 * @returns {unknown|Promise<unknown>} The invocation result.
 */

/**
 * Handles events received from the remote endpoint.
 *
 * @callback IPCClientEventListener
 * @param {unknown} data - Application-defined event payload.
 * @returns {void}
 */

/**
 * Represents a pending invocation awaiting its response.
 *
 * @typedef  {object}                   PendingInvocation
 * @property {(value: unknown) => void} resolve           - Resolves the invocation.
 * @property {(error: Error) => void}   reject            - Rejects the invocation.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Orchestrates IPC messages for one WebSocket connection.
 *
 * @classdesc Owns connection-local handlers, event listeners, pending invocations,
 * and message dispatch. IPCProtocol owns wire-format encoding and decoding.
 */
class IPCClientChannel {
  /**
   * WebSocket transport used for IPC.
   *
   * @type {WebSocketClient}
   */
  #connection;

  /**
   * Wire-format encoder and decoder.
   *
   * @type {IPCProtocol}
   */
  #protocol = new IPCProtocol();

  /**
   * Registered invocation handlers keyed by channel name.
   *
   * @type {Map<string, IPCClientInvokeHandler>}
   */
  #handlers = new Map();

  /**
   * Registered event listeners keyed by channel name.
   *
   * @type {Map<string, Set<IPCClientEventListener>>}
   */
  #listeners = new Map();

  /**
   * In-flight invocations awaiting a response.
   *
   * @type {Map<string, PendingInvocation>}
   */
  #pending = new Map();

  /**
   * Counter used to generate invocation identifiers.
   *
   * @type {number}
   */
  #nextId = 0;

  /**
   * Whether the channel has been closed.
   *
   * @type {boolean}
   */
  #closed = false;

  /**
   * Creates an IPC channel bound to a WebSocket connection.
   *
   * @param {WebSocketClient} connection - WebSocket connection used for IPC.
   *
   * @example
   * ```js
   * const channel = new IPCClientChannel(connection);
   * ```
   */
  constructor(connection) {
    this.#connection = connection;

    connection.on('message', raw => {
      void this.#onMessage(raw);
    });

    connection.on('close', () => {
      this.#forceClose(new IPCError('IPC_CLOSED'));
    });

    connection.on('error', () => {
      this.#forceClose(new IPCError('IPC_CONNECTION_ERROR'));
    });
  }

  /**
   * Registers a handler for invocation requests received from the remote endpoint.
   *
   * @param {string} channel - Invocation channel name.
   * @param {IPCClientInvokeHandler} handler - Function that handles invocation requests.
   * @returns {this} The current channel instance for chaining.
   * @throws {IPCError} If the channel is closed, the name is invalid, or the handler is not callable.
   *
   * @example
   * ```js
   * channel.handle('users:get', async ({ id }) => getUser(id));
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
   * Removes the invocation handler registered for a channel.
   *
   * @param {string} channel - Invocation channel name.
   * @returns {this} The current channel instance for chaining.
   * @throws {IPCError} If the channel is closed or the name is invalid.
   *
   * @example
   * ```js
   * channel.removeHandler('users:get');
   * ```
   */
  removeHandler(channel) {
    this.#assertOpen();
    this.#assertChannel(channel);
    this.#handlers.delete(channel);

    return this;
  }

  /**
   * Registers a listener for events received from the remote endpoint.
   *
   * @param {string} channel - Event channel name.
   * @param {IPCClientEventListener} listener - Function invoked for incoming events.
   * @returns {this} The current channel instance for chaining.
   * @throws {IPCError} If the channel is closed, the name is invalid, or the listener is not callable.
   *
   * @example
   * ```js
   * channel.on('users:updated', user => console.log(user));
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
   * Removes a previously registered event listener.
   *
   * @param {string} channel - Event channel name.
   * @param {IPCClientEventListener} listener - Previously registered listener.
   * @returns {this} The current channel instance for chaining.
   * @throws {IPCError} If the channel is closed, the name is invalid, or the listener is not callable.
   *
   * @example
   * ```js
   * channel.off('users:updated', onUserUpdated);
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
   * Invokes a handler registered on the remote endpoint.
   *
   * @param {string} channel - Remote invocation channel name.
   * @param {unknown} [data] - Optional payload passed to the remote handler.
   * @returns {Promise<unknown>} A promise for the remote handler's result.
   * @throws {IPCError} If the channel is closed or the name is invalid.
   *
   * @example
   * ```js
   * const user = await channel.invoke('users:get', { id: '42' });
   * ```
   */
  invoke(channel, data) {
    this.#assertOpen();
    this.#assertChannel(channel);

    const id = String((this.#nextId += 1));
    const encoded = this.#protocol.encodeInvoke(channel, id, data);

    this.#assertOpen();

    const promise = new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
    });

    this.#sendFrame(encoded);

    return promise;
  }

  /**
   * Sends a one-way event to the remote endpoint.
   *
   * @param {string} channel - Remote event channel name.
   * @param {unknown} [data] - Optional event payload.
   * @returns {void}
   * @throws {IPCError} If the channel is closed or the name is invalid.
   *
   * @example
   * ```js
   * channel.send('notifications:subscribe', { userId: '42' });
   * ```
   */
  send(channel, data) {
    this.#assertOpen();
    this.#assertChannel(channel);
    this.#sendFrame(this.#protocol.encodeEvent(channel, data));
  }

  /**
   * Closes the channel and rejects pending invocations.
   *
   * Safe to call when the channel is already closed.
   *
   * @returns {void}
   *
   * @example
   * ```js
   * channel.close();
   * ```
   */
  close() {
    this.#forceClose(new IPCError('IPC_CLOSED'));
  }

  // ── PRIVATE METHODS ────────────────────────────────────────────────────────

  /**
   * Processes an incoming WebSocket message.
   *
   * Invalid messages are ignored. Message decoding and validation are delegated
   * to IPCProtocol.
   *
   * @param {string|ArrayBuffer} raw - Incoming message payload.
   * @returns {Promise<void>}
   */
  async #onMessage(raw) {
    if (!this.#closed) {
      const text = typeof raw === 'string' ? raw : await new Response(raw).text();

      try {
        const message = this.#protocol.decodeMessage(text);

        if (message.type === 'response') {
          this.#handleResponse(message);
        } else if (message.type === 'invoke') {
          await this.#handleInvoke(message);
        } else {
          this.#handleEvent(message);
        }
      } catch {
        // Ignore malformed messages and isolate message-processing failures.
      }
    }
  }

  /**
   * Resolves or rejects the invocation associated with a response.
   *
   * @param {IPCResponse} message - Decoded response message.
   * @returns {void}
   */
  #handleResponse(message) {
    const pending = this.#pending.get(message.id);

    if (pending) {
      this.#pending.delete(message.id);

      if ('error' in message) {
        const error = new IPCError(message.error.code);
        error.message = message.error.message;
        pending.reject(error);
      } else {
        pending.resolve(message.result);
      }
    }
  }

  /**
   * Handles an invocation request received from the remote endpoint.
   *
   * @param {IPCInvokeRequest} message - Decoded invocation request.
   * @returns {Promise<void>}
   */
  async #handleInvoke(message) {
    const handler = this.#handlers.get(message.channel);

    if (handler) {
      try {
        const result = await handler(message.data);
        this.#sendFrame(this.#protocol.success(message.id, result));
      } catch (error) {
        this.#sendFrame(this.#protocol.error(message.id, error));
      }
    } else {
      this.#sendFrame(
        this.#protocol.error(message.id, {
          code: 'IPC_CHANNEL_NOT_FOUND',
          message: `No handler registered for channel "${message.channel}"`,
        }),
      );
    }
  }

  /**
   * Dispatches an event to listeners registered for its channel.
   *
   * @param {IPCEventRequest} message - Decoded event request.
   * @returns {void}
   */
  #handleEvent(message) {
    const set = this.#listeners.get(message.channel);

    if (set) {
      for (const listener of set) {
        try {
          listener(message.data);
        } catch {
          // Listener failures are isolated.
        }
      }
    }
  }

  /**
   * Sends an encoded message through the WebSocket connection.
   *
   * @param {string} encoded - Encoded IPC message.
   * @returns {void}
   */
  #sendFrame(encoded) {
    if (!this.#closed) {
      try {
        this.#connection.send(encoded);
      } catch {
        this.#forceClose(new IPCError('IPC_CONNECTION_ERROR'));
      }
    }
  }

  /**
   * Closes the channel and clears connection-local state.
   *
   * @param {Error} error - Error used to reject pending invocations.
   * @returns {void}
   */
  #forceClose(error) {
    if (!this.#closed) {
      this.#closed = true;

      const pending = [...this.#pending.values()];

      this.#pending.clear();
      this.#handlers.clear();
      this.#listeners.clear();

      for (const invocation of pending) {
        invocation.reject(error);
      }

      try {
        this.#connection.close();
      } catch {
        // Ignore transport close failures.
      }
    }
  }

  /**
   * Returns the listener set for a channel, creating it when absent.
   *
   * @param {string} channel - Event channel name.
   * @returns {Set<IPCClientEventListener>} The listener set.
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
   * Ensures the channel is open.
   *
   * @returns {void}
   * @throws {IPCError} If the channel is closed.
   */
  #assertOpen() {
    if (this.#closed) {
      throw new IPCError('IPC_CLOSED');
    }
  }

  /**
   * Validates a channel name.
   *
   * @param {string} channel - Channel name to validate.
   * @returns {void}
   * @throws {IPCError} If the channel name is invalid.
   */
  #assertChannel(channel) {
    if (typeof channel !== 'string' || channel.trim().length === 0) {
      throw new IPCError('IPC_INVALID_CHANNEL');
    }
  }

  /**
   * Validates a callable argument.
   *
   * @param {unknown} value - Value to validate.
   * @param {'handler'|'listener'} name - Argument name used in the error.
   * @returns {void}
   * @throws {IPCError} If the value is not callable.
   */
  #assertFunction(value, name) {
    if (typeof value !== 'function') {
      throw new IPCError(name === 'handler' ? 'IPC_INVALID_HANDLER' : 'IPC_INVALID_LISTENER');
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default IPCClientChannel;
