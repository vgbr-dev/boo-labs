// @ts-check
/**
 * @file Defines the Node.js `HTTP` transport adapter.
 *
 * @description Provides the concrete `HTTP` transport adapter for Node.js.
 *
 * `HttpAdapter` implements the `TransportAdapter` contract using Node.js'
 * built-in `node:http` module. It creates and manages the native
 * `http.Server` instance and translates the transport operations defined
 * by the application into operations provided by the Node.js HTTP server.
 *
 * This adapter belongs to the infrastructure layer and isolates the rest
 * of the application from the Node.js HTTP server implementation.
 *
 * @module HttpAdapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import http from 'node:http';

// » IMPORT LOCAL MODULES
import TransportAdapter from '../TransportAdapter/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the underlying Node.js HTTP server.
 *
 * @typedef {import('node:http').Server} HttpServer
 */

/**
 * Configuration options passed to the underlying Node.js HTTP server.
 *
 * This type is provided by the native `node:http` module and is used to
 * configure the server created by {@link HttpAdapter}.
 *
 * @typedef {import('node:http').ServerOptions} ServerOptions
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
 * Callback that handles an incoming HTTP/1.1 request.
 *
 * @callback Http1Handler
 * @param {IncomingMessage} request - The incoming HTTP/1.1 request message.
 * @param {ServerResponse} response - The HTTP/1.1 server response.
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

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Node.js implementation of the {@link TransportAdapter} contract.
 *
 * @classdesc `HttpAdapter` adapts the native Node.js HTTP server to the
 * transport contract expected by the application. It owns the underlying
 * `http.Server` instance and exposes transport-independent operations
 * through the inherited `TransportAdapter` API.
 *
 * The adapter uses the `http` protocol and `h1` transport, while delegating
 * server lifecycle operations to Node.js.
 *
 * @augments {TransportAdapter<TransportIdentityH1>}
 */
class HttpAdapter extends TransportAdapter {
  /**
   * Creates a Node.js HTTP transport adapter.
   *
   * The constructor creates the underlying Node.js HTTP server using the
   * supplied server configuration.
   *
   * @param {ServerOptions} [options] - Configuration for the HTTP server.
   * @example
   * ```js
   * const adapter = new HttpAdapter({
   *   keepAliveTimeout: 65000
   * });
   * ```
   */
  constructor(options) {
    const server = HttpAdapter.#createServer(options);
    super(server, 'http', 'h1');
  }

  /**
   * Creates the underlying Node.js HTTP server.
   *
   * @param {ServerOptions} [options] - Configuration for the HTTP server.
   * @returns {HttpServer} The created Node.js HTTP server.
   */
  static #createServer(options) {
    if (options === undefined) {
      return http.createServer();
    }

    return http.createServer(options);
  }
}
// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default HttpAdapter;
