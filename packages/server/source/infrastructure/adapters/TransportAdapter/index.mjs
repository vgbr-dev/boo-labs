// @ts-check
/**
 * @file Defines the transport adapter.
 *
 * @description Declares the abstract contract that transport adapters must
 * implement to integrate a network server with the application.
 *
 * The adapter isolates the application from the underlying transport
 * implementation. Concrete adapters are responsible for translating this
 * contract into operations provided by a specific runtime or server implementation.
 *
 * @module TransportAdapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Address from '#value-objects/Address';
import Endpoint from '#value-objects/Endpoint';
import createWebSocketOpenRequest from './createWebSocketOpenRequest.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a Node.js HTTP server.
 *
 * @typedef {import('node:http').Server} HttpServer
 */

/**
 * Represents a Node.js HTTPS server.
 *
 * @typedef {import('node:https').Server} HttpsServer
 */

/**
 * Represents a Node.js HTTP/2 server.
 *
 * @typedef {import('node:http2').Http2Server} Http2Server
 */

/**
 * Represents a Node.js secure HTTP/2 server.
 *
 * @typedef {import('node:http2').Http2SecureServer} Http2SecureServer
 */

/**
 * Represents an incoming HTTP/1.1 request message from Node.js.
 *
 * @typedef {import('node:http').IncomingMessage} IncomingMessage
 */

/**
 * Represents a Node.js HTTP/1.1 response.
 *
 * @typedef {import('node:http').ServerResponse} ServerResponse
 */

/**
 * Represents an incoming HTTP/2 request.
 *
 * @typedef {import('node:http2').Http2ServerRequest} Http2ServerRequest
 */

/**
 * Represents an HTTP/2 server response.
 *
 * @typedef {import('node:http2').Http2ServerResponse} Http2ServerResponse
 */

/**
 * Represents a server-side HTTP/2 stream.
 *
 * @typedef {import('node:http2').ServerHttp2Stream} ServerHttp2Stream
 */

/**
 * Represents the headers received with an incoming HTTP/2 request.
 *
 * @typedef {import('node:http2').IncomingHttpHeaders} IncomingHttpHeaders
 */

/**
 * Callback that handles an incoming HTTP/1.1 request.
 *
 * @callback Http1Handler
 * @param {IncomingMessage} request - The incoming HTTP/1.1 request message.
 * @param {ServerResponse} response - The HTTP/1.1 server response.
 * @returns {void}
 */

/**
 * Callback that handles an incoming HTTP/2 request.
 *
 * @callback Http2Handler
 * @param {Http2ServerRequest} request - The incoming HTTP/2 request message.
 * @param {Http2ServerResponse} response - The HTTP/2 server response.
 * @returns {void}
 */

/**
 * Identity for a plain HTTP/1.1 server.
 *
 * Represents a permitted transport identity for a Node.js HTTP server
 * operating over HTTP/1.1 cleartext.
 *
 * @typedef  {object}       TransportIdentityH1
 * @property {HttpServer}   server              - The underlying Node.js HTTP server instance.
 * @property {'http'}       protocol            - The application-level protocol (`http`).
 * @property {'h1'}         transport           - The transport identifier for HTTP/1.1 cleartext (`h1`).
 * @property {Http1Handler} requestHandler      - Callback invoked for each incoming HTTP request.
 */

/**
 * Identity for a secure HTTPS/1.1 server.
 *
 * Represents a permitted transport identity for a Node.js HTTPS server
 * operating over HTTP/1.1 with TLS.
 *
 * @typedef  {object}       TransportIdentityH1S
 * @property {HttpsServer}  server               - The underlying Node.js HTTPS server instance.
 * @property {'https'}      protocol             - The application-level protocol (`https`).
 * @property {'h1s'}        transport            - The transport identifier for HTTP/1.1 over TLS (`h1s`).
 * @property {Http1Handler} requestHandler       - Callback invoked for each incoming HTTP request.
 */

