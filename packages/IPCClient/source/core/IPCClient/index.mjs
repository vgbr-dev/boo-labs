// @ts-check
/**
 * @file Public client-side IPC API.
 *
 * @description Provides a client API for bidirectional inter-process communication
 * over WebSocket, including remote invocations, one-way events, local invocation
 * handlers, and event listeners.
 *
 * @module IPCClient
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import WebSocketClient from './WebSocketClient.mjs';
import IPCClientChannel from './IPCClientChannel.mjs';
import IPCError from '#shared/errors/IPCError';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Handler for invocation requests received from the remote endpoint.
 *
 * @typedef {import('./IPCClientChannel.mjs').IPCClientInvokeHandler} IPCClientInvokeHandler
 */

/**
 * Listener for events received from the remote endpoint.
 *
 * @typedef {import('./IPCClientChannel.mjs').IPCClientEventListener} IPCClientEventListener
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Public client-side API for bidirectional IPC communication.
 *
 * @classdesc Connects to a server-side `IPCMain` instance over WebSocket.
 * Delegates invocation handling, event delivery, and message exchange to
 * `IPCClientChannel`.
 */
class IPCClient {
  /**
   * Underlying WebSocket transport.
   *
   * @type {WebSocketClient}
   */
  #connection;

  /**
   * Active IPC channel, or `null` when not connected.
   *
   * @type {IPCClientChannel|null}
   */
  #channel = null;

  /**
   * Pending connection attempt, shared by concurrent `connect()` calls.
   *
   * @type {Promise<void>|null}
   */
  #connectionPromise = null;

  /**
   * Creates an IPC client for a WebSocket endpoint.
   *
   * When no URL is provided, the endpoint is derived from the current browser
   * location using the `/ipc` path. HTTPS pages use `wss:`; other page
   * protocols use `ws:`.
   *
   * Creating an instance does not establish the connection.
   *
   * @param {string} [url] - Absolute WebSocket endpoint URL using `ws:` or `wss:`.
   * @throws {ReferenceError} If no URL is provided and the browser location is unavailable.
   * @throws {TypeError} If the URL is not a string.
   * @throws {RangeError} If the URL is an empty string.
   * @throws {TypeError} If the URL cannot be parsed as an absolute URL.
   * @throws {TypeError} If the URL does not use the `ws:` or `wss:` protocol.
   * @throws {TypeError} If the URL does not declare a hostname.
   * @throws {TypeError} If the URL contains embedded credentials.
   * @throws {TypeError} If the URL contains a fragment.
   *
   * @example
   * ```js
   * const ipc = new IPCClient();
   * ```
   *
   * @example
   * ```js
   * const ipc = new IPCClient('wss://api.example.com/ipc');
   * ```
   */
  constructor(url) {
    const resolved =
      url === undefined ? IPCClient.#resolveURLFromWindow() : IPCClient.#ensureURL(url);

    this.#connection = new WebSocketClient(resolved);
  }

  /**
   * Indicates whether the IPC channel has been established.
   *
   * This property reflects the local channel state and does not guarantee
   * that the underlying WebSocket connection is still open.
   *
   * @readonly
   * @type {boolean}
   */
  get connected() {
    return this.#channel !== null;
  }

