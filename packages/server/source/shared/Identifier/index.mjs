/**
 * @file Represents an immutable binary identifier with a customizable format.
 *
 * @description An Identifier encapsulates a fixed-length binary buffer that can
 * be composed of multiple segments (timestamp, random, counter). Each subclass
 * defines its own format structure with configurable byte allocations for
 * each segment.
 *
 * Identifiers can be created from various input types (hex strings, buffers,
 * arrays, integers) and provide efficient hexadecimal encoding/decoding using
 * precomputed lookup tables for optimal performance.
 *
 * @module Identifier
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { inspect } from 'node:util';
import crypto from 'node:crypto';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * The allowed input types for creating an Identifier:
 *
 * - string: Hexadecimal representation.
 * - Buffer | Uint8Array | number[]: Raw binary data.
 * - number: A timestamp (milliseconds) to use for generation.
 * - undefined: Generates a new identifier with the current timestamp.
 *
 * @typedef {string | Buffer | Uint8Array | number[] | number | Date} IdentifierInput
 */

/**
 * Defines the binary format of an identifier.
 *
 * Specifies how the identifier's fixed-length binary representation is
 * divided into logical segments. The sum of all segment lengths must equal
 * the identifier's.
 *
 * @typedef  {object} IdentifierFormat
 * @property {number} timestamp        - Number of bytes for the timestamp segment.
 * @property {number} random           - Number of bytes for the random data segment.
 * @property {number} counter          - Number of bytes for the sequential counter segment.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Symbol used as a branded property to identify Identifier instances.
 *
 * @private
 * @type {symbol}
 */
const IDENTIFIER_BRAND = Symbol('Identifier');

/**
 * Precomputed hexadecimal encoding lookup table.
 *
 * Maps each byte value (0-255) to its two-character hexadecimal representation.
 * Used for fast encoding without repeated string conversions.
 *
 * @private
 * @type {Array<string>}
 */
const HEX_ENCODE_TABLE = new Array(256);

for (let i = 0; i < 256; i += 1) {
  HEX_ENCODE_TABLE[i] = i.toString(16).padStart(2, '0');
}

/**
 * Precomputed hexadecimal decoding lookup table.
 *
 * Maps ASCII character codes to their hexadecimal values (0-15).
 * Values for non-hex characters default to 255 (invalid).
 * Supports both uppercase and lowercase hex characters.
 *
 * @private
 * @type {Uint8Array}
 */
const HEX_DECODE_TABLE = new Uint8Array(256);

HEX_DECODE_TABLE.fill(255);

for (let i = 0; i <= 9; i += 1) {
  HEX_DECODE_TABLE[0x30 + i] = i;
}

