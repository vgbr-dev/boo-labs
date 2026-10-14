# boo-labs

A collection of zero-dependency JavaScript packages for building server-side and client-side applications with Node.js and WebSocket-based communication.

## Packages

| Package                                             | Description                                                                                   |
|-----------------------------------------------------|-----------------------------------------------------------------------------------------------|
| [`@boo-labs/server`](./packages/server)             | A zero-dependency HTTP server for Node.js with routing, middleware, and built-in IPC support. |
| [`@boo-labs/ipc-renderer`](./packages/ipc-renderer) | Client-side IPC communication with a `@boo-labs/server` instance.                             |

## Requirements

- Node.js 22 or later.

Individual packages may have additional requirements.

## Installation

Install the packages you need independently:

```bash
npm install @boo-labs/server
```

```bash
npm install @boo-labs/ipc-renderer
```

See each package's README for installation instructions, usage examples, and API documentation.

## Development

This repository uses npm workspaces to manage the packages in a single repository.

Install dependencies and link the workspaces:

```bash
npm install
```

Run the available repository scripts with:

```bash
npm run
```

## Links

- [Repository](https://github.com/vgbr-dev/boo-labs)
- [Issues](https://github.com/vgbr-dev/boo-labs/issues)
- [Wiki](https://github.com/vgbr-dev/boo-labs/wiki)

## License

Distributed under the MIT License. See the [LICENSE](./LICENSE) file for details.