/**
 * Identity for a cleartext HTTP/2 server (h2c).
 *
 * Represents a permitted transport identity for a Node.js HTTP/2 server
 * operating over cleartext.
 *
 * @typedef  {object}                      TransportIdentityH2C
 * @property {Http2Server}                 server               - The underlying Node.js HTTP/2 cleartext server instance.
 * @property {'http'}                      protocol             - The application-level protocol (`http`).
 * @property {'h2c'}                       transport            - The transport identifier for HTTP/2 cleartext (`h2c`).
 * @property {Http2Handler | Http1Handler} requestHandler       - Callback invoked for each incoming request.
 */

/**
 * Identity for a secure HTTP/2 server (h2).
 *
 * Represents a permitted transport identity for a Node.js HTTP/2 server
 * operating over TLS.
 *
 * @typedef  {object}                      TransportIdentityH2
 * @property {Http2SecureServer}           server              - The underlying Node.js secure HTTP/2 server instance.
 * @property {'https'}                     protocol            - The application-level protocol (`https`).
 * @property {'h2'}                        transport           - The transport identifier for HTTP/2 over TLS (`h2`).
 * @property {Http2Handler | Http1Handler} requestHandler      - Callback invoked for each incoming request.
 */

/**
 * Represents a permitted transport identity.
 *
 * Each identity correlates a Node.js server type with its protocol,
 * transport, and permitted request handler contract.
 *
 * @typedef {TransportIdentityH1 | TransportIdentityH1S | TransportIdentityH2C | TransportIdentityH2} TransportIdentity
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
 * Represents an established WebSocket connection contract.
 *
 * @typedef  {object}                        WebSocketConnection
 * @property {(data: string|Buffer) => void} send                - Sends a text or binary WebSocket message.
 * @property {WebSocketOn}                   on                  - Registers a listener for WebSocket events.
 * @property {() => void}                    close               - Closes the WebSocket connection.
 * @property {number}                        readyState          - Current transport-defined WebSocket ready state. Read-only.
 */

/**
 * Transport-level request used to accept or reject a WebSocket handshake.
 *
 * @typedef  {object}                                                 WebSocketOpenRequest
 * @property {string}                                                 url                  - The requested WebSocket URL.
 * @property {Record<string, string|string[]|undefined>}              headers              - Headers received during the WebSocket handshake.
 * @property {() => WebSocketConnection|Promise<WebSocketConnection>} accept               - Accepts the handshake and resolves to the established connection.
 * @property {(code?: number, message?: string) => void}              reject               - Rejects the WebSocket handshake.
 */

/**
 * Callback invoked once the server has been closed.
 *
 * Receives the error reported by the underlying Node.js server when the
 * shutdown operation fails, or `undefined` when it succeeds.
 *
 * @callback OnCloseHandler
 * @param {Error} [error] - Error reported if the server could not be closed.
 * @returns {void}
 */

/**
 * Callback invoked once the server has started listening.
 *
 * Receives no arguments. It signals that the server has successfully bound
 * to its configured network address and is ready to accept connections.
 *
 * @callback OnListenHandler
 * @returns {void}
 */

/**
 * Callback invoked when a WebSocket handshake request is received.
 *
 * @callback OnWebSocketHandler
 * @param {WebSocketOpenRequest} openRequest - WebSocket handshake request.
 * @returns {void}
 */

/**
 * Network configuration used to start a server.
 *
 * @typedef  {object} ListenOptions
 * @property {number} [port]        - The TCP port on which the server listens.
 * @property {string} [host]        - The hostname or IP address on which the server listens.
 * @property {number} [backlog]     - The maximum number of pending connections that may be queued while the operating system is waiting to accept them.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Abstract port for a server transport adapter.
 *
 * @template {TransportIdentity} TIdentity
 *
 * @classdesc The `TransportAdapter` defines the transport-level operations
 * required by the application to control and inspect a server without depending
 * on a concrete transport implementation.
 *
 * Concrete implementations must extend this class and provide the actual
 * transport operations.
 *
 * The class cannot be instantiated directly.
 */
