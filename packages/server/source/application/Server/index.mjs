/**
 * @file Defines the Server API.
 *
 * @description Provides the public server interface for configuring,
 * starting, monitoring, and stopping an application server.
 *
 * The Server manages the server lifecycle, middleware and route
 * registration, request handling, and server events.
 *
 * @module Server
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES

// » IMPORT THIRD PARTY MODULES

// » IMPORT LOCAL MODULES
import Kernel from '#Kernel';
import ServerError from '#shared/errors/ServerError';
import { assertServerConfiguration } from '#shared/validations/Server/ServerConfiguration';
import { assertRouter } from '#shared/validations/Server/Router';
import { assertNotFoundHandler } from '#shared/validations/Server/NotFoundHandler';
import { assertSystemErrorHandler } from '#shared/validations/Server/SystemErrorHandler';
import { assertPathnamePattern } from '#shared/validations/PathnamePattern';
import { assertMiddlewares } from '#shared/validations/Middleware';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * This error type provides identifiable failures related to middleware validation.
 *
 * @typedef {import('#shared/errors/MiddlewareError').default} MiddlewareError
 */

/**
 * This error type provides identifiable failures related to pathname pattern syntax and validation.
 *
 * @typedef {import('#shared/errors/PathnamePatternError').default} PathnamePatternError
 */

/**
 * Represents a permitted server configuration identity.
 *
 * @typedef {import('#configurations/ServerConfiguration').ServerConfigurationIdentity} ServerConfigurationIdentity
 */

/**
 * Represents a server configuration constrained to a permitted identity.
 *
 * @typedef {import('#configurations/ServerConfiguration').default<ServerConfigurationIdentity>} ServerConfiguration
 */

/**
 * Represents a complete network endpoint.
 *
 * @typedef {import('#value-objects/Endpoint').default} Endpoint
 */

/**
 * Represents the network address of an HTTP server.
 *
 * @typedef {import('#value-objects/Address').default} Address
 */

/**
 * Represents a router instance.
 *
 * @typedef {import('#routing/Router').default} Router
 */

/**
 * Owns the IPC subsystem and its application-facing API.
 *
 * @typedef {import('#IPCMain').default} IPCMain
 */

/**
 * Provides information about an exchange when processing starts.
 *
 * @typedef {import('#Exchange').ExchangeStartInfo} ExchangeStartInfo
 */

/**
 * Provides information about an exchange when processing fails.
 *
 * @typedef {import('#Exchange').ExchangeErrorInfo} ExchangeErrorInfo
 */

/**
 * Provides information about an exchange when processing completes.
 *
 * @typedef {import('#Exchange').ExchangeEndInfo} ExchangeEndInfo
 */

/**
 * Represents the lifecycle states of the server.
 *
 * @typedef { 'idle' | 'starting' | 'listening' | 'stopping' | 'closed' | 'error' } ServerState
 */

/**
 * Represents a pathname pattern used to match incoming requests.
 *
 * @typedef {string} PathnamePattern
 */

/**
 * Represents a function that delegates execution to the next
 * middleware layer.
 *
 * @callback NextFunction
 * @returns {void|Promise<void>}
 */

/**
 * Represents an exchange middleware function.
 *
 * @callback MiddlewareFunction
 * @param {Exchange} exchange - Current HTTP exchange.
 * @param {NextFunction} next - Delegates execution to the next layer.
 * @returns {void|Promise<void>}
 */

/**
 * Represents an event name supported by the server.
 *
 * @typedef {'listen'|'close'|'error'|'exchange:start'|'exchange:end'|'exchange:error'|symbol} EventName
 */

/**
 * Data emitted with the `listen` event.
 *
 * @typedef  {object}   ListenEventData
 * @property {Endpoint} endpoint        - Endpoint where the server is listening.
 * @property {Address}  address         - Network address where the server is listening.
 * @property {number}   elapsed         - Elapsed time in milliseconds.
 */

