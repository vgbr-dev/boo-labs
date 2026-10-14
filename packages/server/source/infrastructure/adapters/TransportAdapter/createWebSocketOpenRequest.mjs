// @ts-check
/**
 * @file Provides WebSocket upgrade and connection utilities for HTTP/1.1
 * transports.
 *
 * @description Implements the RFC 6455 handshake and the low-level WebSocket
 * connection required by the HTTP/1.1 transport. It includes subprotocol
 * negotiation, message size limits, and full frame lifecycle management
 * (fragmentation, ping/pong, and close).
 *
 * @module WebSocketUpgrade
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import crypto from 'node:crypto';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Underlying TCP socket used by a WebSocket connection.
 *
 * @typedef {import('node:net').Socket} WebSocketSocket
 */

/**
 * HTTP/1.1 request received during a WebSocket upgrade.
 *
 * @typedef {import('node:http').IncomingMessage} WebSocketUpgradeRequest
 */

/**
 * Listener for incoming WebSocket messages.
 *
 * @callback WebSocketMessageListener
 * @param {string|Buffer} data - Incoming text or binary message.
 * @returns {void}
 */

/**
 * Listener for WebSocket close events.
 *
 * @callback WebSocketCloseListener
 * @returns {void}
 */

/**
 * Listener for WebSocket error events.
 *
 * @callback WebSocketErrorListener
 * @param {Error} error - Error reported by the WebSocket connection.
 * @returns {void}
 */

/**
 * Registers a WebSocket event listener.
 *
 * @typedef {(
 * ((event: 'message', listener: WebSocketMessageListener) => void) &
 * ((event: 'close', listener: WebSocketCloseListener) => void) &
 * ((event: 'error', listener: WebSocketErrorListener) => void)
 * )} WebSocketOn
 */

/**
 * Represents an established WebSocket connection contract.
 *
 * @typedef  {object}                        WebSocketConnection
 * @property {(data: string|Buffer) => void} send                - Sends a text or binary WebSocket message.
 * @property {WebSocketOn}                   on                  - Registers a listener for WebSocket events.
 * @property {() => void}                    close               - Closes the WebSocket connection.
 * @property {number}                        readyState          - Current transport-defined WebSocket ready state.
 */

/**
 * Transport-level request used to accept or reject a WebSocket handshake.
 *
 * @typedef  {object}                                             WebSocketOpenRequest
 * @property {string}                                             url                  - The requested WebSocket URL.
 * @property {Record<string, string|string[]|undefined>}          headers              - Headers received during the WebSocket handshake.
 * @property {(selectedProtocol?: string) => WebSocketConnection} accept               - Accepts the handshake. Optionally selects a subprotocol.
 * @property {(code?: number, message?: string) => void}          reject               - Rejects the WebSocket handshake.
 */

/**
 * Represents a parsed WebSocket frame.
 *
 * @typedef  {object}  WebSocketFrame
 * @property {boolean} fin            - Whether this is the final fragment of the message.
 * @property {number}  opcode         - Frame opcode.
 * @property {Buffer}  payload        - Unmasked frame payload.
 * @property {number}  length         - Total frame length in bytes, including header.
 */

/**
 * Options accepted by {@link createWebSocketOpenRequest}.
 *
 * @typedef  {object}   WebSocketUpgradeOptions
 * @property {number}   [maxMessageSize]        - Maximum allowed message size in bytes.
 * @property {string[]} [supportedProtocols]    - WebSocket subprotocols supported by the server.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Magic string defined by RFC 6455 for the WebSocket handshake.
 *
 * @type {string}
 */
const WS_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * WebSocket protocol version supported by this implementation.
 *
 * @type {number}
 */
const WS_VERSION = 13;

/**
 * WebSocket close code indicating a normal closure.
 *
 * @type {number}
 */
const WS_CLOSE_NORMAL = 1000;

/**
 * WebSocket close code indicating a protocol error.
 *
 * @type {number}
 */
const WS_CLOSE_PROTOCOL_ERROR = 1002;

/**
 * WebSocket close code indicating invalid frame payload data.
 *
 * @type {number}
 */
const WS_CLOSE_INVALID_PAYLOAD = 1007;

/**
 * WebSocket close code indicating a message that is too large to process.
 *
 * @type {number}
 */
const WS_CLOSE_MESSAGE_TOO_BIG = 1009;

/**
 * WebSocket ready state indicating the connection is open.
 *
 * @type {number}
 */
const WS_OPEN = 1;

/**
 * WebSocket ready state indicating the closing handshake has started.
 *
 * @type {number}
 */
