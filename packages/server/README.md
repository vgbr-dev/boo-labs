# @boo-labs/server

A lightweight, zero-dependency HTTP server for Node.js, designed around modular architecture, explicit configuration, and a predictable request lifecycle.

`@boo-labs/server` provides a small public API for building HTTP applications with support for HTTP/1.1, HTTPS, and HTTP/2, along with routing, middleware composition, lifecycle events, and graceful resource management.

## Features

- **Zero runtime dependencies** — built on Node.js native APIs.
- **Multiple transports** — HTTP, HTTPS, HTTP/2 cleartext, and secure HTTP/2.
- **Composable routing** — organize endpoints with reusable routers.
- **Middleware pipeline** — process requests through ordered middleware.
- **Lifecycle events** — observe server and request-exchange activity.
- **Explicit resource management** — supports asynchronous disposal.
- **JavaScript-first implementation** — includes TypeScript declarations for consumers.

## Installation

```bash
npm install @boo-labs/server
```

## Imports

`@boo-labs/server` is an ECMAScript module (ESM).

```js
import Server, {
  Router,
  HttpServerConfiguration,
  HttpsServerConfiguration,
  Http2CleartextServerConfiguration,
  Http2SecureServerConfiguration,
} from '@boo-labs/server';
```

TypeScript declarations for the public API are included in the package.

## Getting Started

```js
import Server, { HttpServerConfiguration } from '@boo-labs/server';

const configuration = new HttpServerConfiguration({
  listen: {
    host: '127.0.0.1',
    port: 3000,
  },
});

const server = new Server(configuration);

server.get('/hello', (exchange) => {
  exchange.response.json({ message: 'Hello, World!' });
});

server.onListen(({ endpoint }) => {
  console.log(`Server listening on ${endpoint.displayUrl}`);
});

server.onError((error) => {
  console.error('Server error:', error);
});

await server.listen();
```

## Concepts

### Exchange

An `Exchange` represents a single HTTP transaction. It couples the incoming request with its outgoing response and exposes shared per-request state, correlation identifiers, and a cancellation signal.

Exchanges are created by the runtime and passed to middleware and handlers. Consumers do not construct exchanges.

```js
server.get('/hello', async (exchange) => {
  exchange.response.json({ message: 'Hello, World!' });
});
```

Key properties:

| Property    | Type                      | Description                              |
|-------------|---------------------------|------------------------------------------|
| `id`        | `string`                  | Unique identifier for the exchange.      |
| `traceId`   | `string`                  | W3C trace identifier.                    |
| `spanId`    | `string`                  | W3C span identifier.                     |
| `signal`    | `AbortSignal`             | Cancellation signal for the exchange.    |
| `request`   | `Request`                 | Incoming request.                        |
| `response`  | `Response`                | Outgoing response.                       |
| `state`     | `Record<string, unknown>` | Mutable per-request state.               |

### Request

A transport-independent view of the incoming message. Exposes normalized
metadata and lazy body access via `request.body()`.

Supported media types for `body()`:

| Media type                          | Result                          |
|-------------------------------------|---------------------------------|
| `application/json`                  | Parsed JSON value               |
| `application/*+json`                | Parsed JSON value               |
| `application/x-www-form-urlencoded` | Parsed key/value object         |
| `multipart/form-data`               | Parsed multipart representation |

Unsupported media types raise `RequestError`. When the body exceeds the configured limit, reading fails with `RequestError` and the connection may be closed without a normal error response.

The `CONNECT` method is not supported.

### Response

Built progressively by configuring status, headers, and body. Body methods do not send anything; only `end()` materializes and sends the response. A response can describe at most one body.

Convenience methods:

| Method       | Purpose                                          |
|--------------|--------------------------------------------------|
| `json()`     | Serializes a value as JSON.                      |
| `html()`     | Sends an HTML body.                              |
| `text()`     | Sends a plain-text body.                         |
| `send()`     | Sends a string or binary body.                   |
| `stream()`   | Streams a readable body.                         |
| `redirect()` | Sends a redirect response.                       |
| `cache()`    | Sets a public cache lifetime.                    |
| `noCache()`  | Disables caching.                                |
| `vary()`     | Adds fields to the `Vary` header.                |

### Middleware

Middleware functions receive `(exchange, next)` and run in registration order. They may be registered globally, by pathname, on a route, or on a router.

```js
server.use(async (exchange, next) => {
  // before
  await next();
  // after
});
```

### Not Found and System Error Handling

- `server.notFound(handler)` — when no route matches (default: `404` JSON).
- `server.systemError(handler)` — when an error propagates (default: `500` JSON).

## Routing

Routes associate an HTTP method and a pathname pattern with middleware.

Supported methods:

| Method     | Server | Router |
|------------|--------|--------|
| `get()`    | ✅     | ✅     |
| `post()`   | ✅     | ✅     |
| `put()`    | ✅     | ✅     |
| `patch()`  | ✅     | ✅     |
| `delete()` | ✅     | ✅     |
| `head()`   | ✅     | ✅     |
| `trace()`  | ✅     | ✅     |
| `query()`  | ✅     | ✅     |
| `all()`    | ❌     | ✅     |

**Note:** `OPTIONS` is handled automatically and does not require a dedicated registration method.

Pathname patterns support literals, named parameters (`:id` or `{id}`), and wildcards (`*` / trailing `/*`).

Named parameters and wildcards are used only for matching; captured values are not exposed on the exchange. To read a path segment, parse `exchange.request.pathname` directly.

```js
const api = new Router();
api.get('/users', listUsers);
server.mount('/api', api);
// Available at /api/users
```

## Server Configuration

Four configuration classes fix the transport:

| Class                               | Protocol | Transport |
|-------------------------------------|----------|-----------|
| `HttpServerConfiguration`           | `http`   | `h1`      |
| `HttpsServerConfiguration`          | `https`  | `h1s`     |
| `Http2CleartextServerConfiguration` | `http`   | `h2c`     |
| `Http2SecureServerConfiguration`    | `https`  | `h2`      |

Common top-level options:

| Option            | Purpose                                       |
|-------------------|-----------------------------------------------|
| `connection`      | Transport-specific Node.js server options.    |
| `listen`          | Host, port, and backlog for binding.          |
| `request`         | Request parsing and proxy trust.              |
| `response`        | Response shaping (ETag, charset).             |
| `static`          | Static file serving.                          |
| `cors`            | Cross-Origin Resource Sharing.                |
| `securityHeaders` | HTTP security response headers.               |
| `rateLimit`       | Request rate limiting.                        |
| `cookie`          | Cookie parsing and cookie-backed sessions.    |
| `csrf`            | CSRF protection.                              |
| `compress`        | Response compression.                         |

These options enable server features. When enabled, the corresponding behavior is applied before user-registered middleware.

See the [full API reference](https://github.com/vgbr-dev/boo-labs/wiki) for the complete option shapes and defaults.

## Lifecycle and Events

```js
await server.listen();
// ...
await server.close();
```

States:

| State       | Description                                          |
|-------------|------------------------------------------------------|
| `idle`      | Initial state. The server has not started.           |
| `starting`  | The server is starting up.                           |
| `listening` | The server is accepting connections.                 |
| `stopping`  | The server is shutting down.                         |
| `closed`    | The server has closed.                               |
| `error`     | The server encountered an error and cannot continue. |

Events:

| Event            | Convenience method    | Description                      |
|------------------|-----------------------|----------------------------------|
| `listen`         | `onListen()`          | The server started listening.    |
| `close`          | `onClose()`           | The server has closed.           |
| `error`          | `onError()`           | A server error occurred.         |
| `exchange:start` | `onExchangeStart()`   | An exchange began processing.    |
| `exchange:end`   | `onExchangeEnd()`     | An exchange ended.               |
| `exchange:error` | `onExchangeError()`   | An exchange failed.              |

`Server` implements `Symbol.asyncDispose` for `await using` when the runtime supports it.

## IPC

An IPC API over WebSocket at `/ipc`. Supports request-response channels (`handle` / invoke) and one-way events (`on` / event). Available while the
server is listening via `server.ipc`.

```js
await server.listen();

server.ipc.handle('users:get', async (id) => {
  return usersRepository.findById(id);
});

server.ipc.on('analytics:event', (event) => {
  analytics.record(event);
});
```

See the [full API reference](https://github.com/vgbr-dev/boo-labs/wiki) for the wire protocol and handler details.

## Errors

Public APIs throw errors that extend `Error` and expose a stable `code`
property.

| Error                      | Domain                                       |
|----------------------------|----------------------------------------------|
| `ServerConfigurationError` | Server configuration validation.             |
| `RequestError`             | Incoming request processing.                 |
| `ResponseError`            | Outgoing response construction.              |
| `RouterError`              | Router route registration.                   |
| `PathnamePatternError`     | Pathname pattern validation.                 |
| `MiddlewareError`          | Middleware validation.                       |
| `ServerError`              | Server lifecycle and state transitions.      |
| `IPCError`                 | IPC operations.                              |

Error codes are documented in the [project wiki](https://github.com/vgbr-dev/boo-labs/wiki/Errors).

## Documentation

- [Full API reference](https://github.com/vgbr-dev/boo-labs/wiki) — complete public API, configuration options, response methods, IPC protocol, and more.

## License

Distributed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Dedication

This project is named after my sister — "Boo". Her nickname gave this project its name.