/**
 * Data emitted with the `close` event.
 *
 * @typedef  {object} CloseEventData
 * @property {number} elapsed        - Elapsed time in milliseconds.
 */

/**
 * Listener registered for the `listen` event.
 *
 * @typedef {(data: ListenEventData) => void} ListenEventListener
 */

/**
 * Listener registered for the `close` event.
 *
 * @typedef {(data: CloseEventData) => void} CloseEventListener
 */

/**
 * Listener registered for the `error` event.
 *
 * @typedef {(error: Error) => void} ErrorEventListener
 */

/**
 * Listener registered for the `exchange:start` event.
 *
 * @typedef {(data: ExchangeStartInfo) => void} ExchangeStartEventListener
 */

/**
 * Listener registered for the `exchange:end` event.
 *
 * @typedef {(data: ExchangeEndInfo) => void} ExchangeEndEventListener
 */

/**
 * Listener registered for the `exchange:error` event.
 *
 * @typedef {(data: ExchangeErrorInfo) => void} ExchangeErrorEventListener
 */

/**
 * Represents a listener registered for a server event.
 *
 * @typedef {(data?: unknown) => void} EventListener
 */

/**
 * Represents a handler invoked when a request does not match any registered route.
 *
 * @typedef {(exchange: Exchange) => void|Promise<void>} NotFoundHandler
 */

/**
 * Represents a handler invoked when an error propagates during request processing.
 *
 * @typedef {(error: Error, exchange: Exchange) => void|Promise<void>} SystemErrorHandler
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Provides the public interface for managing an application server.
 *
 * @classdesc Server is the central entry point for configuring and controlling
 * the application server. It provides middleware and route registration,
 * lifecycle management, request handling, error handling, and server
 * event notifications.
 *
 * The server remains inactive until `listen()` is called and can be
 * gracefully stopped with `close()`. Configuration and application
 * handlers are registered before startup and remain fixed throughout
 * the server lifecycle.
 */
class Server {
  /**
   * Application kernel instance.
   *
   * @type {Kernel}
   */
  #kernel;

  /**
   * Current server lifecycle state.
   *
   * @type {ServerState}
   */
  #state = Server.#STATES.IDLE;

  /**
   * Creates a server instance from the provided configuration.
   *
   * The configuration defines the transport protocol, listening options, and
   * server behavior. The server is initialized in the `idle` state and remains
   * inactive until `listen()` is called.
   *
   * @param {ServerConfiguration} configuration - Server configuration used to initialize the server.
   * @throws {ServerError} If `configuration` does not implement the ServerConfiguration contract.
   * @example
   * ```js
   * const configuration = new HttpServerConfiguration({
   *   connection: {
   *     requestTimeout: 300_000,
   *     headersTimeout: 60_000,
   *     keepAliveTimeout: 5_000,
   *     maxHeaderSize: 16_384,
   *     noDelay: true,
   *   },
   *   listen: {
   *     host: '127.0.0.1',
   *     port: 3000,
   *     backlog: 511,
   *   },
   *   request: {
   *     bodyLimit: 1_048_576,
   *     trustProxy: false,
   *   },
   *   response: {
   *     etag: true,
   *     defaultCharset: 'utf-8',
   *   },
   * });
   *
   * const server = new Server(configuration);
   * ```
   *
   * @example
   * ```js
   * const configuration = new HttpsServerConfiguration({
   *   connection: {
   *     requestTimeout: 300_000,
   *     headersTimeout: 60_000,
   *     keepAliveTimeout: 5_000,
   *     maxHeaderSize: 16_384,
   *     noDelay: true,
   *     key: await readFile('./certs/server.key'),
   *     cert: await readFile('./certs/server.crt'),
   *     ca: await readFile('./certs/ca.crt'),
   *     minVersion: 'TLSv1.2',
   *     maxVersion: 'TLSv1.3',
   *     requestCert: false,
   *     rejectUnauthorized: true,
   *     ALPNProtocols: ['h2', 'http/1.1'],
   *   },
   *   listen: {
   *     host: '127.0.0.1',
   *     port: 3000,
   *     backlog: 511,
   *   },
   *   request: {
   *     bodyLimit: 1_048_576,
   *     trustProxy: false,
   *   },
   *   response: {
   *     etag: true,
   *     defaultCharset: 'utf-8',
   *   },
   * });
   *
   * const server = new Server(configuration);
   * ```
   */
  constructor(configuration) {
    assertServerConfiguration(configuration);

    this.#kernel = new Kernel(configuration);
  }

