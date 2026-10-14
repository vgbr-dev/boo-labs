//@ts-check
/**
 * @file Defines the Node.js `HTTP/2` secure transport adapter.
 *
 * @description Provides the concrete `HTTP/2` secure transport adapter for Node.js.
 *
 * `Http2Adapter` implements the `TransportAdapter` contract using Node.js'
 * built-in `node:http2` module. It creates and manages the native
 * `Http2SecureServer` instance and translates the transport operations defined
 * by the application into operations provided by the Node.js HTTP/2 server.
 *
 * This adapter belongs to the infrastructure layer and isolates the rest
 * of the application from the Node.js HTTP/2 server implementation.
 *
 * @module Http2Adapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import http2 from 'node:http2';

// » IMPORT LOCAL MODULES
import TransportAdapter from '../TransportAdapter/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the underlying Node.js secure HTTP/2 server.
 *
 * @typedef {import('node:http2').Http2SecureServer} Http2SecureServer
 */

/**
 * Configuration options passed to the underlying Node.js HTTP/2 server.
 *
 * This type is provided by the native `node:http2` module and is used to
 * configure the server created by {@link Http2Adapter}.
 *
 * @typedef {import('node:http2').SecureServerOptions} ServerOptions
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
// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Node.js implementation of the {@link TransportAdapter} contract.
 *
 * @classdesc `Http2Adapter` adapts the native Node.js secure HTTP/2 server to
 * the transport contract expected by the application. It owns the underlying
 * `Http2SecureServer` instance and exposes transport-independent operations
 * through the inherited `TransportAdapter` API.
 *
 * The adapter uses the `https` protocol and `h2` transport, while delegating
 * server lifecycle operations to Node.js.
 *
 * @augments {TransportAdapter<TransportIdentityH2>}
 */
class Http2Adapter extends TransportAdapter {
  /**
   * Creates a Node.js secure HTTP/2 transport adapter.
   *
   * The constructor creates the underlying Node.js secure HTTP/2 server
   * using the supplied server configuration.
   *
   * @param {ServerOptions} [options] - Configuration for the HTTP/2 server.
   * @example
   * ```js
   * const adapter = new Http2Adapter({
   *   key: privateKey,
   *   cert: certificate
   * });
   * ```
   */
  constructor(options) {
    const server = Http2Adapter.#createServer(options);
    super(server, 'https', 'h2');
  }

  /**
   * Creates the underlying Node.js secure HTTP/2 server.
   *
   * @param {ServerOptions} [options] - Configuration for the HTTP/2 server.
   * @returns {Http2SecureServer} The created Node.js secure HTTP/2 server.
   */
  static #createServer(options) {
    if (options === undefined) {
      return http2.createSecureServer();
    }
    return http2.createSecureServer(options);
  }
}
// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Http2Adapter;
