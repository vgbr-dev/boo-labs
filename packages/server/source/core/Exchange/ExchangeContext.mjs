// @ts-check
/**
 * @file Defines the internal execution context of an HTTP exchange.
 *
 * @description The context groups runtime-only data associated with a
 * single transaction: telemetry, cancellation signal, and correlation
 * identifiers. It is private to `Exchange` and is never exposed to the
 * consumer.
 *
 * The context does not access the native HTTP message. Any HTTP-derived
 * information it needs (currently only the W3C `traceparent` header) is
 * extracted by `Exchange` and passed in at construction time.
 *
 * The outgoing `traceparent` represents the server's own span: the incoming
 * `traceId` is preserved when present, a new `spanId` is generated, and the
 * incoming `trace-flags` are preserved to avoid altering the sampling
 * decision taken upstream.
 *
 * @module ExchangeContext
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { randomBytes } from 'node:crypto';

// » IMPORT LOCAL MODULES
import Telemetry from './Telemetry.mjs';
import UUIDV7 from '#shared/domain/UUIDV7';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * W3C Trace Context version supported by this implementation.
 *
 * @type {string}
 */
const TRACEPARENT_VERSION = '00';

/**
 * Default trace flags used when no incoming `traceparent` is available.
 *
 * @type {string}
 */
const DEFAULT_TRACE_FLAGS = '01';

/**
 * Pattern matching a W3C `traceparent` header value.
 *
 * @type {RegExp}
 */
const TRACEPARENT_PATTERN = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

/**
 * Represents an all-zero trace identifier, which is invalid per W3C.
 *
 * @type {string}
 */
const INVALID_TRACE_ID = '0'.repeat(32);

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Options used to construct an exchange context.
 *
 * @typedef  {object} ExchangeContextOptions
 * @property {string} [traceparent]          - W3C `traceparent` header value received with the request.
 */

/**
 * Represents the trace information extracted from a W3C `traceparent`.
 *
 * @typedef  {object} TraceContext
 * @property {string} traceId      - The 32-character hexadecimal trace identifier.
 * @property {string} traceFlags   - The 2-character hexadecimal trace flags.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Groups runtime-only data associated with a single HTTP exchange.
 *
 * @classdesc The context holds telemetry, cancellation signal, and
 * correlation identifiers. It is created by `Exchange` and never exposed
 * to the consumer.
 */
class ExchangeContext {
  /**
   * Cancellation controller for the transaction.
   *
   * @type {AbortController}
   */
  #controller;

  /**
   * Telemetry tracker for the transaction.
   *
   * @type {Telemetry}
   */
  #telemetry;

  /**
   * Unique identifier for the transaction.
   *
   * @type {string}
   */
  #id;

  /**
   * W3C trace identifier.
   *
   * @type {string}
   */
  #traceId;

  /**
   * W3C span identifier.
   *
   * @type {string}
   */
  #spanId;

  /**
   * W3C trace flags.
   *
   * @type {string}
   */
  #traceFlags;

  /**
   * Creates an exchange context.
   *
   * @param {ExchangeContextOptions} [options] - The context options.
   * @example
   * ```js
   * const context = new ExchangeContext({ traceparent: '00-...-...-01' });
   * ```
   */
  constructor(options = {}) {
    this.#controller = new AbortController();
    this.#telemetry = new Telemetry();
    this.#id = UUIDV7.create();

    const trace = ExchangeContext.#extractTrace(options.traceparent);

    this.#traceId = trace?.traceId ?? ExchangeContext.#generateTraceId();
    this.#traceFlags = trace?.traceFlags ?? DEFAULT_TRACE_FLAGS;
    this.#spanId = ExchangeContext.#generateSpanId();
  }

  /**
   * The cancellation signal for the transaction.
   *
   * @type {AbortSignal}
   */
  get signal() {
    return this.#controller.signal;
  }

  /**
   * The telemetry tracker for the transaction.
   *
   * @type {Telemetry}
   */
  get telemetry() {
    return this.#telemetry;
  }

  /**
   * The unique identifier for the transaction.
   *
   * @type {string}
   */
  get id() {
    return this.#id;
  }

  /**
   * The W3C trace identifier for the transaction.
   *
   * @type {string}
   */
  get traceId() {
    return this.#traceId;
  }

  /**
   * The W3C span identifier for the transaction.
   *
   * @type {string}
   */
  get spanId() {
    return this.#spanId;
  }

  /**
   * Monotonic timestamp captured when the exchange processing context was created.
   *
   * @type {number}
   */
  get startedAt() {
    return this.#telemetry.startedAt;
  }

  /**
   * Aborts the transaction.
   *
   * Signals the associated cancellation signal. Callers of `signal` will
   * receive the `abort` event. Subsequent calls have no effect.
   *
   * @returns {void}
   * @example
   * ```js
   * context.abort();
   * ```
   */
  abort() {
    this.#controller.abort();
  }

  /**
   * Returns the W3C `traceparent` header value for this transaction.
   *
   * The value represents the server's own span: it preserves the incoming
   * `traceId` and `trace-flags` when present, and always carries a new
   * `spanId`.
   *
   * @returns {string} The formatted `traceparent` header value.
   * @example
   * ```js
   * response.setHeader('traceparent', context.traceparent());
   * ```
   */
  traceparent() {
    return `${TRACEPARENT_VERSION}-${this.#traceId}-${this.#spanId}-${this.#traceFlags}`;
  }

  /**
   * Extracts the trace information from a W3C `traceparent` header value.
   *
   * Returns `null` when the value is missing, malformed, uses a version
   * not supported by this implementation, or carries an all-zero trace
   * identifier.
   *
   * @param {string|undefined} value - The `traceparent` header value.
   * @returns {TraceContext|null} The extracted trace information, or `null`.
   */
  static #extractTrace(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const match = value.match(TRACEPARENT_PATTERN);

    if (!match) {
      return null;
    }

    if (match[1].toLowerCase() !== TRACEPARENT_VERSION) {
      return null;
    }

    const traceId = match[2].toLowerCase();

    if (traceId === INVALID_TRACE_ID) {
      return null;
    }

    return {
      traceId,
      traceFlags: match[4].toLowerCase(),
    };
  }

  /**
   * Generates a 32-character lowercase hexadecimal trace identifier.
   *
   * @returns {string} The generated trace identifier.
   */
  static #generateTraceId() {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generates a 16-character lowercase hexadecimal span identifier.
   *
   * @returns {string} The generated span identifier.
   */
  static #generateSpanId() {
    return randomBytes(8).toString('hex');
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ExchangeContext;
