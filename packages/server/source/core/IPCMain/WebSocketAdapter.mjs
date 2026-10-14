// @ts-check
/**
 * @file Adapts transport-level WebSocket upgrades to connection listeners.
 *
 * @description WebSocketAdapter bridges the TransportAdapter WebSocket upgrade
 * capability with consumers that need established WebSocket connections.
 *
 * The adapter does not own active connections. It only owns the subscription
 * to the transport upgrade source and the current connection listener.
 *
 * @module WebSocketAdapter
 */

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
 * Represents an established WebSocket connection contract.
 *
 * @typedef {import('#adapters/TransportAdapter').WebSocketConnection} WebSocketConnection
 */

/**
 * Transport-level request used to accept or reject a WebSocket handshake.
 *
 * @typedef {import('#adapters/TransportAdapter').WebSocketOpenRequest} WebSocketOpenRequest
 */

/**
 * Receives an established WebSocket connection.
 *
 * @callback WebSocketConnectionListener
 * @param {WebSocketConnection} connection - Established WebSocket connection.
 * @returns {void}
 */

/**
 * Configuration for WebSocketAdapter.
 *
 * @typedef  {object}                   WebSocketAdapterOptions
 * @property {(url: string) => boolean} [accept]                - Optional predicate used to accept or reject WebSocket upgrade URLs.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class WebSocketAdapter {
  /**
   * Underlying transport adapter responsible for WebSocket upgrade handling.
   *
   * @type {TransportAdapter}
   */
  #transport;

  /**
   * Optional predicate used to determine whether a WebSocket URL is accepted.
   *
   * @type {((url: string) => boolean)|null}
   */
  #accept;

  /**
   * Current listener that receives accepted WebSocket connections.
   *
   * @type {WebSocketConnectionListener|null}
   */
  #listener = null;

  /**
   * Indicates whether the adapter has subscribed to transport WebSocket upgrades.
   *
   * @type {boolean}
   */
  #subscribed = false;

  /**
   * Initializes the WebSocket adapter with a transport adapter.
   *
   * @param {TransportAdapter} transport - Transport adapter responsible for handling WebSocket upgrade requests.
   * @param {WebSocketAdapterOptions} [options] - Optional WebSocket adapter configuration.
   *
   * @example
   * ```js
   * const adapter = new WebSocketAdapter(transport, {
   *   accept: url => url.startsWith('/ws/')
   * });
   * ```
   */
  constructor(transport, options = {}) {
    this.#transport = transport;
    this.#accept = typeof options.accept === 'function' ? options.accept : null;
  }

  /**
   * Registers the current listener that receives accepted WebSocket connections.
   *
   * Calling this method again replaces the previously registered listener.
   * The underlying transport is subscribed only once, regardless of how many
   * times this method is called.
   *
   * @param {WebSocketConnectionListener} listener - Callback invoked when a WebSocket connection is established.
   * @throws {TypeError} If listener is not a function.
   *
   * @example
   * ```js
   * adapter.onConnection(connection => {
   *   connection.on('message', data => {
   *     connection.send(`Echo: ${data}`);
   *   });
   * });
   * ```
   */
  onConnection(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    this.#listener = listener;

    if (!this.#subscribed) {
      this.#subscribed = true;

      this.#transport.onWebSocket(openRequest => {
        this.#handleOpen(openRequest);
      });
    }
  }

  /**
   * Stops delivering newly accepted connections to the current listener.
   *
   * After `close()` is called, incoming WebSocket upgrade requests are
   * rejected with `503 WebSocket unavailable`. The adapter cannot be
   * reopened once closed.
   *
   * Existing connections remain owned by their consumer.
   *
   * @example
   * ```js
   * adapter.close();
   * ```
   */
  close() {
    this.#listener = null;
  }

  /**
   * Processes one transport-level WebSocket upgrade request.
   *
   * @param {WebSocketOpenRequest} openRequest - Transport-level request used to accept or reject the WebSocket handshake.
   */
  #handleOpen(openRequest) {
    if (this.#listener === null) {
      openRequest.reject(503, 'WebSocket unavailable');
    } else if (this.#accept && !this.#accept(openRequest.url)) {
      openRequest.reject(404, 'Not Found');
    } else {
      Promise.resolve()
        .then(() => openRequest.accept())
        .then(
          connection => {
            if (this.#listener !== null) {
              this.#listener(connection);
            } else {
              try {
                connection.close();
              } catch {
                // Ignore transport close failures during cleanup.
              }
            }
          },
          () => {
            openRequest.reject(500, 'WebSocket accept failed');
          },
        );
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default WebSocketAdapter;
