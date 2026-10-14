// @ts-check
/**
 * @file Defines the Address value object.
 *
 * @module Address
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { inspect } from 'node:util';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Options accepted by the Address constructor.
 *
 * @typedef  {object} AddressOptions
 * @property {string} address        - The network address where the server is listening.
 * @property {number} port           - The TCP port where the server is listening.
 * @property {string} family         - The IP address family.
 */

/**
 * Plain object representation of an Address.
 *
 * @typedef  {object} AddressInfo
 * @property {string} address     - The network address where the server is listening.
 * @property {number} port        - The TCP port where the server is listening.
 * @property {string} family      - The IP address family reported by Node.js.
 * @property {string} displayHost - The hostname used when displaying the address.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Represents the network address of an HTTP server.
 *
 * @classdesc Immutable value object that encapsulates the network address,
 * port and IP address family of an HTTP server.
 *
 * It provides multiple representations of the same address,
 * including plain objects, JSON serialization and canonical string formatting.
 *
 * IPv6 addresses are automatically enclosed in square brackets when
 * converted to their string representation.
 */
class Address {
  /**
   * The server network address.
   *
   * @type {string}
   */
  #address;

  /**
   * The TCP port where the server is listening.
   *
   * @type {number}
   */
  #port;

  /**
   * The IP address family.
   *
   * @type {string}
   */
  #family;

  /**
   * Creates a new Address instance.
   *
   * @param {AddressOptions} options - The server network address.
   * @example
   * ```js
   * const address = new Address({
   *   address: '127.0.0.1',
   *   port: 3000,
   *   family: 'IPv4'
   * });
   *
   * console.log(address.toString()); // '127.0.0.1:3000'
   * ```
   */
  constructor({ address, port, family }) {
    this.#address = address;
    this.#port = port;
    this.#family = family;
  }

  /**
   * The network address where the server is listening.
   *
   * @readonly
   * @type {string}
   */
  get address() {
    return this.#address;
  }

  /**
   * The TCP port where the server is listening.
   *
   * @readonly
   * @type {number}
   */
  get port() {
    return this.#port;
  }

  /**
   * The IP address family.
   *
   * @readonly
   * @type {string}
   */
  get family() {
    return this.#family;
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
    if (this.#address === '127.0.0.1' || this.#address === '::1') {
      return 'localhost';
    }

    return this.#address;
  }

  /**
   * Custom string tag for better type identification.
   *
   * @readonly
   * @type {string}
   * @example
   * ```js
   * const address = new Address({...});
   * console.log(Object.prototype.toString.call(address)); // '[object Address]'
   * console.log(address[Symbol.toStringTag]); // 'Address'
   * ```
   */
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }

  /**
   * Returns the address as a plain JavaScript object.
   *
   * The returned object includes the real network data and a display-friendly
   * host derived from loopback normalization.
   *
   * @returns {AddressInfo} A plain object representation of this address.
   * @example
   * ```js
   * console.log(address.toObject());
   * // {
   * //   address: '::1',
   * //   port: 3000,
   * //   family: 'IPv6',
   * //   displayHost: 'localhost'
   * // }
   * ```
   */
  toObject() {
    return {
      address: this.#address,
      port: this.#port,
      family: this.#family,
      displayHost: this.displayHost,
    };
  }

  /**
   * Returns a JSON-serializable representation of this address.
   *
   * This method is automatically used by JSON.stringify().
   *
   * @returns {AddressInfo} A JSON representation of this address.
   * @example
   * ```js
   * const json = JSON.stringify(address);
   *
   * console.log(json); // {"address":"::1","port":3000,"family":"IPv6","displayHost":"localhost"}
   * ```
   */
  toJSON() {
    return this.toObject();
  }

  /**
   * Returns the canonical string representation of this address.
   *
   * IPv4 addresses are represented as `host:port`.
   * IPv6 addresses are represented as `[host]:port`.
   *
   * @returns {string} The canonical network address.
   * @example
   * ```js
   * const ipv4 = new Address({
   *   address: '127.0.0.1',
   *   port: 3000,
   *   family: 'IPv4'
   * });
   *
   * console.log(ipv4.toString()); // '127.0.0.1:3000'
   * ```
   *
   * @example
   * ```js
   * const ipv6 = new Address({
   *   address: '2001:db8::1',
   *   port: 3000,
   *   family: 'IPv6'
   * });
   *
   * console.log(ipv6.toString()); // '[2001:db8::1]:3000'
   * ```
   */
  toString() {
    const host = this.#family === 'IPv6' ? `[${this.#address}]` : this.#address;

    return `${host}:${this.#port}`;
  }

  /**
   * Custom inspect implementation for Node.js `util.inspect()`.
   *
   * @returns {string} Custom string representation for debugging.
   * @example
   * ```js
   * const address = new Address({...});
   *
   * console.log(address);
   * // Address {
   * //   address: '::1',
   * //   port: 5173,
   * //   family: 'IPv6',
   * //   displayHost: 'localhost'
   * // }
   * ```
   */
  [inspect.custom]() {
    return `${this.constructor.name} ${inspect(this.toObject(), { colors: true })}`;
  }

  /**
   * Converts this address to a primitive value.
   *
   * String and default conversions return the canonical address string.
   * Numeric conversion is not supported.
   *
   * @param {'string'|'number'|'default'} hint - The preferred primitive type.
   * @returns {string} The canonical address string.
   * @throws {TypeError} Thrown when a numeric conversion is attempted.
   * @example
   * ```js
   * const address = new Address({
   *   address: '127.0.0.1',
   *   port: 3000,
   *   family: 'IPv4'
   * });
   *
   * console.log(`Server Address: ${address}`); // '127.0.0.1:3000'
   * console.log(String(address)); // '127.0.0.1:3000'
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
export default Address;
