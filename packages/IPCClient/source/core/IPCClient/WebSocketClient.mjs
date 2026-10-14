// @ts-check
/**
 * @file Thin platform WebSocket wrapper.
 *
 * @description Wraps the platform WebSocket and exposes a stable event-listener
 * and connection contract. Delegates transport operations to the native WebSocket
 * implementation without owning IPC framing or message semantics.
 *
 * @module WebSocketClient
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Handles a message received from the remote endpoint.
 *
 * @callback WebSocketMessageListener
 * @param {string|ArrayBuffer} data - Message payload normalized to a string or ArrayBuffer.
 * @returns {void}
 */

/**
 * Handles a successfully established WebSocket connection.
 *
 * @callback WebSocketOpenListener
 * @returns {void}
 */

/**
 * Handles the closure of a WebSocket connection.
 *
 * @callback WebSocketCloseListener
 * @returns {void}
 */

/**
 * Handles a WebSocket transport error.
 *
 * @callback WebSocketErrorListener
 * @param {Event|Error} error - Error event or error object reported by the transport.
 * @returns {void}
 */

/**
 * Represents a listener registered for a WebSocket event.
 *
 * @typedef {(data?: any) => void} EventListener
 */

/**
 * Options used to initialize the WebSocket connection.
 *
 * @typedef  {object}          WebSocketClientOptions
 * @property {string|string[]} [protocols]            - One subprotocol or an ordered list of subprotocols offered during the WebSocket handshake.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * WebSocket ready state indicating the connection is being established.
 *
 * @type {number}
 */
const WS_CONNECTING = 0;

/**
 * WebSocket ready state indicating the connection is open.
 *
 * @type {number}
 */
const WS_OPEN = 1;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Thin wrapper around the platform WebSocket API.
 *
 * @classdesc Provides connection-state access, event-listener registration,
 * message transmission, and connection closure for the IPC client transport.
 * Normalizes incoming message payloads and isolates listener exceptions from
 * other listeners. Does not implement IPC protocol behavior.
 */
class WebSocketClient {
  /**
   * Native WebSocket connection.
   *
   * @type {WebSocket}
   */
  #socket;

  /**
   * Registered listeners for successful connection events.
   *
   * @type {Set<WebSocketOpenListener>}
   */
  #openListeners = new Set();

  /**
   * Registered listeners for incoming message events.
   *
   * @type {Set<WebSocketMessageListener>}
   */
  #messageListeners = new Set();

  /**
   * Registered listeners for connection closure events.
   *
   * @type {Set<WebSocketCloseListener>}
   */
  #closeListeners = new Set();

  /**
   * Registered listeners for transport error events.
   *
   * @type {Set<WebSocketErrorListener>}
   */
  #errorListeners = new Set();

