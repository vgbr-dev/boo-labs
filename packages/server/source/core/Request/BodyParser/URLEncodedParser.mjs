// @ts-check
/**
 * @file Defines the URL-encoded body parser.
 *
 * @description Provides the `URLEncodedParser` class for parsing
 * `application/x-www-form-urlencoded` request bodies.
 *
 * @module URLEncodedParser
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import BodyParser from './BodyParser.mjs';
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
 * Parses `application/x-www-form-urlencoded` request bodies into
 * `URLSearchParams`.
 *
 * @augments BodyParser
 */
class URLEncodedParser extends BodyParser {
  /**
   * Parses the incoming URL-encoded request body.
   *
   * @returns {Promise<URLSearchParams>} Parsed request body.
   * @throws {RequestError} If the body cannot be parsed.
   * @example
   * ```js
   * const body = await parser.parse();
   *
   * body.get('username'); // 'john'
   * body.get('age');      // '30'
   * ```
   */
  async parse() {
    const buffer = await this.readBody();

    try {
      return new URLSearchParams(buffer.toString('utf8'));
    } catch (error) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid URL-encoded body' },
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default URLEncodedParser;
