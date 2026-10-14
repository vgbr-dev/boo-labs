// @ts-check
/**
 * @file Defines the static files middleware.
 *
 * @description Serves static files from a configured root directory without
 * external dependencies. Supports index files, extension fallback,
 * Cache-Control, ETag, Last-Modified, path-traversal protection, symlink
 * confinement, dotfile filtering, request cancellation, and graceful
 * fallthrough.
 *
 * Options are expected to be already validated and normalized by the
 * corresponding Value Object. This middleware does not validate its input.
 *
 * @module StaticMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NODE MODULES
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, relative, resolve, sep } from 'node:path';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an HTTP exchange.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware
 * layer.
 *
 * @typedef {() => void | Promise<void>} NextFunction
 */

/**
 * Represents normalized static middleware configuration.
 *
 * All defaults have already been applied and all values have already been
 * validated by the corresponding Value Object.
 *
 * @typedef  {object}             StaticOptionsData
 * @property {string}             root              - Absolute resolved path to the static files root directory.
 * @property {string[]}           index             - Ordered list of index file names to try when the requested path resolves to a directory.
 * @property {number}             maxAge            - Cache-Control max-age value in seconds.
 * @property {boolean}            etag              - Whether to generate and send an ETag header.
 * @property {boolean}            lastModified      - Whether to generate and send a Last-Modified header.
 * @property {boolean}            fallthrough       - Whether to delegate to the next middleware when no file is found.
 * @property {string[]|undefined} extensions        - Optional extensions to try when the requested pathname has no extension.
 * @property {boolean}            dotfiles          - Whether files and directories whose path contains dot-prefixed segments may be served.
 */

/**
 * Represents filesystem statistics for a file.
 *
 * @typedef {import('node:fs').Stats} Stats
 */

/**
 * Represents a successfully located static file.
 *
 * @typedef  {object} LocatedFile
 * @property {string} filePath    - Absolute real path of the file.
 * @property {Stats}  stats       - File statistics obtained from the filesystem.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Maps supported file extensions to their MIME types.
 *
 * @type {Readonly<Record<string, string>>}
 */
const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
});

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Returns the MIME type associated with a file path.
 *
 * The extension lookup is case-insensitive. Unknown extensions fall back to
 * `application/octet-stream`.
 *
 * @private
 * @param {string} filePath - Absolute or relative file path.
 * @returns {string} The resolved MIME type.
 */
function getContentType(filePath) {
  const extension = extname(filePath).toLowerCase();

  return MIME_TYPES[extension] ?? 'application/octet-stream';
}

/**
 * Generates a weak ETag from the file size and modification time.
 *
 * The generated value is intentionally weak because the representation
 * identity is derived from filesystem metadata rather than from the complete
 * file contents.
 *
 * @private
 * @param {Stats} stats - File statistics.
 * @returns {string} The generated weak ETag.
 */
function generateETag(stats) {
  const hash = createHash('sha256')
    .update(`${stats.size}-${stats.mtimeMs}`)
    .digest('base64url')
    .slice(0, 22);

  return `W/"${hash}"`;
}

/**
 * Determines whether an If-None-Match header matches a generated ETag.
 *
 * Multiple comma-separated entity tags are supported, as is the wildcard
 * value `*`. Weak comparison is used because If-None-Match permits weak
 * comparison.
 *
 * @private
 * @param {string} header - Raw If-None-Match header value.
 * @param {string} tag - Generated ETag.
 * @returns {boolean} Whether the header matches the generated ETag.
 */
