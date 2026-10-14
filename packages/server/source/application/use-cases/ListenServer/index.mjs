// @ts-check
/**
 * @file Defines the ListenServer application use case.
 *
 * @description ListenServer is responsible for executing the server listening
 * operation through an injected server.
 *
 * It delegates the underlying network binding process to the server and
 * remains independent from any concrete transport implementation.
 *
 * @module ListenServer
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
 * Network configuration used to start the server.
 *
 * @typedef  {object} ListenOptions
 * @property {number} [port]        - The TCP port on which the server listens.
 * @property {string} [host]        - The hostname or IP address on which the server listens.
 * @property {number} [backlog]     - The maximum number of pending connections that may be queued while the operating system is waiting to accept them.
 */

/**
 * Callback invoked when the server has successfully started listening.
 *
 * @callback OnListenHandler
 * @returns {void}
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Application use case for starting the server.
 *
 * @classdesc Executes the server listening operation through an injected server.
 *
 * This class does not manage server state transitions or depend on any
 * concrete transport implementation.
 */
class ListenServer {
  /**
   * The server instance whose listening operation.
   *
   * @type {TransportAdapter}
   */
  #server;

  /**
   * Creates a new ListenServer use case.
   *
   * @param {TransportAdapter} server - The server responsible for executing the underlying listening operation.
   * @example
   * ```js
   * const listenServer = new ListenServer(new HttpAdapter({
   *   keepAliveTimeout: 65000
   * }));
   * ```
   */
  constructor(server) {
    this.#server = server;
  }

  /**
   * Executes the server listening operation.
   *
   * Delegates the listening operation to the configured server.
   *
   * @param {ListenOptions} [options] - Network configuration used to start the server.
   * @param {OnListenHandler} [onListenHandler] - Callback invoked once the server has successfully started listening.
   * @returns {Promise<void>} Resolves once the listening operation has been initiated.
   * @example
   * ```js
   * await listenServer.execute({
   *   port: process.env.PORT || 8080,
   *   host: '0.0.0.0',
   *   backlog: 511,
   * }, onListenHandler);
   * ```
   */
  async execute(options, onListenHandler) {
    await this.#server.listen(options, onListenHandler);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ListenServer;
