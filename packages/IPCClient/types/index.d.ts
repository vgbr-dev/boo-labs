/**
 * @file Type definitions for @boo-labs/ipc-client.
 *
 * @description Generated to support TypeScript consumers while keeping the
 * core JS-based.
 *
 * @module IPCClient
 */

// ━━ PRIMITIVE TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an IPC invocation handler registered on the client.
 *
 * The returned value is sent back to the remote invocation requester.
 */
export type IPCClientInvokeHandler = (data: unknown) => unknown | Promise<unknown>;

/**
 * Represents an IPC event listener registered on the client.
 */
export type IPCClientEventListener = (data: unknown) => void;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the public client-side IPC API.
 *
 * Instances communicate with a server-side `IPCMain` instance over WebSocket.
 */
export declare class IPCClient {
  /**
   * Creates an IPC client for a WebSocket endpoint.
   *
   * When no URL is provided, the endpoint is derived from the current browser
   * location using the `/ipc` path.
   *
   * @param url - Absolute WebSocket endpoint URL using `ws:` or `wss:`.
   * @throws {TypeError} If the URL is not a string, cannot be parsed, or is invalid.
   * @throws {RangeError} If the URL is an empty string.
   * @throws {ReferenceError} If no URL is provided and the browser location is unavailable.
   */
  constructor(url?: string);

  /**
   * Indicates whether the local IPC channel has been initialized.
   *
   * It does not guarantee that the underlying WebSocket is still open.
   */
  readonly connected: boolean;

  /**
   * Establishes the WebSocket connection and initializes the IPC channel.
   *
   * Concurrent calls made while a connection attempt is pending share the
   * same promise.
   *
   * @throws {IPCError} If the connection attempt fails.
   */
  connect(): Promise<void>;

  /**
   * Registers a handler for invocation requests received from the server.
   *
   * @param channel - Name of the invocation channel.
   * @param handler - Handler that processes the incoming data.
   * @returns This client instance.
   * @throws {IPCError} If the client is not connected.
   */
  handle(channel: string, handler: IPCClientInvokeHandler): this;

  /**
   * Removes the invocation handler registered for a channel.
   *
   * @param channel - Name of the invocation channel.
   * @returns This client instance.
   * @throws {IPCError} If the client is not connected.
   */
  removeHandler(channel: string): this;

  /**
   * Registers a listener for events received from the server.
   *
   * @param channel - Name of the event channel.
   * @param listener - Listener that processes the incoming data.
   * @returns This client instance.
   * @throws {IPCError} If the client is not connected.
   */
  on(channel: string, listener: IPCClientEventListener): this;

  /**
   * Removes a previously registered event listener.
   *
   * @param channel - Name of the event channel.
   * @param listener - Listener to remove.
   * @returns This client instance.
   * @throws {IPCError} If the client is not connected.
   */
  off(channel: string, listener: IPCClientEventListener): this;

  /**
   * Invokes a handler registered on the remote server.
   *
   * @param channel - Name of the invocation channel.
   * @param data - Data sent to the remote handler.
   * @returns A promise that resolves with the remote handler's result.
   * @throws {IPCError} If the client is not connected.
   */
  invoke(channel: string, data?: unknown): Promise<unknown>;

  /**
   * Sends a one-way event to the remote server.
   *
   * @param channel - Name of the event channel.
   * @param data - Data sent with the event.
   * @throws {IPCError} If the client is not connected.
   */
  send(channel: string, data?: unknown): void;

  /**
   * Closes the IPC channel and the underlying WebSocket connection.
   */
  close(): void;
}
// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default IPCClient;