class TransportAdapter {
  /**
   * Underlying Node.js server instance.
   *
   * @type {TIdentity['server']}
   */
  #server;

  /**
   * Protocol identifier used by this adapter.
   *
   * @type {TIdentity['protocol']}
   */
  #protocol;

  /**
   * Transport identifier used by this adapter.
   *
   * @type {TIdentity['transport']}
   */
  #transport;

  /**
   * Creates a transport adapter instance.
   *
   * Concrete adapters must invoke this constructor through `super()` before
   * initializing their own transport-specific state.
   *
   * @abstract
   * @param {TIdentity['server']} server - The native Node.js server managed by the adapter.
   * @param {TIdentity['protocol']} protocol - The protocol exposed by the adapter.
   * @param {TIdentity['transport']} transport - The transport implementation represented by the adapter.
   * @throws {Error} Thrown when `TransportAdapter` is instantiated directly.
   */
  constructor(server, protocol, transport) {
    if (new.target === TransportAdapter) {
      throw new Error('TransportAdapter is abstract and cannot be instantiated directly');
    }
    this.#server = server;
    this.#protocol = protocol;
    this.#transport = transport;
  }

  /**
   * The protocol identifier represented by {@link TIdentity['protocol']}.
   *
   * @type {TIdentity['protocol']}
   */
  get protocol() {
    return this.#protocol;
  }

  /**
   * The transport identifier represented by {@link TIdentity['transport']}.
   *
   * @type {TIdentity['transport']}
   */
  get transport() {
    return this.#transport;
  }

  /**
   * Indicates whether the underlying server is currently listening.
   *
   * The value is `true` when the server is accepting incoming connections;
   * otherwise, `false`.
   *
   * @type {boolean}
   */
  get listening() {
    return this.#server.listening;
  }

  /**
   * Returns the endpoint on which the server is currently listening.
   *
   * The endpoint combines the adapter's protocol with the network address
   * and port reported by the underlying Node.js server.
   *
   * If the server is not currently listening, `null` is returned.
   *
   * @returns {Endpoint|null} The server endpoint, or `null` when the server is not listening.
   * @example
   * ```js
   * adapter.endpoint();
   * ```
   */
  endpoint() {
    const address = this.address();

    if (address === null) {
      return null;
    }

    return new Endpoint({
      protocol: this.#protocol,
      address,
    });
  }

  /**
   * Returns the network address currently used by the server.
   *
   * The native Node.js address representation is converted into an
   * `Address` value object so that transport-specific address details
   * do not leak outside the adapter.
   *
   * If the server is not currently listening, `null` is returned.
   *
   * @returns {Address|null} The server network address, or `null` when the server is not listening.
   * @example
   * ```js
   * adapter.address();
   * ```
   */
  address() {
    if (!this.#server.listening) {
      return null;
    }
    const address = this.#server.address();

    if (address === null || typeof address === 'string') {
      return null;
    }
    return new Address(address);
  }

  /**
   * Registers a handler for incoming requests.
   *
   * The handler is invoked for each incoming request received by the
   * underlying Node.js server.
   *
   * @param {TIdentity['requestHandler']} onRequestHandler - Callback invoked for each incoming request.
   * @example
   * ```js
   * adapter.onRequest(onRequestHandler);
   * ```
   */
  onRequest(onRequestHandler) {
    this.#server.on('request', onRequestHandler);
  }

