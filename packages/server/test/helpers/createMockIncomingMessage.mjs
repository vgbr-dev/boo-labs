// @ts-check
/**
 * @file Contains a mock IncomingMessage factory for Request tests.
 *
 * @module test/helpers/createMockIncomingMessage
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { EventEmitter } from 'node:events';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Options accepted by `createMockIncomingMessage`.
 *
 * @typedef  {object}                                    MockIncomingMessageOptions
 * @property {string}                                    [method]                   - HTTP method. Defaults to `'GET'`.
 * @property {string}                                    [url]                      - Request URL. Defaults to `'/'`.
 * @property {Record<string, string|string[]|undefined>} [headers]                  - Request headers. Defaults to `{}`.
 * @property {string}                                    [remoteAddress]            - Socket remote address.
 * @property {boolean}                                   [encrypted]                - Whether the socket is encrypted.
 * @property {number}                                    [httpVersionMajor]         - HTTP major version. Defaults to `1`.
 * @property {number}                                    [httpVersionMinor]         - HTTP minor version. Defaults to `1`.
 * @property {string|null}                               [httpVersion]              - HTTP version string. `null` omits it.
 * @property {string}                                    [authority]                - HTTP/2 authority pseudo-header.
 * @property {string}                                    [scheme]                   - HTTP/2 scheme pseudo-header.
 * @property {Buffer|string|undefined}                   [body]                     - Optional body payload.
 */

/**
 * Represents the socket attached to a mock incoming message.
 *
 * @typedef  {object}  MockSocket
 * @property {string}  [remoteAddress] - Socket remote address.
 * @property {boolean} [encrypted]     - Whether the socket is encrypted.
 */

/**
 * Represents the `destroy` method of a mock incoming message.
 *
 * @typedef {(error?: Error) => MockIncomingMessage} DestroyFunction
 */

/**
 * Represents the message fields shared with a real `IncomingMessage`.
 *
 * @typedef  {object}                                    MockMessageFields
 * @property {string}                                    [method]          - HTTP method.
 * @property {string}                                    [url]             - Request URL.
 * @property {Record<string, string|string[]|undefined>} headers           - Request headers.
 * @property {number}                                    httpVersionMajor  - HTTP major version.
 * @property {number}                                    httpVersionMinor  - HTTP minor version.
 * @property {string}                                    [httpVersion]     - HTTP version string.
 * @property {string}                                    [authority]       - HTTP/2 authority pseudo-header.
 * @property {string}                                    [scheme]          - HTTP/2 scheme pseudo-header.
 * @property {MockSocket}                                socket            - Mock socket.
 * @property {boolean}                                   [destroyed]       - Whether the stream is destroyed.
 * @property {DestroyFunction}                           destroy           - Marks the stream as destroyed and emits `error` if provided.
 */

/**
 * Represents a minimal mock `IncomingMessage` used by Request tests.
 *
 * It behaves both as an `EventEmitter` (for `data`/`end` listeners) and
 * as an async iterable (for `for await` consumers), mirroring the dual
 * API surface of a real `IncomingMessage`.
 *
 * @typedef {EventEmitter & MockMessageFields} MockIncomingMessage
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a minimal mock `IncomingMessage`.
 *
 * The returned object is both an `EventEmitter` (so consumers that rely
 * on `data`/`end` events work) and async iterable (so consumers that use
 * `for await` work). This mirrors the dual API surface of a real
 * `IncomingMessage` closely enough for unit tests.
 *
 * Passing `httpVersion: null` omits the `httpVersion` property entirely,
 * which is useful to exercise the major/minor fallback path in `Request`.
 *
 * @param {MockIncomingMessageOptions} [options] - Mock configuration.
 * @returns {MockIncomingMessage} A mock incoming message instance.
 */
export function createMockIncomingMessage(options = {}) {
  const {
    method = 'GET',
    url = '/',
    headers = {},
    remoteAddress,
    encrypted,
    httpVersionMajor = 1,
    httpVersionMinor = 1,
    httpVersion = '1.1',
    authority,
    scheme,
    body,
  } = options;

  /** @type {MockIncomingMessage} */
  // @ts-expect-error - EventEmitter is progressively enriched below.
  const message = new EventEmitter();

  message.method = method;
  message.url = url;
  message.headers = headers;
  message.httpVersionMajor = httpVersionMajor;
  message.httpVersionMinor = httpVersionMinor;

  if (httpVersion !== null) {
    message.httpVersion = httpVersion;
  }

  if (authority !== undefined) {
    message.authority = authority;
  }

  if (scheme !== undefined) {
    message.scheme = scheme;
  }

  message.socket = {
    remoteAddress,
    encrypted,
  };

  const chunks = body === undefined ? [] : [Buffer.isBuffer(body) ? body : Buffer.from(body)];

  // Async iterator — required by `BodyParser.readBody()`.
  /**
   * Registers the async iterator required by `BodyParser.readBody()`.
   *
   * @type {any}
   */
  (message)[Symbol.asyncIterator] = async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  };

  /**
   * Marks the stream as destroyed and emits `error` if provided.
   *
   * @param {Error} [error] - Optional error to emit.
   * @returns {MockIncomingMessage} The mock instance for chaining.
   */
  message.destroy = function destroy(error) {
    message.destroyed = true;

    if (error) {
      message.emit('error', error);
    }

    return message;
  };

  // Event-based interface — for consumers that use `on('data')`.
  queueMicrotask(() => {
    for (const chunk of chunks) {
      message.emit('data', chunk);
    }
    message.emit('end');
  });

  return message;
}