  /**
   * Establishes the WebSocket connection and initializes the IPC channel.
   *
   * Concurrent calls made while a connection attempt is pending share the
   * same promise. The promise resolves after the IPC channel is initialized.
   *
   * @returns {Promise<void>} A promise that resolves when the IPC channel has been initialized.
   * @throws {IPCError} If the connection attempt fails.
   *
   * @example
   * ```js
   * const ipc = new IPCClient();
   *
   * await ipc.connect();
   *
   * console.log(ipc.connected);
   * ```
   */
  async connect() {
    if (this.#channel !== null) {
      return undefined;
    }

    if (this.#connectionPromise === null) {
      this.#connectionPromise = new Promise((resolve, reject) => {
        const cleanup = () => {
          this.#connection.off('open', onOpen);
          this.#connection.off('error', onError);
        };

        const onOpen = () => {
          cleanup();
          this.#channel = new IPCClientChannel(this.#connection);
          resolve(undefined);
        };

        const onError = () => {
          cleanup();
          reject(new IPCError('IPC_CONNECTION_FAILED'));
        };

        this.#connection.on('open', onOpen);
        this.#connection.on('error', onError);
      });
    }

    const connectionPromise = this.#connectionPromise;

    try {
      await connectionPromise;
    } finally {
      if (this.#connectionPromise === connectionPromise) {
        this.#connectionPromise = null;
      }
    }
  }

  /**
   * Registers a handler for invocation requests received from the server.
   *
   * The handler processes requests addressed to the specified channel.
   * Its return value or resolved promise is used as the invocation result
   * according to the IPC protocol.
   *
   * @param {string} channel - Name of the invocation channel.
   * @param {IPCClientInvokeHandler} handler - Function that handles incoming invocation requests.
   * @returns {this} The current client instance for method chaining.
   * @throws {IPCError} If the client is not connected.
   *
   * @example
   * ```js
   * ipc.handle('users:get', async ({ id }) => getUser(id));
   * ```
   */
  handle(channel, handler) {
    this.#getChannel().handle(channel, handler);

    return this;
  }

  /**
   * Removes the invocation handler registered for a channel.
   *
   * The effect of removing a channel without a registered handler is
   * determined by `IPCClientChannel`.
   *
   * @param {string} channel - Name of the invocation channel.
   * @returns {this} The current client instance for method chaining.
   * @throws {IPCError} If the client is not connected.
   *
   * @example
   * ```js
   * ipc.removeHandler('users:get');
   * ```
   */
  removeHandler(channel) {
    this.#getChannel().removeHandler(channel);

    return this;
  }

  /**
   * Registers a listener for events received from the server.
   *
   * The listener is called when an event for the specified channel is
   * delivered by the IPC channel.
   *
   * @param {string} channel - Name of the event channel.
   * @param {IPCClientEventListener} listener - Function invoked for incoming events.
   * @returns {this} The current client instance for method chaining.
   * @throws {IPCError} If the client is not connected.
   *
   * @example
   * ```js
   * const onUserUpdated = (user) => {
   *   console.log(user);
   * };
   *
   * ipc.on('users:updated', onUserUpdated);
   * ```
   */
  on(channel, listener) {
    this.#getChannel().on(channel, listener);

    return this;
  }

  /**
   * Removes a previously registered event listener.
   *
   * Pass the same channel and listener reference used when registering the
   * listener.
   *
   * @param {string} channel - Name of the event channel.
   * @param {IPCClientEventListener} listener - Previously registered listener.
   * @returns {this} The current client instance for method chaining.
   * @throws {IPCError} If the client is not connected.
   *
   * @example
   * ```js
   * ipc.off('users:updated', onUserUpdated);
   * ```
   */
  off(channel, listener) {
    this.#getChannel().off(channel, listener);

    return this;
  }

  /**
   * Invokes a handler registered on the remote server.
   *
   * Sends an invocation request and resolves with the remote handler's result.
   * The returned promise rejects if the invocation fails according to the
   * IPC protocol.
   *
   * @param {string} channel - Name of the remote invocation channel.
   * @param {unknown} [data] - Optional data passed to the remote handler.
   * @returns {Promise<unknown>} A promise that resolves with the remote handler's result.
   * @throws {IPCError} If the client is not connected.
   *
   * @example
   * ```js
   * const user = await ipc.invoke('users:get', { id: '42' });
   *
   * console.log(user);
   * ```
   */
  invoke(channel, data) {
    return this.#getChannel().invoke(channel, data);
  }

  /**
   * Sends a one-way event to the remote server.
   *
   * This method does not wait for a response from the server.
   *
   * @param {string} channel - Name of the remote event channel.
   * @param {unknown} [data] - Optional event payload.
   * @returns {void}
   * @throws {IPCError} If the client is not connected.
   *
   * @example
   * ```js
   * ipc.send('notifications:subscribe', { userId: '42' });
   * ```
   */
  send(channel, data) {
    this.#getChannel().send(channel, data);
  }

  /**
   * Closes the IPC channel and the underlying WebSocket connection.
   *
   * If an IPC channel has been initialized, it is closed and removed from
   * the client. The underlying connection is closed regardless of whether
   * a channel currently exists.
   *
   * @returns {void}
   *
   * @example
   * ```js
   * ipc.close();
   * ```
   */
  close() {
    if (this.#channel !== null) {
      this.#channel.close();
      this.#channel = null;
    }

    this.#connection.close();
  }

  /**
   * Returns the established IPC channel.
   *
   * @returns {IPCClientChannel} The active local IPC channel.
   * @throws {IPCError} If the client is not connected.
   */
  #getChannel() {
    if (this.#channel === null) {
      throw new IPCError('IPC_NOT_CONNECTED');
    }

    return this.#channel;
  }

  /**
   * Resolves the default WebSocket endpoint from the browser location.
   *
   * Uses `wss:` for HTTPS pages and `ws:` for other page protocols.
   *
   * @returns {string} The default WebSocket endpoint URL.
   * @throws {ReferenceError} If the browser location is unavailable.
   */
  static #resolveURLFromWindow() {
    if (!globalThis.window || !globalThis.window.location) {
      throw new ReferenceError('IPC URL cannot be resolved: browser location is unavailable.');
    }

    const { protocol, host } = globalThis.window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

    return `${wsProtocol}//${host}/ipc`;
  }

  /**
   * Validates and normalizes an absolute WebSocket endpoint URL.
   *
   * Only `ws:` and `wss:` URLs without embedded credentials or fragments
   * are accepted.
   *
   * @param {string} value - URL to validate.
   * @returns {string} The normalized WebSocket endpoint URL.
   * @throws {TypeError} If the URL is not a string.
   * @throws {RangeError} If the URL is an empty string.
   * @throws {TypeError} If the URL cannot be parsed as an absolute URL.
   * @throws {TypeError} If the URL does not use the `ws:` or `wss:` protocol.
   * @throws {TypeError} If the URL does not declare a hostname.
   * @throws {TypeError} If the URL contains embedded credentials.
   * @throws {TypeError} If the URL contains a fragment.
   */
  static #ensureURL(value) {
    if (typeof value !== 'string') {
      throw new TypeError('IPC URL must be a string.');
    }

    if (value.length === 0) {
      throw new RangeError('IPC URL must be a non-empty string.');
    }

    const url = IPCClient.#parseURL(value);

    if (!['ws:', 'wss:'].includes(url.protocol)) {
      throw new TypeError('IPC URL must use the ws: or wss: protocol.');
    }

    if (url.hostname.length === 0) {
      throw new TypeError('IPC URL must declare a hostname.');
    }

    if (url.username.length > 0 || url.password.length > 0) {
      throw new TypeError('IPC URL must not contain credentials.');
    }

    if (url.hash.length > 0) {
      throw new TypeError('IPC URL must not contain a fragment.');
    }

    return url.href;
  }

  /**
   * Parses an absolute URL string into a `URL` instance.
   *
   * Normalizes parsing failures into a `TypeError` so callers can handle
   * invalid input uniformly.
   *
   * @param {string} value - URL string to parse.
   * @returns {URL} The parsed URL.
   * @throws {TypeError} If the value cannot be parsed as an absolute URL.
   */
  static #parseURL(value) {
    try {
      return new URL(value);
    } catch {
      throw new TypeError('IPC URL could not be parsed.');
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default IPCClient;
