// @ts-check
/**
 * @file Defines the Node.js `HTTPS` transport adapter.
 *
 * @description Provides the concrete `HTTPS` transport adapter for Node.js.
 *
 * `HttpsAdapter` implements the `TransportAdapter` contract using Node.js'
 * built-in `node:https` module. It creates and manages the native
 * `https.Server` instance and translates the transport operations defined
 * by the application into operations provided by the Node.js HTTP server.
 *
 * This adapter belongs to the infrastructure layer and isolates the rest
 * of the application from the Node.js HTTP server implementation.
 *
 * @module HttpsAdapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import https from 'node:https';

// » IMPORT LOCAL MODULES
import TransportAdapter from '../TransportAdapter/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the underlying Node.js HTTPS server.
 *
 * @typedef {import('node:https').Server} HttpsServer
 */

/**
 * Configuration options passed to the underlying Node.js HTTPS server.
 *
 * This type is provided by the native `node:https` module and is used to
 * configure the server created by {@link HttpsAdapter}.
 *
 * @typedef {import('node:https').ServerOptions} ServerOptions
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
 * Identity for a secure HTTPS/1.1 server.
 *
 * Represents a valid combination of a Node.js HTTPS server instance
 * with the corresponding protocol and transport identifiers.
 *
 * @typedef  {object}       TransportIdentityH1S
 * @property {HttpsServer}  server               - The underlying Node.js HTTPS server instance.
 * @property {'https'}      protocol             - The application-level protocol (`https`).
 * @property {'h1s'}        transport            - The transport identifier for HTTP/1.1 over TLS (`h1s`).
 * @property {Http1Handler} requestHandler       - Callback invoked for each incoming HTTP request.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Node.js implementation of the {@link TransportAdapter} contract.
 *
 * @classdesc `HttpsAdapter` adapts the native Node.js HTTPS server to the
 * transport contract expected by the application. It owns the underlying
 * `https.Server` instance and exposes transport-independent operations
 * through the inherited `TransportAdapter` API.
 *
 * The adapter uses the `https` protocol and `h1s` transport, while delegating
 * server lifecycle operations to Node.js.
 *
 * @augments {TransportAdapter<TransportIdentityH1S>}
 */
class HttpsAdapter extends TransportAdapter {
  /**
   * Creates a Node.js HTTPS transport adapter.
   *
   * The constructor creates the underlying Node.js HTTPS server using the
   * supplied server configuration.
   *
   * @param {ServerOptions} [options] - Configuration for the HTTPS server.
   * @example
   * ```js
   * const adapter = new HttpsAdapter({
   *   keepAliveTimeout: 65000
   * });
   * ```
   */
  constructor(options) {
    const server = HttpsAdapter.#createServer(options);
    super(server, 'https', 'h1s');
  }

  /**
   * Creates the underlying Node.js secure HTTP server.
   *
   * @param {ServerOptions} [options] - Configuration for the HTTPS server.
   * @returns {HttpsServer} The created Node.js secure HTTP server.
   */
  static #createServer(options) {
    if (options === undefined) {
      return https.createServer();
    }

    return https.createServer(options);
  }
}
// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default HttpsAdapter;
