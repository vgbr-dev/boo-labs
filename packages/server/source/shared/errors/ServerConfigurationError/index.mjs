/**
 * @file Defines domain-specific errors for server configuration.
 *
 * @description ServerConfigurationError extends BaseError to provide
 * structured, identifiable errors specific to server configuration
 * validation, including request options, response options, listen
 * options, static options, and adapter initialization failures.
 *
 * @module ServerConfigurationError
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import BaseError from '../BaseError/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @template {string} T
 * @typedef {T | (string & {})} LiteralUnion
 */

/**
 * Identifies a predefined server configuration error or allows a custom
 * error message.
 *
 * @typedef {LiteralUnion<
 * 'INVALID_REQUEST_OPTIONS' |
 * 'INVALID_BODY_LIMIT' |
 * 'INVALID_BODY_LIMIT_TYPE' |
 * 'INVALID_BODY_LIMIT_RANGE' |
 * 'INVALID_TRUST_PROXY' |
 * 'INVALID_TRUST_PROXY_TYPE' |
 * 'INVALID_TRUST_PROXY_RANGE' |
 * 'INVALID_RESPONSE_OPTIONS' |
 * 'INVALID_ETAG_TYPE' |
 * 'INVALID_ETAG' |
 * 'INVALID_DEFAULT_CHARSET_TYPE' |
 * 'INVALID_DEFAULT_CHARSET_VALUE' |
 * 'INVALID_DEFAULT_CHARSET' |
 * 'INVALID_LISTEN_OPTIONS' |
 * 'MISSING_PORT' |
 * 'INVALID_PORT' |
 * 'INVALID_PORT_TYPE' |
 * 'INVALID_PORT_RANGE' |
 * 'INVALID_HOST' |
 * 'INVALID_HOST_TYPE' |
 * 'INVALID_HOST_VALUE' |
 * 'INVALID_HOST_RANGE' |
 * 'INVALID_BACKLOG' |
 * 'INVALID_BACKLOG_TYPE' |
 * 'INVALID_BACKLOG_RANGE' |
 * 'INVALID_STATIC_OPTIONS' |
 * 'MISSING_STATIC_ROOT' |
 * 'INVALID_STATIC_ROOT_TYPE' |
 * 'INVALID_STATIC_ROOT_VALUE' |
 * 'INVALID_STATIC_INDEX_TYPE' |
 * 'INVALID_STATIC_INDEX_ITEM' |
 * 'INVALID_STATIC_MAX_AGE_TYPE' |
 * 'INVALID_STATIC_MAX_AGE_VALUE' |
 * 'INVALID_STATIC_ETAG_TYPE' |
 * 'INVALID_STATIC_LAST_MODIFIED_TYPE' |
 * 'INVALID_STATIC_FALLTHROUGH_TYPE' |
 * 'INVALID_STATIC_EXTENSIONS_TYPE' |
 * 'INVALID_STATIC_EXTENSIONS_ITEM' |
 * 'INVALID_STATIC_DOTFILES_TYPE' |
 * 'SERVER_CONFIGURATION_INVALID' |
 * 'SERVER_ADAPTER_INIT_FAILED' |
 * 'INVALID_CORS_OPTIONS' |
 * 'INVALID_CORS_ORIGIN_TYPE' |
 * 'INVALID_CORS_ORIGIN_ITEM' |
 * 'INVALID_CORS_METHODS_TYPE' |
 * 'INVALID_CORS_METHODS_ITEM' |
 * 'INVALID_CORS_ALLOWED_HEADERS_TYPE' |
 * 'INVALID_CORS_ALLOWED_HEADERS_ITEM' |
 * 'INVALID_CORS_EXPOSED_HEADERS_TYPE' |
 * 'INVALID_CORS_EXPOSED_HEADERS_ITEM' |
 * 'INVALID_CORS_CREDENTIALS_TYPE' |
 * 'INVALID_CORS_MAX_AGE_TYPE' |
 * 'INVALID_CORS_MAX_AGE_RANGE' |
 * 'INVALID_CORS_PREFLIGHT_CONTINUE_TYPE' |
 * 'INVALID_CORS_OPTIONS_SUCCESS_STATUS_TYPE' |
 * 'INVALID_CORS_OPTIONS_SUCCESS_STATUS_RANGE' |
 * 'INVALID_SECURITY_HEADERS_OPTIONS' |
 * 'INVALID_SECURITY_HEADERS_OPTION_TYPE' |
 * 'INVALID_RATE_LIMIT_OPTIONS' |
 * 'INVALID_RATE_LIMIT_WINDOW_MS_TYPE' |
 * 'INVALID_RATE_LIMIT_WINDOW_MS_RANGE' |
 * 'INVALID_RATE_LIMIT_MAX_TYPE' |
 * 'INVALID_RATE_LIMIT_MAX_RANGE' |
 * 'INVALID_RATE_LIMIT_STATUS_CODE_TYPE' |
 * 'INVALID_RATE_LIMIT_STATUS_CODE_RANGE' |
 * 'INVALID_RATE_LIMIT_MESSAGE_TYPE' |
 * 'INVALID_RATE_LIMIT_STANDARD_HEADERS_TYPE' |
 * 'INVALID_RATE_LIMIT_LEGACY_HEADERS_TYPE' |
 * 'INVALID_COOKIE_PARSER_OPTIONS' |
 * 'INVALID_COOKIE_PARSER_DECODE_TYPE' |
 * 'INVALID_COOKIE_SESSION_OPTIONS' |
 * 'COOKIE_SESSION_REQUIRES_COOKIE_PARSER' |
 * 'MISSING_COOKIE_SESSION_KEYS' |
 * 'INVALID_COOKIE_SESSION_NAME_TYPE' |
 * 'INVALID_COOKIE_SESSION_NAME_VALUE' |
 * 'INVALID_COOKIE_SESSION_KEYS_TYPE' |
 * 'INVALID_COOKIE_SESSION_KEYS_ITEM' |
 * 'INVALID_COOKIE_SESSION_MAX_AGE_TYPE' |
 * 'INVALID_COOKIE_SESSION_MAX_AGE_RANGE' |
 * 'INVALID_COOKIE_SESSION_PATH_TYPE' |
 * 'INVALID_COOKIE_SESSION_PATH_VALUE' |
 * 'INVALID_COOKIE_SESSION_DOMAIN_TYPE' |
 * 'INVALID_COOKIE_SESSION_DOMAIN_VALUE' |
 * 'INVALID_COOKIE_SESSION_SECURE_TYPE' |
 * 'INVALID_COOKIE_SESSION_HTTP_ONLY_TYPE' |
 * 'INVALID_COOKIE_SESSION_SAME_SITE_VALUE' |
 * 'INVALID_COOKIE_SESSION_OVERWRITE_TYPE' |
 * 'COOKIE_SESSION_NONE_REQUIRES_SECURE' |
 * 'INVALID_CSRF_OPTIONS' |
 * 'INVALID_CSRF_COOKIE_NAME_TYPE' |
 * 'INVALID_CSRF_COOKIE_NAME_VALUE' |
 * 'INVALID_CSRF_HEADER_NAME_TYPE' |
 * 'INVALID_CSRF_HEADER_NAME_VALUE' |
 * 'INVALID_CSRF_SAFE_METHODS_TYPE' |
 * 'INVALID_CSRF_SAFE_METHODS_ITEM' |
 * 'INVALID_CSRF_TOKEN_BYTES_TYPE' |
 * 'INVALID_CSRF_TOKEN_BYTES_RANGE' |
 * 'INVALID_CSRF_PATH_TYPE' |
 * 'INVALID_CSRF_PATH_VALUE' |
 * 'INVALID_CSRF_DOMAIN_TYPE' |
 * 'INVALID_CSRF_DOMAIN_VALUE' |
 * 'INVALID_CSRF_SECURE_TYPE' |
 * 'INVALID_CSRF_SAME_SITE_VALUE' |
 * 'CSRF_NONE_REQUIRES_SECURE' |
 * 'INVALID_COMPRESS_OPTIONS' |
 * 'INVALID_COMPRESS_THRESHOLD_TYPE' |
 * 'INVALID_COMPRESS_THRESHOLD_RANGE' |
 * 'INVALID_COMPRESS_LEVEL_TYPE' |
 * 'INVALID_COMPRESS_LEVEL_RANGE' |
 * 'INVALID_COMPRESS_TYPES_TYPE' |
 * 'INVALID_COMPRESS_TYPES_ITEM'
 * >} ServerConfigurationErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  ServerConfigurationErrorOptions
 * @property {Record<string, unknown>} [values]                        - Values for template placeholders in the error message.
 * @property {unknown}                 [details]                       - Additional contextual information about the error.
 * @property {Error}                   [cause]                         - The original error that caused this error.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error thrown when server configuration is invalid or an adapter cannot
 * be initialized.
 *
 * @classdesc This error type provides identifiable failures related to
 * server configuration validation and adapter lifecycle.
 *
 * @augments BaseError
 * @private
 */
