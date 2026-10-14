// @ts-check
/**
 * @file Defines the server event system.
 *
 * @description Provides the event bus used by the application runtime to
 * register listeners and emit server lifecycle and exchange events.
 *
 * @module EventSystem
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import EventEmitter from 'node:events';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Identifies an event by its string or symbol name.
 *
 * @typedef {string|symbol} EventName
 */

/**
 * Represents a listener registered for a kernel event.
 *
 * @typedef {(data?: any) => void} EventListener
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Provides event management for the server runtime.
 *
 * @classdesc EventSystem encapsulates the underlying event emitter and exposes
 * the event operations required by the application layer.
 */
class EventSystem {
  #events = new EventEmitter();

  /**
   * Registers a listener for a server event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Function invoked when the event is emitted.
   * @returns {EventSystem} The current event system instance.
   * @example
   * ```js
   * eventSystem.on('listen', ({ endpoint }) => {
   *   console.log(`Server listening at ${endpoint}`);
   * });
   * ```
   */
  on(event, listener) {
    this.#events.on(event, listener);

    return this;
  }

  /**
   * Registers a listener that is invoked only once for a server event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Function invoked when the event is emitted.
   * @returns {EventSystem} The current event system instance.
   * @example
   * ```js
   * eventSystem.once('close', () => {
   *   console.log('Server closed');
   * });
   * ```
   */
  once(event, listener) {
    this.#events.once(event, listener);

    return this;
  }

  /**
   * Removes a listener from a server event.
   *
   * @param {EventName} event - Event name.
   * @param {EventListener} listener - Listener to remove.
   * @returns {EventSystem} The current event system instance.
   * @example
   * ```js
   * eventSystem.off('error', handleError);
   * ```
   */
  off(event, listener) {
    this.#events.off(event, listener);

    return this;
  }

  /**
   * Emits a server event.
   *
   * @param {EventName} event - Event name.
   * @param {unknown} [eventData] - Optional data associated with the event.
   * @returns {boolean} True if the event had listeners, false otherwise.
   * @example
   * ```js
   * eventSystem.emit('exchange', exchange);
   * ```
   */
  emit(event, eventData) {
    return this.#events.emit(event, eventData);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default EventSystem;
