// @ts-check
/**
 * @file Defines the base abstraction for parsing incoming request bodies.
 *
 * @description Provides the common functionality required by concrete body
 * parsers to consume an incoming request stream while enforcing the
 * configured maximum body size.
 *
 * When the body limit is exceeded, the underlying request is destroyed so
 * that the socket is not left consuming bytes. As a consequence, the
 * connection may be closed abruptly instead of producing a normal `413`
 * response.
 *
 * @module BodyParser
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import RequestError from '#shared/errors/RequestError';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Provides the base abstraction for parsing incoming request bodies.
 *
 * @classdesc BodyParser provides common functionality for safely consuming
 * an incoming request stream while enforcing the configured maximum body
 * size. Concrete parsers implement `parse()` to transform the request body
 * into the appropriate representation.
 */
class BodyParser {
  /**
   * Underlying Node.js incoming request message.
   *
   * @type {IncomingRequest}
   */
  #incomingMessage;

  /**
   * Maximum number of bytes allowed for the request body.
   *
   * @type {number}
   */
  #bodyLimit;

  /**
   * Creates a body parser.
   *
   * @param {IncomingRequest} incomingMessage - Incoming HTTP request message.
   * @param {number} bodyLimit - Maximum number of bytes allowed for the body.
   * @throws {Error} Thrown when attempting to instantiate `BodyParser` directly.
   */
  constructor(incomingMessage, bodyLimit) {
    if (new.target === BodyParser) {
      throw new Error('BodyParser is abstract and cannot be instantiated directly');
    }

    this.#incomingMessage = incomingMessage;
    this.#bodyLimit = bodyLimit;
  }

  /**
   * Returns the underlying Node.js incoming request message.
   *
   * Concrete parsers use this stream to consume the request body.
   *
   * @type {IncomingRequest}
   */
  get incomingMessage() {
    return this.#incomingMessage;
  }

  /**
   * Parses the incoming request body.
   *
   * Concrete parsers must implement this method and return the parsed
   * representation appropriate for their media type.
   *
   * @abstract
   * @returns {Promise<unknown>} Parsed request body.
   * @throws {Error} If the method is not implemented.
   */
  async parse() {
    throw new Error('BodyParser.parse() must be implemented.');
  }

  /**
   * Reads the complete request body from the underlying stream.
   *
   * When `Content-Length` is present, its value is validated before the
   * stream is consumed. The actual number of bytes received is tracked to
   * enforce the configured body size limit. When the limit is exceeded, the
   * underlying request is destroyed so the socket is not left consuming
   * further bytes.
   *
   * Stream-level failures (such as client disconnections) are normalized
   * into `RequestError` instances. `RequestError` instances produced by
   * this method are preserved as-is.
   *
   * @returns {Promise<Buffer>} The complete request body as a Buffer.
   * @throws {RequestError} If `Content-Length` is invalid.
   * @throws {RequestError} If the request body exceeds the configured limit.
   * @throws {RequestError} If the underlying stream fails while being read.
   * @example
   * ```js
   * const buffer = await bodyParser.readBody();
   * ```
   */
  async readBody() {
    const contentLength = this.#incomingMessage.headers['content-length'];

    if (contentLength !== undefined) {
      const length = Number(contentLength);

      if (!Number.isSafeInteger(length) || length < 0) {
        throw new RequestError('INVALID_CONTENT_LENGTH');
      }

      if (length > this.#bodyLimit) {
        this.#incomingMessage.destroy();
        throw new RequestError('BODY_LIMIT_EXCEEDED', {
          values: {
            bodySize: length,
            bodyLimit: this.#bodyLimit,
          },
        });
      }
    }

    let bytesRead = 0;
    const chunks = [];

    try {
      for await (const chunk of this.#incomingMessage) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytesRead += buffer.length;

        if (bytesRead > this.#bodyLimit) {
          this.#incomingMessage.destroy();
          throw new RequestError('BODY_LIMIT_EXCEEDED', {
            values: {
              bodySize: bytesRead,
              bodyLimit: this.#bodyLimit,
            },
          });
        }

        chunks.push(buffer);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw this.#normalizeStreamError(error);
    }
  }

  /**
   * Normalizes a thrown value from a stream read operation.
   *
   * Preserves existing `RequestError` instances (for example
   * `BODY_LIMIT_EXCEEDED`) and wraps everything else, including native
   * stream errors such as `ECONNRESET`, in a `RequestError`.
   *
   * @param {unknown} error - The value thrown by the stream.
   * @returns {RequestError} The normalized error.
   */
  #normalizeStreamError(error) {
    if (error instanceof RequestError) {
      return error;
    }

    return new RequestError('BODY_STREAM_ERROR', {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default BodyParser;
