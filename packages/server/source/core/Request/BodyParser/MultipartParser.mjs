// @ts-check
/**
 * @file Defines the multipart/form-data body parser.
 *
 * @description Provides the `MultipartParser` class for parsing
 * `multipart/form-data` HTTP request bodies.
 *
 * @remarks This parser targets the multipart shape produced by standard browsers.
 *
 * It does not aim to implement the full RFC 7578 grammar. In particular:
 *
 * - It accepts `name` and `filename` parameters in quoted or token form.
 * - It accepts `filename*` (RFC 5987) values with UTF-8 percent-decoding, Other charsets are rejected.
 * - It does not implement folded headers.
 *
 * Requires Node.js >= 18.0.0
 *
 * @module MultipartParser
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

/**
 * Represents the parsed `Content-Disposition` parameters of a multipart
 * section.
 *
 * @typedef  {object}           MultipartDisposition
 * @property {string}           fieldName            - Multipart field name.
 * @property {string|undefined} filename             - Uploaded filename, if present.
 */

/**
 * Represents the parsed headers of a multipart section.
 *
 * @typedef  {object}           MultipartHeaders
 * @property {string}           disposition      - Content-Disposition header value.
 * @property {string|undefined} contentType      - Content-Type header value, if present.
 * @property {number}           end              - Buffer position immediately after the headers.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Maximum allowed length for a multipart boundary, per RFC 2046.
 *
 * @type {number}
 */
const MAX_BOUNDARY_LENGTH = 70;

/**
 * Validates the RFC 2046 boundary grammar.
 *
 * @type {RegExp}
 */
const BOUNDARY_PATTERN = /^[0-9A-Za-z'()+_,\-./:=? ]{0,69}[0-9A-Za-z'()+_,\-./:=?]$/;

/**
 * ASCII code for carriage return (`\r`).
 *
 * @type {number}
 */
const CR = 0x0d;

/**
 * ASCII code for line feed (`\n`).
 *
 * @type {number}
 */
const LF = 0x0a;

/**
 * ASCII code for hyphen (`-`).
 *
 * @type {number}
 */
const HYPHEN = 0x2d;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Parses `multipart/form-data` HTTP request bodies into `FormData`.
 *
 * @augments BodyParser
 */
class MultipartParser extends BodyParser {
  /**
   * Complete multipart request body.
   *
   * @type {Buffer}
   */
  #buffer = Buffer.alloc(0);

  /**
   * Multipart boundary prefixed with the required `--` delimiter.
   *
   * @type {Buffer}
   */
  #boundary = Buffer.alloc(0);

  /**
   * CRLF sequence used to delimit multipart sections.
   *
   * @type {Buffer}
   */
  #lineBreak = Buffer.alloc(0);

  /**
   * CRLF sequence separating multipart headers from their content.
   *
   * @type {Buffer}
   */
  #headerSeparator = Buffer.alloc(0);

  /**
   * Double hyphen marker indicating the closing multipart delimiter.
   *
   * @type {Buffer}
   */
  #closingMarker = Buffer.alloc(0);

  /**
   * Multipart boundary prefixed with the preceding CRLF sequence.
   *
   * @type {Buffer}
   */
  #boundaryWithCRLF = Buffer.alloc(0);

  /**
   * Current byte position within the multipart request body.
   *
   * @type {number}
   */
  #position = 0;

  /**
   * Form data containing the parsed multipart sections.
   *
   * @type {FormData}
   */
  #formData = new FormData();