class ServerConfigurationError extends BaseError {
  /**
   * Creates a new {@link ServerConfigurationError}.
   *
   * @param {ServerConfigurationErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {ServerConfigurationErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   * throw new ServerConfigurationError('INVALID_BODY_LIMIT', {
   *   values: { received: typeof bodyLimit },
   * });
   * ```
   * @example
   * ```js
   * throw new ServerConfigurationError('MISSING_PORT', {
   *   values: {},
   * });
   * ```
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Collection of predefined server configuration error messages.
   *
   * Available error identifiers:
   *
   * Request options:
   *
   * - `'INVALID_REQUEST_OPTIONS'`.
   * - `'INVALID_BODY_LIMIT'`.
   * - `'INVALID_BODY_LIMIT_TYPE'`.
   * - `'INVALID_BODY_LIMIT_RANGE'`.
   * - `'INVALID_TRUST_PROXY'`.
   * - `'INVALID_TRUST_PROXY_TYPE'`.
   * - `'INVALID_TRUST_PROXY_RANGE'`.
   *
   * Response options:
   *
   * - `'INVALID_RESPONSE_OPTIONS'`.
   * - `'INVALID_ETAG_TYPE'`.
   * - `'INVALID_ETAG'`.
   * - `'INVALID_DEFAULT_CHARSET_TYPE'`.
   * - `'INVALID_DEFAULT_CHARSET_VALUE'`.
   * - `'INVALID_DEFAULT_CHARSET'`.
   *
   * Listen options:
   *
   * - `'INVALID_LISTEN_OPTIONS'`.
   * - `'MISSING_PORT'`.
   * - `'INVALID_PORT'`.
   * - `'INVALID_PORT_TYPE'`.
   * - `'INVALID_PORT_RANGE'`.
   * - `'INVALID_HOST'`.
   * - `'INVALID_HOST_TYPE'`.
   * - `'INVALID_HOST_VALUE'`.
   * - `'INVALID_HOST_RANGE'`.
   * - `'INVALID_BACKLOG'`.
   * - `'INVALID_BACKLOG_TYPE'`.
   * - `'INVALID_BACKLOG_RANGE'`.
   *
   * Static options:
   *
   * - `'INVALID_STATIC_OPTIONS'`.
   * - `'MISSING_STATIC_ROOT'`.
   * - `'INVALID_STATIC_ROOT_TYPE'`.
   * - `'INVALID_STATIC_ROOT_VALUE'`.
   * - `'INVALID_STATIC_INDEX_TYPE'`.
   * - `'INVALID_STATIC_INDEX_ITEM'`.
   * - `'INVALID_STATIC_MAX_AGE_TYPE'`.
   * - `'INVALID_STATIC_MAX_AGE_VALUE'`.
   * - `'INVALID_STATIC_ETAG_TYPE'`.
   * - `'INVALID_STATIC_LAST_MODIFIED_TYPE'`.
   * - `'INVALID_STATIC_FALLTHROUGH_TYPE'`.
   * - `'INVALID_STATIC_EXTENSIONS_TYPE'`.
   * - `'INVALID_STATIC_EXTENSIONS_ITEM'`.
   * - `'INVALID_STATIC_DOTFILES_TYPE'`.
   *
   * Configuration:
   *
   * - `'SERVER_CONFIGURATION_INVALID'`.
   * - `'SERVER_ADAPTER_INIT_FAILED'`.
   *
   * CORS options:
   *
   * - `'INVALID_CORS_OPTIONS'`.
   * - `'INVALID_CORS_ORIGIN_TYPE'`.
   * - `'INVALID_CORS_ORIGIN_ITEM'`.
   * - `'INVALID_CORS_METHODS_TYPE'`.
   * - `'INVALID_CORS_METHODS_ITEM'`.
   * - `'INVALID_CORS_ALLOWED_HEADERS_TYPE'`.
   * - `'INVALID_CORS_ALLOWED_HEADERS_ITEM'`.
   * - `'INVALID_CORS_EXPOSED_HEADERS_TYPE'`.
   * - `'INVALID_CORS_EXPOSED_HEADERS_ITEM'`.
   * - `'INVALID_CORS_CREDENTIALS_TYPE'`.
   * - `'INVALID_CORS_MAX_AGE_TYPE'`.
   * - `'INVALID_CORS_MAX_AGE_RANGE'`.
   * - `'INVALID_CORS_PREFLIGHT_CONTINUE_TYPE'`.
   * - `'INVALID_CORS_OPTIONS_SUCCESS_STATUS_TYPE'`.
   * - `'INVALID_CORS_OPTIONS_SUCCESS_STATUS_RANGE'`.
   *
   * Security headers options:
   *
   * - `'INVALID_SECURITY_HEADERS_OPTIONS'`.
   * - `'INVALID_SECURITY_HEADERS_OPTION_TYPE'`.
   *
   * Rate limit options:
   *
   * - `'INVALID_RATE_LIMIT_OPTIONS'`.
   * - `'INVALID_RATE_LIMIT_WINDOW_MS_TYPE'`.
   * - `'INVALID_RATE_LIMIT_WINDOW_MS_RANGE'`.
   * - `'INVALID_RATE_LIMIT_MAX_TYPE'`.
   * - `'INVALID_RATE_LIMIT_MAX_RANGE'`.
   * - `'INVALID_RATE_LIMIT_STATUS_CODE_TYPE'`.
   * - `'INVALID_RATE_LIMIT_STATUS_CODE_RANGE'`.
   * - `'INVALID_RATE_LIMIT_MESSAGE_TYPE'`.
   * - `'INVALID_RATE_LIMIT_STANDARD_HEADERS_TYPE'`.
   * - `'INVALID_RATE_LIMIT_LEGACY_HEADERS_TYPE'`.
   *
   * Cookie parser options:
   *
   * - `'INVALID_COOKIE_PARSER_OPTIONS'`.
   * - `'INVALID_COOKIE_PARSER_DECODE_TYPE'`.
   *
   * Cookie session options:
   *
   * - `'INVALID_COOKIE_SESSION_OPTIONS'`.
   * - `'COOKIE_SESSION_REQUIRES_COOKIE_PARSER'`.
   * - `'MISSING_COOKIE_SESSION_KEYS'`.
   * - `'INVALID_COOKIE_SESSION_NAME_TYPE'`.
   * - `'INVALID_COOKIE_SESSION_NAME_VALUE'`.
   * - `'INVALID_COOKIE_SESSION_KEYS_TYPE'`.
   * - `'INVALID_COOKIE_SESSION_KEYS_ITEM'`.
   * - `'INVALID_COOKIE_SESSION_MAX_AGE_TYPE'`.
   * - `'INVALID_COOKIE_SESSION_MAX_AGE_RANGE'`.
   * - `'INVALID_COOKIE_SESSION_PATH_TYPE'`.
   * - `'INVALID_COOKIE_SESSION_PATH_VALUE'`.
   * - `'INVALID_COOKIE_SESSION_DOMAIN_TYPE'`.
   * - `'INVALID_COOKIE_SESSION_DOMAIN_VALUE'`.
   * - `'INVALID_COOKIE_SESSION_SECURE_TYPE'`.
   * - `'INVALID_COOKIE_SESSION_HTTP_ONLY_TYPE'`.
   * - `'INVALID_COOKIE_SESSION_SAME_SITE_VALUE'`.
   * - `'INVALID_COOKIE_SESSION_OVERWRITE_TYPE'`.
   * - `'COOKIE_SESSION_NONE_REQUIRES_SECURE'`.
   *
   * CSRF options:
   *
   * - `'INVALID_CSRF_OPTIONS'`.
   * - `'INVALID_CSRF_COOKIE_NAME_TYPE'`.
   * - `'INVALID_CSRF_COOKIE_NAME_VALUE'`.
   * - `'INVALID_CSRF_HEADER_NAME_TYPE'`.
   * - `'INVALID_CSRF_HEADER_NAME_VALUE'`.
   * - `'INVALID_CSRF_SAFE_METHODS_TYPE'`.
   * - `'INVALID_CSRF_SAFE_METHODS_ITEM'`.
   * - `'INVALID_CSRF_TOKEN_BYTES_TYPE'`.
   * - `'INVALID_CSRF_TOKEN_BYTES_RANGE'`.
   * - `'INVALID_CSRF_PATH_TYPE'`.
   * - `'INVALID_CSRF_PATH_VALUE'`.
   * - `'INVALID_CSRF_DOMAIN_TYPE'`.
   * - `'INVALID_CSRF_DOMAIN_VALUE'`.
   * - `'INVALID_CSRF_SECURE_TYPE'`.
   * - `'INVALID_CSRF_SAME_SITE_VALUE'`.
   * - `'CSRF_NONE_REQUIRES_SECURE'`.
   *
   * Compress options:
   *
   * - `'INVALID_COMPRESS_OPTIONS'`.
   * - `'INVALID_COMPRESS_THRESHOLD_TYPE'`.
   * - `'INVALID_COMPRESS_THRESHOLD_RANGE'`.
   * - `'INVALID_COMPRESS_LEVEL_TYPE'`.
   * - `'INVALID_COMPRESS_LEVEL_RANGE'`.
   * - `'INVALID_COMPRESS_TYPES_TYPE'`.
   * - `'INVALID_COMPRESS_TYPES_ITEM'`.
   *
   * @private
   * @static
   * @type {Map<ServerConfigurationErrorIdentifier, string>}
   */
  static MESSAGES = new Map([
    // ── Request options ────────────────────────────────────────────────────
    ['INVALID_REQUEST_OPTIONS', 'Request options must be a plain object, received: {received}.'],
    ['INVALID_BODY_LIMIT', 'bodyLimit must be a positive safe integer, received: {received}.'],
    ['INVALID_BODY_LIMIT_TYPE', 'bodyLimit must be a number, received: {received}.'],
    [
      'INVALID_BODY_LIMIT_RANGE',
      'bodyLimit must be a positive safe integer, received: {bodyLimit}.',
    ],
    [
      'INVALID_TRUST_PROXY',
      'trustProxy must be a boolean or a non-negative integer, received: {received}.',
    ],
    [
      'INVALID_TRUST_PROXY_TYPE',
      'trustProxy must be a boolean or a non-negative integer, received: {received}.',
    ],
    [
      'INVALID_TRUST_PROXY_RANGE',
      'trustProxy must be a non-negative integer, received: {trustProxy}.',
    ],

    // ── Response options ───────────────────────────────────────────────────
    ['INVALID_RESPONSE_OPTIONS', 'Response options must be a plain object, received: {received}.'],
    ['INVALID_ETAG_TYPE', 'etag must be a boolean, received: {received}.'],
    ['INVALID_ETAG', 'etag must be a boolean, received: {received}.'],
    ['INVALID_DEFAULT_CHARSET_TYPE', 'defaultCharset must be a string, received: {received}.'],
    ['INVALID_DEFAULT_CHARSET_VALUE', 'defaultCharset must be a non-empty string.'],
    ['INVALID_DEFAULT_CHARSET', 'defaultCharset must be a non-empty string, received: {received}.'],

    // ── Listen options ─────────────────────────────────────────────────────
    ['INVALID_LISTEN_OPTIONS', 'Listen options must be a plain object, received: {received}.'],
    ['MISSING_PORT', 'Listen options must declare a port.'],
    ['INVALID_PORT', 'port must be a valid integer between 0 and 65535.'],
    ['INVALID_PORT_TYPE', 'port must be a number, received: {received}.'],
    ['INVALID_PORT_RANGE', 'port must be an integer between 0 and 65535, received: {port}.'],
    ['INVALID_HOST', 'host must be a non-empty string, received: {received}.'],
    ['INVALID_HOST_TYPE', 'host must be a string, received: {received}.'],
    ['INVALID_HOST_VALUE', 'host must be a non-empty string.'],
    ['INVALID_HOST_RANGE', 'host must be a non-empty string.'],
    ['INVALID_BACKLOG', 'backlog must be a positive integer, received: {received}.'],
    ['INVALID_BACKLOG_TYPE', 'backlog must be a number, received: {received}.'],
    ['INVALID_BACKLOG_RANGE', 'backlog must be a positive integer, received: {backlog}.'],

    // ── Static options ─────────────────────────────────────────────────────
    ['INVALID_STATIC_OPTIONS', 'Static options must be a plain object, received: {received}.'],
    ['MISSING_STATIC_ROOT', 'Static options must declare a root.'],
    ['INVALID_STATIC_ROOT_TYPE', 'root must be a string, received: {received}.'],
    ['INVALID_STATIC_ROOT_VALUE', 'root must be a non-empty string.'],
    ['INVALID_STATIC_INDEX_TYPE', 'index must be an array, received: {received}.'],
    ['INVALID_STATIC_INDEX_ITEM', 'index items must be non-empty strings.'],
    ['INVALID_STATIC_MAX_AGE_TYPE', 'maxAge must be a number, received: {received}.'],
    ['INVALID_STATIC_MAX_AGE_VALUE', 'maxAge must be a non-negative integer, received: {maxAge}.'],
    ['INVALID_STATIC_ETAG_TYPE', 'etag must be a boolean, received: {received}.'],
    ['INVALID_STATIC_LAST_MODIFIED_TYPE', 'lastModified must be a boolean, received: {received}.'],
    ['INVALID_STATIC_FALLTHROUGH_TYPE', 'fallthrough must be a boolean, received: {received}.'],
    ['INVALID_STATIC_EXTENSIONS_TYPE', 'extensions must be an array, received: {received}.'],
    ['INVALID_STATIC_EXTENSIONS_ITEM', 'extensions items must be non-empty strings.'],
    ['INVALID_STATIC_DOTFILES_TYPE', 'dotfiles must be a boolean, received: {received}.'],

    // ── Configuration ──────────────────────────────────────────────────────
    ['SERVER_CONFIGURATION_INVALID', 'Server configuration is invalid: {reason}.'],
    ['SERVER_ADAPTER_INIT_FAILED', 'Server adapter failed to initialize: {reason}.'],

    // ── CORS options ───────────────────────────────────────────────────────
    ['INVALID_CORS_OPTIONS', 'CORS options must be a plain object, received: {received}.'],
    [
      'INVALID_CORS_ORIGIN_TYPE',
      'origin must be `true`, a string, or an array of strings, received: {received}.',
    ],
    ['INVALID_CORS_ORIGIN_ITEM', 'origin array items must be non-empty strings.'],
    ['INVALID_CORS_METHODS_TYPE', 'methods must be an array, received: {received}.'],
    ['INVALID_CORS_METHODS_ITEM', 'methods items must be non-empty strings.'],
    ['INVALID_CORS_ALLOWED_HEADERS_TYPE', 'allowedHeaders must be an array, received: {received}.'],
    ['INVALID_CORS_ALLOWED_HEADERS_ITEM', 'allowedHeaders items must be non-empty strings.'],
    ['INVALID_CORS_EXPOSED_HEADERS_TYPE', 'exposedHeaders must be an array, received: {received}.'],
    ['INVALID_CORS_EXPOSED_HEADERS_ITEM', 'exposedHeaders items must be non-empty strings.'],
    ['INVALID_CORS_CREDENTIALS_TYPE', 'credentials must be a boolean, received: {received}.'],
    ['INVALID_CORS_MAX_AGE_TYPE', 'maxAge must be a number, received: {received}.'],
    ['INVALID_CORS_MAX_AGE_RANGE', 'maxAge must be a non-negative integer, received: {maxAge}.'],
    [
      'INVALID_CORS_PREFLIGHT_CONTINUE_TYPE',
      'preflightContinue must be a boolean, received: {received}.',
    ],
    [
      'INVALID_CORS_OPTIONS_SUCCESS_STATUS_TYPE',
      'optionsSuccessStatus must be a number, received: {received}.',
    ],
    [
      'INVALID_CORS_OPTIONS_SUCCESS_STATUS_RANGE',
      'optionsSuccessStatus must be an integer between 100 and 599, received: {optionsSuccessStatus}.',
    ],

    // ── Security headers options ───────────────────────────────────────────
    [
      'INVALID_SECURITY_HEADERS_OPTIONS',
      'Security headers options must be a plain object, received: {received}.',
    ],
    [
      'INVALID_SECURITY_HEADERS_OPTION_TYPE',
      'Security header option `{key}` must be a string or `false`, received: {received}.',
    ],

    // ── Rate limit options ─────────────────────────────────────────────────
    [
      'INVALID_RATE_LIMIT_OPTIONS',
      'Rate limit options must be a plain object, received: {received}.',
    ],
    ['INVALID_RATE_LIMIT_WINDOW_MS_TYPE', 'windowMs must be a number, received: {received}.'],
    [
      'INVALID_RATE_LIMIT_WINDOW_MS_RANGE',
      'windowMs must be a positive integer, received: {windowMs}.',
    ],
    ['INVALID_RATE_LIMIT_MAX_TYPE', 'max must be a number, received: {received}.'],
    ['INVALID_RATE_LIMIT_MAX_RANGE', 'max must be a positive integer, received: {max}.'],
    ['INVALID_RATE_LIMIT_STATUS_CODE_TYPE', 'statusCode must be a number, received: {received}.'],
    [
      'INVALID_RATE_LIMIT_STATUS_CODE_RANGE',
      'statusCode must be an integer between 400 and 599, received: {statusCode}.',
    ],
    ['INVALID_RATE_LIMIT_MESSAGE_TYPE', 'message must be a plain object, received: {received}.'],
    [
      'INVALID_RATE_LIMIT_STANDARD_HEADERS_TYPE',
      'standardHeaders must be a boolean, received: {received}.',
    ],
    [
      'INVALID_RATE_LIMIT_LEGACY_HEADERS_TYPE',
      'legacyHeaders must be a boolean, received: {received}.',
    ],

    // ── Cookie parser options ──────────────────────────────────────────────
    [
      'INVALID_COOKIE_PARSER_OPTIONS',
      'Cookie parser options must be a plain object, received: {received}.',
    ],
    ['INVALID_COOKIE_PARSER_DECODE_TYPE', 'decode must be a boolean, received: {received}.'],

    // ── Cookie session options ─────────────────────────────────────────────
    [
      'INVALID_COOKIE_SESSION_OPTIONS',
      'Cookie session options must be a plain object, received: {received}.',
    ],
    [
      'COOKIE_SESSION_REQUIRES_COOKIE_PARSER',
      'Cookie session requires a cookie parser to be configured.',
    ],
    ['MISSING_COOKIE_SESSION_KEYS', 'Cookie session keys must be a non-empty array of strings.'],
    ['INVALID_COOKIE_SESSION_NAME_TYPE', 'name must be a string, received: {received}.'],
    ['INVALID_COOKIE_SESSION_NAME_VALUE', 'name must be a non-empty string.'],
    ['INVALID_COOKIE_SESSION_KEYS_TYPE', 'keys must be an array, received: {received}.'],
    ['INVALID_COOKIE_SESSION_KEYS_ITEM', 'keys items must be non-empty strings.'],
    ['INVALID_COOKIE_SESSION_MAX_AGE_TYPE', 'maxAge must be a number, received: {received}.'],
    [
      'INVALID_COOKIE_SESSION_MAX_AGE_RANGE',
      'maxAge must be a positive integer, received: {maxAge}.',
    ],
    ['INVALID_COOKIE_SESSION_PATH_TYPE', 'path must be a string, received: {received}.'],
    ['INVALID_COOKIE_SESSION_PATH_VALUE', 'path must be a non-empty string.'],
    ['INVALID_COOKIE_SESSION_DOMAIN_TYPE', 'domain must be a string, received: {received}.'],
    ['INVALID_COOKIE_SESSION_DOMAIN_VALUE', 'domain must be a non-empty string.'],
    ['INVALID_COOKIE_SESSION_SECURE_TYPE', 'secure must be a boolean, received: {received}.'],
    ['INVALID_COOKIE_SESSION_HTTP_ONLY_TYPE', 'httpOnly must be a boolean, received: {received}.'],
    [
      'INVALID_COOKIE_SESSION_SAME_SITE_VALUE',
      "sameSite must be 'Strict', 'Lax', or 'None', received: {received}.",
    ],
    ['INVALID_COOKIE_SESSION_OVERWRITE_TYPE', 'overwrite must be a boolean, received: {received}.'],
    ['COOKIE_SESSION_NONE_REQUIRES_SECURE', "sameSite 'None' requires secure to be true."],

    // ── CSRF options ───────────────────────────────────────────────────────
    ['INVALID_CSRF_OPTIONS', 'CSRF options must be a plain object, received: {received}.'],
    ['INVALID_CSRF_COOKIE_NAME_TYPE', 'cookieName must be a string, received: {received}.'],
    ['INVALID_CSRF_COOKIE_NAME_VALUE', 'cookieName must be a non-empty string.'],
    ['INVALID_CSRF_HEADER_NAME_TYPE', 'headerName must be a string, received: {received}.'],
    ['INVALID_CSRF_HEADER_NAME_VALUE', 'headerName must be a non-empty string.'],
    ['INVALID_CSRF_SAFE_METHODS_TYPE', 'safeMethods must be an array, received: {received}.'],
    ['INVALID_CSRF_SAFE_METHODS_ITEM', 'safeMethods items must be non-empty strings.'],
    ['INVALID_CSRF_TOKEN_BYTES_TYPE', 'tokenBytes must be a number, received: {received}.'],
    [
      'INVALID_CSRF_TOKEN_BYTES_RANGE',
      'tokenBytes must be a positive integer, received: {tokenBytes}.',
    ],
    ['INVALID_CSRF_PATH_TYPE', 'path must be a string, received: {received}.'],
    ['INVALID_CSRF_PATH_VALUE', 'path must be a non-empty string.'],
    ['INVALID_CSRF_DOMAIN_TYPE', 'domain must be a string, received: {received}.'],
    ['INVALID_CSRF_DOMAIN_VALUE', 'domain must be a non-empty string.'],
    ['INVALID_CSRF_SECURE_TYPE', 'secure must be a boolean, received: {received}.'],
    [
      'INVALID_CSRF_SAME_SITE_VALUE',
      "sameSite must be 'Strict', 'Lax', or 'None', received: {received}.",
    ],
    ['CSRF_NONE_REQUIRES_SECURE', "sameSite 'None' requires secure to be true."],

    // ── Compress options ───────────────────────────────────────────────────
    ['INVALID_COMPRESS_OPTIONS', 'Compress options must be a plain object, received: {received}.'],
    ['INVALID_COMPRESS_THRESHOLD_TYPE', 'threshold must be a number, received: {received}.'],
    [
      'INVALID_COMPRESS_THRESHOLD_RANGE',
      'threshold must be a non-negative integer, received: {threshold}.',
    ],
    ['INVALID_COMPRESS_LEVEL_TYPE', 'level must be a number, received: {received}.'],
    [
      'INVALID_COMPRESS_LEVEL_RANGE',
      'level must be an integer between -1 and 11, received: {level}.',
    ],
    ['INVALID_COMPRESS_TYPES_TYPE', 'types must be an array, received: {received}.'],
    ['INVALID_COMPRESS_TYPES_ITEM', 'types items must be non-empty strings.'],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ServerConfigurationError;