const WS_CLOSING = 2;

/**
 * WebSocket ready state indicating the connection is closed.
 *
 * @type {number}
 */
const WS_CLOSED = 3;

/**
 * Default maximum allowed message size in bytes.
 *
 * Prevents memory exhaustion attacks from oversized WebSocket messages,
 * including fragmented messages.
 *
 * @type {number}
 */
const DEFAULT_MAX_MESSAGE_SIZE = 10 * 1024 * 1024;

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Encodes a WebSocket close code as a two-byte buffer.
 *
 * @private
 * @param {number} code - WebSocket close code.
 * @returns {Buffer} Two-byte close code buffer.
 */
function encodeCloseCode(code) {
  const buffer = Buffer.alloc(2);

  buffer.writeUInt16BE(code, 0);

  return buffer;
}

/**
 * Determines whether a WebSocket close code is valid per RFC 6455.
 *
 * Valid ranges:
 *
 * - `1000`–`1003`: normal and endpoint-defined closures.
 * - `1007`–`1014`: RFC-defined closure conditions.
 * - `3000`–`4999`: application- and library-defined closures.
 *
 * @private
 * @param {number} code - WebSocket close code.
 * @returns {boolean} `true` when the code is valid.
 */
function isValidCloseCode(code) {
  return (
    (code >= 1000 && code <= 1003) ||
    (code >= 1007 && code <= 1014) ||
    (code >= 3000 && code <= 4999)
  );
}

/**
 * Determines whether a buffer contains valid UTF-8 data.
 *
 * @private
 * @param {Buffer} buffer - Buffer to validate.
 * @returns {boolean} `true` when the buffer is valid UTF-8.
 */
function isValidUTF8(buffer) {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);

    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a WebSocket frame.
 *
 * Server-to-client frames are never masked.
 *
 * @private
 * @param {number} opcode - WebSocket frame opcode.
 * @param {Buffer} payload - Frame payload.
 * @returns {Buffer} Encoded WebSocket frame.
 */
function createWebSocketFrame(opcode, payload) {
  const length = payload.length;

  if (length <= 125) {
    const frame = Buffer.alloc(2 + length);

    frame[0] = 0x80 | opcode;
    frame[1] = length;
    payload.copy(frame, 2);

    return frame;
  }

  if (length <= 0xffff) {
    const frame = Buffer.alloc(4 + length);

    frame[0] = 0x80 | opcode;
    frame[1] = 126;
    frame.writeUInt16BE(length, 2);
    payload.copy(frame, 4);

    return frame;
  }

  const frame = Buffer.alloc(10 + length);

  frame[0] = 0x80 | opcode;
  frame[1] = 127;
  frame.writeBigUInt64BE(BigInt(length), 2);
  payload.copy(frame, 10);

  return frame;
}

/**
 * Parses an incoming WebSocket frame.
 *
 * Client-to-server frames must be masked according to RFC 6455. The returned
 * payload is always unmasked.
 *
 * @private
 * @param {Buffer} buffer - Raw WebSocket bytes.
 * @param {number} maxMessageSize - Maximum allowed message size in bytes.
 * @returns {WebSocketFrame|null} Parsed frame, or `null` when the buffer does not yet contain a complete frame.
 * @throws {Error & { code?: number }} Thrown when the frame violates the WebSocket protocol. The error may carry a numeric `code` indicating the appropriate WebSocket close code.
 */
function parseWebSocketFrame(buffer, maxMessageSize) {
  if (buffer.length < 2) {
    return null;
  }

  const firstByte = buffer[0];
  const secondByte = buffer[1];

  const fin = (firstByte & 0x80) !== 0;
  const reserved = firstByte & 0x70;
  const opcode = firstByte & 0x0f;

  if (reserved !== 0) {
    throw new Error('Reserved WebSocket bits are not supported.');
  }

  if (
    opcode !== 0x0 &&
    opcode !== 0x1 &&
    opcode !== 0x2 &&
    opcode !== 0x8 &&
    opcode !== 0x9 &&
    opcode !== 0xa
  ) {
    throw new Error(`Unsupported WebSocket opcode: ${opcode}.`);
  }

  const isMasked = (secondByte & 0x80) !== 0;

  if (!isMasked) {
    throw new Error('Client WebSocket frames must be masked.');
  }

  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) {
      return null;
    }

    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) {
      return null;
    }

    const length = buffer.readBigUInt64BE(2);

    if (length > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('WebSocket payload is too large.');
    }

    payloadLength = Number(length);
    offset = 10;
  }

  const isControlFrame = opcode >= 0x8;

  if (isControlFrame && (!fin || payloadLength > 125)) {
    throw new Error('Invalid WebSocket control frame.');
  }

  if (!isControlFrame && payloadLength > maxMessageSize) {
    const error = /** @type {Error & { code?: number }} */ (
      new Error(
        `WebSocket payload size (${payloadLength} bytes) exceeds maximum allowed message size (${maxMessageSize} bytes).`,
      )
    );

    error.code = WS_CLOSE_MESSAGE_TOO_BIG;

    throw error;
  }

  if (buffer.length < offset + 4) {
    return null;
  }

  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;

  if (buffer.length < offset + payloadLength) {
    return null;
  }

  const payload = Buffer.from(buffer.subarray(offset, offset + payloadLength));

  for (let index = 0; index < payload.length; index += 1) {
    payload[index] ^= mask[index % 4];
  }

  return {
    fin,
    opcode,
    payload,
    length: offset + payloadLength,
  };
}