  /**
   * Creates a WebSocket connection to the specified endpoint.
   *
   * The native connection begins establishing immediately. The `open` event
   * indicates successful establishment; construction itself does not wait for
   * the connection to complete.
   *
   * Incoming binary messages are configured to use `ArrayBuffer` where supported.
   *
   * @param {string} url - Absolute WebSocket endpoint URL.
   * @param {WebSocketClientOptions} [options] - Optional connection settings.
   * @throws {ReferenceError} If the WebSocket implementation is unavailable.
   * @throws {DOMException} If the native WebSocket constructor rejects the URL or the requested subprotocols.
   *
   * @example
   * ```js
   * const connection = new WebSocketClient('wss://api.example.com/ipc');
   *
   * connection.on('open', () => {
   *   connection.send('{"type":"ready"}');
   * });
   * ```
   *
   * @example
   * ```js
   * const connection = new WebSocketClient('wss://api.example.com/ipc', {
   *   protocols: ['ipc.v1'],
   * });
   * ```
   */
  constructor(url, options = {}) {
    if (typeof globalThis.WebSocket !== 'function') {
      throw new ReferenceError('WebSocket is not available in this environment.');
    }

    this.#socket = new globalThis.WebSocket(url, options.protocols);

    if ('binaryType' in this.#socket) {
      this.#socket.binaryType = 'arraybuffer';
    }

    this.#socket.addEventListener('open', () => {
      for (const listener of this.#openListeners) {
        try {
          listener();
        } catch {
          // Isolate listener failures.
        }
      }
    });

    this.#socket.addEventListener('message', event => {
      const data =
        typeof event.data === 'string' || event.data instanceof ArrayBuffer
          ? event.data
          : String(event.data);

      for (const listener of this.#messageListeners) {
        try {
          listener(data);
        } catch {
          // Isolate listener failures.
        }
      }
    });

    this.#socket.addEventListener('close', () => {
      for (const listener of this.#closeListeners) {
        try {
          listener();
        } catch {
          // Isolate listener failures.
        }
      }
    });

    this.#socket.addEventListener('error', event => {
      for (const listener of this.#errorListeners) {
        try {
          listener(event);
        } catch {
          // Isolate listener failures.
        }
      }
    });
  }

  /**
   * Returns the native WebSocket connection state.
   *
   * Values follow the platform WebSocket constants: `0` for connecting,
   * `1` for open, `2` for closing, and `3` for closed.
   *
   * @readonly
   * @type {number}
   */
  get readyState() {
    return this.#socket.readyState;
  }

  /**
   * @overload
   * @param {'open'} event - Event name.
   * @param {WebSocketOpenListener} listener - Function invoked when the connection opens.
   * @returns {void}
   */
  /**
   * @overload
   * @param {'message'} event - Event name.
   * @param {WebSocketMessageListener} listener - Function invoked when a message is received.
   * @returns {void}
   */
  /**
   * @overload
   * @param {'close'} event - Event name.
   * @param {WebSocketCloseListener} listener - Function invoked when the connection closes.
   * @returns {void}
   */
  /**
   * @overload
   * @param {'error'} event - Event name.
   * @param {WebSocketErrorListener} listener - Function invoked when a transport error occurs.
   * @returns {void}
   */
  /**
   * Registers a listener for a supported WebSocket event.
   *
   * Registering the same function more than once for the same event has no
   * additional effect because listeners are stored in a Set. Listeners added
   * after an event has occurred do not receive that past event.
   *
   * @param {string} event - Event name.
   * @param {EventListener} listener - Function invoked when the event is emitted.
   * @throws {TypeError} If the listener is not a function.
   * @throws {TypeError} If the event is unsupported.
   *
   * @example
   * ```js
   * const onMessage = data => {
   *   console.log(data);
   * };
   *
   * connection.on('message', onMessage);
   * ```
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function.');
    }

    if (event === 'open') {
      this.#openListeners.add(listener);
    } else if (event === 'message') {
      this.#messageListeners.add(listener);
    } else if (event === 'close') {
      this.#closeListeners.add(listener);
    } else if (event === 'error') {
      this.#errorListeners.add(listener);
    } else {
      throw new TypeError(`Unsupported event: ${event}`);
    }
  }

  /**
   * Removes a previously registered listener from the specified event.
   *
   * Passing a listener that is not registered has no effect. The listener
   * reference must be identical to the one originally passed to `on()`.
   *
   * @param {string} event - Event name.
   * @param {EventListener} listener - Function invoked when the event is emitted.
   * @returns {void}
   *
   * @example
   * ```js
   * const onMessage = data => console.log(data);
   *
   * connection.on('message', onMessage);
   * connection.off('message', onMessage);
   * ```
   */
  off(event, listener) {
    if (event === 'open') {
      this.#openListeners.delete(listener);
    } else if (event === 'message') {
      this.#messageListeners.delete(listener);
    } else if (event === 'close') {
      this.#closeListeners.delete(listener);
    } else if (event === 'error') {
      this.#errorListeners.delete(listener);
    }
  }
  /**
   * Sends a message through the WebSocket connection.
   *
   * The payload may be text or binary. Sending is synchronous at the API level
   * and does not wait for remote delivery.
   *
   * @param {string|BufferSource} data - Text or binary payload to transmit.
   * @throws {Error} If the WebSocket connection is not open.
   * @throws {DOMException} If the native WebSocket implementation rejects the payload.
   *
   * @example
   * ```js
   * connection.send(JSON.stringify({ type: 'ping' }));
   * ```
   *
   * @example
   * ```js
   * connection.send(new Uint8Array([1, 2, 3]));
   * ```
   */
  send(data) {
    if (this.#socket.readyState !== WS_OPEN) {
      throw new Error('WebSocket connection is not open.');
    }

    this.#socket.send(data);
  }

  /**
   * Initiates closure of the WebSocket connection.
   *
   * Calls the native `close()` method only while the connection is connecting
   * or open. Calls made while it is closing or closed have no effect.
   * Closure completion is asynchronous and is reported through the `close` event.
   *
   * @returns {void}
   *
   * @example
   * ```js
   * connection.on('close', () => {
   *   console.log('Connection closed.');
   * });
   *
   * connection.close();
   * ```
   */
  close() {
    if (this.#socket.readyState === WS_OPEN || this.#socket.readyState === WS_CONNECTING) {
      this.#socket.close();
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default WebSocketClient;
