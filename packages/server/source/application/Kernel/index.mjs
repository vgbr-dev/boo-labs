// @ts-check
/**
 * @file Central orchestration component of the HTTP server runtime.
 *
 * @description Central orchestration component of the HTTP server runtime.
 *
 * Kernel coordinates the server lifecycle, request processing pipeline,
 * exchange lifecycle events, and server-level error handling. It delegates
 * transport operations such as listening and closing to their corresponding
 * use cases while retaining control over the HTTP execution flow.
 *
 * The kernel does not expose the underlying HTTP adapter directly. Instead,
 * it composes the adapter-dependent use cases and provides the runtime
 * behavior required by HttpServer.
 *
 * @module Kernel
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES

// » IMPORT THIRD PARTY MODULES

// » IMPORT LOCAL MODULES
import RouterSystem from '#routing/RouterSystem';
import EventSystem from '#EventSystem';
import IPCMain from '#IPCMain';
import ListenServer from '#use-cases/ListenServer';
import CloseServer from '#use-cases/CloseServer';
import TransportResolver from '#resolvers/TransportResolver';
import Exchange, { discardResponseState } from '#Exchange';
import ServerError from '#shared/errors/ServerError';
import ExchangeLayerBuilder from '#ExchangeLayerBuilder';
import { composeConfiguration } from '#configurations/ServerConfiguration';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a Node.js HTTP/1.1 or HTTPS/1.1 incoming request.
 *
 * @typedef {import('node:http').IncomingMessage} HttpIncomingMessage
 */

/**
 * Represents a Node.js HTTP/2 incoming request.
 *
 * @typedef {import('node:http2').Http2ServerRequest} Http2IncomingMessage
 */

/**
 * Represents a Node.js HTTP/1.1 response.
 *
 * @typedef {import('node:http').ServerResponse} HttpServerResponse
 */

/**
 * Represents a Node.js HTTP/2 response.
 *
 * @typedef {import('node:http2').Http2ServerResponse} Http2ServerResponse
 */

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
 * Represents the network options used to start the server.
 *
 * @typedef {import('#ServerOptions/ListenOptions').ListenOptionsData} ListenOptions
 */

/**
 * Represents the options forwarded to the Request constructor.
 *
 * @typedef {import('#ServerOptions/RequestOptions').RequestOptionsData} RequestOptions
 */

/**
 * Represents the options forwarded to the Response constructor.
 *
 * @typedef {import('#ServerOptions/ResponseOptions').ResponseOptionsData} ResponseOptions
 */

/**
 * Represents an HTTP method supported by the routing layer.
 *
 * @typedef {import('#routing/ExchangeLayer').HTTPMethod} HTTPMethod
 */

/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#routing/ExchangeLayer').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Represents a router instance.
 *
 * @typedef {import('#routing/Router').default} Router
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
 * Represents the processing outcome of an HTTP exchange.
 *
 * @typedef {import('#Exchange').ExchangeOutcome} ExchangeOutcome
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
 * Represents an incoming request supported by the transport abstraction.
 *
 * @typedef {HttpIncomingMessage|Http2IncomingMessage} IncomingRequest
 */

/**
 * Represents a response supported by the transport abstraction.
 *
 * @typedef {HttpServerResponse|Http2ServerResponse} ServerResponse
 */

/**
 * Represents the connection options forwarded to the transport adapter.
 *
 * @typedef {ServerConfiguration['connection']} ServerConnectionOptions
 */

/**
 * Represents the transport identifier used to resolve the transport adapter.
 *
 * @typedef {ServerConfiguration['transport']} ServerTransportOption
 */

/**
 * Callback invoked to resolve a not-found exchange.
 *
 * @typedef {(exchange: Exchange) => void|Promise<void>} NotFoundHandler
 */

/**
 * Callback invoked to resolve a system error exchange.
 *
 * @typedef {(error: Error, exchange: Exchange) => void|Promise<void>} SystemErrorHandler
 */

/**
 * Represents an event name accepted by the kernel event system.
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
 * Represents a listener registered for a kernel event.
 *
 * @typedef {(data?: any) => void} EventListener
 */

/**
 * Represents a successful pipeline execution.
 *
 * @typedef  {object} PipelineExecutionSuccess
 * @property {true}   success                  - Indicates that the pipeline completed successfully.
 */