function matchesETag(header, tag) {
  /**
   * Normalizes an entity tag by trimming surrounding whitespace and removing
   * the weak validator prefix.
   *
   * @param {string} value - Entity tag to normalize.
   * @returns {string} The normalized entity tag.
   */
  const normalize = value => value.trim().replace(/^W\//i, '').trim();

  if (header.trim() === '*') {
    return true;
  } else {
    const normalizedTag = normalize(tag);

    return header
      .split(',')
      .map(normalize)
      .some(value => value === normalizedTag);
  }
}

/**
 * Determines whether a resource has not been modified since a given date.
 *
 * HTTP date comparison uses second-level precision, so the resource
 * modification time is truncated to whole seconds before comparison.
 *
 * @private
 * @param {string} header - Raw If-Modified-Since header value.
 * @param {number} mtimeMs - Resource modification time in milliseconds.
 * @returns {boolean} Whether the resource has not been modified.
 */
function isNotModifiedSince(header, mtimeMs) {
  const modifiedSince = Date.parse(header);

  if (Number.isNaN(modifiedSince)) {
    return false;
  } else {
    const modifiedAt = Math.floor(mtimeMs / 1000) * 1000;

    return modifiedAt <= modifiedSince;
  }
}

/**
 * Resolves a request pathname against the configured root directory.
 *
 * The returned path is rejected when lexical path resolution would escape the
 * configured root. Physical symlink confinement is performed separately.
 *
 * @private
 * @param {string} root - Absolute configured root directory.
 * @param {string} requestPath - Request pathname.
 * @returns {string|null} The resolved candidate path, or `null` when it escapes the root.
 */
function safeResolve(root, requestPath) {
  const relativePath = requestPath.replace(/^\/+/, '');
  const resolved = resolve(root, relativePath);

  if (!resolved.startsWith(root + sep) && resolved !== root) {
    return null;
  } else {
    return resolved;
  }
}

/**
 * Determines whether a path contains a dot-prefixed segment relative to the
 * configured root.
 *
 * The root itself is not considered a dotfile path.
 *
 * @private
 * @param {string} root - Absolute configured root directory.
 * @param {string} resolvedPath - Absolute candidate path.
 * @returns {boolean} Whether the path contains a dot-prefixed segment.
 */
function hasDotSegment(root, resolvedPath) {
  const relativePath = relative(root, resolvedPath);

  if (relativePath === '') {
    return false;
  } else {
    return relativePath
      .split(sep)
      .some(segment => segment.startsWith('.') && segment !== '.' && segment !== '..');
  }
}

/**
 * Reads filesystem statistics for a path.
 *
 * Only ENOENT and ENOTDIR are interpreted as a missing resource. Other
 * filesystem errors are propagated to the Kernel.
 *
 * @private
 * @param {string} filePath - Absolute file path.
 * @returns {Promise<Stats|null>} The file statistics, or `null` when the path does not exist.
 */
async function safeStat(filePath) {
  try {
    return await stat(filePath);
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return null;
    } else {
      throw error;
    }
  }
}

/**
 * Resolves the physical filesystem path of a candidate.
 *
 * Only ENOENT and ENOTDIR are interpreted as a missing resource. Other
 * filesystem errors are propagated to the Kernel.
 *
 * @private
 * @param {string} filePath - Absolute candidate path.
 * @returns {Promise<string|null>} The real path, or `null` when the path does not exist.
 */
async function safeRealpath(filePath) {
  try {
    return await realpath(filePath);
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return null;
    } else {
      throw error;
    }
  }
}

/**
 * Resolves and verifies a candidate against the physical static root.
 *
 * The candidate is rejected when its real filesystem path escapes the real
 * root directory. This prevents symlinks inside the configured root from
 * exposing files outside that root.
 *
 * @private
 * @param {string} realRoot - Physical root directory.
 * @param {string} candidate - Absolute lexical candidate path.
 * @returns {Promise<string|null>} The confined real path, or `null` when the candidate is unavailable or escapes the root.
 */
async function confineToRoot(realRoot, candidate) {
  const realCandidate = await safeRealpath(candidate);

  if (realCandidate === null) {
    return null;
  } else if (!realCandidate.startsWith(realRoot + sep) && realCandidate !== realRoot) {
    return null;
  } else {
    return realCandidate;
  }
}

