// @ts-check
/**
 * @file Defines the transport resolver.
 *
 * @description Resolves the transport adapter constructor associated with a
 * supported transport identifier.
 *
 * @module TransportResolver
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import HttpAdapter from '#adapters/HttpAdapter';
import HttpsAdapter from '#adapters/HttpsAdapter';
import Http2Adapter from '#adapters/Http2Adapter';
import Http2CleartextAdapter from '#adapters/Http2CleartextAdapter';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Maps each transport identifier to its concrete adapter type.
 *
 * @typedef  {object}                TransportRegistry
 * @property {HttpAdapter}           h1                - HTTP/1.1 over cleartext TCP.
 * @property {HttpsAdapter}          h1s               - HTTP/1.1 over TLS.
 * @property {Http2Adapter}          h2                - HTTP/2 over TLS.
 * @property {Http2CleartextAdapter} h2c               - HTTP/2 over cleartext TCP.
 */

/**
 * Identifies the transport implementation handled by an adapter.
 *
 * @typedef {keyof TransportRegistry} Transport
 */

/**
 * Generic contract satisfied by every concrete adapter in the registry.
 *
 * @typedef {TransportRegistry[Transport]} TransportAdapterContract
 */

/**
 * Represents a transport adapter capable of managing a permitted transport.
 *
 * @typedef {import('#configurations/ServerConfiguration').ServerConfigurationIdentity} ServerConfigurationIdentity
 */

/**
 * Represents a transport adapter capable of managing a permitted transport.
 *
 * @typedef {import('#configurations/ServerConfiguration').default<ServerConfigurationIdentity>} ServerConfiguration
 */

/**
 * Constructor for a transport adapter that accepts optional transport
 * configuration.
 *
 * @template {Transport} T
 * @typedef {new (options: object|undefined) => TransportRegistry[T]} TransportAdapterConstructor
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Resolves transport adapter constructors from transport identifiers.
 *
 * @class
 */
class TransportResolver {
  /**
   * Prevents direct instantiation of the resolver.
   *
   * @abstract
   * @throws {Error} Always thrown because `TransportResolver` exposes only static behavior.
   */
  constructor() {
    throw new Error('TransportResolver is a static class and cannot be instantiated');
  }

  /**
   * Resolves the adapter constructor associated with a transport.
   *
   * @param {Transport} transport - Identifier of the transport to resolve.
   * @returns {TransportAdapterConstructor<Transport>} The transport adapter constructor.
   * @throws {Error} When the transport is not supported by this implementation.
   * @example
   * ```js
   * const Adapter = TransportResolver.resolve('h1');
   * const adapter = new Adapter(configuration);
   * ```
   */
  static resolve(transport) {
    const Adapter = TransportResolver.#adapters.get(transport);

    if (!Adapter) {
      throw new Error(`Unsupported transport: ${transport}`);
    }

    return Adapter;
  }

  /**
   * @type {Array<[Transport, TransportAdapterConstructor<Transport>]>}
   */
  static #ADAPTERS = [
    ['h1', HttpAdapter],
    ['h1s', HttpsAdapter],
    ['h2', Http2Adapter],
    ['h2c', Http2CleartextAdapter],
  ];

  /**
   * Transport adapter constructors indexed by transport identifier.
   *
   * @type {Map<Transport, TransportAdapterConstructor<Transport>>}
   */
  static #adapters = new Map(TransportResolver.#ADAPTERS);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default TransportResolver;
