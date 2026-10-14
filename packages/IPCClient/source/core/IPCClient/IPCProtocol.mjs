// @ts-check
/**
 * @file Defines the IPC wire protocol.
 *
 * @description Validates incoming IPC messages and serializes outgoing IPC
 * messages.
 *
 * IPCProtocol is the sole owner of wire-format normalization. Higher layers
 * pass raw handler errors to this protocol instead of constructing IPC error
 * payloads themselves.
 *
 * @module IPCProtocol
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Result from '#shared/outcome/Result';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an IPC invocation request.
 *
 * An invocation expects a matching response carrying the same `id`.
 *
 * @typedef  {object}   IPCInvokeRequest
 * @property {'invoke'} type             - Identifies the request as an invocation.
 * @property {string}   channel          - IPC channel targeted by the request.
 * @property {string}   id               - Unique invocation identifier.
 * @property {unknown}  [data]           - Application-defined data associated with the request.
 */

/**
 * Represents an IPC event request.
 *
 * An event does not expect a response.
 *
 * @typedef  {object}  IPCEventRequest
 * @property {'event'} type            - Identifies the request as an event.
 * @property {string}  channel         - IPC channel targeted by the request.
 * @property {unknown} [data]          - Application-defined data associated with the request.
 */

/**
 * Represents an IPC request transmitted through the wire protocol.
 *
 * @typedef {IPCInvokeRequest|IPCEventRequest} IPCRequest
 */

/**
 * Represents the normalized error payload exposed through the IPC wire format.
 *
 * @typedef  {object} IPCError
 * @property {string} code     - Machine-readable error code.
 * @property {string} message  - Human-readable error message.
 */

/**
 * Represents a successful IPC response containing a handler result.
 *
 * @typedef  {object}     IPCSuccessResponse
 * @property {'response'} type               - Identifies the message as an IPC response.
 * @property {string}     id                 - Invocation identifier associated with the request.
 * @property {unknown}    result             - Handler result returned to the caller.
 */

/**
 * Represents a failed IPC response containing a normalized error.
 *
 * @typedef  {object}     IPCErrorResponse
 * @property {'response'} type             - Identifies the message as an IPC response.
 * @property {string}     id               - Invocation identifier associated with the request.
 * @property {IPCError}   error            - Normalized error returned to the caller.
 */

/**
 * Represents an IPC response transmitted through the wire protocol.
 *
 * @typedef {IPCSuccessResponse|IPCErrorResponse} IPCResponse
 */

/**
 * Represents any IPC message transmitted through the wire protocol.
 *
 * @typedef {IPCRequest|IPCResponse} IPCMessage
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error code used when an incoming IPC payload cannot be decoded as a valid
 * request.
 *
 * @type {string}
 */
const IPC_BAD_MESSAGE = 'IPC_BAD_MESSAGE';

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Determines whether a value is a non-null plain object.
 *
 * @private
 * @param {unknown} value - Value to inspect.
 * @returns {value is Record<string, unknown>} `true` if the value is a plain object.
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Implements the IPC wire protocol for decoding requests and serializing
 * responses.
 *
 * @classdesc IPCProtocol validates incoming IPC messages and serializes
 * outgoing IPC messages without exposing wire-format concerns to higher
 * layers. Owns all wire-format concerns for both server and client.
 *
 */
class IPCProtocol {
  /**
   * Decodes and validates an incoming IPC request.
   *
   * @param {string} data - JSON-encoded IPC request to decode.
   * @returns {IPCRequest} Decoded and validated IPC request.
   * @throws {TypeError} If the payload is not valid JSON.
   * @throws {Error} If the payload does not satisfy the IPC request contract.
   *
   * @example
   * ```js
   * const request = protocol.decode(
   *   '{"type":"invoke","channel":"users:get","id":"42"}',
   * );
   *
   * console.log(request.channel);
   * // 'users:get'
   * ```
   */
  decode(data) {
    const result = this.#ensureRequest(this.#parse(data));

    if (!result.ok) {
      throw result.error;
    }

    return result.value;
  }

  /**
   * Serializes a validated IPC response into its wire representation.
   *
   * @param {IPCResponse} response - Validated IPC response to serialize.
   * @returns {string} JSON-encoded IPC response.
   *
   * @example
   * ```js
   * const data = protocol.encode({
   *   type: 'response',
   *   id: '42',
   *   result: { name: 'Victor' },
   * });
   *
   * console.log(data);
   * // '{"type":"response","id":"42","result":{"name":"Victor"}}'
   * ```
   */
  encode(response) {
    return JSON.stringify(response);
  }

