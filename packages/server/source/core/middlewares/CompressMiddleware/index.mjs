// @ts-check
/**
 * @file Defines the compression middleware.
 *
 * @description Implements HTTP response compression without external
 * dependencies. Supports `br` and `gzip`, negotiates the encoding from
 * `Accept-Encoding`, applies a size threshold, and skips incompressible
 * media types.
 *
 * Configuration is expected to be validated and normalized before the
 * middleware is created.
 *
 * @module CompressMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { constants as zlibConstants, createBrotliCompress, createGzip } from 'node:zlib';

// » IMPORT LOCAL MODULES
import { wrapResponseBody } from '#Exchange';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an outgoing HTTP response.
 *
 * @typedef {import('#Response').default} Response
 */

/**
 * Represents an incoming HTTP request.
 *
 * @typedef {import('#Request').default} Request
 */

/**
 * Represents a native Node.js transform stream.
 *
 * @typedef {import('node:stream').Transform} NodeTransform
 */

/**
 * Represents a function that delegates execution to the next middleware
 * layer.
 *
 * @typedef {() => void | Promise<void>} NextFunction
 */

/**
 * Identifies the compression encodings supported by this middleware.
 *
 * @typedef {'br'|'gzip'} CompressionEncoding
 */

/**
 * Represents normalized compression middleware configuration.
 *
 * @typedef  {object}             CompressOptionsData
 * @property {number}             threshold           - Minimum body size in bytes required to compress. Use `0` to compress any non-empty body.
 * @property {number}             level               - Compression level passed to the underlying zlib implementation.
 * @property {string[]|undefined} types               - Compressible media types. When `undefined`, the default allow-list is used.
 */

/**
 * Represents a parsed `Accept-Encoding` entry.
 *
 * @typedef  {object} EncodingPreference
 * @property {string} encoding           - The encoding token.
 * @property {number} quality            - Parsed q-value in the range `[0, 1]`.
 */

/**
 * Represents the outcome of negotiating an encoding.
 *
 * @typedef {CompressionEncoding|null} NegotiatedEncoding
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Media types considered compressible by default.
 *
 * Types that are already compressed (images, video, audio, archives) are
 * intentionally excluded. Compressing them wastes CPU and often increases
 * the payload size.
 *
 * @type {Set<string>}
 */
const DEFAULT_COMPRESSIBLE_TYPES = new Set([
  'application/javascript',
  'application/json',
  'application/manifest+json',
  'application/xml',
  'application/xhtml+xml',
  'application/rss+xml',
  'application/atom+xml',
  'application/ld+json',
  'application/wasm',
  'image/svg+xml',
  'text/css',
  'text/csv',
  'text/html',
  'text/javascript',
  'text/plain',
  'text/xml',
]);

/**
 * Identifies the encodings supported by this middleware, in preference
 * order.
 *
 * @type {CompressionEncoding[]}
 */
const SUPPORTED_ENCODINGS = ['br', 'gzip'];

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Reads a header value as a single string.
 *
 * Numeric header values are converted to strings. Array values are
 * reduced to their first element.
 *
 * @private
 * @param {string|number|(string|number)[]|undefined} value - Header value to normalize.
 * @returns {string|undefined} The first header value as a string, or `undefined` when no value exists.
 */
const firstHeaderValue = value => {
  if (value === undefined) {
    return undefined;
  }

  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : String(first);
};

/**
 * Parses a single `q` parameter value.
 *
 * @private
 * @param {string|undefined} rawValue - The raw parameter value.
 * @returns {number} The parsed quality, or `0` when the value is invalid.
 */
const parseQuality = rawValue => {
  const parsed = Number.parseFloat((rawValue ?? '').trim());
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
};

/**
 * Parses a single `Accept-Encoding` entry.
 *
 * @private
 * @param {string} part - A single comma-separated entry.
 * @returns {EncodingPreference|null} The parsed preference, or `null` when the entry is empty.
 */
const parsePreference = part => {
  const [rawEncoding, ...params] = part.trim().split(';');
  const encoding = rawEncoding.trim().toLowerCase();

  const quality = params.reduce((acc, param) => {
    const [key, rawValue] = param.trim().split('=');
    return key.trim().toLowerCase() === 'q' ? parseQuality(rawValue) : acc;
  }, 1);

  return encoding.length === 0 ? null : { encoding, quality };
};

