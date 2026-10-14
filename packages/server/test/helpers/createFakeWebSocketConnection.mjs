// @ts-check
/**
 * @file Contains a fake WebSocketConnection factory for IPC tests.
 *
 * @module test/createFakeWebSocketConnection
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a fake WebSocket connection used to drive IPC tests.
 *
 * @typedef  {object}                                      FakeWebSocketConnection
 * @property {(data: string|Buffer) => void}               send                    - Records an outbound message.
 * @property {(event: string, listener: Function) => void} on                      - Registers a listener.
 * @property {() => void}                                  close                   - Marks the connection as closed and emits `close`.
 * @property {number}                                      readyState              - Current connection state (1 = open, 3 = closed).
 * @property {Map<string, Function[]>}                     _listeners              - Recorded listeners, keyed by event name.
 * @property {string[]}                                    _sent                   - Recorded outbound messages.
 * @property {(event: string, ...args: unknown[]) => void} _emit                   - Dispatches a synthetic event to listeners.
 * @property {boolean}                                     _closed                 - Whether the connection has been closed.
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a fake WebSocket connection for IPC tests.
 *
 * The returned connection records outbound messages, exposes a way to
 * emit events, and tracks its closed state.
 *
 * @returns {FakeWebSocketConnection} The fake connection.
 */
export function createFakeWebSocketConnection() {
  /** @type {Map<string, Function[]>} */
  const listeners = new Map();

  /** @type {string[]} */
  const sent = [];

  let closed = false;

  /**
   * Dispatches a synthetic event to all registered listeners.
   *
   * @param {string} event - Event name.
   * @param {...unknown} args - Arguments passed to each listener.
   */
  function emit(event, ...args) {
    const list = listeners.get(event) ?? [];
    for (const listener of list) {
      listener(...args);
    }
  }

  /** @type {FakeWebSocketConnection} */
  const connection = {
    send(data) {
      sent.push(String(data));
    },
    on(event, listener) {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)?.push(listener);
    },
    close() {
      closed = true;
      emit('close');
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    _listeners: listeners,
    _sent: sent,
    _emit: emit,
    get _closed() {
      return closed;
    },
  };

  return connection;
}
