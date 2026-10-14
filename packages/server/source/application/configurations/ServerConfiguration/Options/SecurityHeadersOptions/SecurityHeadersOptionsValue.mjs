// @ts-check
/**
 * @file Defines the SecurityHeadersOptionsValue value object.
 *
 * @description Normalizes and validates security headers middleware
 * configuration used by SecurityHeadersMiddleware. When options are
 * omitted, defaults are applied and the value is always a complete
 * SecurityHeadersOptionsData object.
 *
 * @module SecurityHeadersOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertSecurityHeadersOptions } from '#shared/validations/ServerConfiguration/SecurityHeadersOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the security headers options accepted by the server configuration.
 *
 * Every property accepts a string header value or `false` to omit the header.
 *
 * @typedef  {object}       SecurityHeadersOptionsInput
 * @property {string|false} [contentSecurityPolicy]         - Value for the Content-Security-Policy header, or `false` to omit it.
 * @property {string|false} [crossOriginEmbedderPolicy]     - Value for the Cross-Origin-Embedder-Policy header, or `false` to omit it.
 * @property {string|false} [crossOriginOpenerPolicy]       - Value for the Cross-Origin-Opener-Policy header, or `false` to omit it.
 * @property {string|false} [crossOriginResourcePolicy]     - Value for the Cross-Origin-Resource-Policy header, or `false` to omit it.
 * @property {string|false} [originAgentCluster]            - Value for the Origin-Agent-Cluster header, or `false` to omit it.
 * @property {string|false} [permissionsPolicy]             - Value for the Permissions-Policy header, or `false` to omit it.
 * @property {string|false} [referrerPolicy]                - Value for the Referrer-Policy header, or `false` to omit it.
 * @property {string|false} [strictTransportSecurity]       - Value for the Strict-Transport-Security header, or `false` to omit it.
 * @property {string|false} [xContentTypeOptions]           - Value for the X-Content-Type-Options header, or `false` to omit it.
 * @property {string|false} [xDnsPrefetchControl]           - Value for the X-DNS-Prefetch-Control header, or `false` to omit it.
 * @property {string|false} [xDownloadOptions]              - Value for the X-Download-Options header, or `false` to omit it.
 * @property {string|false} [xFrameOptions]                 - Value for the X-Frame-Options header, or `false` to omit it.
 * @property {string|false} [xPermittedCrossDomainPolicies] - Value for the X-Permitted-Cross-Domain-Policies header, or `false` to omit it.
 * @property {string|false} [xXssProtection]                - Value for the legacy X-XSS-Protection header, or `false` to omit it.
 */

/**
 * Represents the normalized security headers options.
 *
 * @typedef  {object}       SecurityHeadersOptionsData
 * @property {string|false} contentSecurityPolicy         - Value for the Content-Security-Policy header, or `false` to omit it.
 * @property {string|false} crossOriginEmbedderPolicy     - Value for the Cross-Origin-Embedder-Policy header, or `false` to omit it.
 * @property {string|false} crossOriginOpenerPolicy       - Value for the Cross-Origin-Opener-Policy header, or `false` to omit it.
 * @property {string|false} crossOriginResourcePolicy     - Value for the Cross-Origin-Resource-Policy header, or `false` to omit it.
 * @property {string|false} originAgentCluster            - Value for the Origin-Agent-Cluster header, or `false` to omit it.
 * @property {string|false} permissionsPolicy             - Value for the Permissions-Policy header, or `false` to omit it.
 * @property {string|false} referrerPolicy                - Value for the Referrer-Policy header, or `false` to omit it.
 * @property {string|false} strictTransportSecurity       - Value for the Strict-Transport-Security header, or `false` to omit it.
 * @property {string|false} xContentTypeOptions           - Value for the X-Content-Type-Options header, or `false` to omit it.
 * @property {string|false} xDnsPrefetchControl           - Value for the X-DNS-Prefetch-Control header, or `false` to omit it.
 * @property {string|false} xDownloadOptions              - Value for the X-Download-Options header, or `false` to omit it.
 * @property {string|false} xFrameOptions                 - Value for the X-Frame-Options header, or `false` to omit it.
 * @property {string|false} xPermittedCrossDomainPolicies - Value for the X-Permitted-Cross-Domain-Policies header, or `false` to omit it.
 * @property {string|false} xXssProtection                - Value for the legacy X-XSS-Protection header, or `false` to omit it.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default value for the Content-Security-Policy header.
 *
 * Disabled by default because it must be tailored to each application.
 *
 * @type {string|false}
 */
const DEFAULT_CONTENT_SECURITY_POLICY = false;

/**
 * Default value for the Cross-Origin-Embedder-Policy header.
 *
 * Disabled by default because it breaks cross-origin resources that do not
 * opt in via CORP or CORS.
 *
 * @type {string|false}
 */
const DEFAULT_CROSS_ORIGIN_EMBEDDER_POLICY = false;

/**
 * Default value for the Cross-Origin-Opener-Policy header.
 *
 * @type {string|false}
 */
const DEFAULT_CROSS_ORIGIN_OPENER_POLICY = 'same-origin';

/**
 * Default value for the Cross-Origin-Resource-Policy header.
 *
 * @type {string|false}
 */
const DEFAULT_CROSS_ORIGIN_RESOURCE_POLICY = 'same-origin';

/**
 * Default value for the Origin-Agent-Cluster header.
 *
 * @type {string|false}
 */
const DEFAULT_ORIGIN_AGENT_CLUSTER = '?1';

/**
 * Default value for the Permissions-Policy header.
 *
 * Disabled by default because it must be tailored to each application.
 *
 * @type {string|false}
 */