/**
 * Parses an `Accept-Encoding` header value into a list of encoding
 * preferences.
 *
 * Invalid entries are ignored. When the header is missing or contains no
 * valid entry, an empty array is returned.
 *
 * @private
 * @param {string|undefined} value - The `Accept-Encoding` header value.
 * @returns {EncodingPreference[]} The parsed preferences.
 */
const parseAcceptEncoding = value =>
  typeof value !== 'string'
    ? []
    : value
        .split(',')
        .map(parsePreference)
        .filter(preference => preference !== null);

/**
 * Selects the best supported encoding from the parsed preferences.
 *
 * Preference order is determined by `q` value (descending). When several
 * encodings share the same `q`, the order defined by `SUPPORTED_ENCODINGS`
 * is preserved.
 *
 * @private
 * @param {EncodingPreference[]} preferences - Parsed preferences.
 * @returns {NegotiatedEncoding} The selected encoding, or `null` when none is acceptable.
 */
const selectEncoding = preferences => {
  const qualityByEncoding = new Map(
    preferences.map(({ encoding, quality }) => [encoding, quality]),
  );

  const wildcardQuality = qualityByEncoding.get('*') ?? 0;

  const candidates = SUPPORTED_ENCODINGS.map(encoding => ({
    encoding,
    quality: qualityByEncoding.get(encoding) ?? wildcardQuality,
  })).filter(candidate => candidate.quality > 0);

  return candidates.length === 0
    ? null
    : candidates.reduce((best, candidate) => (candidate.quality > best.quality ? candidate : best))
        .encoding;
};

/**
 * Determines whether a media type is compressible.
 *
 * The comparison ignores parameters (e.g. `; charset=utf-8`) and is
 * case-insensitive. A media type is compressible when it is explicitly
 * included in the configured allow-list, when it is a `text/*` type,
 * or when it uses a structured `+json` / `+xml` suffix.
 *
 * @private
 * @param {string|undefined} contentType - The response `Content-Type` header value.
 * @param {Set<string>} compressibleTypes - The explicitly allowed media types.
 * @returns {boolean} `true` when the media type is compressible.
 */
const isCompressible = (contentType, compressibleTypes) => {
  if (typeof contentType !== 'string') {
    return false;
  }

  const [mediaType] = contentType.split(';', 1);
  const normalized = mediaType.trim().toLowerCase();

  return (
    compressibleTypes.has(normalized) ||
    normalized.startsWith('text/') ||
    normalized.endsWith('+json') ||
    normalized.endsWith('+xml')
  );
};

/**
 * Determines whether the response declares a compressible media type.
 *
 * @private
 * @param {Response} response - The outgoing response.
 * @param {Set<string>} compressibleTypes - The set of compressible media types.
 * @returns {boolean} `true` when the response media type is compressible.
 */
const isCompressibleResponse = (response, compressibleTypes) =>
  isCompressible(firstHeaderValue(response.getHeader('Content-Type')), compressibleTypes);

/**
 * Determines whether the response has a body to compress.
 *
 * @private
 * @param {Response} response - The outgoing response.
 * @returns {boolean} `true` when the response has a body.
 */
const hasBody = response => response.bodyKind !== 'none';

/**
 * Determines whether the response has no `Content-Encoding` header set.
 *
 * A response that already declares a content encoding must not be
 * compressed again.
 *
 * @private
 * @param {Response} response - The outgoing response.
 * @returns {boolean} `true` when the response has no `Content-Encoding` header.
 */
const hasNoContentEncoding = response => !response.hasHeader('Content-Encoding');

/**
 * Determines whether the response body meets the size threshold required
 * for compression.
 *
 * Buffered bodies are compared against the threshold. Stream bodies
 * always meet the threshold because their size is unknown ahead of time.
 *
 * @private
 * @param {Response} response - The outgoing response.
 * @param {number} threshold - Minimum body size in bytes.
 * @returns {boolean} `true` when the body meets the threshold.
 */
const meetsThreshold = (response, threshold) =>
  response.bodyKind !== 'buffer' || (response.bodyLength ?? 0) >= threshold;