  /**
   * Creates and serializes a successful IPC response.
   *
   * @param {string} id - Invocation identifier associated with the request.
   * @param {unknown} result - Handler result returned to the caller.
   * @returns {string} JSON-encoded successful IPC response.
   *
   * @example
   * ```js
   * const data = protocol.success('42', { name: 'Victor' });
   *
   * console.log(data);
   * // '{"type":"response","id":"42","result":{"name":"Victor"}}'
   * ```
   */
  success(id, result) {
    return this.encode({
      type: 'response',
      id,
      result,
    });
  }

  /**
   * Creates and serializes an IPC error response from an arbitrary error value.
   *
   * The supplied error is normalized to the IPC wire error format before the
   * response is serialized.
   *
   * @param {string} id - Invocation identifier associated with the request.
   * @param {unknown} error - Error value produced while handling the request.
   * @returns {string} JSON-encoded IPC error response.
   *
   * @example
   * ```js
   * const data = protocol.error('42', new Error('User not found'));
   *
   * console.log(data);
   * // '{"type":"response","id":"42","error":{"code":"IPC_HANDLER_ERROR","message":"User not found"}}'
   * ```
   */
  error(id, error) {
    return this.encode({
      type: 'response',
      id,
      error: this.#normalizeError(error),
    });
  }

  /**
   * Creates and serializes an IPC error response for a malformed request.
   *
   * This method is used when a valid invocation identifier can still be
   * recovered from the malformed payload.
   *
   * @param {string} id - Invocation identifier recovered from the request.
   * @param {string} message - Description of the malformed request.
   * @returns {string} JSON-encoded IPC error response.
   *
   * @example
   * ```js
   * const data = protocol.badMessage('42', 'IPC channel must be a non-empty string.');
   *
   * console.log(data);
   * // '{"type":"response","id":"42","error":{"code":"IPC_BAD_MESSAGE","message":"IPC channel must be a non-empty string."}}'
   * ```
   */
  badMessage(id, message) {
    return this.encode({
      type: 'response',
      id,
      error: {
        code: IPC_BAD_MESSAGE,
        message,
      },
    });
  }

  /**
   * Serializes an invocation request into its wire representation.
   *
   * @param {string} channel - IPC channel targeted by the request.
   * @param {string} id - Unique invocation identifier.
   * @param {unknown} [data] - Application-defined payload associated with the request.
   * @returns {string} JSON-encoded invocation request.
   *
   * @example
   * ```js
   * const data = protocol.encodeInvoke('users:get', '42', { id: 1 });
   *
   * console.log(data);
   * // '{"type":"invoke","channel":"users:get","id":"42","data":{"id":1}}'
   * ```
   */
  encodeInvoke(channel, id, data) {
    /** @type {IPCInvokeRequest} */
    const message = {
      type: 'invoke',
      channel,
      id,
      data,
    };

    return JSON.stringify(message);
  }

  /**
   * Serializes a one-way event into its wire representation.
   *
   * @param {string} channel - IPC channel targeted by the event.
   * @param {unknown} [data] - Application-defined payload associated with the event.
   * @returns {string} JSON-encoded event request.
   *
   * @example
   * ```js
   * const data = protocol.encodeEvent('notifications:read', { id: 42 });
   *
   * console.log(data);
   * // '{"type":"event","channel":"notifications:read","data":{"id":42}}'
   * ```
   */
  encodeEvent(channel, data) {
    /** @type {IPCEventRequest} */
    const message = {
      type: 'event',
      channel,
      data,
    };

    return JSON.stringify(message);
  }

  /**
   * Decodes and validates any IPC message (request or response).
   *
   * @param {string} data - JSON-encoded IPC message to decode.
   * @returns {IPCMessage} Decoded and validated IPC message.
   * @throws {TypeError} If the payload is not valid JSON.
   * @throws {Error} If the payload does not satisfy the IPC message contract.
   *
   * @example
   * ```js
   * const message = protocol.decodeMessage(
   *   '{"type":"response","id":"42","result":{"name":"Victor"}}',
   * );
   *
   * console.log(message.result);
   * // { name: 'Victor' }
   * ```
   */
  decodeMessage(data) {
    const parsed = this.#parse(data);
    const result = this.#ensureMessage(parsed);

    if (!result.ok) {
      throw result.error;
    }

    return result.value;
  }

