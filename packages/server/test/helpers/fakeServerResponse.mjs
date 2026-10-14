// @ts-check
/**
 * @file Contains minimal fake HTTP response factories for unit tests.
 *
 * @module test/helpers/fakeServerResponse
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single `writeHead` invocation recorded by the fake response.
 *
 * @typedef  {object}                          WriteHeadCall
 * @property {number}                          statusCode    - HTTP status code passed to `writeHead`.
 * @property {Record<string, string|string[]>} [headers]     - Optional response headers.
 */

/**
 * Represents a single `write` or `end` invocation recorded by the fake response.
 *
 * @typedef  {object}  ChunkCall
 * @property {unknown} [chunk]   - Optional chunk passed to `write` or `end`.
 */

/**
 * Represents the recorded invocations of the fake response.
 *
 * @typedef  {object}          FakeResponseCalls
 * @property {WriteHeadCall[]} writeHead         - Recorded `writeHead` calls.
 * @property {ChunkCall[]}     end               - Recorded `end` calls.
 * @property {ChunkCall[]}     write             - Recorded `write` calls.
 */

/**
 * Represents the `writeHead` method of the fake HTTP/1 response.
 *
 * @typedef {(statusCode: number, headers?: Record<string, string|string[]>) => FakeHttp1Response} WriteHeadFunction
 */

/**
 * Represents a chunk-accepting method of the fake HTTP/1 response.
 *
 * @typedef {(chunk?: unknown) => FakeHttp1Response} ChunkFunction
 */

/**
 * Represents a no-argument fluent method of the fake HTTP/1 response.
 *
 * @typedef {() => FakeHttp1Response} FluentFunction
 */

/**
 * Represents the `emit` method of the fake HTTP/1 response.
 *
 * @typedef {(eventName: string, ...args: unknown[]) => boolean} EmitFunction
 */

/**
 * Represents a minimal fake of a Node.js `HttpServerResponse` for unit tests.
 *
 * @typedef  {object}            FakeHttp1Response
 * @property {WriteHeadFunction} writeHead         - Records a status code and optional headers.
 * @property {ChunkFunction}     write             - Records a chunk written to the response.
 * @property {ChunkFunction}     end               - Records the final chunk and marks the response as finished.
 * @property {FluentFunction}    destroy           - Marks the response as finished.
 * @property {FluentFunction}    on                - No-op event registration.
 * @property {FluentFunction}    once              - No-op one-time event registration.
 * @property {EmitFunction}      emit              - No-op event emission.
 * @property {FluentFunction}    removeListener    - No-op listener removal.
 * @property {boolean}           writableEnded     - Whether the response has been ended.
 * @property {boolean}           finished          - Whether the response is finished.
 * @property {boolean}           headersSent       - Whether headers have been sent.
 * @property {FakeResponseCalls} _calls            - Recorded invocations for assertions.
 */

/**
 * Represents a minimal fake of a Node.js `Http2ServerResponse` for unit tests.
 *
 * @typedef {FakeHttp1Response & { stream: object }} FakeHttp2Response
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Minimal fake of a Node.js HttpServerResponse for unit tests.
 *
 * Records writeHead and end calls, exposes a minimal stream surface
 * so Response can treat it as a writable target.
 *
 * @returns {FakeHttp1Response} The fake HTTP/1 response instance.
 */
export function createFakeHttp1Response() {
  /** @type {FakeResponseCalls} */
  const calls = {
    writeHead: [],
    end: [],
    write: [],
  };

  let finished = false;

  /** @type {FakeHttp1Response} */
  const fake = {
    writeHead(statusCode, headers) {
      calls.writeHead.push({ statusCode, headers });
      return fake;
    },

    write(chunk) {
      calls.write.push({ chunk });
      return true;
    },

    end(chunk) {
      calls.end.push({ chunk });
      finished = true;
      return fake;
    },

    destroy() {
      finished = true;
      return fake;
    },

    on() {
      return fake;
    },

    once() {
      return fake;
    },

    emit() {
      return true;
    },

    removeListener() {
      return fake;
    },

    get writableEnded() {
      return finished;
    },

    get finished() {
      return finished;
    },

    get headersSent() {
      return calls.writeHead.length > 0;
    },

    _calls: calls,
  };

  return fake;
}

/**
 * Minimal fake of Http2ServerResponse.
 * Has a `stream` property to trigger the h2 branch.
 *
 * @returns {FakeHttp2Response} The fake HTTP/2 response instance.
 */
export function createFakeHttp2Response() {
  const fake = /** @type {FakeHttp2Response} */ (createFakeHttp1Response());

  // Marker: Http2ServerResponse branch.
  fake.stream = {};

  return fake;
}
