// @ts-check
/**
 * @file Defines the Node.js `HTTP/2` cleartext transport adapter.
 *
 * @description Provides the concrete `HTTP/2` cleartext transport adapter for Node.js.
 *
 * `Http2CleartextAdapter` implements the `TransportAdapter` contract using Node.js'
 * built-in `node:http2` module. It creates and manages the native
 * `Http2Server` instance and translates the transport operations defined
 * by the application into operations provided by the Node.js HTTP/2 server.
 *
 * This adapter belongs to the infrastructure layer and isolates the rest
 * of the application from the Node.js HTTP/2 server implementation.
 *
 * @module Http2CleartextAdapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import http2 from 'node:http2';

// » IMPORT LOCAL MODULES
import TransportAdapter from '../TransportAdapter/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the underlying Node.js cleartext HTTP/2 server.
 *
 * @typedef {import('node:http2').Http2Server} Http2Server
 */

/**
 * Configuration options passed to the underlying Node.js HTTP/2 server.
 *
 * This type is provided by the native `node:http2` module and is used to
 * configure the server created by {@link Http2CleartextAdapter}.
 *
 * @typedef {import('node:http2').ServerOptions} ServerOptions
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

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Node.js implementation of the {@link TransportAdapter} contract.
 *
 * @classdesc `Http2CleartextAdapter` adapts the native Node.js cleartext HTTP/2
 * server to the transport contract expected by the application. It owns the
 * underlying `Http2Server` instance and exposes transport-independent
 * operations through the inherited `TransportAdapter` API.
 *
 * The adapter uses the `http` protocol and `h2c` transport, while delegating
 * server lifecycle operations to Node.js.
 *
 * @augments {TransportAdapter<TransportIdentityH2C>}
 */
class Http2CleartextAdapter extends TransportAdapter {
  /**
   * Creates a Node.js cleartext HTTP/2 transport adapter.
   *
   * The constructor creates the underlying Node.js cleartext HTTP/2 server
   * using the supplied server configuration.
   *
   * @param {ServerOptions} [options] - Configuration for the HTTP/2 server.
   * @example
   * ```js
   * const adapter = new Http2CleartextAdapter({
   *   settings: {
   *     enablePush: false
   *   }
   * });
   * ```
   */
  constructor(options) {
    const server = Http2CleartextAdapter.#createServer(options);
    super(server, 'http', 'h2c');
  }

  /**
   * Creates the underlying Node.js cleartext HTTP/2 server.
   *
   * @param {ServerOptions} [options] - Configuration for the HTTP/2 server.
   * @returns {Http2Server} The created Node.js cleartext HTTP/2 server.
   */
  static #createServer(options) {
    if (options === undefined) {
      return http2.createServer();
    }
    return http2.createServer(options);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Http2CleartextAdapter;