/**
 * Represents a failed pipeline execution.
 *
 * @typedef  {object} PipelineExecutionFailure
 * @property {false}  success                  - Indicates that the pipeline failed.
 * @property {Error}  error                    - The error raised during pipeline execution.
 */

/**
 * Represents the outcome of pipeline execution.
 *
 * @typedef {PipelineExecutionSuccess|PipelineExecutionFailure} PipelineExecutionResult
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Normalizes a thrown value into an `Error` instance.
 *
 * - `Error` instances (including subclasses) are returned as-is.
 * - Any other value is converted to an `Error` whose message is `String(value)`.
 *
 * @private
 * @param {unknown} error - The value thrown or rejected.
 * @returns {Error} The normalized error instance.
 */
const normalizeError = error => {
  return error instanceof Error ? error : new Error(String(error));
};

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Coordinates the HTTP server lifecycle and request execution pipeline.
 *
 * @classdesc Kernel acts as the central orchestration component between the
 * public HttpServer API and the application-level HTTP runtime. It manages
 * server lifecycle operations, registers pipeline entries, creates exchange
 * contexts, emits lifecycle events, and handles errors occurring during
 * server or exchange execution.
 *
 * Transport-specific lifecycle operations are delegated to ListenServer
 * and CloseServer. Request delivery is connected directly to the transport
 * adapter and routed into the exchange processing pipeline.
 */
class Kernel {
  /**
   * Resolved transport adapter instance.
   *
   * @type {TransportAdapter}
   */
  #server;

  /**
   * Network configuration used to start the server.
   *
   * @type {ListenOptions|undefined}
   */
  #listenOptions;

  /**
   * Options forwarded to the Request constructor.
   *
   * @type {RequestOptions|undefined}
   */
  #requestOptions;

  /**
   * Options forwarded to the Response constructor.
   *
   * @type {ResponseOptions|undefined}
   */
  #responseOptions;

  /**
   * Use case responsible for starting the server.
   *
   * @type {ListenServer}
   */
  #listenServer;

  /**
   * Use case responsible for stopping the server.
   *
   * @type {CloseServer}
   */
  #closeServer;

  /**
   * Routing system responsible for registering routes and executing the pipeline.
   *
   * @type {RouterSystem}
   */
  #routerSystem = new RouterSystem();

  /**
   * Event system used to report kernel lifecycle and exchange events.
   *
   * @type {EventSystem}
   */
  #eventSystem = new EventSystem();

  /**
   * IPC subsystem owned by the kernel.
   *
   * @type {IPCMain}
   */
  #ipc;

  /**
   * User-provided handler for not-found exchanges.
   *
   * @type {NotFoundHandler|null}
   */
  #notFoundHandler = null;

  /**
   * User-provided handler for system error exchanges.
   *
   * @type {SystemErrorHandler|null}
   */
  #systemErrorHandler = null;

  /**
   * Creates an HTTP kernel.
   *
   * @param {ServerConfiguration} configuration - Configuration options for server startup.
   * @example
   * ```js
   * const configuration = new HttpsServerConfiguration({
   *   listen: {
   *     host: 'localhost',
   *     port: 3443,
   *   },
   *   connection: {
   *     cert: './cert.pem',
   *     key: './key.pem',
   *   },
   * });
   *
   * const kernel = new Kernel(configuration);
   * ```
   */
  constructor(configuration) {
    const { serverOptions, middlewareOptions } = composeConfiguration(configuration);

    this.#server = Kernel.#ensureAdapter(serverOptions.transport, serverOptions.connection);
    this.#listenOptions = serverOptions.listen;
    this.#requestOptions = serverOptions.request;
    this.#responseOptions = serverOptions.response;

    this.#listenServer = new ListenServer(this.#server);
    this.#closeServer = new CloseServer(this.#server);
    this.#ipc = new IPCMain(this.#server);

    const layerOptions = ExchangeLayerBuilder.build(middlewareOptions);

    this.#routerSystem.registerLayerOptionsBatch(layerOptions);

    /**
     * Handles one incoming HTTP request.
     *
     * @param {IncomingRequest} incomingMessage - Native Node.js incoming HTTP message.
     * @param {ServerResponse} serverResponse - Native Node.js outgoing HTTP message.
     * @returns {void}
     */
    const onRequestHandler = (incomingMessage, serverResponse) => {
      void this.#handleExchange(incomingMessage, serverResponse);
    };

    this.#server.onRequest(onRequestHandler);
  }

