// @ts-check
/**
 * @file Defines the Exchange abstraction.
 *
 * @description An Exchange represents a single HTTP transaction. It
 * composes a `Request`, a `Response`, and a private `ExchangeContext`
 * that carries runtime-only execution data such as telemetry, cancellation,
 * and correlation identifiers. It also exposes mutable per-request state
 * shared between middleware layers.
 *
 * The exchange is the unit of work processed by the pipeline. It is
 * created by the runtime from the incoming request and outgoing
 * response objects and does not expose those objects to consumers.
 *
 * @module Exchange
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Request from '#Request';
import Response from '#Response';
import ExchangeContext from './ExchangeContext.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Response operation error.
 *
 * @typedef {import('#shared/errors/ResponseError').default} ResponseError
 */

/**
 * Represents an incoming HTTP/1.1 or HTTPS/1.1 request message from Node.js.
 *
 * @typedef {import('node:http').IncomingMessage} HttpIncomingMessage
 */

/**
 * Represents an incoming HTTP/2 request message from Node.js.
 *
 * @typedef {import('node:http2').Http2ServerRequest} Http2IncomingMessage
 */

/**
 * Represents an incoming request message supported by the server.
 *
 * @typedef {HttpIncomingMessage|Http2IncomingMessage} IncomingRequest
 */

/**
 * Represents a native Node.js HTTP/1.1 server response.
 *
 * @typedef {import('node:http').ServerResponse} HttpServerResponse
 */

/**
 * Represents a native Node.js HTTP/2 server response.
 *
 * @typedef {import('node:http2').Http2ServerResponse} Http2ServerResponse
 */

/**
 * Represents a native Node.js server response.
 *
 * @typedef {HttpServerResponse|Http2ServerResponse} ServerResponse
 */

/**
 * Represents a native Node.js transform stream.
 *
 * @typedef {import('node:stream').Transform} NodeTransform
 */

/**
 * Options forwarded to the `Request` constructor.
 *
 * @typedef  {object}         ExchangeRequestOptions
 * @property {number}         [bodyLimit]            - Maximum number of bytes allowed for the request body.
 * @property {boolean|number} [trustProxy]           - Whether (and how much) to trust proxy headers.
 */

/**
 * Options forwarded to the `Response` constructor.
 *
 * @typedef  {object}  ExchangeResponseOptions
 * @property {boolean} [etag]                  - Whether to generate a weak ETag for buffered bodies.
 * @property {string}  [defaultCharset]        - Charset appended to eligible Content-Type headers when none is set.
 */

/**
 * Callback invoked when response commitment produces an error.
 *
 * @typedef {(error: Error, exchange: Exchange) => void} ExchangeCommitErrorHook
 */

/**
 * Defines the options supported by an exchange.
 *
 * @typedef  {object}                  ExchangeOptions
 * @property {ExchangeRequestOptions}  [request]       - Options forwarded to the `Request` constructor.
 * @property {ExchangeResponseOptions} [response]      - Options forwarded to the `Response` constructor.
 * @property {ExchangeCommitErrorHook} [onCommitError] - Optional callback invoked when response commitment produces an error.
 */

/**
 * Represents the processing outcome of an HTTP exchange.
 *
 * @typedef {'pending'|'success'|'error'} ExchangeOutcome
 */

/**
 * Represents timing information captured when exchange processing starts.
 *
 * @typedef  {object}    ExchangeStartTiming
 * @property {number}    startedAt           - Monotonic timestamp captured when processing started.
 * @property {undefined} endedAt             - Timestamp is unavailable before processing ends.
 * @property {undefined} duration            - Duration is unavailable before processing ends.
 */

/**
 * Represents timing information captured for a non-terminal exchange error.
 *
 * @typedef  {object}    ExchangeErrorTiming
 * @property {number}    startedAt           - Monotonic timestamp captured when processing started.
 * @property {undefined} endedAt             - Not available in a non-terminal error snapshot.
 * @property {undefined} duration            - Not available in a non-terminal error snapshot.
 */

/**
 * Represents timing information captured when exchange processing ends.
 *
 * @typedef  {object} ExchangeEndTiming
 * @property {number} startedAt         - Monotonic timestamp captured when processing started.
 * @property {number} endedAt           - Monotonic timestamp captured when processing ended.
 * @property {number} duration          - Elapsed processing time in milliseconds, rounded.
 */