for (let i = 10; i <= 15; i += 1) {
  HEX_DECODE_TABLE[0x41 + i - 10] = i;
  HEX_DECODE_TABLE[0x61 + i - 10] = i;
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an immutable binary identifier with a customizable format.
 *
 * The Identifier class serves as a base for creating fixed-length binary
 * identifiers composed of three segments: timestamp, random data, and a
 * sequential counter. The class uses optimized lookup tables for fast
 * hexadecimal encoding/decoding.
 *
 * - {@link Identifier.BYTE_LENGTH}.
 * - {@link Identifier.FORMAT}.
 *
 * @classdesc Identifiers expose an immutable binary value. Instances cannot have their
 * internal identifier data modified after construction. Derived representations
 * may be cached internally without changing the identifier value.
 *
 * **NOTE**: This class is intended to be used as an internal base class.
 * It should not be exposed directly through public APIs. Instead, extend it
 * to create specific types (e.g., SessionId, UserId, ConnectionId).
 *
 * @property {Buffer} buffer    - The raw binary data as a Buffer (read-only copy).
 * @property {number} timestamp - The timestamp component extracted from the identifier.
 * @abstract
 * @example
 * ```js
 * // Define a custom identifier (or use default format)
 * class CustomId extends Identifier {
 *   static BYTE_LENGTH = 16;
 *   static FORMAT = {
 *     timestamp: 6,
 *     random: 7,
 *     counter: 3,
 *   };
 * }
 *
 * // Create instances
 * const id1 = new CustomId(); // Auto-generated with current timestamp
 * const id2 = new CustomId('a1b2c3d4e5f6...'); // From hex string
 * const id3 = new CustomId(Buffer.alloc(16)); // From buffer
 * const id4 = new CustomId(1700000000000); // With custom timestamp
 * ```
 */
class Identifier {
  /**
   * Private buffer storage for the identifier data.
   *
   * @private
   * @type {Buffer}
   */
  #buffer;

  /**
   * This cached value does not affect the identifier identity and does not
   * modify the underlying binary representation.
   *
   * Lazily computed on first access via {@link Identifier#toHexString}
   * to avoid unnecessary conversions.
   *
   * @private
   * @type {string|undefined}
   */
  #hexString;

  /**
   * Creates a new Identifier instance.
   *
   * The constructor normalizes the input and stores the branded symbol
   * for type identification.
   *
   * If `undefined`, a random identifier with the current timestamp is generated.
   *
   * @param {IdentifierInput} [identifier] - The input to create the identifier from.
   * @throws {TypeError} If the provided identifier is invalid or has incorrect length.
   * @example
   * ```js
   * // Auto-generate
   * const id = new CustomId();
   *
   * // From hex string
   * const id = new CustomId('a1b2c3d4e5f6...');
   *
   * // From buffer
   * const id = new CustomId(Buffer.alloc(16));
   *
   * // With custom timestamp
   * const id = new CustomId(1700000000000);
   * ```
   */
  constructor(identifier) {
    const Type = this.constructor;
    this.#buffer = Identifier.#normalize(identifier, Type);
    Object.defineProperty(this, IDENTIFIER_BRAND, {
      value: Type,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }

  /**
   * Gets the raw binary data of this identifier as a Buffer.
   *
   * @readonly
   * @type {Buffer}
   * @returns {Buffer} A copy of the internal buffer.
   * @example
   * ```js
   * const id = new CustomId();
   * const buffer = id.buffer;
   * console.log(buffer.length); // 16
   * ```
   */
  get buffer() {
    return Buffer.from(this.#buffer);
  }

  /**
   * Gets the timestamp component of the identifier.
   *
   * Reads the first N bytes of the buffer (where N = FORMAT.timestamp)
   * as a big-endian unsigned integer.
   *
   * @readonly
   * @type {number}
   * @returns {number} The timestamp component encoded in the identifier.
   * @example
   * ```js
   * const id = new CustomId();
   * console.log(id.timestamp); // 1700000000000
   * ```
   */
  get timestamp() {
    return this.#buffer.readUIntBE(0, this.constructor.FORMAT.timestamp);
  }

  /**
   * Get the hexadecimal representation of this document identifier.
   *
   * @readonly
   * @type {string}
   * @returns {string} The hexadecimal representation of this document identifier.
   * @example
   * ```js
   * const id = new CustomId();
   * console.log(id.hex); // 019f681d8cf21c92ed7768a61d000000
   * ```
   */
  get hex() {
    if (this.#hexString === undefined) {
      this.#hexString = Identifier.#encodeHex(this.#buffer);
    }
    return this.#hexString;
  }

  /**
   * Custom string tag for better type identification.
   *
   * @readonly
   * @type {string}
   * @returns {string} The string tag of the subclass.
   * @example
   * ```js
   * const id = new CustomId();
   * console.log(Object.prototype.toString.call(id)); // '[object CustomId]'
   * console.log(id[Symbol.toStringTag]); // 'CustomId'
   * ```
   */
  get [Symbol.toStringTag]() {
    return `${this.constructor.name}`;
  }

  /**
   * Compares this identifier with another identifier by value.
   *
   * Identifiers are considered equal only when they belong to the same
   * identifier type and contain the same binary representation.
   *
   * @param {Identifier} other - Identifier to compare.
   * @returns {boolean} Whether both identifiers represent the same value.
   * @example
   * ```js
   * const id1 = new CustomId();
   * const id2 = new CustomId(id1.buffer);
   *
   * console.log(id1 === id2);
   * // false (different object references)
   *
   * console.log(id1.equals(id2));
   * // true (same identifier value)
   * ```
   */
  equals(other) {
    return other?.[IDENTIFIER_BRAND] === this.constructor && this.#buffer.equals(other.#buffer);
  }

  /**
   * Returns the string representation of the identifier.
   *
   * This method is automatically invoked in string contexts (e.g., template literals).
   *
   * @returns {string} The hexadecimal string representation.
   * @example
   * ```js
   * const id = new CustomId();
   * console.log(`ID: ${id}`); // 'ID: a1b2c3d4...'
   * ```
   */
  toString() {
    return this.hex;
  }

  /**
   * Returns the JSON representation of the identifier.
   *
   * This method is automatically invoked by `JSON.stringify()`.
   *
   * @returns {string} The hexadecimal string representation.
   * @example
   * ```js
   * const id = new CustomId();
   * console.log(JSON.stringify({ id })); // '{"id":"a1b2c3d4..."}'
   * ```
   */
  toJSON() {
    return this.hex;
  }

  /**
   * Custom inspect implementation for Node.js `util.inspect()`.
   *
   * @returns {string} Custom string representation for debugging.
   * @example
   * ```js
   * const id = new CustomId();
   * console.log(require('util').inspect(id));
   * // CustomId 'a1b2c3d4...'
   * ```
   */
  [inspect.custom]() {
    return `${this.constructor.name}(${inspect(this.hex)})`;
  }

  /**
   * Defines the primitive conversion behavior of the identifier.
   *
   * This method allows the identifier to be automatically cast to a string
   * in contexts like template literals or string concatenation. It explicitly
   * prevents conversion to numbers to avoid unintended mathematical operations.
   *
   * @param {string} hint - The conversion hint ('string', 'number', or 'default').
   * @returns {string} The hexadecimal string representation of the identifier.
   * @throws {TypeError} If `hint` is 'number', as identifiers are not numeric.
   * @example
   * ```js
   * const id = new CustomId();
   *
   * // String conversion (hint: 'string' or 'default')
   * console.log(`ID: ${id}`); // 'ID: a1b2c3d4e5f6...'
   * console.log('ID: ' + id); // 'ID: a1b2c3d4e5f6...'
   * console.log(String(id));  // 'a1b2c3d4e5f6...'
   *
   * // Number conversion (throws TypeError)
   * try {
   *   const num = Number(id); // Throws: CustomId cannot be converted to number.
   * } catch (error) {
   *   console.error(error.message);
   * }
   *
   * // Comparison operations use string conversion
   * console.log(id == 'a1b2c3d4e5f6...'); // true
   * console.log(id === 'a1b2c3d4e5f6...'); // false (different types)
   * ```
   */
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') {
      throw new TypeError(`${this.constructor.name} cannot be converted to number.`);
    }
    return String(this.hex);
  }

  /**
   * Total byte length of the identifier.
   *
   * @description Defines the fixed binary size used by the identifier implementation.
   * @static
   * @type {number}
   * @default 16
   * @example
   * ```js
   * class CustomId extends Identifier {
   *   static BYTE_LENGTH = 16;
   * }
   * ```
   */
  static BYTE_LENGTH = 16;

  /**
   * Format definition for the identifier segments.
   *
   * @static
   * @type {IdentifierFormat}
   * @default { timestamp: 6, random: 7, counter: 3 }
   * @description Defines the binary layout used by the identifier implementation.
   * @example
   * ```js
   * class CustomId extends Identifier {
   *   static FORMAT = {
   *     timestamp: 6,  // 48-bit timestamp
   *     random: 7,     // 56-bit random data
   *     counter: 3,    // 24-bit sequential counter
   *   };
   * }
   * ```
   */
  static FORMAT = {
    timestamp: 6,
    random: 7,
    counter: 3,
  };

  /**
   * Stores sequence counters for each identifier subclass.
   *
   * Used to generate sequential counter values that increment with each
   * new identifier of the same type.
   *
   * @private
   * @static
   * @type {WeakMap<typeof Identifier, { timestamp: number, counter: number }>}
   */
  static #sequence = new WeakMap();

  /**
   * Gets or creates the sequence state for an identifier subclass.
   *
   * @private
   * @static
   * @param {typeof Identifier} Type - The identifier subclass.
   * @returns {{ timestamp: number, counter: number }} The sequence state for the identifier type.
   */
  static #getSequence(Type) {
    if (!Identifier.#sequence.has(Type)) {
      Identifier.#sequence.set(Type, {
        timestamp: 0,
        counter: 0,
      });
    }

    return Identifier.#sequence.get(Type);
  }

  /**
   * Generates sequential counter values.
   *
   * The first identifier generated for a timestamp starts at 0.
   * Subsequent identifiers increment the counter value.
   *
   * @private
   * @static
   * @param {typeof Identifier} Type - The class to generate for.
   * @param {number} timestamp - Timestamp associated with the identifier being generated.
   * @param {number} counterBytes - Number of bytes allocated for the counter.
   * @returns {number} The counter value for the generated identifier.
   * @throws  {RangeError} If the counter exceeds the maximum value representable by the allocated number of bytes for the current timestamp.
   */
  static #nextCounter(Type, timestamp, counterBytes) {
    const max = 2 ** (counterBytes * 8);
    const sequence = Identifier.#getSequence(Type);

    if (sequence.timestamp !== timestamp) {
      sequence.timestamp = timestamp;
      sequence.counter = 0;
      return 0;
    }

    if (sequence.counter === max - 1) {
      throw new RangeError('Identifier counter overflow.');
    }
    sequence.counter += 1;
    return sequence.counter;
  }
  /**
   * Parses a hexadecimal string into a buffer.
   *
   * Uses a precomputed lookup table for efficient decoding.
   *
   * @private
   * @static
   * @param {string} hexString - The hexadecimal string to parse.
   * @param {number} byteLength - The expected byte length.
   * @returns {Buffer} The parsed buffer.
   * @throws {TypeError} If the string is not a valid hex string of the correct length.
   */
  static #parseHex(hexString, byteLength) {
    const regex = new RegExp(`^[0-9a-fA-F]{${byteLength * 2}}$`);

    if (!regex.test(hexString)) {
      throw new TypeError('Invalid hex string format.');
    }

    const buffer = Buffer.alloc(byteLength);

    for (let i = 0; i < byteLength; i += 1) {
      const high = HEX_DECODE_TABLE[hexString.charCodeAt(i * 2)];
      const low = HEX_DECODE_TABLE[hexString.charCodeAt(i * 2 + 1)];

      buffer[i] = (high << 4) | low;
    }

    return buffer;
  }

  /**
   * Parses bytes from various input types into a buffer.
   *
   * @private
   * @static
   * @param {Buffer|Uint8Array|number[]} bytes - The bytes to parse.
   * @param {number} byteLength - The expected byte length.
   * @returns {Buffer} The validated buffer.
   * @throws {TypeError} If the byte length doesn't match the expected length.
   */
  static #parseBytes(bytes, byteLength) {
    const buffer = Buffer.from(bytes);
    if (buffer.length !== byteLength)
      throw new TypeError(`Invalid length. Expected ${byteLength} bytes.`);
    return buffer;
  }

  /**
   * Encodes a buffer to a hexadecimal string.
   *
   * Uses a precomputed lookup table for optimal performance.
   *
   * @private
   * @static
   * @param {Buffer} buffer - The buffer to encode.
   * @returns {string} The hexadecimal string representation.
   */
  static #encodeHex(buffer) {
    let hex = '';
    for (const byte of buffer) {
      hex += HEX_ENCODE_TABLE[byte];
    }
    return hex;
  }

  /**
   * Writes a big-endian unsigned integer to a buffer at a specific offset.
   *
   * @private
   * @static
   * @param {Buffer} buffer - The buffer to write to.
   * @param {number} value - The value to write.
   * @param {number} offset - The offset in the buffer.
   * @param {number} byteLength - The number of bytes to write.
   */
  static #writeUIntBE(buffer, value, offset, byteLength) {
    buffer.writeUIntBE(value, offset, byteLength);
  }

  /**
   * Writes the timestamp to a buffer at the beginning.
   *
   * @private
   * @static
   * @param {Buffer} buffer - The buffer to write to.
   * @param {typeof Identifier} Type - The class to generate for.
   * @param {number} timestamp - The timestamp value to write.
   */
  static #addTimestampToBuffer(buffer, Type, timestamp) {
    const { timestamp: timestampBytes } = Type.FORMAT;
    Identifier.#writeUIntBE(buffer, timestamp, 0, timestampBytes);
  }

  /**
   * Fills the random segment of the buffer using cryptographically secure random bytes.
   *
   * @private
   * @static
   * @param {Buffer} buffer - The buffer to modify.
   * @param {typeof Identifier} Type - The class to generate for.
   */
  static #addRandomToBuffer(buffer, Type) {
    const { timestamp: timestampBytes, random: randomBytes } = Type.FORMAT;
    crypto.randomFillSync(buffer, timestampBytes, randomBytes);
  }

  /**
   * Writes the counter value to the buffer at the correct position.
   *
   * @private
   * @static
   * @param {Buffer} buffer - The buffer to modify.
   * @param {typeof Identifier} Type - The class to generate for.
   * @param {number} timestamp - Timestamp associated with the identifier being generated.
   */
  static #addCounterToBuffer(buffer, Type, timestamp) {
    const { timestamp: timestampBytes, random: randomBytes, counter: counterBytes } = Type.FORMAT;
    Identifier.#writeUIntBE(
      buffer,
      Identifier.#nextCounter(Type, timestamp, counterBytes),
      timestampBytes + randomBytes,
      counterBytes,
    );
  }

  /**
   * Generates a new identifier.
   *
   * Creates a buffer composed of timestamp, random data, and counter segments
   * in that order.
   *
   * @private
   * @static
   * @param {typeof Identifier} Type - The class to generate for.
   * @param {number} [timestamp] - Optional timestamp value, default value is `Date.now()`.
   * @returns {Buffer} The generated buffer.
   */
  static #generate(Type, timestamp = Date.now()) {
    const buffer = Buffer.alloc(Type.BYTE_LENGTH);

    Identifier.#addTimestampToBuffer(buffer, Type, timestamp);
    Identifier.#addRandomToBuffer(buffer, Type);
    Identifier.#addCounterToBuffer(buffer, Type, timestamp);

    return buffer;
  }

  /**
   * Normalizes various input types into a buffer.
   *
   * Handles all supported input formats and performs necessary validation.
   *
   * @private
   * @static
   * @param {IdentifierInput} identifier - The input to normalize.
   * @param {typeof Identifier} Type - The class to normalize for.
   * @returns {Buffer} The normalized buffer.
   * @throws {TypeError} If the input is invalid.
   */
  static #normalize(identifier, Type) {
    const byteLength = Type.BYTE_LENGTH;
    if (identifier === undefined) {
      return Identifier.#generate(Type);
    }

    if (identifier?.[IDENTIFIER_BRAND] === Type) {
      return Buffer.from(identifier.buffer);
    }

    if (typeof identifier === 'string') {
      return Identifier.#parseHex(identifier, byteLength);
    }

    if (identifier instanceof Date) {
      return Identifier.#generate(Type, identifier.getTime());
    }

    if (
      Buffer.isBuffer(identifier) ||
      identifier instanceof Uint8Array ||
      Array.isArray(identifier)
    ) {
      return Identifier.#parseBytes(identifier, byteLength);
    }

    if (Number.isInteger(identifier)) {
      return Identifier.#generate(Type, identifier);
    }

    throw new TypeError(
      'Expected a hexadecimal string, Buffer, Uint8Array, Array<number>, Date, integer timestamp, or an identifier of the same type.',
    );
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Identifier;