  /**
   * Parses the incoming multipart request body.
   *
   * @returns {Promise<FormData>} Parsed multipart form data.
   * @throws {RequestError} If the body cannot be parsed.
   * @example
   * ```js
   * const formData = await parser.parse();
   * formData.get('username'); // 'john'
   * formData.get('avatar');   // File
   * ```
   */
  async parse() {
    const boundary = this.#extractBoundary();
    const buffer = await this.readBody();

    try {
      return this.#parsePayload(buffer, boundary);
    } catch (error) {
      if (error instanceof RequestError) {
        throw error;
      }

      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid multipart body' },
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Extracts the multipart boundary from the request `Content-Type` header.
   *
   * @returns {string} Multipart boundary value.
   * @throws {RequestError} If the boundary is missing or invalid.
   */
  #extractBoundary() {
    const contentType = this.incomingMessage.headers['content-type'] || '';
    const match = contentType.match(/(?:^|;)\s*boundary=(?:"([^"]+)"|([^;]+))/i);

    if (!match) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'multipart request missing boundary' },
      });
    }

    const boundary = (match[1] ?? match[2]).trim();
    this.#validateBoundary(boundary);
    return boundary;
  }

  /**
   * Validates a multipart boundary value against the RFC 2046 grammar.
   *
   * @param {string} boundary - Multipart boundary value.
   * @throws {RequestError} If the boundary is invalid.
   */
  #validateBoundary(boundary) {
    const isValid =
      boundary.length > 0 &&
      boundary.length <= MAX_BOUNDARY_LENGTH &&
      BOUNDARY_PATTERN.test(boundary);

    if (!isValid) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid multipart boundary' },
      });
    }
  }

  /**
   * Initializes the parser state for a multipart payload.
   *
   * @param {Buffer} buffer - Complete multipart request body.
   * @param {string} boundary - Multipart boundary value.
   */
  #initialize(buffer, boundary) {
    this.#buffer = buffer;
    this.#boundary = Buffer.from(`--${boundary}`);
    this.#lineBreak = Buffer.from('\r\n');
    this.#headerSeparator = Buffer.from('\r\n\r\n');
    this.#closingMarker = Buffer.from('--');
    this.#boundaryWithCRLF = Buffer.concat([this.#lineBreak, this.#boundary]);
    this.#position = 0;
    this.#formData = new FormData();
  }

  /**
   * Parses a complete multipart payload.
   *
   * @param {Buffer} buffer - Complete multipart request body.
   * @param {string} boundary - Multipart boundary value.
   * @returns {FormData} Parsed multipart form data.
   * @throws {RequestError} If the multipart payload is malformed.
   */
  #parsePayload(buffer, boundary) {
    this.#initialize(buffer, boundary);
    this.#consume(this.#boundary, 'invalid initial boundary');

    if (this.#isEmptyMultipart()) {
      return this.#formData;
    }

    this.#consume(this.#lineBreak, 'invalid multipart boundary');
    this.#parseParts();
    return this.#formData;
  }

  /**
   * Determines whether the multipart payload contains no parts.
   *
   * @returns {boolean} `true` when the closing marker immediately follows
   * the initial boundary.
   * @throws {RequestError} If trailing data follows the closing marker.
   */
  #isEmptyMultipart() {
    if (!this.#isCurrentPositionEqualTo(this.#closingMarker)) {
      return false;
    }

    this.#position += this.#closingMarker.length;
    this.#consumeOptionalTrailingCRLF();

    if (this.#position !== this.#buffer.length) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid multipart payload' },
      });
    }

    return true;
  }

  /**
   * Parses all multipart sections until the closing boundary is found.
   *
   * @throws {RequestError} If the payload ends before the closing boundary.
   */
  #parseParts() {
    while (this.#position < this.#buffer.length) {
      if (this.#parsePart()) {
        break;
      }
    }

    if (this.#position !== this.#buffer.length) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid multipart payload' },
      });
    }
  }

  /**
   * Parses a single multipart section.
   *
   * @returns {boolean} `true` when the closing boundary has been consumed.
   */
  #parsePart() {
    const headers = this.#extractHeaders();
    const { fieldName, filename } = this.#parseDisposition(headers.disposition);

    this.#position = headers.end;

    const content = this.#extractContent();

    this.#appendPart(fieldName, filename, headers.contentType, content);

    if (this.#isFinalBoundary()) {
      return true;
    }

    this.#consume(this.#lineBreak, 'invalid multipart boundary');
    return false;
  }

  /**
   * Extracts the headers of the current multipart section.
   *
   * @returns {MultipartHeaders} Parsed multipart headers and the position
   * immediately after them.
   * @throws {RequestError} If the part headers are malformed.
   */
  #extractHeaders() {
    const headerEnd = this.#buffer.indexOf(this.#headerSeparator, this.#position);

    if (headerEnd === -1) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid multipart part headers' },
      });
    }

    const headersText = this.#buffer.subarray(this.#position, headerEnd).toString('latin1');

    let disposition;
    let contentType;

    for (const line of headersText.split('\r\n')) {
      const separatorIndex = line.indexOf(':');

      if (separatorIndex === -1) {
        throw new RequestError('BODY_PARSE_FAILED', {
          values: { reason: 'invalid multipart part headers' },
        });
      }

      const name = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();

      if (!name) {
        throw new RequestError('BODY_PARSE_FAILED', {
          values: { reason: 'invalid multipart part headers' },
        });
      }

      if (name === 'content-disposition') {
        disposition = value;
      } else if (name === 'content-type') {
        contentType = value;
      }
    }

    if (disposition === undefined) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'multipart part missing content-disposition' },
      });
    }

    return {
      disposition,
      contentType,
      end: headerEnd + this.#headerSeparator.length,
    };
  }

  /**
   * Parses a multipart `Content-Disposition` header.
   *
   * @param {string} value - `Content-Disposition` header value.
   * @returns {MultipartDisposition} Parsed disposition parameters.
   * @throws {RequestError} If the disposition type is not `form-data`.
   * @throws {RequestError} If the field name is missing.
   */
  #parseDisposition(value) {
    if (!/^form-data(?:;|\s*$)/i.test(value.trim())) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'multipart part must use form-data disposition' },
      });
    }

    const fieldName = this.#extractDispositionParam(value, 'name');

    if (fieldName === null) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'multipart part missing field name' },
      });
    }

    const filename = this.#extractDispositionParam(value, 'filename');

    return {
      fieldName,
      filename: filename ?? undefined,
    };
  }

  /**
   * Extracts a single parameter from a `Content-Disposition` header value.
   *
   * Extended parameters (`param*=`) are percent-decoded as UTF-8. Other
   * charsets are rejected. Parameter names must appear at a parameter
   * boundary (`;`) or at the start of the value, so that `name` does not
   * match inside `filename`.
   *
   * @param {string} value - `Content-Disposition` header value.
   * @param {string} param - Parameter name to extract.
   * @returns {string|null} Extracted parameter, or `null` when absent.
   * @throws {RequestError} If the extended parameter has an unsupported
   * charset or invalid percent-encoding.
   */
  #extractDispositionParam(value, param) {
    const extendedPattern = new RegExp(`(?:^|;)\\s*${param}\\*=([^']*)'([^']*)'([^;]+)`, 'i');
    const extendedMatch = value.match(extendedPattern);

    if (extendedMatch) {
      const charset = extendedMatch[1].toLowerCase();

      if (charset !== '' && charset !== 'utf-8') {
        throw new RequestError('BODY_PARSE_FAILED', {
          values: { reason: `unsupported ${param} charset` },
        });
      }

      try {
        return decodeURIComponent(extendedMatch[3]);
      } catch (error) {
        throw new RequestError('BODY_PARSE_FAILED', {
          values: { reason: `invalid ${param} encoding` },
          cause: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    const quotedPattern = new RegExp(`(?:^|;)\\s*${param}="([^"]*)"`, 'i');
    const quotedMatch = value.match(quotedPattern);

    if (quotedMatch) {
      return quotedMatch[1];
    }

    const tokenPattern = new RegExp(`(?:^|;)\\s*${param}=([^;\\s]+)`, 'i');
    const tokenMatch = value.match(tokenPattern);

    if (tokenMatch) {
      return tokenMatch[1];
    }

    return null;
  }

  /**
   * Extracts the content of the current multipart section.
   *
   * @returns {Buffer} Raw multipart section content.
   * @throws {RequestError} If the next boundary cannot be found.
   */
  #extractContent() {
    const boundaryIndex = this.#findBoundaryCandidate();

    if (boundaryIndex === -1) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid multipart payload' },
      });
    }

    const content = this.#buffer.subarray(this.#position, boundaryIndex);
    this.#position = boundaryIndex + this.#lineBreak.length + this.#boundary.length;

    return content;
  }

  /**
   * Finds the next valid boundary delimiter.
   *
   * A valid delimiter is the CRLF-preceded boundary followed by `\r`
   * (normal boundary) or `-` (closing boundary).
   *
   * @returns {number} The index of the valid delimiter, or `-1` when absent.
   */
  #findBoundaryCandidate() {
    let searchFrom = this.#position;

    while (searchFrom < this.#buffer.length) {
      const candidate = this.#buffer.indexOf(this.#boundaryWithCRLF, searchFrom);

      if (candidate === -1) {
        return -1;
      }

      const nextIndex = candidate + this.#boundaryWithCRLF.length;
      const nextByte = this.#buffer[nextIndex];

      if (nextByte === CR || nextByte === HYPHEN) {
        return candidate;
      }

      searchFrom = candidate + 1;
    }

    return -1;
  }

  /**
   * Appends a multipart section to the resulting `FormData`.
   *
   * @param {string} fieldName - Multipart field name.
   * @param {string|undefined} filename - Uploaded filename.
   * @param {string|undefined} contentType - Part `Content-Type`.
   * @param {Buffer} content - Raw part content.
   */
  #appendPart(fieldName, filename, contentType, content) {
    if (filename !== undefined) {
      const file = new File([new Uint8Array(content)], filename, {
        type: contentType || 'application/octet-stream',
      });

      this.#formData.append(fieldName, file);
    } else {
      this.#formData.append(fieldName, content.toString('utf8'));
    }
  }

  /**
   * Determines whether the closing multipart marker is at the
   * current parser position.
   *
   * @returns {boolean} `true` when the closing marker is present.
   * @throws {RequestError} If trailing data follows the closing marker.
   */
  #isFinalBoundary() {
    if (!this.#isCurrentPositionEqualTo(this.#closingMarker)) {
      return false;
    }

    this.#position += this.#closingMarker.length;
    this.#consumeOptionalTrailingCRLF();

    if (this.#position !== this.#buffer.length) {
      throw new RequestError('BODY_PARSE_FAILED', {
        values: { reason: 'invalid multipart payload' },
      });
    }

    return true;
  }

  /**
   * Consumes an optional trailing CRLF after a closing boundary.
   */
  #consumeOptionalTrailingCRLF() {
    if (this.#buffer[this.#position] === CR && this.#buffer[this.#position + 1] === LF) {
      this.#position += 2;
    }
  }

  /**
   * Determines whether the bytes at the current position equal the specified value.
   *
   * @param {Buffer} value - Buffer value to compare.
   * @returns {boolean} `true` when the values are equal.
   */
  #isCurrentPositionEqualTo(value) {
    return this.#buffer.subarray(this.#position, this.#position + value.length).equals(value);
  }

  /**
   * Consumes the specified value from the current parser position.
   *
   * @param {Buffer} value - Expected buffer value.
   * @param {string} reason - Reason used in the error when the value is missing.
   * @throws {RequestError} If the expected value is not present.
   */
  #consume(value, reason) {
    if (!this.#isCurrentPositionEqualTo(value)) {
      throw new RequestError('BODY_PARSE_FAILED', { values: { reason } });
    }

    this.#position += value.length;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default MultipartParser;