/**
 * Determines whether the response is in a state that permits compression.
 *
 * @private
 * @param {Response} response - The outgoing response.
 * @param {number} threshold - Minimum body size in bytes.
 * @returns {boolean} `true` when the response can be compressed.
 */
const canApplyCompression = (response, threshold) =>
  !response.isCommitted &&
  hasBody(response) &&
  hasNoContentEncoding(response) &&
  meetsThreshold(response, threshold);

/**
 * Creates the transform stream for the selected encoding.
 *
 * @private
 * @param {CompressionEncoding} encoding - The negotiated encoding.
 * @param {number} level - The compression level.
 * @returns {NodeTransform} The transform stream.
 */
const createCompressionStream = (encoding, level) =>
  encoding === 'br'
    ? createBrotliCompress({
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: level },
      })
    : createGzip({ level });

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Implements HTTP response compression.
 *
 * @classdesc The middleware negotiates the compression encoding from
 * `Accept-Encoding`, applies a size threshold, filters incompressible
 * media types, and wraps the response body with the selected transform.
 *
 * Compression runs after `await next()` so that the response body is
 * already described by the handler. The middleware never overwrites an
 * existing `Content-Encoding`.
 */
class CompressMiddleware {
  /**
   * Normalized compression options.
   *
   * @type {Readonly<CompressOptionsData>}
   */
  #options;

  /**
   * Compressible media types resolved at construction time.
   *
   * @type {Set<string>}
   */
  #compressibleTypes;

  /**
   * Creates a compression middleware.
   *
   * @param {CompressOptionsData} options - Validated and normalized compression options.
   *
   * @example
   * ```js
   * const middleware = new CompressMiddleware({
   *   threshold: 1024,
   *   level: 6,
   *   types: undefined,
   * });
   * ```
   */
  constructor(options) {
    this.#options = options;
    this.#compressibleTypes =
      options.types === undefined
        ? DEFAULT_COMPRESSIBLE_TYPES
        : new Set(options.types.map(type => type.toLowerCase()));
  }

  /**
   * Processes an HTTP exchange and compresses the response when applicable.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @param {NextFunction} next - Function that delegates to the next middleware.
   * @returns {Promise<void>} Resolves when request processing has completed.
   *
   * @example
   * ```js
   * await middleware.handle(exchange, next);
   * ```
   */
  async handle(exchange, next) {
    await next();

    const { request, response } = exchange;
    const encoding = this.#negotiate(request);

    if (this.#shouldCompress(response, encoding)) {
      this.#applyCompression(response, encoding);
    }
  }

  /**
   * Negotiates the compression encoding for the request.
   *
   * @param {Request} request - The incoming request.
   * @returns {NegotiatedEncoding} The negotiated encoding, or `null` when none is acceptable.
   */
  #negotiate(request) {
    return selectEncoding(
      parseAcceptEncoding(firstHeaderValue(request.getHeader('accept-encoding'))),
    );
  }

  /**
   * Determines whether the response should be compressed.
   *
   * @param {Response} response - The outgoing response.
   * @param {NegotiatedEncoding} encoding - The negotiated encoding.
   * @returns {encoding is CompressionEncoding} `true` when the response should be compressed.
   */
  #shouldCompress(response, encoding) {
    return (
      encoding !== null &&
      isCompressibleResponse(response, this.#compressibleTypes) &&
      canApplyCompression(response, this.#options.threshold)
    );
  }

  /**
   * Applies the compression transform to the response.
   *
   * Compression is best-effort. If the response cannot be wrapped, the
   * original response remains unchanged.
   *
   * @param {Response} response - The outgoing response.
   * @param {CompressionEncoding} encoding - The negotiated encoding.
   */
  #applyCompression(response, encoding) {
    const transform = createCompressionStream(encoding, this.#options.level);

    if (this.#tryWrap(response, transform)) {
      response.setHeader('Content-Encoding', encoding);
      response.vary('Accept-Encoding');
    }
  }

  /**
   * Attempts to wrap the response body with the given transform.
   *
   * @param {Response} response - The outgoing response.
   * @param {NodeTransform} transform - The compression transform.
   * @returns {boolean} `true` when the body was wrapped.
   */
  #tryWrap(response, transform) {
    try {
      wrapResponseBody(response, transform);
      return true;
    } catch {
      return false;
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CompressMiddleware;