/**
 * Locates a static file for a request pathname.
 *
 * Resolution proceeds in the following order:
 *
 * 1. Resolve the requested pathname against the configured root.
 * 2. Reject dotfile segments when dotfiles are disabled.
 * 3. Resolve the candidate through the real filesystem root.
 * 4. Serve the candidate when it is a regular file.
 * 5. Try configured index files when the candidate is a directory.
 * 6. Try configured extensions when the request has no extension.
 *
 * Every candidate is physically confined to the real root before it can be
 * served.
 *
 * @private
 * @param {string} realRoot - Physical root directory.
 * @param {string} root - Absolute configured root directory.
 * @param {string} pathname - Request pathname.
 * @param {string[]} indexes - Ordered index file names.
 * @param {string[]|undefined} extensions - Optional extensions to try.
 * @param {boolean} allowDotfiles - Whether dotfile paths may be served.
 * @returns {Promise<LocatedFile|null>} The located file, or `null` when no file can be served.
 */
async function locateFile(realRoot, root, pathname, indexes, extensions, allowDotfiles) {
  const candidate = safeResolve(root, pathname);

  if (candidate === null) {
    return null;
  } else if (!allowDotfiles && hasDotSegment(root, candidate)) {
    return null;
  } else {
    const realCandidate = await confineToRoot(realRoot, candidate);

    if (realCandidate !== null) {
      const stats = await safeStat(realCandidate);

      if (stats !== null && stats.isFile()) {
        return { filePath: realCandidate, stats };
      } else if (stats !== null && stats.isDirectory()) {
        for (const index of indexes) {
          const indexPath = join(realCandidate, index);

          if (!allowDotfiles && hasDotSegment(realRoot, indexPath)) {
            continue;
          }

          const realIndexPath = await confineToRoot(realRoot, indexPath);

          if (realIndexPath === null) {
            continue;
          }

          const indexStats = await safeStat(realIndexPath);

          if (indexStats !== null && indexStats.isFile()) {
            return { filePath: realIndexPath, stats: indexStats };
          }
        }
      }
    }

    if (extensions !== undefined && extensions.length > 0 && extname(pathname) === '') {
      for (const extension of extensions) {
        const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
        const withExtension = safeResolve(root, `${pathname}${normalizedExtension}`);

        if (withExtension === null) {
          continue;
        }

        if (!allowDotfiles && hasDotSegment(root, withExtension)) {
          continue;
        }

        const realWithExtension = await confineToRoot(realRoot, withExtension);

        if (realWithExtension === null) {
          continue;
        }

        const extensionStats = await safeStat(realWithExtension);

        if (extensionStats !== null && extensionStats.isFile()) {
          return {
            filePath: realWithExtension,
            stats: extensionStats,
          };
        }
      }
    }

    return null;
  }
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Serves static files from a configured filesystem root.
 *
 * The middleware supports conditional requests, cache headers, index files,
 * extension fallback, dotfile filtering, path-traversal protection, physical
 * symlink confinement, request cancellation, and configurable fallthrough.
 *
 * The received options must already be validated and normalized by the
 * corresponding Value Object. The middleware does not perform configuration
 * validation.
 *
 * @class
 *
 * @example
 * const middleware = new StaticMiddleware({
 *   root: '/var/www/public',
 *   index: ['index.html'],
 *   maxAge: 3600,
 *   etag: true,
 *   lastModified: true,
 *   fallthrough: true,
 *   extensions: ['html'],
 *   dotfiles: false,
 * });
 */
class StaticMiddleware {
  /**
   * Normalized static middleware options.
   *
   * @type {Readonly<StaticOptionsData>}
   */
  #options;

  /**
   * Cached promise for the physical root directory.
   *
   * The promise is cached rather than only its resolved value so concurrent
   * requests share the same filesystem resolution.
   *
   * @type {Promise<string>|null}
   */
  #realRoot = null;

  /**
   * Creates a static files middleware.
   *
   * @param {StaticOptionsData} options - Validated and normalized static options.
   *
   * @example
   * const middleware = new StaticMiddleware({
   *   root: '/var/www/public',
   *   index: ['index.html'],
   *   maxAge: 3600,
   *   etag: true,
   *   lastModified: true,
   *   fallthrough: true,
   *   extensions: ['html'],
   *   dotfiles: false,
   * });
   */
  constructor(options) {
    this.#options = options;
  }

  /**
   * Returns the physical filesystem path of the configured root.
   *
   * The resolution is performed at most once for the lifetime of the
   * middleware instance. Concurrent requests share the same promise.
   *
   * @returns {Promise<string>} The physical root directory.
   */
  async #getRealRoot() {
    if (this.#realRoot === null) {
      this.#realRoot = realpath(this.#options.root);
    }

    return this.#realRoot;
  }

  /**
   * Processes an HTTP exchange and serves a matching static file.
   *
   * GET requests are streamed from the filesystem. HEAD requests receive the
   * same representation metadata without a response body. Requests for
   * unsupported methods are delegated to the next middleware. When no file is
   * found, behavior depends on the configured `fallthrough` option.
   *
   * Conditional requests are evaluated using ETag first and
   * Last-Modified second. When an If-None-Match header is present, the
   * If-Modified-Since validator is not evaluated.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @param {NextFunction} next - Function that delegates to the next middleware.
   * @returns {Promise<void>} Resolves when request processing has completed.
   *
   * @example
   * await middleware.handle(exchange, next);
   */
  async handle(exchange, next) {
    const { request, response, signal } = exchange;

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      await next();
    } else if (!signal.aborted) {
      const { root, index, maxAge, etag, lastModified, fallthrough, extensions, dotfiles } =
        this.#options;

      const realRoot = await this.#getRealRoot();

      const located = await locateFile(
        realRoot,
        root,
        request.pathname,
        index,
        extensions,
        dotfiles,
      );

      if (located === null) {
        if (fallthrough) {
          await next();
        } else {
          response.status(404).json({ error: 'Not Found' });
        }
      } else {
        const { filePath, stats } = located;

        // ── Representation headers ───────────────────────────────────────
        const tag = etag ? generateETag(stats) : null;

        if (tag !== null) {
          response.setHeader('ETag', tag);
        }

        if (lastModified) {
          response.setHeader('Last-Modified', new Date(stats.mtimeMs).toUTCString());
        }

        if (maxAge > 0) {
          response.cache(maxAge);
        } else {
          response.noCache();
        }

        // ── Conditional requests ─────────────────────────────────────────
        const ifNoneMatch = request.getHeader('if-none-match');
        const ifModifiedSince = request.getHeader('if-modified-since');

        const ifNoneMatchValue = Array.isArray(ifNoneMatch) ? ifNoneMatch[0] : ifNoneMatch;

        const ifModifiedSinceValue = Array.isArray(ifModifiedSince)
          ? ifModifiedSince[0]
          : ifModifiedSince;

        const etagMatches =
          typeof ifNoneMatchValue === 'string' && tag !== null
            ? matchesETag(ifNoneMatchValue, tag)
            : false;

        const shouldCheckModifiedSince =
          !etagMatches &&
          lastModified &&
          ifNoneMatchValue === undefined &&
          typeof ifModifiedSinceValue === 'string';

        const modifiedSinceMatches = shouldCheckModifiedSince
          ? isNotModifiedSince(ifModifiedSinceValue, stats.mtimeMs)
          : false;

        if (etagMatches || modifiedSinceMatches) {
          response.status(304).end();
        } else {
          // ── Content headers ───────────────────────────────────────────
          response.setHeader('Content-Type', getContentType(filePath));
          response.setHeader('Content-Length', String(stats.size));

          // ── HEAD ──────────────────────────────────────────────────────
          if (request.method === 'HEAD') {
            response.status(200).end();
          } else {
            // ── Stream ──────────────────────────────────────────────────
            const stream = createReadStream(filePath);

            const onAbort = () => {
              stream.destroy();
            };

            signal.addEventListener('abort', onAbort, { once: true });

            if (signal.aborted) {
              signal.removeEventListener('abort', onAbort);
              stream.destroy();
            } else {
              stream.on('close', () => {
                signal.removeEventListener('abort', onAbort);
              });

              response.status(200).stream(stream);
            }
          }
        }
      }
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default StaticMiddleware;