/**
 * Contains a snapshot of the relevant HTTP request information.
 *
 * @typedef  {object}           ExchangeRequestInfo
 * @property {string|undefined} method              The HTTP method used by the request, or `undefined` if unavailable.
 * @property {string}           pathname            The URL pathname requested by the client.
 * @property {string|undefined} ip                  The IP address associated with the request, or `undefined` if unavailable.
 * @property {string|undefined} userAgent           The value of the request's `User-Agent` header, or `undefined` if the header is absent.
 */

/**
 * Contains a snapshot of the relevant HTTP response information.
 *
 * @typedef  {object} ExchangeResponseInfo
 * @property {number} statusCode           The HTTP status code assigned to the response.
 */

/**
 * Provides information about an exchange when processing starts.
 *
 * @typedef  {object}               ExchangeStartInfo
 * @property {string}               id                - Unique identifier assigned to the exchange.
 * @property {string}               traceId           - Identifier used to correlate related operations.
 * @property {ExchangeStartTiming}  timing            - Timing information captured at processing start.
 * @property {ExchangeRequestInfo}  request           - Request information captured for the exchange.
 * @property {ExchangeResponseInfo} response          - Response information captured for the exchange.
 * @property {'pending'}            outcome           - Processing outcome at the time of the snapshot.
 * @property {undefined}            error             - No processing error has been recorded in this snapshot.
 */

/**
 * Provides information about an exchange when processing fails.
 *
 * @typedef  {object}               ExchangeErrorInfo
 * @property {string}               id                - Unique identifier assigned to the exchange.
 * @property {string}               traceId           - Identifier used to correlate related operations.
 * @property {ExchangeErrorTiming}  timing            - Timing information captured when processing ended.
 * @property {ExchangeRequestInfo}  request           - Request information captured for the exchange.
 * @property {ExchangeResponseInfo} response          - Response information captured for the exchange.
 * @property {'error'}              outcome           - Indicates that exchange processing failed.
 * @property {Error}                error             - Error that caused exchange processing to fail.
 */

/**
 * Provides information about an exchange when processing completes.
 *
 * @typedef  {object}               ExchangeEndInfo
 * @property {string}               id              - Unique identifier assigned to the exchange.
 * @property {string}               traceId         - Identifier used to correlate related operations.
 * @property {ExchangeEndTiming}    timing          - Timing information captured when processing ended.
 * @property {ExchangeRequestInfo}  request         - Request information captured for the exchange.
 * @property {ExchangeResponseInfo} response        - Response information captured for the exchange.
 * @property {'success'|'error'}    outcome         - Indicates whether exchange processing succeeded or failed.
 * @property {Error|undefined}      error           - Error associated with the exchange, if one occurred.
 */

/**
 * Represents an exchange snapshot for any supported processing outcome.
 *
 * @typedef {ExchangeStartInfo|ExchangeErrorInfo|ExchangeEndInfo} ExchangeInfo
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Header name used to expose the W3C trace context on the response.
 *
 * @type {string}
 */
const HEADER_TRACEPARENT = 'traceparent';

/**
 * Header name used to expose the request identifier on the response.
 *
 * @type {string}
 */
const HEADER_REQUEST_ID = 'x-request-id';

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Discards the uncommitted response state.
 *
 * @private
 * @param {Response} response - Response whose state is discarded.
 * @throws {TypeError} If `response` is not a `Response` instance.
 * @throws {ResponseError} If the response has already been committed.
 */
const discardResponseState = response => {
  Response.discardUncommittedState(response);
};

/**
 * Wraps the response body with a transform stream.
 *
 * @private
 * @param {Response} response - Response whose body is wrapped.
 * @param {NodeTransform} transform - Transform applied to the response body.
 * @throws {TypeError} If the response is not a `Response` instance.
 * @throws {ResponseError} If the response cannot be wrapped (see `Response.wrapBody`).
 */
const wrapResponseBody = (response, transform) => {
  Response.wrapBody(response, transform);
};

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @classdesc An exchange couples an incoming request with its outgoing
 * response and carries the internal context needed to process it.
 */
class Exchange {
  /**
   * Incoming request abstraction.
   *
   * @type {Request}
   */
  #request;

  /**
   * Outgoing response abstraction.
   *
   * @type {Response}
   */
  #response;

  /**
   * Internal execution context.
   *
   * @type {ExchangeContext}
   */
  #context;

  /**
   * Per-request mutable state shared between middleware layers.
   *
   * @type {Record<string, unknown>}
   */
  #state;

