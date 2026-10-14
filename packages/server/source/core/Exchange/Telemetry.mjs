/**
 * @file Provides a utility class for collecting server-side timing telemetry.
 *
 * @description Records timestamps for the exchange lifecycle and measures the
 * elapsed time spent processing a request. Emits `Server-Timing` response
 * headers for browser performance inspection.
 *
 * @module Telemetry
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the telemetry data collected during an exchange.
 *
 * @typedef  {object}  TelemetryData
 * @property {number}  serverReceivedAt Timestamp when the server received the request.
 * @property {number}  processStartAt   High-resolution timestamp when processing started.
 * @property {?number} processDuration  Elapsed processing time in milliseconds.
 * @property {?number} serverSentAt     Timestamp when the server sent the response.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Collects server-side timing telemetry for an exchange.
 *
 * @classdesc The class uses {@link Date.now} for wall-clock timestamps and
 * {@link performance.now} for high-resolution elapsed time measurement.
 *
 * Telemetry state is private and can only be modified through the lifecycle
 * methods provided by the class. Both {@link Telemetry#markProcessDuration}
 * and {@link Telemetry#markServerSentAt} are idempotent: repeated calls
 * preserve the first recorded value.
 */
class Telemetry {
  #serverReceivedAt;
  #processStartAt;
  #processDuration = null;
  #serverSentAt = null;

  /**
   * Creates a telemetry tracker and records the server reception and
   * processing start times.
   *
   * @example
   * ```js
   * const telemetry = new Telemetry();
   * ```
   */
  constructor() {
    this.#serverReceivedAt = Date.now();
    this.#processStartAt = performance.now();
  }

  /**
   * Monotonic timestamp captured when the exchange processing context was created.
   *
   * @type {number}
   */
  get startedAt() {
    return this.#processStartAt;
  }

  /**
   * Custom string tag for better type identification.
   *
   * @readonly
   * @type {string}
   */
  get [Symbol.toStringTag]() {
    return `${this.constructor.name}`;
  }

  /**
   * Records the elapsed server-side processing time.
   *
   * The duration is measured from the processing start time recorded when the
   * instance was created. Once recorded, subsequent calls preserve the first
   * value.
   *
   * @returns {Telemetry} The current instance, allowing method chaining.
   * @example
   * ```js
   * const telemetry = new Telemetry();
   * await processRequest(request);
   * telemetry.markProcessDuration();
   * ```
   */
  markProcessDuration() {
    if (this.#processDuration !== null) return this;

    this.#processDuration = Number((performance.now() - this.#processStartAt).toFixed(2));

    return this;
  }

  /**
   * Records the timestamp when the server sends the response.
   *
   * Once recorded, subsequent calls preserve the first value.
   *
   * @returns {Telemetry} The current instance, allowing method chaining.
   * @example
   * ```js
   * const telemetry = new Telemetry();
   * telemetry.markProcessDuration();
   * telemetry.markServerSentAt();
   * ```
   */
  markServerSentAt() {
    if (this.#serverSentAt !== null) return this;

    this.#serverSentAt = Date.now();

    return this;
  }

  /**
   * Returns the collected telemetry data as a plain object.
   *
   * The returned object is a snapshot of the current telemetry state and does
   * not expose the instance's private properties.
   *
   * @returns {TelemetryData} A copy of the telemetry data.
   * @example
   * ```js
   * const data = telemetry.toObject();
   * ```
   */
  toObject() {
    return {
      serverReceivedAt: this.#serverReceivedAt,
      processStartAt: this.#processStartAt,
      processDuration: this.#processDuration,
      serverSentAt: this.#serverSentAt,
    };
  }

  /**
   * Returns the collected telemetry data for JSON serialization.
   *
   * This method delegates to {@link Telemetry#toObject} so that
   * `JSON.stringify` serializes the same snapshot exposed by the object
   * representation.
   *
   * @returns {TelemetryData} A copy of the telemetry data.
   * @example
   * ```js
   * const telemetry = new Telemetry();
   * telemetry.markProcessDuration();
   * const json = JSON.stringify(telemetry);
   * ```
   */
  toJSON() {
    return this.toObject();
  }

  /**
   * Returns the recorded telemetry as a `Server-Timing` response header.
   *
   * The generated value contains event markers for reception and response
   * completion, and a duration metric for server-side processing.
   *
   * Metrics whose value has not been recorded yet are omitted from the output.
   *
   * @returns {Array<Array<string>>} A single header name/value pair.
   * @example
   * ```js
   * const telemetry = new Telemetry();
   * telemetry.markProcessDuration();
   * telemetry.markServerSentAt();
   *
   * for (const [name, value] of telemetry.entries()) {
   *   response.setHeader(name, value);
   * }
   * ```
   */
  entries() {
    const parts = ['received;desc="Received"'];

    if (this.#processDuration !== null) {
      parts.push(`processing;dur=${this.#processDuration};desc="Processing"`);
    }

    if (this.#serverSentAt !== null) {
      parts.push('sent;desc="Sent"');
    }

    return [['Server-Timing', parts.join(', ')]];
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Telemetry;
