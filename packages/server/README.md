# @boo-labs/server

A lightweight, zero-dependency HTTP server for Node.js, designed around
modular architecture, explicit configuration, and a predictable request
lifecycle.

`@boo-labs/server` provides a small public API for building HTTP applications
with support for HTTP/1.1, HTTPS, and HTTP/2, along with routing,
middleware composition, lifecycle events, and graceful resource management.

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

const server = new Server(
  new HttpServerConfiguration({
    listen: {
      host: '127.0.0.1',
      port: 3000,
    },
  }),
);

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

An `Exchange` represents a single HTTP transaction. It couples the incoming
request with its outgoing response and exposes shared per-request state,
correlation identifiers, and a cancellation signal.

Exchanges are created by the runtime and passed to middleware and handlers.
Consumers do not construct exchanges.

```js
server.get('/hello', async (exchange) => {
  exchange.response.json({ message: 'Hello, World!' });
});
```

Key properties: `id`, `traceId`, `spanId`, `signal`, `request`, `response`,
and `state` (a mutable plain object for request-scoped data).

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

Unsupported media types raise `RequestError`. When the body exceeds the
configured limit, reading fails with `RequestError` and the connection may
be closed without a normal error response.

The `CONNECT` method is not supported.

### Response

Built progressively by configuring status, headers, and body. Body methods
do not send anything; only `end()` materializes and sends the response.
A response can describe at most one body.

Convenience methods: `json()`, `html()`, `text()`, `send()`, `stream()`,
`redirect()`, `cache()`, `noCache()`, `vary()`.

### Middleware

Middleware functions receive `(exchange, next)` and run in registration
order. They may be registered globally, by pathname, on a route, or on a
router.

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

Supported methods: `get`, `post`, `put`, `patch`, `delete`, `head`,
`trace`, `query`. Routers also support `all()`. `OPTIONS` is handled
automatically.

Pathname patterns support literals, named parameters (`:id` or `{id}`),
and wildcards (`*` / trailing `/*`). Named parameters and wildcards are
used only for matching; captured values are not exposed on the exchange.
To read a path segment, parse `exchange.request.pathname` directly.

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

Common top-level options: `connection`, `listen`, `request`, `response`,
`static`, `cors`, `securityHeaders`, `rateLimit`, `cookie`, `csrf`,
`compress`.

These options enable server features. When enabled, the corresponding
behavior is applied before user-registered middleware.

See the [full API reference](./Docs/BOO_SERVER_API.md) for the complete
option shapes and defaults.

## Lifecycle and Events

```js
await server.listen();
// ...
await server.close();
```

States: `idle` → `starting` → `listening` → `stopping` → `closed` (or `error`).

Events: `listen`, `close`, `error`, `exchange:start`, `exchange:end`,
`exchange:error`. Convenience methods: `onListen()`, `onClose()`,
`onError()`, `onExchangeStart()`, `onExchangeEnd()`, `onExchangeError()`.

`Server` implements `Symbol.asyncDispose` for `await using` when the
runtime supports it.

## IPC

An IPC API over WebSocket at `/ipc`. Supports request-response channels
(`handle` / invoke) and one-way events (`on` / event). Available while the
server is listening via `server.ipc`.

See the [full API reference](./Docs/BOO_SERVER_API.md) for the wire protocol
and handler details.

## Errors

Public APIs throw errors that extend `Error` and expose a stable `code`
property. Error types include `ServerConfigurationError`, `RequestError`,
`ResponseError`, `RouterError`, `PathnamePatternError`, `MiddlewareError`,
`ServerError`, and `IPCError`.

Error codes are documented in the
[project wiki](https://github.com/vgbr-dev/boo-labs/wiki/Errors).

## Documentation

- [Full API reference](./Docs/SERVER_API.md) — complete public API,
  configuration options, response methods, IPC protocol, and more.

## License

Distributed under the MIT License. See the [LICENSE](./LICENSE) file for
details.

## Dedication

This project is named after my sister — "Boo". Her nickname gave this
project its name.
