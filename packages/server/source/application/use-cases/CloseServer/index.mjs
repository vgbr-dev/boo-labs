// @ts-check
/**
 * @file Defines the CloseServer application use case.
 *
 * @description CloseServer is responsible for executing the server shutdown
 * operation through an injected server.
 *
 * It delegates the underlying shutdown process to the server and remains
 * independent from any concrete transport implementation.
 *
 * @module CloseServer
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
 * Callback invoked after the server has closed.
 *
 * @callback OnCloseHandler
 * @param {Error} [error] - Error reported if the server could not be closed.
 * @returns {void}
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Application use case for stopping the server.
 *
 * @classdesc Executes the server shutdown operation through an injected server.
 *
 * This class does not manage server state transitions or depend on any
 * concrete transport implementation.
 */
class CloseServer {
  /**
   * The server instance whose shutdown operation this use case executes.
   *
   * @type {TransportAdapter}
   */
  #server;

  /**
   * Creates a new CloseServer use case.
   *
   * @param {TransportAdapter} server - The server used to execute the shutdown operation.
   * @example
   * ```js
   * const closeServer = new CloseServer(new HttpAdapter({
   *   keepAliveTimeout: 65000
   * }));
   * ```
   */
  constructor(server) {
    this.#server = server;
  }

  /**
   * Executes the server shutdown operation.
   *
   * Delegates the shutdown operation to the configured server.
   *
   * @param {OnCloseHandler} [onCloseHandler] - Callback invoked by Node.js once the server has been successfully closed.
   * @returns {Promise<void>} Resolves once the shutdown operation has completed.
   * @example
   * ```js
   * await closeServer.execute(onCloseHandler);
   * ```
   */
  async execute(onCloseHandler) {
    await this.#server.close(onCloseHandler);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CloseServer;