  /**
   * Returns whether the server is currently listening for requests.
   *
   * @readonly
   * @type {boolean}
   */
  get listening() {
    return this.#server.listening;
  }

  /**
   * The IPC subsystem owned by the kernel.
   *
   * @readonly
   * @type {IPCMain}
   */
  get ipc() {
    return this.#ipc;
  }

  /**
   * @overload
   * @param {'listen'} event - Event name.
   * @param {ListenEventListener} listener - Function invoked when the server starts listening.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'close'} event - Event name.
   * @param {CloseEventListener} listener - Function invoked when the server closes.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'error'} event - Event name.
   * @param {ErrorEventListener} listener - Function invoked when a server-level error occurs.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:start'} event - Event name.
   * @param {ExchangeStartEventListener} listener - Function invoked during the exchange starts.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:end'} event - Event name.
   * @param {ExchangeEndEventListener} listener - Function invoked during the exchange ends.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:error'} event - Event name.
   * @param {ExchangeErrorEventListener} listener - Function invoked when an exchange fails.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * Registers a listener for a kernel event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Function invoked when the event is emitted.
   * @returns {Kernel} The current kernel instance.
   * @example
   * ```js
   * kernel.onListen(({ endpoint, address, elapsed }) => {
   *   console.log(`Server listening at ${endpoint.displayUrl} in ${elapsed}ms`);
   *   console.log(`Bound to ${address} (${address.family})`);
   *   // Bound to [::1]:3000 (IPv6)
   * });
   * ```
   */
  on(event, listener) {
    this.#eventSystem.on(event, listener);
    return this;
  }

  /**
   * @overload
   * @param {'listen'} event - Event name.
   * @param {ListenEventListener} listener - Function invoked when the server starts listening.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'close'} event - Event name.
   * @param {CloseEventListener} listener - Function invoked when the server closes.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'error'} event - Event name.
   * @param {ErrorEventListener} listener - Function invoked when a server-level error occurs.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:start'} event - Event name.
   * @param {ExchangeStartEventListener} listener - Function invoked during the exchange starts.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:end'} event - Event name.
   * @param {ExchangeEndEventListener} listener - Function invoked during the exchange ends.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:error'} event - Event name.
   * @param {ExchangeErrorEventListener} listener - Function invoked when an exchange fails.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * Registers a listener that is invoked only once for a kernel event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Function invoked when the event is emitted.
   * @returns {Kernel} The current kernel instance.
   * @example
   * ```js
   * kernel.once('listen', ({ endpoint }) => {
   *   console.log(`Server started at ${endpoint.displayUrl}`);
   * });
   * ```
   */
  once(event, listener) {
    this.#eventSystem.once(event, listener);
    return this;
  }

  /**
   * @overload
   * @param {'listen'} event - Event name.
   * @param {ListenEventListener} listener - Function invoked when the server starts listening.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'close'} event - Event name.
   * @param {CloseEventListener} listener - Function invoked when the server closes.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'error'} event - Event name.
   * @param {ErrorEventListener} listener - Function invoked when a server-level error occurs.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:start'} event - Event name.
   * @param {ExchangeStartEventListener} listener - Function invoked during the exchange starts.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:end'} event - Event name.
   * @param {ExchangeEndEventListener} listener - Function invoked during the exchange ends.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * @overload
   * @param {'exchange:error'} event - Event name.
   * @param {ExchangeErrorEventListener} listener - Function invoked when an exchange fails.
   * @returns {Kernel} The current kernel instance.
   */
  /**
   * Removes a listener from a kernel event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Listener to remove.
   * @returns {Kernel} The current kernel instance.
   * @example
   * ```js
   * const listener = () => {
   *   console.log('Server started');
   * };
   *
   * kernel.on('listen', listener);
   * kernel.off('listen', listener);
   * ```
   */
  off(event, listener) {
    this.#eventSystem.off(event, listener);
    return this;
  }

  /**
   * Registers a listener for the `listen` event.
   *
   * @param {ListenEventListener} listener - Function invoked when the server starts listening.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.onListen(({ endpoint, address, elapsed }) => {
   *   console.log(`Server listening at ${endpoint.displayUrl} in ${elapsed}ms`);
   *   console.log(`Bound to ${address} (${address.family})`);
   *   // Bound to [::1]:3000 (IPv6)
   * });
   * ```
   */
  onListen(listener) {
    this.#eventSystem.on(Kernel.#EVENTS.LISTEN, listener);
    return this;
  }

