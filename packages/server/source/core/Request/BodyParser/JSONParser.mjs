// @ts-check
/**
 * @file Defines the JSON body parser.
 *
 * @description Provides the `JSONParser` class for parsing `application/json`
 * request bodies.
 *
 * @module JSONParser
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
 * Parses `application/json` request bodies into JavaScript values.
 *
 * @augments BodyParser
 */
class JSONParser extends BodyParser {
  /**
   * Parses the incoming JSON request body.
   *
   * @returns {Promise<unknown>} Parsed JavaScript value.
   * @throws {RequestError} If the body cannot be parsed as JSON.
   * @example
   * ```js
   * const body = await parser.parse();
   *
   * body.username; // 'john'
   * body.age;      // 30
   * ```
   */
  async parse() {
    const buffer = await this.readBody();

    try {
      return JSON.parse(buffer.toString('utf8'));
    } catch (error) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid JSON' },
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default JSONParser;