  /**
   * Optional callback invoked when response commitment produces an error.
   *
   * @type {ExchangeCommitErrorHook|null}
   */
  #onCommitError = null;

  /**
   * Creates an exchange from the incoming request and outgoing response.
   *
   * @param {IncomingRequest} incomingMessage - Incoming HTTP request message.
   * @param {ServerResponse} serverResponse - Native Node.js server response.
   * @param {ExchangeOptions} [options] - The exchange options.
   * @example
   * ```js
   * const exchange = new Exchange(incomingMessage, serverResponse, {
   *   request: { bodyLimit: 1_000_000 },
   *   response: { etag: true, defaultCharset: 'utf-8' },
   *   events,
   *   onCommitError: (error, exchange) => console.error(error, exchange.id),
   * });
   * ```
   */
  constructor(incomingMessage, serverResponse, options = {}) {
    this.#onCommitError =
      typeof options.onCommitError === 'function' ? options.onCommitError : null;
    this.#state = Object.create(null);

    this.#request = new Request(incomingMessage, options.request);

    const traceparent = this.#request.getHeader(HEADER_TRACEPARENT);
    const validTraceparent =
      typeof traceparent === 'string'
        ? traceparent
        : Array.isArray(traceparent)
          ? traceparent[0]
          : undefined;

    this.#context = new ExchangeContext({
      traceparent: validTraceparent,
    });

    this.#response = new Response(serverResponse, {
      ...options.response,
      onCommit: response => this.#handleCommit(response),
      onCommitError: error => this.#handleCommitError(error),
    });

    this.#bindNativeLifecycle(incomingMessage, serverResponse);
  }

  /**
   * The incoming request.
   *
   * @type {Request}
   */
  get request() {
    return this.#request;
  }

  /**
   * The outgoing response.
   *
   * @type {Response}
   */
  get response() {
    return this.#response;
  }

  /**
   * The mutable per-request state shared between middleware layers.
   *
   * @type {Record<string, unknown>}
   */
  get state() {
    return this.#state;
  }

  /**
   * The unique identifier for the transaction.
   *
   * @type {string}
   */
  get id() {
    return this.#context.id;
  }

  /**
   * The W3C trace identifier for the transaction.
   *
   * @type {string}
   */
  get traceId() {
    return this.#context.traceId;
  }

  /**
   * The W3C span identifier for the transaction.
   *
   * @type {string}
   */
  get spanId() {
    return this.#context.spanId;
  }

  /**
   * The cancellation signal for the transaction.
   *
   * @type {AbortSignal}
   */
  get signal() {
    return this.#context.signal;
  }

  /**
   * Monotonic timestamp captured when the exchange was created.
   *
   * @type {number}
   */
  get startedAt() {
    return this.#context.startedAt;
  }

  /**
   * Aborts the transaction.
   *
   * Signals the cancellation signal associated with the transaction.
   * Subsequent calls have no effect.
   *
   * @returns {void}
   * @example
   * ```js
   * exchange.abort();
   * ```
   */
  abort() {
    this.#context.abort();
  }

  /**
   * Binds native transport lifecycle events to the exchange.
   *
   * If the socket is already destroyed when the exchange is created,
   * the exchange is aborted immediately. Otherwise a one-shot listener
   * aborts the exchange when the incoming request closes before the
   * response has finished writing.
   *
   * @param {IncomingRequest} incomingMessage - Native incoming HTTP message whose close event is observed.
   * @param {ServerResponse} serverResponse - Native outgoing HTTP response used to determine whether writing has already ended.
   * @returns {void}
   */
  #bindNativeLifecycle(incomingMessage, serverResponse) {
    if (incomingMessage.destroyed) {
      this.abort();
    } else {
      const onClose = () => {
        if (!serverResponse.writableEnded) {
          this.abort();
        }
      };

      incomingMessage.once('close', onClose);

      this.#context.signal.addEventListener(
        'abort',
        () => {
          incomingMessage.removeListener('close', onClose);
        },
        { once: true },
      );
    }
  }

  /**
   * Runs the commit hook associated with the response.
   *
   * Adds the telemetry headers, the W3C trace context, and the request
   * identifier to the response before it is materialized. Headers already
   * present on the response are preserved.
   *
   * @param {Response} response - The response being committed.
   */
  #handleCommit(response) {
    this.#context.telemetry.markServerSentAt();
    this.#context.telemetry.markProcessDuration();

    for (const [name, value] of this.#context.telemetry.entries()) {
      if (!response.hasHeader(name)) {
        response.setHeader(name, value);
      }
    }

    if (!response.hasHeader(HEADER_TRACEPARENT)) {
      response.setHeader(HEADER_TRACEPARENT, this.#context.traceparent());
    }

    if (!response.hasHeader(HEADER_REQUEST_ID)) {
      response.setHeader(HEADER_REQUEST_ID, this.#context.id);
    }
  }

  /**
   * Forwards a commit error to the configured error callback and event bus.
   *
   * @param {Error} error - The error produced while committing the response.
   */
  #handleCommitError(error) {
    if (this.#onCommitError) {
      this.#onCommitError(error, this);
    }
  }

  /**
   * Builds an immutable snapshot of this exchange.
   *
   * @param {ExchangeOutcome} outcome - Outcome to record.
   * @param {number|undefined} endedAt - Monotonic end timestamp, or `undefined` for a non-terminal snapshot.
   * @param {Error|undefined} error - Error raised during the exchange, when any.
   * @returns {ExchangeInfo} An immutable snapshot of the exchange.
   * @throws {TypeError} If `outcome` does not match any supported processing state.
   */
  #createSnapshot(outcome, endedAt, error) {
    const startedAt = this.#context.startedAt;
    const userAgent = this.#request.getHeader('user-agent');
    const request = Object.freeze({
      method: this.#request.method,
      pathname: this.#request.pathname,
      ip: this.#request.ip,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });
    const response = Object.freeze({
      statusCode: this.#response.statusCode,
    });

    if (outcome === 'pending') {
      return Object.freeze({
        id: this.#context.id,
        traceId: this.#context.traceId,
        timing: Object.freeze({ startedAt, endedAt: undefined, duration: undefined }),
        request,
        response,
        outcome,
        error: undefined,
      });
    }

    if (outcome === 'error' && endedAt === undefined && error) {
      return Object.freeze({
        id: this.#context.id,
        traceId: this.#context.traceId,
        timing: Object.freeze({ startedAt, endedAt: undefined, duration: undefined }),
        request,
        response,
        outcome,
        error,
      });
    }

    if (outcome === 'error' && endedAt !== undefined && error) {
      return Object.freeze({
        id: this.#context.id,
        traceId: this.#context.traceId,
        timing: Object.freeze({
          startedAt,
          endedAt,
          duration: Math.round(endedAt - startedAt),
        }),
        request,
        response,
        outcome,
        error,
      });
    }

    if (outcome === 'success' && endedAt !== undefined) {
      return Object.freeze({
        id: this.#context.id,
        traceId: this.#context.traceId,
        timing: Object.freeze({
          startedAt,
          endedAt,
          duration: Math.round(endedAt - startedAt),
        }),
        request,
        response,
        outcome,
        error: undefined,
      });
    }

    throw new TypeError('Unreachable: unexpected exchange outcome');
  }

  /**
   * Creates an immutable snapshot of an exchange.
   *
   * The `outcome` value indicates the processing state captured in the snapshot:
   *
   * - `'pending'` — processing has not finished.
   * - `'success'` — processing finished without an error.
   * - `'error'` — an error occurred during processing.
   *
   * When `endedAt` is `undefined`, the snapshot is non-terminal and `duration`
   * is also `undefined`. When `endedAt` is provided, `duration` is computed as
   * the rounded elapsed time since `startedAt`.
   *
   * @param {Exchange} exchange - Exchange to snapshot.
   * @param {ExchangeOutcome} outcome - Outcome to record.
   * @param {number|undefined} endedAt - Monotonic end timestamp, or `undefined` for a non-terminal snapshot.
   * @param {Error|undefined} error - Error raised during the exchange, when any.
   * @returns {ExchangeInfo} An immutable snapshot of the exchange.
   * @throws {TypeError} If `exchange` is not an `Exchange` instance.
   * @example
   * ```js
   * const info = Exchange.createSnapshot(exchange, 'success', performance.now(), undefined);
   * ```
   */
  static createSnapshot(exchange, outcome, endedAt, error) {
    if (!(exchange instanceof Exchange)) {
      throw new TypeError('Expected an Exchange instance');
    }

    return exchange.#createSnapshot(outcome, endedAt, error);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Exchange;
export { discardResponseState, wrapResponseBody };