  /**
   * Returns the current server lifecycle state.
   *
   * @readonly
   * @type {ServerState}
   */
  get state() {
    return this.#state;
  }

  /**
   * Returns whether the server is currently listening for requests.
   *
   * @readonly
   * @type {boolean}
   */
  get listening() {
    return this.#kernel.listening;
  }

  /**
   * The IPC subsystem owned by the server.
   *
   * Available only while the server is listening.
   *
   * @readonly
   * @type {IPCMain}
   * @throws {ServerError} If the server is not currently listening.
   */
  get ipc() {
    if (!this.#kernel.listening) {
      throw new ServerError('SERVER_NOT_LISTENING');
    }

    return this.#kernel.ipc;
  }

  /**
   * Registers middleware for all HTTP methods.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.use('/api', authenticate);
   * server.use(logger);
   * ```
   */
  use(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);
    this.#kernel.registerRouteEntry(undefined, routeEntry.pathnamePattern, routeEntry.middlewares);
    return this;
  }

  /**
   * Registers middleware for GET requests.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching GET requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.get('/users', getUsers);
   * ```
   */
  get(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);

    this.#kernel.registerRouteEntry('GET', routeEntry.pathnamePattern, routeEntry.middlewares);

    return this;
  }

  /**
   * Registers middleware for QUERY requests.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching QUERY requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.query('/users', queryUsers);
   * ```
   */
  query(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);

    this.#kernel.registerRouteEntry('QUERY', routeEntry.pathnamePattern, routeEntry.middlewares);

    return this;
  }

  /**
   * Registers middleware for POST requests.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching POST requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.post('/users', createUser);
   * ```
   */
  post(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);

    this.#kernel.registerRouteEntry('POST', routeEntry.pathnamePattern, routeEntry.middlewares);

    return this;
  }

  /**
   * Registers middleware for PUT requests.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching PUT requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.put('/users/:userId', updateUser);
   * ```
   */
  put(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);

    this.#kernel.registerRouteEntry('PUT', routeEntry.pathnamePattern, routeEntry.middlewares);

    return this;
  }

  /**
   * Registers middleware for PATCH requests.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching PATCH requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.patch('/users/:userId', patchUser);
   * ```
   */
  patch(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);

    this.#kernel.registerRouteEntry('PATCH', routeEntry.pathnamePattern, routeEntry.middlewares);

    return this;
  }

  /**
   * Registers middleware for DELETE requests.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching DELETE requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.delete('/users/:userId', deleteUser);
   * ```
   */
  delete(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);

    this.#kernel.registerRouteEntry('DELETE', routeEntry.pathnamePattern, routeEntry.middlewares);

    return this;
  }

  /**
   * Registers middleware for HEAD requests.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching HEAD requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.head('/users', checkUsers);
   * ```
   */
  head(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);

    this.#kernel.registerRouteEntry('HEAD', routeEntry.pathnamePattern, routeEntry.middlewares);

    return this;
  }

  /**
   * Registers middleware for TRACE requests.
   *
   * @param {PathnamePattern | MiddlewareFunction} pathnamePattern - The pathname pattern to match, or the first middleware function.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching TRACE requests.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * server.trace('/debug', traceRequest);
   * ```
   */
  trace(pathnamePattern, ...middlewares) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    const routeEntry = this.#ensureRouteEntry(pathnamePattern, middlewares);

    this.#kernel.registerRouteEntry('TRACE', routeEntry.pathnamePattern, routeEntry.middlewares);

    return this;
  }

  /**
   * Mounts a router instance at a specific pathname prefix.
   *
   * @param {PathnamePattern} pathnamePattern - Pathname prefix where the router is mounted.
   * @param {Router} router - Router instance to mount.
   * @returns {Server} The server instance.
   * @throws {ServerError} If the server is not in the idle state.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @example
   * ```js
   *
   * const api = new Router();
   * api.get('/users', getUsers);
   * api.post('/users', createUser);
   *
   * server.mount('/api', api);
   * ```
   */
  mount(pathnamePattern, router) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    assertPathnamePattern(pathnamePattern);
    assertRouter(router);
    this.#kernel.registerMountEntry(pathnamePattern, router);
    return this;
  }

  /**
   * Registers a custom handler for requests that do not match any route (404 Not Found).
   *
   * @param {NotFoundHandler} notFoundHandler - The handler function executed on unmatched routes.
   * @returns {Server} The server instance.
   * @throws {ServerError} If called in an invalid state.
   * @throws {ServerError} If the handler is not a function.
   * @throws {ServerError} If the handler does not declare exactly one parameter.
   * @example
   * ```js
   * server.notFound(exchange => {
   *   exchange.response.status(404).json({ error: 'Not Found' });
   * });
   * ```
   */
  notFound(notFoundHandler) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    assertNotFoundHandler(notFoundHandler);
    this.#kernel.notFound(notFoundHandler);
    return this;
  }

  /**
   * Registers a handler for errors raised during request processing.
   *
   * This handler is invoked when an error propagates through the exchange
   * processing pipeline.
   *
   * @param {SystemErrorHandler} systemErrorHandler - The error handling function.
   * @returns {Server} The server instance.
   * @throws {ServerError} If called in an invalid state.
   * @throws {ServerError} If the handler is not a function.
   * @throws {ServerError} If the handler does not declare exactly two parameters.
   * @example
   * ```js
   * server.systemError((error, exchange) => {
   *   console.error(error);
   *   exchange.response.status(500).json({ error: 'Internal Server Error' });
   * });
   * ```
   */
  systemError(systemErrorHandler) {
    this.#assertCurrentState(Server.#IDLE_STATE_ERRORS);
    assertSystemErrorHandler(systemErrorHandler);
    this.#kernel.systemError(systemErrorHandler);
    return this;
  }

  /**
   * Starts listening for incoming requests.
   *
   * Transitions the server state from 'idle' to 'starting', and upon success, to 'listening'.
   *
   * @returns {Promise<void>}
   * @throws {ServerError} If the server is not in the idle state, or if startup fails.
   * @example
   * ```js
   * await server.listen();
   * // Server is now listening.
   * ```
   *
   * @example
   * ```js
   * server.onListen(({ endpoint, address, elapsed }) => {
   *   console.log(`Server listening at ${endpoint.displayUrl} in ${elapsed}ms`);
   *   console.log(`Bound to ${address} (${address.family})`);
   *   // Bound to [::1]:3000 (IPv6)
   * });
   *
   * await server.listen();
   * ```
   */
  async listen() {
    this.#assertCurrentState(Server.#LISTEN_STATE_ERRORS);
    this.#transitionTo(Server.#STATES.STARTING);

    try {
      await this.#kernel.listen();
      this.#transitionTo(Server.#STATES.LISTENING);
    } catch (error) {
      this.#transitionTo(Server.#STATES.ERROR);
      throw error;
    }
  }

  /**
   * Stops the server and releases associated network resources.
   *
   * Transitions the server state to 'stopping' and then to 'closed'.
   *
   * @returns {Promise<void>}
   * @throws {ServerError} If the server is not listening or shutdown fails.
   * @example
   * ```js
   * // Graceful shutdown
   * process.on('SIGTERM', async () => {
   *   await server.close();
   *   process.exit(0);
   * });
   * ```
   */
  async close() {
    this.#assertCurrentState(Server.#CLOSE_STATE_ERRORS);
    this.#transitionTo(Server.#STATES.STOPPING);

    try {
      await this.#kernel.close();
      this.#transitionTo(Server.#STATES.CLOSED);
    } catch (error) {
      this.#transitionTo(Server.#STATES.ERROR);
      throw error;
    }
  }

  /**
   * @overload
   * @param {'listen'} event - Event name.
   * @param {ListenEventListener} listener - Function invoked when the server starts listening.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'close'} event - Event name.
   * @param {CloseEventListener} listener - Function invoked when the server closes.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'error'} event - Event name.
   * @param {ErrorEventListener} listener - Function invoked when a server-level error occurs.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:start'} event - Event name.
   * @param {ExchangeStartEventListener} listener - Function invoked during the exchange starts.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:end'} event - Event name.
   * @param {ExchangeEndEventListener} listener - Function invoked during the exchange ends.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:error'} event - Event name.
   * @param {ExchangeErrorEventListener} listener - Function invoked when an exchange fails.
   * @returns {Server} The server instance.
   */
  /**
   * Registers a listener for a server event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Function invoked when the event is emitted.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * server.on('listen', ({ endpoint, address, elapsed }) => {
   *   console.log(`Server listening at ${endpoint.displayUrl} in ${elapsed}ms`);
   *   console.log(`Bound to ${address} (${address.family})`);
   *   // Bound to [::1]:3000 (IPv6)
   * });
   * ```
   */
  on(event, listener) {
    this.#kernel.on(event, listener);
    return this;
  }

  /**
   * @overload
   * @param {'listen'} event - Event name.
   * @param {ListenEventListener} listener - Function invoked when the server starts listening.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'close'} event - Event name.
   * @param {CloseEventListener} listener - Function invoked when the server closes.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'error'} event - Event name.
   * @param {ErrorEventListener} listener - Function invoked when a server-level error occurs.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:start'} event - Event name.
   * @param {ExchangeStartEventListener} listener - Function invoked during the exchange starts.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:end'} event - Event name.
   * @param {ExchangeEndEventListener} listener - Function invoked during the exchange ends.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:error'} event - Event name.
   * @param {ExchangeErrorEventListener} listener - Function invoked when an exchange fails.
   * @returns {Server} The server instance.
   */
  /**
   * Registers a listener that is invoked only once for a server event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Function invoked when the event is emitted.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * server.once('listen', ({ endpoint }) => {
   *   console.log(`Server started at ${endpoint.displayUrl}`);
   * });
   * ```
   */
  once(event, listener) {
    this.#kernel.once(event, listener);
    return this;
  }

  /**
   * @overload
   * @param {'listen'} event - Event name.
   * @param {ListenEventListener} listener - Function invoked when the server starts listening.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'close'} event - Event name.
   * @param {CloseEventListener} listener - Function invoked when the server closes.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'error'} event - Event name.
   * @param {ErrorEventListener} listener - Function invoked when a server-level error occurs.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:start'} event - Event name.
   * @param {ExchangeStartEventListener} listener - Function invoked during the exchange starts.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:end'} event - Event name.
   * @param {ExchangeEndEventListener} listener - Function invoked during the exchange ends.
   * @returns {Server} The server instance.
   */
  /**
   * @overload
   * @param {'exchange:error'} event - Event name.
   * @param {ExchangeErrorEventListener} listener - Function invoked when an exchange fails.
   * @returns {Server} The server instance.
   */
  /**
   * Removes a listener from a server event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Listener to remove.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * const listener = () => {
   *   console.log('Server started');
   * };
   *
   * server.on('listen', listener);
   * server.off('listen', listener);
   * ```
   */
  off(event, listener) {
    this.#kernel.off(event, listener);
    return this;
  }

  /**
   * Registers a listener for the `listen` event.
   *
   * @param {(data: ListenEventData) => void} listener - Invoked when the server starts listening.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * server.onListen(({ endpoint, address, elapsed }) => {
   *   console.log(`Server listening at ${endpoint.displayUrl} in ${elapsed}ms`);
   *   console.log(`Bound to ${address} (${address.family})`);
   *   // Bound to [::1]:3000 (IPv6)
   * });
   * ```
   */
  onListen(listener) {
    this.#kernel.on('listen', listener);
    return this;
  }

  /**
   * Registers a listener for the `close` event.
   *
   * @param {(data: CloseEventData) => void} listener - Invoked when the server closes.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * server.onClose(({ elapsed }) => {
   *   console.log(`Server closed in ${elapsed}ms`);
   * });
   * ```
   */
  onClose(listener) {
    this.#kernel.on('close', listener);
    return this;
  }

  /**
   * Registers a listener for the `error` event.
   *
   * @param {(error: Error) => void} listener - Invoked when a server-level error occurs.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * server.onError(error => {
   *   console.error('Server error:', error);
   * });
   * ```
   */
  onError(listener) {
    this.#kernel.on('error', listener);
    return this;
  }

  /**
   * Registers a listener for the `exchange:start` event.
   *
   * @param {ExchangeStartEventListener} listener - Function invoked when an exchange starts.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * server.onExchangeStart(information => {
   *   console.log(
   *     information.id,
   *     information.request.method,
   *     information.request.pathname,
   *   );
   * });
   * ```
   */
  onExchangeStart(listener) {
    this.#kernel.on('exchange:start', listener);
    return this;
  }

  /**
   * Registers a listener for the `exchange:end` event.
   *
   * @param {ExchangeEndEventListener} listener - Function invoked when exchange processing ends.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * server.onExchangeEnd(information => {
   *   console.log(
   *     information.outcome,          // 'success' | 'error'
   *     information.timing.duration,  // number
   *   );
   * });
   * ```
   */
  onExchangeEnd(listener) {
    this.#kernel.on('exchange:end', listener);
    return this;
  }

  /**
   * Registers a listener for the `exchange:error` event.
   *
   * @param {ExchangeErrorEventListener} listener - Function invoked when an exchange fails.
   * @returns {Server} The server instance.
   *
   * @example
   * ```js
   * server.onExchangeError(information => {
   *   console.error(
   *     information.id,
   *     information.error,
   *     information.request.pathname,
   *   );
   * });
   * ```
   */
  onExchangeError(listener) {
    this.#kernel.on('exchange:error', listener);
    return this;
  }

  /**
   * Asynchronously disposes of the server resources.
   *
   * Enables the use of the `await using` statement to automatically
   * close the server when it goes out of scope.
   *
   * @returns {Promise<void>}
   * @async
   * @example
   * ```js
   * async function main() {
   *   await using server = new Server(configuration);
   *   await server.listen();
   *   // ... use server ...
   * } // ← `Symbol.asyncDispose` runs here.
   * ```
   */
  async [Symbol.asyncDispose]() {
    if (this.#state === Server.#STATES.LISTENING || this.#state === Server.#STATES.STARTING) {
      await this.close();
    }
  }

  /**
   * Validates that the current state allows an operation.
   *
   * @private
   * @param {Map<ServerState, string>} errorStates - Map containing invalid states and associated error codes.
   * @throws {ServerError} If the current state is restricted.
   */
  #assertCurrentState(errorStates) {
    const identifier = errorStates.get(this.#state);
    if (identifier !== undefined) {
      throw new ServerError(identifier);
    }
  }

  /**
   * Performs a safe state transition.
   *
   * @private
   * @param {ServerState} nextState - Target lifecycle state.
   */
  #transitionTo(nextState) {
    this.#assertTransition(nextState);
    this.#state = nextState;
  }

  /**
   * Validates whether a state transition is permitted.
   *
   * @private
   * @param {ServerState} nextState - Target lifecycle state.
   * @throws {ServerError} If the transition is disallowed by the state machine.
   */
  #assertTransition(nextState) {
    const transitions = Server.#TRANSITIONS.get(this.#state);

    if (!transitions.has(nextState)) {
      throw new ServerError('SERVER_INVALID_STATE_TRANSITION', {
        values: {
          from: this.#state,
          to: nextState,
        },
      });
    }
  }

  #ensureRouteEntry(pathnamePattern, middlewares) {
    if (typeof pathnamePattern === 'string') {
      assertPathnamePattern(pathnamePattern);
      assertMiddlewares(middlewares);

      return {
        pathnamePattern,
        middlewares,
      };
    }

    const normalizedMiddlewares = [pathnamePattern, ...middlewares];

    assertMiddlewares(normalizedMiddlewares);

    return {
      pathnamePattern: undefined,
      middlewares: normalizedMiddlewares,
    };
  }

  /**
   * Enumeration of server lifecycle states.
   *
   * @private
   * @readonly
   * @enum {ServerState}
   */
  static #STATES = Object.freeze({
    IDLE: 'idle',
    STARTING: 'starting',
    LISTENING: 'listening',
    STOPPING: 'stopping',
    CLOSED: 'closed',
    ERROR: 'error',
  });

  /**
   * Allowed state transition rules map.
   *
   * @private
   * @type {Map<ServerState, Set<ServerState>>}
   */
  static #TRANSITIONS = new Map([
    [Server.#STATES.IDLE, new Set([Server.#STATES.STARTING])],
    [Server.#STATES.STARTING, new Set([Server.#STATES.LISTENING, Server.#STATES.ERROR])],
    [Server.#STATES.LISTENING, new Set([Server.#STATES.STOPPING, Server.#STATES.ERROR])],
    [Server.#STATES.STOPPING, new Set([Server.#STATES.CLOSED, Server.#STATES.ERROR])],
    [Server.#STATES.CLOSED, new Set()],
    [Server.#STATES.ERROR, new Set()],
  ]);

  /**
   * Error mappings for configuration methods when server is busy or unready.
   *
   * @private
   * @type {Map<ServerState, string>}
   */
  static #IDLE_STATE_ERRORS = new Map([
    [Server.#STATES.STARTING, 'SERVER_ALREADY_STARTING'],
    [Server.#STATES.LISTENING, 'SERVER_ALREADY_LISTENING'],
    [Server.#STATES.STOPPING, 'SERVER_STOPPING'],
    [Server.#STATES.CLOSED, 'SERVER_CLOSED'],
    [Server.#STATES.ERROR, 'SERVER_ERROR'],
  ]);

  /**
   * Error mappings when attempting to call listen() in an invalid state.
   *
   * @private
   * @type {Map<ServerState, string>}
   */
  static #LISTEN_STATE_ERRORS = new Map([
    [Server.#STATES.STARTING, 'SERVER_ALREADY_STARTING'],
    [Server.#STATES.LISTENING, 'SERVER_ALREADY_LISTENING'],
    [Server.#STATES.STOPPING, 'SERVER_STOPPING'],
    [Server.#STATES.CLOSED, 'SERVER_CLOSED'],
    [Server.#STATES.ERROR, 'SERVER_ERROR'],
  ]);

  /**
   * Error mappings when attempting to call close() in an invalid state.
   *
   * @private
   * @type {Map<ServerState, string>}
   */
  static #CLOSE_STATE_ERRORS = new Map([
    [Server.#STATES.IDLE, 'SERVER_NOT_LISTENING'],
    [Server.#STATES.STARTING, 'SERVER_NOT_LISTENING'],
    [Server.#STATES.STOPPING, 'SERVER_ALREADY_STOPPING'],
    [Server.#STATES.CLOSED, 'SERVER_CLOSED'],
    [Server.#STATES.ERROR, 'SERVER_ERROR'],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Server;