  /**
   * Registers a listener for the `close` event.
   *
   * @param {CloseEventListener} listener - Function invoked when the server closes.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.onClose(({ elapsed }) => {
   *   console.log(`Server closed in ${elapsed}ms`);
   * });
   * ```
   */
  onClose(listener) {
    this.#eventSystem.on(Kernel.#EVENTS.CLOSE, listener);
    return this;
  }

  /**
   * Registers a listener for the `error` event.
   *
   * @param {ErrorEventListener} listener - Function invoked when a server-level error occurs.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.onError(error => {
   *   console.error('Server error:', error);
   * });
   * ```
   */
  onError(listener) {
    this.#eventSystem.on(Kernel.#EVENTS.ERROR, listener);
    return this;
  }

  /**
   * Registers a listener for the `exchange:start` event.
   *
   * @param {ExchangeStartEventListener} listener - Function invoked when an exchange starts.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.onExchangeStart(information => {
   *   console.log(
   *     information.id,
   *     information.request.method,
   *     information.request.pathname,
   *   );
   * });
   * ```
   */
  onExchangeStart(listener) {
    this.#eventSystem.on(Kernel.#EVENTS.EXCHANGE_START, listener);
    return this;
  }

  /**
   * Registers a listener for the `exchange:end` event.
   *
   * @param {ExchangeEndEventListener} listener - Function invoked when exchange processing ends.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.onExchangeEnd(information => {
   *   console.log(
   *     information.outcome,          // 'success' | 'error'
   *     information.timing.duration,  // number
   *   );
   * });
   * ```
   */
  onExchangeEnd(listener) {
    this.#eventSystem.on(Kernel.#EVENTS.EXCHANGE_END, listener);
    return this;
  }

  /**
   * Registers a listener for the `exchange:error` event.
   *
   * @param {ExchangeErrorEventListener} listener - Function invoked when an exchange fails.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.onExchangeError(information => {
   *   console.error(
   *     information.id,
   *     information.error,
   *     information.request.pathname,
   *   );
   * });
   * ```
   */
  onExchangeError(listener) {
    this.#eventSystem.on(Kernel.#EVENTS.EXCHANGE_ERROR, listener);
    return this;
  }

