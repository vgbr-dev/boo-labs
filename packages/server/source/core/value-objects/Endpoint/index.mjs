// @ts-check
/**
 * @file Defines the Endpoint value object.
 *
 * @module Endpoint
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { inspect } from 'node:util';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the network address of an HTTP server.
 *
 * @typedef {import('#value-objects/Address').default} Address
 */

/**
 * Identifies an application-layer communication protocol.
 *
 * @typedef { 'http'|'https'|'ws'|'wss'|'grpc'|'mqtt'|'coap' } Protocol
 */

/**
 * Represents network endpoint configuration options.
 *
 * @typedef  {object}   EndpointOptions
 * @property {Protocol} protocol        - The communication protocol.
 * @property {Address}  address         - The server network address.
 */

/**
 * Represents the data of a network endpoint.
 *
 * @typedef  {object}   EndpointData
 * @property {Protocol} protocol     - The communication protocol.
 * @property {string}   address      - The network address where the server is listening.
 * @property {number}   port         - The TCP port where the server is listening.
 * @property {string}   family       - The IP address family.
 * @property {string}   displayHost  - The hostname used when displaying the address.
 * @property {string}   displayUrl   - The URL used when displaying the endpoint.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a complete network endpoint.
 *
 * @classdesc Immutable value object that combines a communication protocol
 * with a network address.
 *
 * It provides multiple representations of the same endpoint,
 * including plain objects, JSON serialization and URL formatting.
 */
class Endpoint {
  /**
   * The communication protocol of the endpoint.
   *
   * @type {Protocol}
   */
  #protocol;

  /**
   * The server network address.
   *
   * @type {Address}
   */
  #address;

  /**
   * Creates a new Endpoint instance.
   *
   * @param {EndpointOptions} options - The network endpoint configuration.
   * @example
   * ```js
   * const address = new Address({
   *   address: '127.0.0.1',
   *   port: 3000,
   *   family: 'IPv4',
   * });
   *
   * const endpoint = new Endpoint({
   *   protocol: 'http',
   *   address,
   * });
   * ```
   */
  constructor({ protocol, address }) {
    this.#protocol = protocol;
    this.#address = address;
  }

  /**
   * The communication protocol.
   *
   * @readonly
   * @type {Protocol}
   */
  get protocol() {
    return this.#protocol;
  }

  /**
   * The network address where the server is listening.
   *
   * @readonly
   * @type {string}
   */
  get address() {
    return this.#address.address;
  }

  /**
   * The TCP port where the server is listening.
   *
   * @readonly
   * @type {number}
   */
  get port() {
    return this.#address.port;
  }

  /**
   * The IP address family.
   *
   * @readonly
   * @type {string}
   */
  get family() {
    return this.#address.family;
  }

  /**
   * The hostname used when displaying the network address.
   *
   * IPv4 and IPv6 loopback addresses.
   *
   * @readonly
   * @type {string}
   */
  get displayHost() {
    return this.#address.displayHost;
  }

  /**
   * The URL used when displaying the endpoint.
   *
   * Loopback addresses are rendered as `localhost`.
   *
   * @readonly
   * @type {string}
   * @example
   * ```js
   * console.log(endpoint.displayUrl); // 'http://localhost:3000'
   * ```
   */
  get displayUrl() {
    const { displayHost, family, port } = this.#address;
    const host =
      family === 'IPv6' && displayHost !== 'localhost' ? `[${displayHost}]` : displayHost;

    return `${this.#protocol}://${host}:${port}`;
  }

  /**
   * Custom string tag for better type identification.
   *
   * @readonly
   * @type {string}
   * @example
   * ```js
   * const endpoint = new Endpoint({...});
   * console.log(Object.prototype.toString.call(endpoint)); // '[object Endpoint]'
   * console.log(endpoint[Symbol.toStringTag]); // 'Endpoint'
   * ```
   */
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }

  /**
   * Returns the endpoint as a plain JavaScript object.
   *
   * @returns {EndpointData} A plain object representation of this endpoint.
   * @example
   * ```js
   * console.log(endpoint.toObject());
   * // {
   * //   protocol: 'http',
   * //   address: '::1',
   * //   port: 3000,
   * //   family: 'IPv6',
   * //   displayHost: 'localhost',
   * //   displayUrl: 'http://localhost:3000',
   * // }
   * ```
   */
  toObject() {
    return {
      protocol: this.#protocol,
      ...this.#address.toObject(),
      displayUrl: this.displayUrl,
    };
  }

  /**
   * Returns a JSON-serializable representation of this endpoint.
   *
   * This method is automatically used by JSON.stringify().
   *
   * @returns {EndpointData}  A JSON representation of this endpoint.
   * @example
   * ```js
   * const json = JSON.stringify(address);
   *
   * console.log(json); // {"protocol":"http","address":"::1","port":3000,"family":"IPv6","displayHost":"localhost","displayUrl":"http://localhost:3000"}
   * ```
   */
  toJSON() {
    return this.toObject();
  }

  /**
   * Returns the canonical URL representation of this endpoint.
   *
   * The URL consists of the endpoint protocol followed by the canonical
   * string representation of its server address.
   *
   * @returns {string} The canonical endpoint URL.
   * @example
   * ```js
   * const address = new Address({
   *   address: '127.0.0.1',
   *   port: 3000,
   *   family: 'IPv4',
   * });
   *
   * const endpoint = new Endpoint({
   *   protocol: 'http',
   *   address,
   * });
   *
   * console.log(endpoint.toString()); // 'http://127.0.0.1:3000'
   * ```
   */
  toString() {
    return `${this.#protocol}://${this.#address}`;
  }

  /**
   * Custom inspect implementation for Node.js `util.inspect()`.
   *
   * @returns {string} Custom string representation for debugging.
   * @example
   * ```js
   * console.log(endpoint);
   * // Endpoint {
   * //   protocol: 'http',
   * //   address: '::1',
   * //   port: 5173,
   * //   family: 'IPv6',
   * //   displayHost: 'localhost',
   * //   displayUrl: 'http://localhost:5173'
   * // }
   * ```
   */
  [inspect.custom]() {
    return `${this.constructor.name} ${inspect(this.toObject(), { colors: true })}`;
  }

  /**
   * Converts this endpoint to a primitive value.
   *
   * Numeric conversion is not supported.
   *
   * @param {'string'|'number'|'default'} hint - The preferred primitive type.
   * @returns {string} The canonical endpoint URL.
   * @throws {TypeError} Thrown when a numeric conversion is attempted.
   * @example
   * ```js
   * console.log(`${endpoint}`); // 'http://127.0.0.1:3000'
   * ```
   */
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') {
      throw new TypeError(`${this.constructor.name} cannot be converted to number.`);
    }
    return this.toString();
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Endpoint;
