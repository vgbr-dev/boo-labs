# @boo-labs/ipc-client

A lightweight client for `@boo-labs/server` IPC over WebSocket.

`@boo-labs/ipc-client` provides a small API for invoking remote handlers, sending one-way events, and registering local invocation handlers and event listeners. It communicates with a server-side `IPCMain` instance over WebSocket.

## Features

- **Zero runtime dependencies** — built on the native WebSocket API.
- **Bidirectional IPC** — invoke remote handlers and receive invocations.
- **One-way events** — send and receive events without a response.
- **Request-response correlation** — invocation identifiers are managed automatically.
- **Lifecycle management** — pending invocations are rejected when the connection closes.
- **JavaScript-first implementation** — includes TypeScript declarations for consumers.

## Installation

```bash
npm install @boo-labs/ipc-client
```

## Imports

`@boo-labs/ipc-client` is an ECMAScript module (ESM).

```js
import { IPCClient } from '@boo-labs/ipc-client';
```

TypeScript declarations for the public API are included in the package. The client requires a runtime with a native `WebSocket` implementation.

## Getting Started

```js
import { IPCClient } from '@boo-labs/ipc-client';

const ipc = new IPCClient('wss://api.example.com/ipc');

await ipc.connect();

const user = await ipc.invoke('users:get', { id: '42' });

console.log(user);

ipc.on('users:updated', updatedUser => {
  console.log('Updated:', updatedUser);
});

ipc.send('notifications:subscribe', { userId: '42' });

ipc.close();
```

When no URL is provided, the endpoint is derived from the current browser location using the `/ipc` path. HTTPS pages use `wss:`; other page protocols use `ws:`.

```js
const ipc = new IPCClient();
```

## Concepts

### Client lifecycle

The client starts disconnected. Calling `connect()` establishes the WebSocket connection and initializes the IPC channel. Concurrent calls to `connect()` share the same pending connection attempt.

The `connected` property indicates whether the local IPC channel has been initialized. It does not guarantee that the underlying WebSocket is still open.

When the channel closes, pending invocations are rejected. Calling `close()` is safe when the client is already disconnected.

### Invocation identifiers

Each call to `invoke()` generates a unique identifier. The client tracks pending invocations by identifier and resolves the corresponding promise when a response is received.

If an invocation fails, its promise is rejected. Pending invocations are also rejected when the IPC connection closes before their responses are received.

### Client-side handlers

A client can register handlers for invocation requests received from the server. The handler's return value is sent back to the remote caller.

```js
ipc.handle('health:check', () => ({ status: 'ok' }));
```

### Client-side listeners

A client can register listeners for events received from the server. Listener failures are isolated so that one listener cannot prevent the remaining listeners from being invoked.

```js
ipc.on('notifications:new', notification => {
  console.log(notification);
});
```

## API Reference

### `IPCClient`

Creates a client for a WebSocket endpoint.

```js
new IPCClient(url);
```

**Arguments:**

| Name  | Type     | Description                                                      |
|-------|----------|------------------------------------------------------------------|
| `url` | `string` | Absolute WebSocket endpoint URL using `ws:` or `wss:`. Optional. |

**Throws:**

| Type             | Description                                                          |
|------------------|----------------------------------------------------------------------|
| `TypeError`      | The URL is not a string, cannot be parsed, or is invalid.            |
| `RangeError`     | The URL is an empty string.                                          |
| `ReferenceError` | No URL is provided and the browser location is unavailable.          |

**Example:**

```js
const ipc = new IPCClient('wss://api.example.com/ipc');
```

### Properties

| Property    | Type      | Description                                                 |
|-------------|-----------|-------------------------------------------------------------|
| `connected` | `boolean` | Whether the local IPC channel has been initialized.         |

### Methods

#### `client.connect()`

Establishes the WebSocket connection and initializes the IPC channel. Concurrent calls share the same pending connection attempt.

**Returns:**

`Promise<void>`

**Throws:**

| Type       | Description                              |
|------------|------------------------------------------|
| `IPCError` | The connection attempt fails.            |

**Example:**

```js
await ipc.connect();
```

#### `client.handle(channel, handler)`

Registers a handler for invocation requests received from the server.

**Arguments:**

| Name      | Type                     | Description                                |
|-----------|--------------------------|--------------------------------------------|
| `channel` | `string`                 | Name of the invocation channel.            |
| `handler` | `IPCClientInvokeHandler` | Function that processes incoming data.     |

**Returns:**

`this`