  /**
   * Starts the server and begins listening for incoming connections.
   *
   * The supplied network configuration is translated into the corresponding
   * arguments expected by Node.js' `server.listen()` method.
   *
   * @param {ListenOptions} [options] - Network configuration used to start the server.
   * @param {OnListenHandler} [onListenHandler] - Callback invoked once the server has successfully started listening.
   * @returns {Promise<void>} Resolves once the server has successfully started listening.
   * @throws {Error} Rejects when the underlying server fails to start listening.
   * @example
   * ```js
   * adapter.listen({
   *   port: process.env.PORT || 8080,
   *   host: '0.0.0.0',
   *   backlog: 511,
   * }, () => console.log('Server listening'));
   * ```
   */
  listen(options, onListenHandler) {
    return new Promise((resolve, reject) => {
      /**
       * Handles startup errors emitted by the underlying server.
       * Ensures proper cleanup by removing the `listening` event listener
       * before rejecting the Promise.
       *
       * @param {Error} error - The error object emitted by the server during startup.
       */
      const onError = error => {
        this.#server.off('listening', onListening);
        reject(error);
      };

      /**
       * Handles the successful startup of the server.
       * Ensures proper cleanup by removing the `error` event listener
       * before resolving the Promise.
       */
      const onListening = () => {
        this.#server.off('error', onError);

        if (onListenHandler) {
          onListenHandler();
        }

        resolve();
      };

      this.#server.once('error', onError);
      this.#server.once('listening', onListening);

      try {
        this.#server.listen(options?.port, options?.host, options?.backlog);
      } catch (error) {
        this.#server.off('error', onError);
        this.#server.off('listening', onListening);
        reject(error);
      }
    });
  }

  /**
   * Stops the server and releases its listening resources.
   *
   * The operation is delegated directly to the underlying Node.js server.
   *
   * @param {OnCloseHandler} [onCloseHandler] - Callback invoked once the server has been closed.
   * @returns {Promise<void>} Resolves once the server has been successfully closed.
   * @throws {Error} Rejects when the server cannot be closed successfully.
   * @example
   * ```js
   * adapter.close();
   * ```
   */
  close(onCloseHandler) {
    return new Promise((resolve, reject) => {
      this.#server.close(error => {
        if (onCloseHandler) {
          onCloseHandler(error);
        }

        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  /**
   * Registers a handler for WebSocket upgrade requests.
   *
   * Concrete adapters inherit the transport-specific WebSocket handshake
   * handling provided by this method.
   *
   * @param {OnWebSocketHandler} onWebSocketHandler - Callback invoked when a WebSocket handshake request is received.
   * @throws {Error} Thrown when the transport does not support WebSockets.
   * @example
   * ```js
   * adapter.onWebSocket(openRequest => {
   *   openRequest.accept();
   * });
   * ```
   */
  onWebSocket(onWebSocketHandler) {
    this.#resolveOnWebSocket(onWebSocketHandler);
  }

  /**
   * Resolves the WebSocket handshake mechanism supported by the transport.
   *
   * @param {OnWebSocketHandler} onWebSocketHandler - Callback invoked when a WebSocket handshake request is received.
   * @throws {Error} Thrown when the transport does not support WebSockets.
   */
  #resolveOnWebSocket(onWebSocketHandler) {
    if (this.#transport === 'h1' || this.#transport === 'h1s') {
      this.#server.on('upgrade', (request, socket, head) => {
        const openRequest = createWebSocketOpenRequest(request, socket, head);
        onWebSocketHandler(openRequest);
      });
    } else if (this.#transport === 'h2' || this.#transport === 'h2c') {
      /**
       * Handles an incoming HTTP/2 stream.
       *
       * @private
       * @param {ServerHttp2Stream} stream - HTTP/2 stream associated with the request.
       * @param {IncomingHttpHeaders} headers - HTTP/2 request headers.
       */
      const onStream = (stream, headers) => {
        if (headers[':method'] === 'CONNECT') {
          stream.respond({ ':status': 501 });
          stream.end();
        }
      };

      this.#server.on('session', session => {
        session.on('stream', onStream);
      });
    } else {
      throw new Error(`WebSocket is not supported by transport '${this.#transport}'`);
    }
  }
}
// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default TransportAdapter;