/**
 * Creates a WebSocket connection over a TCP socket.
 *
 * @param {WebSocketSocket} socket - Underlying TCP socket.
 * @param {Buffer} head - Bytes already read during the HTTP upgrade.
 * @param {number} maxMessageSize - Maximum allowed message size in bytes.
 * @returns {WebSocketConnection} WebSocket connection.
 * @example
 * ```js
 * const connection = createWebSocketConnection(socket, head, 10 * 1024 * 1024);
 * connection.on('message', data => console.log(data));
 * connection.send('hello');
 * connection.close();
 * ```
 */
function createWebSocketConnection(socket, head, maxMessageSize) {
  /**
   * Registered message listeners.
   *
   * @type {((data: string|Buffer) => void)[]}
   */
  const messageListeners = [];

  /**
   * Registered close listeners.
   *
   * @type {(() => void)[]}
   */
  const closeListeners = [];

  /**
   * Registered error listeners.
   *
   * @type {((error: Error) => void)[]}
   */
  const errorListeners = [];

  /**
   * Buffered bytes pending parsing.
   *
   * @type {Buffer}
   */
  let bufferQueue = Buffer.alloc(0);

  /**
   * Current connection ready state.
   *
   * @type {number}
   */
  let readyState = WS_OPEN;

  /**
   * Opcode of the currently in-progress fragmented message, or `null`.
   *
   * @type {number|null}
   */
  let fragmentedOpcode = null;

  /**
   * Accumulated fragments of the in-progress fragmented message.
   *
   * @type {Buffer[]}
   */
  let fragmentedPayload = [];

  /**
   * Accumulated byte size of the in-progress fragmented message.
   *
   * @type {number}
   */
  let fragmentedSize = 0;

  /**
   * Writes a WebSocket frame to the underlying socket.
   *
   * @param {number} opcode - Frame opcode.
   * @param {Buffer} payload - Frame payload.
   * @throws {Error} Thrown when the WebSocket connection is not open.
   */
  const sendFrame = (opcode, payload) => {
    if (readyState !== WS_OPEN) {
      throw new Error('WebSocket connection is not open.');
    }

    socket.write(createWebSocketFrame(opcode, payload));
  };

  /**
   * Sends a WebSocket close frame and ends the underlying socket.
   *
   * @param {Buffer} payload - Close frame payload.
   */
  const sendClose = payload => {
    if (readyState === WS_OPEN) {
      readyState = WS_CLOSING;
      socket.write(createWebSocketFrame(0x8, payload));
    }

    socket.end();
  };

  /**
   * Emits a complete WebSocket message to all registered listeners.
   *
   * Text frames are validated for UTF-8 correctness. Invalid UTF-8 payloads
   * trigger a `1007` close frame per RFC 6455 §5.6.
   *
   * @param {number} opcode - Original message opcode.
   * @param {Buffer} payload - Complete message payload.
   * @returns {boolean} `true` when the message was emitted, `false` when it was rejected.
   */
  const emitMessage = (opcode, payload) => {
    if (opcode === 0x1 && !isValidUTF8(payload)) {
      sendClose(encodeCloseCode(WS_CLOSE_INVALID_PAYLOAD));

      return false;
    }

    const data = opcode === 0x1 ? payload.toString('utf8') : payload;

    messageListeners.forEach(listener => listener(data));

    return true;
  };

  /**
   * Handles a parsed WebSocket frame.
   *
   * @param {WebSocketFrame} frame - Parsed WebSocket frame.
   * @returns {boolean} Whether the frame was valid.
   */
  const handleFrame = frame => {
    if (frame.opcode === 0x8) {
      if (frame.payload.length === 1) {
        return false;
      }

      if (frame.payload.length >= 2) {
        const code = frame.payload.readUInt16BE(0);

        if (!isValidCloseCode(code)) {
          return false;
        }

        if (frame.payload.length > 2 && !isValidUTF8(frame.payload.subarray(2))) {
          sendClose(encodeCloseCode(WS_CLOSE_INVALID_PAYLOAD));

          return false;
        }
      }

      if (readyState === WS_OPEN) {
        readyState = WS_CLOSING;
        socket.write(createWebSocketFrame(0x8, frame.payload));
      }

      socket.end();

      return true;
    }

    if (frame.opcode === 0x9) {
      if (readyState === WS_OPEN) {
        sendFrame(0xa, frame.payload);
      }

      return true;
    }

    if (frame.opcode === 0xa) {
      return true;
    }

    if (frame.opcode === 0x0) {
      if (fragmentedOpcode === null) {
        return false;
      }

      if (fragmentedSize + frame.payload.length > maxMessageSize) {
        sendClose(encodeCloseCode(WS_CLOSE_MESSAGE_TOO_BIG));

        return false;
      }

      fragmentedSize += frame.payload.length;
      fragmentedPayload.push(frame.payload);

      if (frame.fin) {
        const payload = Buffer.concat(fragmentedPayload);
        const opcode = fragmentedOpcode;

        fragmentedOpcode = null;
        fragmentedPayload = [];
        fragmentedSize = 0;

        return emitMessage(opcode, payload);
      }

      return true;
    }

    if (fragmentedOpcode !== null) {
      return false;
    }

    if (frame.fin) {
      return emitMessage(frame.opcode, frame.payload);
    }

    if (frame.payload.length > maxMessageSize) {
      return false;
    }

    fragmentedOpcode = frame.opcode;
    fragmentedPayload = [frame.payload];
    fragmentedSize = frame.payload.length;

    return true;
  };

  /**
   * Parses and dispatches every complete frame currently available in the
   * buffer.
   *
   * Sends the appropriate close frame when a frame violates the WebSocket
   * protocol. Protocol violations default to `1002`; specific violations may
   * carry a different close code through the thrown error.
   */
  const processBuffer = () => {
    /** @type {WebSocketFrame|null} */
    let frame;

    while (readyState !== WS_CLOSED) {
      try {
        frame = parseWebSocketFrame(bufferQueue, maxMessageSize);
      } catch (error) {
        const closeCode =
          error && typeof error === 'object' && 'code' in error && typeof error.code === 'number'
            ? error.code
            : WS_CLOSE_PROTOCOL_ERROR;

        sendClose(encodeCloseCode(closeCode));
        break;
      }

      if (frame === null) {
        break;
      }

      bufferQueue = bufferQueue.subarray(frame.length);

      if (!handleFrame(frame)) {
        if (readyState === WS_OPEN) {
          sendClose(encodeCloseCode(WS_CLOSE_PROTOCOL_ERROR));
        }

        break;
      }
    }
  };

  socket.on('data', chunk => {
    bufferQueue = Buffer.concat([bufferQueue, Buffer.from(chunk)]);
    processBuffer();
  });

  socket.on('close', () => {
    readyState = WS_CLOSED;

    closeListeners.forEach(listener => listener());
  });

  socket.on('error', error => {
    errorListeners.forEach(listener => listener(error));
  });

  if (head && head.length > 0) {
    process.nextTick(() => {
      bufferQueue = Buffer.concat([bufferQueue, head]);
      processBuffer();
    });
  }

  return {
    get readyState() {
      return readyState;
    },

    send(data) {
      if (typeof data === 'string') {
        sendFrame(0x1, Buffer.from(data));
      } else {
        sendFrame(0x2, Buffer.from(data));
      }
    },

    /**
     * Registers a listener for incoming WebSocket messages.
     *
     * @overload
     * @param {'message'} event - Event name.
     * @param {WebSocketMessageListener} listener - Listener invoked for incoming messages.
     * @returns {void}
     */
    /**
     * Registers a listener for WebSocket close events.
     *
     * @overload
     * @param {'close'} event - Event name.
     * @param {WebSocketCloseListener} listener - Listener invoked when the connection closes.
     * @returns {void}
     */
    /**
     * Registers a listener for WebSocket error events.
     *
     * @overload
     * @param {'error'} event - Event name.
     * @param {WebSocketErrorListener} listener - Listener invoked when an error occurs.
     * @returns {void}
     */
    /**
     * Registers a listener for a WebSocket event.
     *
     * @param {'message'|'close'|'error'} event - Event name.
     * @param {WebSocketMessageListener|WebSocketCloseListener|WebSocketErrorListener} listener - Listener invoked for the event.
     * @returns {void}
     */
    on(event, listener) {
      if (event === 'message') {
        messageListeners.push(/** @type {WebSocketMessageListener} */ (listener));
      } else if (event === 'close') {
        closeListeners.push(/** @type {WebSocketCloseListener} */ (listener));
      } else if (event === 'error') {
        errorListeners.push(/** @type {WebSocketErrorListener} */ (listener));
      }
    },

    close() {
      if (readyState === WS_OPEN) {
        sendClose(encodeCloseCode(WS_CLOSE_NORMAL));
      } else {
        socket.end();
      }
    },
  };
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a WebSocket upgrade request for an HTTP/1.1 upgrade.
 *
 * The returned `accept` method performs the RFC 6455 handshake and resolves to
 * an established WebSocket connection. When the client requests subprotocols,
 * the caller may pass a `selectedProtocol` that must be both supported by the
 * server and requested by the client.
 *
 * @param {WebSocketUpgradeRequest} request - HTTP upgrade request.
 * @param {WebSocketSocket} socket - Underlying TCP socket.
 * @param {Buffer} head - Bytes already read during the upgrade.
 * @param {WebSocketUpgradeOptions} [options] - Upgrade options.
 * @returns {WebSocketOpenRequest} WebSocket upgrade request.
 * @example
 * ```js
 * const openRequest = createWebSocketOpenRequest(request, socket, head, {
 *   maxMessageSize: 1024 * 1024,
 *   supportedProtocols: ['chat', 'json'],
 * });
 *
 * openRequest.accept('chat');
 * ```
 */
function createWebSocketOpenRequest(request, socket, head, options = {}) {
  const upgradeHeader = request.headers.upgrade;
  const connectionHeader = request.headers.connection;
  const secWebSocketKey = request.headers['sec-websocket-key'];
  const secWebSocketVersion = request.headers['sec-websocket-version'];
  const secWebSocketProtocol = request.headers['sec-websocket-protocol'];

  const maxMessageSize = options.maxMessageSize ?? DEFAULT_MAX_MESSAGE_SIZE;
  const supportedProtocols = options.supportedProtocols ?? [];

  return {
    url: request.url || '/',
    headers: request.headers,

    accept(selectedProtocol) {
      if (typeof upgradeHeader !== 'string' || upgradeHeader.toLowerCase() !== 'websocket') {
        throw new Error("Missing or invalid 'Upgrade' header for WebSocket handshake.");
      }

      if (typeof connectionHeader !== 'string') {
        throw new Error("Missing 'Connection' header for WebSocket handshake.");
      }

      const connectionTokens = connectionHeader
        .toLowerCase()
        .split(',')
        .map(token => token.trim());

      if (!connectionTokens.includes('upgrade')) {
        throw new Error("Missing 'Upgrade' token in 'Connection' header for WebSocket handshake.");
      }

      if (secWebSocketVersion !== String(WS_VERSION)) {
        throw new Error('Unsupported WebSocket version.');
      }

      if (typeof secWebSocketKey !== 'string' || secWebSocketKey.length === 0) {
        throw new Error("Missing 'Sec-WebSocket-Key' header for WebSocket handshake.");
      }

      if (selectedProtocol) {
        if (!supportedProtocols.includes(selectedProtocol)) {
          throw new Error(`Unsupported WebSocket subprotocol: ${selectedProtocol}.`);
        }

        const clientProtocols =
          typeof secWebSocketProtocol === 'string'
            ? secWebSocketProtocol.split(',').map(protocol => protocol.trim())
            : [];

        if (!clientProtocols.includes(selectedProtocol)) {
          throw new Error(`Client did not request the selected subprotocol: ${selectedProtocol}.`);
        }
      }

      const hash = crypto
        .createHash('sha1')
        .update(secWebSocketKey + WS_MAGIC_STRING)
        .digest('base64');

      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${hash}`,
      ];

      if (selectedProtocol) {
        responseHeaders.push(`Sec-WebSocket-Protocol: ${selectedProtocol}`);
      }

      responseHeaders.push('\r\n');
      socket.write(responseHeaders.join('\r\n'));

      return createWebSocketConnection(socket, head, maxMessageSize);
    },

    reject(code = 400, message = 'Bad Request') {
      socket.write(`HTTP/1.1 ${code} ${message}\r\n\r\n`);
      socket.destroy();
    },
  };
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default createWebSocketOpenRequest;
