# Adamize

A VS Code extension for AI-assisted development with a focus on test-driven development and DevOps best practices.

## Project Overview

Adamize is a VS Code extension that provides AI-assisted development capabilities similar to Augment Code but with specific differences and improvements. The project follows a test-driven development approach with a strong emphasis on DevOps best practices.

## Features

- MCP (Model Context Protocol) client for interacting with AI models
- Context-aware code assistance
- Test-driven development support
- DevOps integration

## Development Environment

This project uses a dedicated DevContainer for development to ensure consistency and isolation from the host system. The DevContainer includes all the necessary tools and dependencies for development.

### Prerequisites

- VS Code
- Docker
- Git

### Setup

1. Clone the repository
2. Open the project in VS Code
3. When prompted, click "Reopen in Container" to start the DevContainer
4. Wait for the container to build and initialize

## Development Workflow

This project follows a strict test-driven development workflow:

1. Define requirements and acceptance criteria
2. Write tests that validate the requirements
3. Implement code to pass the tests
4. Refactor while maintaining test coverage
5. Document the implementation

## Testing

Run tests with:

```bash
npm test
```

Generate coverage report:

```bash
npm run test:coverage
```

## Building

Build the extension with:

```bash
npm run compile
```

Package the extension:

```bash
npm run package
```

## Contributing

Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for contribution guidelines.

## License

[MIT](./LICENSE)