**Throws:**

| Type       | Description                          |
|------------|--------------------------------------|
| `IPCError` | The client is not connected.         |

**Example:**

```js
ipc.handle('health:check', () => ({ status: 'ok' }));
```

#### `client.removeHandler(channel)`

Removes the invocation handler registered for a channel.

**Arguments:**

| Name      | Type     | Description                       |
|-----------|----------|-----------------------------------|
| `channel` | `string` | Name of the invocation channel.   |

**Returns:**

`this`

**Throws:**

| Type       | Description                          |
|------------|--------------------------------------|
| `IPCError` | The client is not connected.         |

#### `client.on(channel, listener)`

Registers a listener for events received from the server.

**Arguments:**

| Name       | Type                     | Description                            |
|------------|--------------------------|----------------------------------------|
| `channel`  | `string`                 | Name of the event channel.             |
| `listener` | `IPCClientEventListener` | Function that processes incoming data. |

**Returns:**

`this`

**Throws:**

| Type       | Description                          |
|------------|--------------------------------------|
| `IPCError` | The client is not connected.         |

**Example:**

```js
ipc.on('notifications:new', notification => {
  console.log(notification);
});
```

#### `client.off(channel, listener)`

Removes a previously registered event listener.

**Arguments:**

| Name       | Type                     | Description                       |
|------------|--------------------------|-----------------------------------|
| `channel`  | `string`                 | Name of the event channel.        |
| `listener` | `IPCClientEventListener` | Listener to remove.               |

**Returns:**

`this`

**Throws:**

| Type       | Description                          |
|------------|--------------------------------------|
| `IPCError` | The client is not connected.         |

#### `client.invoke(channel, data)`

Invokes a handler registered on the remote server.

**Arguments:**

| Name      | Type      | Description                       |
|-----------|-----------|-----------------------------------|
| `channel` | `string`  | Name of the invocation channel.   |
| `data`    | `unknown` | Data sent to the remote handler.  |

**Returns:**

`Promise<unknown>`

**Throws and rejections:**

| Type       | Description                                                   |
|------------|---------------------------------------------------------------|
| `IPCError` | The client is not connected or the invocation cannot proceed. |
| `IPCError` | The remote invocation fails and the error is propagated.      |

**Example:**

```js
try {
  const user = await ipc.invoke('users:get', { id: '42' });
  console.log(user);
} catch (error) {
  console.error(error);
}
```

#### `client.send(channel, data)`

Sends a one-way event to the remote server.

**Arguments:**

| Name      | Type      | Description                      |
|-----------|-----------|----------------------------------|
| `channel` | `string`  | Name of the event channel.       |
| `data`    | `unknown` | Data sent with the event.        |

**Returns:**

`void`

**Throws:**

| Type       | Description                          |
|------------|--------------------------------------|
| `IPCError` | The client is not connected.         |

**Example:**

```js
ipc.send('notifications:subscribe', { userId: '42' });
```

#### `client.close()`

Closes the IPC channel and the underlying WebSocket connection.

Safe to call when the client is already disconnected.

**Returns:**

`void`

**Example:**

```js
ipc.close();
```

## Errors

Public APIs may throw `IPCError` instances with a stable, machine-readable `code` property. Methods returning promises can also reject with `IPCError` instances when an asynchronous operation fails.

```js
try {
  await ipc.invoke('users:get', { id: '42' });
} catch (error) {
  console.error(error);
}
```

Inspect the `code` property when handling known IPC errors.

### Error codes

| Code                    | Condition                                                   |
|-------------------------|-------------------------------------------------------------|
| `IPC_INVALID_CHANNEL`   | The channel name is not a non-empty string.                 |
| `IPC_INVALID_HANDLER`   | The handler is not a function.                              |
| `IPC_INVALID_LISTENER`  | The listener is not a function.                             |
| `IPC_CLOSED`            | The IPC subsystem has been closed.                          |
| `IPC_CHANNEL_NOT_FOUND` | No handler is registered for the requested channel.         |
| `IPC_CONNECTION_ERROR`  | The IPC connection is no longer usable.                     |
| `IPC_CONNECTION_FAILED` | The IPC connection could not be established.                |
| `IPC_NOT_CONNECTED`     | The IPC client is not connected.                            |

## Documentation

See the [project wiki](https://github.com/vgbr-dev/boo-labs/wiki) for guides, concepts, and the full API reference.

## License

Distributed under the MIT License. See the [LICENSE](./LICENSE) file for details.