const DEFAULT_PERMISSIONS_POLICY = false;

/**
 * Default value for the Referrer-Policy header.
 *
 * Preserves the full referrer for same-origin navigation and limits the
 * information sent cross-origin.
 *
 * @type {string|false}
 */
const DEFAULT_REFERRER_POLICY = 'strict-origin-when-cross-origin';

/**
 * Default value for the Strict-Transport-Security header.
 *
 * @type {string|false}
 */
const DEFAULT_STRICT_TRANSPORT_SECURITY = 'max-age=31536000; includeSubDomains';

/**
 * Default value for the X-Content-Type-Options header.
 *
 * @type {string|false}
 */
const DEFAULT_X_CONTENT_TYPE_OPTIONS = 'nosniff';

/**
 * Default value for the X-DNS-Prefetch-Control header.
 *
 * @type {string|false}
 */
const DEFAULT_X_DNS_PREFETCH_CONTROL = 'off';

/**
 * Default value for the X-Download-Options header.
 *
 * @type {string|false}
 */
const DEFAULT_X_DOWNLOAD_OPTIONS = 'noopen';

/**
 * Default value for the X-Frame-Options header.
 *
 * @type {string|false}
 */
const DEFAULT_X_FRAME_OPTIONS = 'SAMEORIGIN';

/**
 * Default value for the X-Permitted-Cross-Domain-Policies header.
 *
 * @type {string|false}
 */
const DEFAULT_X_PERMITTED_CROSS_DOMAIN_POLICIES = 'none';

/**
 * Default value for the legacy X-XSS-Protection header.
 *
 * @type {string|false}
 */
const DEFAULT_X_XSS_PROTECTION = '0';

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized security headers middleware
 * options.
 *
 * @classdesc Validates and normalizes security headers middleware options.
 * When options are provided, defaults are applied for any omitted property.
 * When options are omitted, the value is undefined.
 */
class SecurityHeadersOptionsValue {
  /**
   * The normalized security headers options.
   *
   * @type {Readonly<SecurityHeadersOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link SecurityHeadersOptionsValue}.
   *
   * @param {SecurityHeadersOptionsInput} [options] - The security headers middleware options.
   * @throws {ServerConfigurationError} If `options` is invalid.
   * @example
   * ```js
   * const options = new SecurityHeadersOptionsValue({
   *   contentSecurityPolicy: "default-src 'self'",
   *   xFrameOptions: false,
   * });
   *
   * options.value;
   * // => {
   * //   contentSecurityPolicy: "default-src 'self'",
   * //   crossOriginEmbedderPolicy: false,
   * //   crossOriginOpenerPolicy: 'same-origin',
   * //   crossOriginResourcePolicy: 'same-origin',
   * //   originAgentCluster: '?1',
   * //   permissionsPolicy: false,
   * //   referrerPolicy: 'strict-origin-when-cross-origin',
   * //   strictTransportSecurity: 'max-age=31536000; includeSubDomains',
   * //   xContentTypeOptions: 'nosniff',
   * //   xDnsPrefetchControl: 'off',
   * //   xDownloadOptions: 'noopen',
   * //   xFrameOptions: false,
   * //   xPermittedCrossDomainPolicies: 'none',
   * //   xXssProtection: '0',
   * // }
   * ```
   *
   * @example
   * ```js
   * const options = new SecurityHeadersOptionsValue();
   *
   * options.value;
   * // => undefined
   * ```
   */
  constructor(options) {
    assertSecurityHeadersOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            contentSecurityPolicy: options.contentSecurityPolicy ?? DEFAULT_CONTENT_SECURITY_POLICY,
            crossOriginEmbedderPolicy:
              options.crossOriginEmbedderPolicy ?? DEFAULT_CROSS_ORIGIN_EMBEDDER_POLICY,
            crossOriginOpenerPolicy:
              options.crossOriginOpenerPolicy ?? DEFAULT_CROSS_ORIGIN_OPENER_POLICY,
            crossOriginResourcePolicy:
              options.crossOriginResourcePolicy ?? DEFAULT_CROSS_ORIGIN_RESOURCE_POLICY,
            originAgentCluster: options.originAgentCluster ?? DEFAULT_ORIGIN_AGENT_CLUSTER,
            permissionsPolicy: options.permissionsPolicy ?? DEFAULT_PERMISSIONS_POLICY,
            referrerPolicy: options.referrerPolicy ?? DEFAULT_REFERRER_POLICY,
            strictTransportSecurity:
              options.strictTransportSecurity ?? DEFAULT_STRICT_TRANSPORT_SECURITY,
            xContentTypeOptions: options.xContentTypeOptions ?? DEFAULT_X_CONTENT_TYPE_OPTIONS,
            xDnsPrefetchControl: options.xDnsPrefetchControl ?? DEFAULT_X_DNS_PREFETCH_CONTROL,
            xDownloadOptions: options.xDownloadOptions ?? DEFAULT_X_DOWNLOAD_OPTIONS,
            xFrameOptions: options.xFrameOptions ?? DEFAULT_X_FRAME_OPTIONS,
            xPermittedCrossDomainPolicies:
              options.xPermittedCrossDomainPolicies ?? DEFAULT_X_PERMITTED_CROSS_DOMAIN_POLICIES,
            xXssProtection: options.xXssProtection ?? DEFAULT_X_XSS_PROTECTION,
          });
  }

  /**
   * The normalized security headers options.
   *
   * @readonly
   * @type {Readonly<SecurityHeadersOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default SecurityHeadersOptionsValue;