  /**
   * Registers a route entry.
   *
   * @param {HTTPMethod|undefined} method - The HTTP method to match.
   * @param {string|undefined} pathnamePattern - The URL pathname pattern to match.
   * @param {MiddlewareFunction[]} middlewares - The middleware functions to execute.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.registerRouteEntry('GET', '/users', [
   *   async (exchange, next) => {
   *     exchange.response.json({ users: [] });
   *     await next();
   *   },
   * ]);
   * ```
   */
  registerRouteEntry(method, pathnamePattern, middlewares) {
    this.#routerSystem.registerRouteEntry(method, pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers a mounted router by prefixing its routes with a base pathname pattern.
   *
   * @param {string} basePathnamePattern - The base URL pathname pattern to prefix.
   * @param {Router} router - The router instance to mount.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * const usersRouter = new Router();
   *
   * usersRouter.get('/users', async exchange => {
   *   exchange.response.json({ users: [] });
   * });
   *
   * kernel.registerMountEntry('/api', usersRouter);
   * ```
   */
  registerMountEntry(basePathnamePattern, router) {
    this.#routerSystem.registerMountEntry(basePathnamePattern, router);
    return this;
  }

  /**
   * Registers a handler for not-found exchanges.
   *
   * @param {NotFoundHandler} handler - Handler invoked when no route matches the exchange.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.notFound(exchange => {
   *   exchange.response.status(404).json({
   *     error: 'Resource not found',
   *   });
   * });
   * ```
   */
  notFound(handler) {
    this.#notFoundHandler = handler;
    return this;
  }

  /**
   * Registers a handler for system errors raised during exchange processing.
   *
   * @param {SystemErrorHandler} handler - Handler invoked when an exchange fails.
   * @returns {Kernel} The current kernel instance.
   *
   * @example
   * ```js
   * kernel.systemError((error, exchange) => {
   *   console.error(error);
   *
   *   exchange.response.status(500).json({
   *     error: 'Request failed',
   *   });
   * });
   * ```
   */
  systemError(handler) {
    this.#systemErrorHandler = handler;
    return this;
  }

  /**
   * Starts the HTTP server.
   *
   * @returns {Promise<void>} Resolves when the server has successfully started listening.
   * @throws {ServerError} Thrown when the server cannot start listening.
   *
   * @example
   * ```js
   * await kernel.listen();
   *
   * console.log('Server started');
   * ```
   */
  async listen() {
    const startedAt = performance.now();

    try {
      await this.#listenServer.execute(this.#listenOptions);
    } catch (error) {
      const serverError = new ServerError('SERVER_LISTEN_FAILED', { cause: normalizeError(error) });
      this.#emit(Kernel.#EVENTS.ERROR, serverError);
      throw serverError;
    }

    this.#emit(Kernel.#EVENTS.LISTEN, {
      endpoint: this.#server.endpoint(),
      address: this.#server.address(),
      elapsed: Math.round(performance.now() - startedAt),
    });
  }

  /**
   * Closes the HTTP server.
   *
   * @returns {Promise<void>} Resolves when the server has successfully closed.
   * @throws {ServerError} Thrown when the server cannot be closed successfully.
   *
   * @example
   * ```js
   * await kernel.close();
   *
   * console.log('Server closed');
   * ```
   */
  async close() {
    const startedAt = performance.now();

    if (this.#server.listening) {
      this.#closeIPC();

      try {
        await this.#closeServer.execute();
      } catch (error) {
        const serverError = new ServerError('SERVER_CLOSE_FAILED', {
          cause: normalizeError(error),
        });

        this.#emit(Kernel.#EVENTS.ERROR, serverError);

        throw serverError;
      }

      this.#emit(Kernel.#EVENTS.CLOSE, {
        elapsed: Math.round(performance.now() - startedAt),
      });
    }
  }

  /**
   * Processes a single HTTP exchange.
   *
   * @param {IncomingRequest} incomingMessage - Native Node.js incoming HTTP message.
   * @param {ServerResponse} serverResponse - Native Node.js outgoing HTTP message.
   * @returns {Promise<void>} Resolves when the exchange lifecycle has completed.
   */
  async #handleExchange(incomingMessage, serverResponse) {
    const exchange = this.#createExchange(incomingMessage, serverResponse);

    if (exchange !== null) {
      await this.#processExchange(exchange);
    }
  }

  /**
   * Creates an exchange for an incoming HTTP request.
   *
   * If initialization fails, emits a server-level error and attempts to send
   * a minimal `500` response.
   *
   * @param {IncomingRequest} incomingMessage - Incoming HTTP request.
   * @param {ServerResponse} serverResponse - Outgoing HTTP response.
   * @returns {Exchange|null} The created exchange, or `null` if initialization fails.
   */
  #createExchange(incomingMessage, serverResponse) {
    try {
      return new Exchange(incomingMessage, serverResponse, {
        request: this.#requestOptions,
        response: this.#responseOptions,
        onCommitError: (error, exchangeSource) => {
          this.#emitExchangeError(error, exchangeSource);
        },
      });
    } catch (error) {
      const serverError = new ServerError('SERVER_EXCHANGE_INIT_FAILED', {
        cause: normalizeError(error),
      });
      this.#emit(Kernel.#EVENTS.ERROR, serverError);

      if (!serverResponse.headersSent && !serverResponse.writableEnded) {
        serverResponse.statusCode = 500;
        serverResponse.end();
      }

      return null;
    }
  }

  /**
   * Handles an exchange processing error and attempts to produce an error response.
   *
   * @param {Error} error - The error raised during exchange processing.
   * @param {Exchange} exchange - The exchange associated with the error.
   * @returns {Promise<void>} Resolves when the error has been handled.
   */
  async #handleExchangeError(error, exchange) {
    this.#emitExchangeError(error, exchange);

    if (!exchange.response.isCommitted) {
      discardResponseState(exchange.response);

      try {
        await this.#handleSystemError(error, exchange);
      } finally {
        exchange.response.end();
      }
    }
  }

  /**
   * Processes an exchange and emits its lifecycle events.
   *
   * Lifecycle events are emitted with the snapshot produced by
   * `Exchange.createSnapshot`:
   *
   * - `exchange:start` carries a `pending` snapshot.
   * - `exchange:end` carries a terminal snapshot (success or error).
   * - `exchange:error` carries the snapshot of a failure observed before or during commit.
   *
   * @param {Exchange} exchange - The exchange to process.
   */
  async #processExchange(exchange) {
    this.#emit(
      Kernel.#EVENTS.EXCHANGE_START,
      Exchange.createSnapshot(exchange, 'pending', undefined, undefined),
    );

    const result = await this.#runPipeline(exchange);

    try {
      if (!result.success) {
        await this.#handleExchangeError(result.error, exchange);
      }
    } finally {
      const endedAt = performance.now();

      this.#emit(
        Kernel.#EVENTS.EXCHANGE_END,
        Exchange.createSnapshot(
          exchange,
          result.success ? 'success' : 'error',
          endedAt,
          result.success ? undefined : result.error,
        ),
      );
    }
  }

  /**
   * Executes the exchange pipeline and captures its outcome.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @returns {Promise<PipelineExecutionResult>} The pipeline execution result.
   */
  async #runPipeline(exchange) {
    try {
      await this.#routerSystem.executePipeline(exchange, this.#handleNotFound);

      if (!exchange.response.isCommitted) {
        exchange.response.end();
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error),
      };
    }
  }

  /**
   * Handles an exchange that did not match any route.
   *
   * @type {(exchange: Exchange) => Promise<void>}
   */
  #handleNotFound = async exchange => {
    if (this.#notFoundHandler === null) {
      exchange.response.status(404).json({ error: 'Not Found' });
    } else {
      await this.#notFoundHandler(exchange);
    }
  };

  /**
   * Handles a system error raised during exchange processing.
   *
   * @param {Error} error - Error raised during exchange processing.
   * @param {Exchange} exchange - Exchange associated with the failed request.
   * @returns {Promise<void>} Resolves when the system error handler has completed.
   */
  async #handleSystemError(error, exchange) {
    if (this.#systemErrorHandler === null) {
      exchange.response.status(500).json({ error: 'Internal Server Error' });
    } else {
      await this.#systemErrorHandler(error, exchange);
    }
  }

  /**
   * Emits a kernel event.
   *
   * @param {EventName} event - Event name.
   * @param {unknown} [eventPayload] - Optional event payload.
   * @returns {void}
   */
  #emit(event, eventPayload) {
    this.#eventSystem.emit(event, eventPayload);
  }

  /**
   * Emits an exchange error event.
   *
   * @param {Error} error - The error to report.
   * @param {Exchange} exchange - The exchange associated with the error.
   */
  #emitExchangeError(error, exchange) {
    this.#emit(
      Kernel.#EVENTS.EXCHANGE_ERROR,
      Exchange.createSnapshot(exchange, 'error', undefined, error),
    );
  }

  /**
   * Closes the IPC subsystem without propagating close failures.
   *
   * Invoked during kernel shutdown. Failures are intentionally ignored
   * because the server is already shutting down.
   */
  #closeIPC() {
    try {
      this.#ipc.close();
    } catch {
      // Ignore IPC close failures — the server is shutting down.
    }
  }

  /**
   * Kernel lifecycle event names.
   *
   * @type {Readonly<{
   * EXCHANGE_START: 'exchange:start',
   * EXCHANGE_END: 'exchange:end',
   * EXCHANGE_ERROR: 'exchange:error',
   * LISTEN: 'listen',
   * CLOSE: 'close',
   * ERROR: 'error'
   * }>}
   */
  static #EVENTS = Object.freeze({
    EXCHANGE_START: 'exchange:start',
    EXCHANGE_END: 'exchange:end',
    EXCHANGE_ERROR: 'exchange:error',
    LISTEN: 'listen',
    CLOSE: 'close',
    ERROR: 'error',
  });

  /**
   * Resolves and creates the transport adapter for the server.
   *
   * @param {ServerTransportOption} transport - Transport identifier used to resolve the adapter.
   * @param {ServerConnectionOptions} connection - Connection options passed to the adapter.
   * @returns {TransportAdapter} The initialized transport adapter.
   * @throws {ServerError} Thrown when the transport adapter cannot be resolved or initialized.
   */
  static #ensureAdapter(transport, connection) {
    try {
      const Adapter = TransportResolver.resolve(transport);
      return new Adapter(connection);
    } catch (error) {
      throw new ServerError('SERVER_ADAPTER_INIT_FAILED', { cause: normalizeError(error) });
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Kernel;