  /**
   * Ensures a parsed IPC payload is a valid request.
   *
   * Returns a successful {@link Result} containing the normalized request, or
   * a failure describing the first structural violation encountered.
   *
   * @param {unknown} message - Parsed IPC payload.
   * @returns {Result<IPCRequest>} Successful result containing the normalized request, or a failure describing the validation error.
   */
  #ensureRequest(message) {
    if (!isPlainObject(message)) {
      return Result.failure({
        error: TypeError,
        message: 'IPC message must be a plain object.',
        code: 'IPC_INVALID_MESSAGE',
        custom: false,
      });
    }

    if (!('type' in message)) {
      return Result.failure({
        error: ReferenceError,
        message: 'IPC message requires a "type" property.',
        code: 'IPC_MISSING_TYPE',
        custom: false,
      });
    }

    if (message.type === 'invoke') {
      return this.#ensureInvokeRequest(message);
    }

    if (message.type === 'event') {
      return this.#ensureEventRequest(message);
    }

    return Result.failure({
      error: TypeError,
      message: 'IPC message type must be "invoke" or "event".',
      code: 'IPC_INVALID_TYPE',
      custom: false,
    });
  }

  /**
   * Ensures a parsed payload is any valid IPC message (request or response).
   *
   * Dispatches validation to the appropriate request or response validator
   * based on the message `type`.
   *
   * @param {unknown} message - Parsed IPC payload.
   * @returns {Result<IPCMessage>} Successful result containing the normalized message, or a failure describing the validation error.
   */
  #ensureMessage(message) {
    if (!isPlainObject(message)) {
      return Result.failure({
        error: TypeError,
        message: 'IPC message must be a plain object.',
        code: 'IPC_INVALID_MESSAGE',
        custom: false,
      });
    }

    if (!('type' in message)) {
      return Result.failure({
        error: ReferenceError,
        message: 'IPC message requires a "type" property.',
        code: 'IPC_MISSING_TYPE',
        custom: false,
      });
    }

    if (message.type === 'invoke') {
      return this.#ensureInvokeRequest(message);
    }

    if (message.type === 'event') {
      return this.#ensureEventRequest(message);
    }

    if (message.type === 'response') {
      return this.#ensureResponse(message);
    }

    return Result.failure({
      error: TypeError,
      message: 'IPC message type must be "invoke", "event" or "response".',
      code: 'IPC_INVALID_TYPE',
      custom: false,
    });
  }

  /**
   * Ensures a parsed IPC payload is a valid invocation request.
   *
   * @param {Record<string, unknown>} message - Parsed IPC payload.
   * @returns {Result<IPCInvokeRequest>} Successful result containing the normalized request, or a failure describing the validation error.
   */
  #ensureInvokeRequest(message) {
    if (!('channel' in message)) {
      return Result.failure({
        error: ReferenceError,
        message: 'IPC message requires a "channel" property.',
        code: 'IPC_MISSING_CHANNEL',
        custom: false,
      });
    }

    if (typeof message.channel !== 'string') {
      return Result.failure({
        error: TypeError,
        message: 'IPC channel must be a string.',
        code: 'IPC_INVALID_CHANNEL_TYPE',
        custom: false,
      });
    }

    if (message.channel.trim().length === 0) {
      return Result.failure({
        error: RangeError,
        message: 'IPC channel must be a non-empty string.',
        code: 'IPC_INVALID_CHANNEL_RANGE',
        custom: false,
      });
    }

    if (!('id' in message)) {
      return Result.failure({
        error: ReferenceError,
        message: 'IPC invocation requires an "id" property.',
        code: 'IPC_MISSING_ID',
        custom: false,
      });
    }

    if (typeof message.id !== 'string') {
      return Result.failure({
        error: TypeError,
        message: 'IPC invocation id must be a string.',
        code: 'IPC_INVALID_ID_TYPE',
        custom: false,
      });
    }

    if (message.id.trim().length === 0) {
      return Result.failure({
        error: RangeError,
        message: 'IPC invocation id must be a non-empty string.',
        code: 'IPC_INVALID_ID_RANGE',
        custom: false,
      });
    }

    return Result.success({
      type: 'invoke',
      channel: message.channel,
      id: message.id,
      data: message.data,
    });
  }

  /**
   * Ensures a parsed IPC payload is a valid event request.
   *
   * @param {Record<string, unknown>} message - Parsed IPC payload.
   * @returns {Result<IPCEventRequest>} Successful result containing the normalized request, or a failure describing the validation error.
   */
  #ensureEventRequest(message) {
    if (!('channel' in message)) {
      return Result.failure({
        error: ReferenceError,
        message: 'IPC message requires a "channel" property.',
        code: 'IPC_MISSING_CHANNEL',
        custom: false,
      });
    }

    if (typeof message.channel !== 'string') {
      return Result.failure({
        error: TypeError,
        message: 'IPC channel must be a string.',
        code: 'IPC_INVALID_CHANNEL_TYPE',
        custom: false,
      });
    }

    if (message.channel.trim().length === 0) {
      return Result.failure({
        error: RangeError,
        message: 'IPC channel must be a non-empty string.',
        code: 'IPC_INVALID_CHANNEL_RANGE',
        custom: false,
      });
    }

    return Result.success({
      type: 'event',
      channel: message.channel,
      data: message.data,
    });
  }

  /**
   * Ensures a parsed IPC payload is a valid response.
   *
   * A response must carry an `id` and exactly one of `result` or `error`.
   * When `error` is present, it must be an object with string `code` and
   * `message` properties.
   *
   * @param {Record<string, unknown>} message - Parsed IPC payload.
   * @returns {Result<IPCResponse>} Successful result containing the normalized response, or a failure describing the validation error.
   */
  #ensureResponse(message) {
    if (!('id' in message)) {
      return Result.failure({
        error: ReferenceError,
        message: 'IPC response requires an "id" property.',
        code: 'IPC_MISSING_ID',
        custom: false,
      });
    }

    if (typeof message.id !== 'string') {
      return Result.failure({
        error: TypeError,
        message: 'IPC response id must be a string.',
        code: 'IPC_INVALID_ID_TYPE',
        custom: false,
      });
    }

    if (message.id.trim().length === 0) {
      return Result.failure({
        error: RangeError,
        message: 'IPC response id must be a non-empty string.',
        code: 'IPC_INVALID_ID_RANGE',
        custom: false,
      });
    }

    const hasResult = 'result' in message;
    const hasError = 'error' in message;

    if (hasResult && hasError) {
      return Result.failure({
        error: TypeError,
        message: 'IPC response cannot contain both "result" and "error".',
        code: 'IPC_INVALID_RESPONSE',
        custom: false,
      });
    }

    if (!hasResult && !hasError) {
      return Result.failure({
        error: ReferenceError,
        message: 'IPC response requires either "result" or "error".',
        code: 'IPC_MISSING_RESULT_OR_ERROR',
        custom: false,
      });
    }

    if (hasError) {
      const error = message.error;

      if (!isPlainObject(error)) {
        return Result.failure({
          error: TypeError,
          message: 'IPC response error must be an object.',
          code: 'IPC_INVALID_ERROR',
          custom: false,
        });
      }

      if (typeof error.code !== 'string' || typeof error.message !== 'string') {
        return Result.failure({
          error: TypeError,
          message: 'IPC response error must be an object with string "code" and "message".',
          code: 'IPC_INVALID_ERROR',
          custom: false,
        });
      }

      return Result.success({
        type: 'response',
        id: message.id,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return Result.success({
      type: 'response',
      id: message.id,
      result: message.result,
    });
  }

  /**
   * Normalizes an arbitrary thrown value into the IPC wire error format.
   *
   * Objects containing `code` and `message` preserve both values after
   * converting them to strings. Other values use the default
   * `IPC_HANDLER_ERROR` code.
   *
   * @param {unknown} error - Thrown value to normalize.
   * @returns {IPCError} Normalized IPC wire error.
   */
  #normalizeError(error) {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return {
        code: String(Reflect.get(error, 'code')),
        message: String(Reflect.get(error, 'message')),
      };
    }

    if (error instanceof Error) {
      return {
        code: 'IPC_HANDLER_ERROR',
        message: error.message,
      };
    }

    return {
      code: 'IPC_HANDLER_ERROR',
      message: String(error),
    };
  }

  /**
   * Parses JSON and throws a TypeError when the payload is not valid JSON.
   *
   * @param {string} data - Raw IPC payload.
   * @returns {unknown} The parsed value.
   * @throws {TypeError} If the payload is not valid JSON.
   */
  #parse(data) {
    try {
      return JSON.parse(data);
    } catch (error) {
      throw new TypeError('IPC message must be valid JSON', { cause: error });
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default IPCProtocol;
