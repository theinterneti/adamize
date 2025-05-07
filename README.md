# Adamize

[![CI](https://github.com/theinterneti/adamize/actions/workflows/ci.yml/badge.svg)](https://github.com/theinterneti/adamize/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/theinterneti/adamize/branch/main/graph/badge.svg?token=ADAMIZE_CODECOV_API)](https://codecov.io/gh/theinterneti/adamize)

A VS Code extension for AI-assisted development with a focus on test-driven development and DevOps best practices.

## Project Overview

Adamize is a VS Code extension that provides AI-assisted development capabilities similar to Augment Code but with specific differences and improvements. The project follows a test-driven development approach with a strong emphasis on DevOps best practices and integrates with local LLMs through the Model Context Protocol (MCP).

## Features

- **MCP Integration**: Connect to local LLMs through the Model Context Protocol
- **Test-Driven Development**: Assistance for writing tests and implementing code
- **Memory Management**: Store and retrieve development context using Neo4j
- **DevOps Best Practices**: Guidance for following DevOps best practices
- **Customizable**: Configure to match your development workflow

## Installation

### From VS Code Marketplace

*Coming soon*

### From VSIX File

1. Download the latest `.vsix` file from the [Releases](https://github.com/theinterneti/adamize/releases) page
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click on the "..." menu in the top-right corner
5. Select "Install from VSIX..."
6. Choose the downloaded `.vsix` file

### Development Build

1. Clone the repository
2. Open the project in VS Code with DevContainer support
3. Run `npm install`
4. Press F5 to start debugging

## Requirements

- VS Code 1.85.0 or higher
- Node.js 20 or higher (for development)
- Docker (for running MCP servers locally)

## Configuration

Adamize can be configured through VS Code settings:

```json
{
  "adamize.environment": "development",
  "adamize.mcp.enabled": true,
  "adamize.mcp.serverUrl": "http://localhost:8000",
  "adamize.mcp.connectionMethod": "auto"
}
```

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `adamize.environment` | Environment type (development, testing, production) | `"development"` |
| `adamize.mcp.enabled` | Enable MCP client | `true` |
| `adamize.mcp.serverUrl` | MCP server URL | `"http://localhost:8000"` |
| `adamize.mcp.neo4jServerUrl` | Neo4j MCP server URL | `"http://localhost:8001"` |
| `adamize.mcp.connectionMethod` | MCP connection method (http, docker-exec, local-process, auto) | `"auto"` |

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

## Usage

### Connecting to MCP Server

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize: Connect to MCP Server"
3. The extension will connect to the configured MCP server

### Listing Available MCP Tools

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize: List MCP Tools"
3. The extension will display the available tools

### Searching Memory

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize: Search Memory"
3. Enter your search query
4. The extension will display the search results

## Development Workflow

This project follows a strict test-driven development workflow:

1. Define requirements and acceptance criteria with clear requirement tags
2. Write tests that validate the requirements with corresponding test tags
3. Implement code to pass the tests with implementation tags
4. Refactor while maintaining test coverage
5. Document the implementation

### TDD Workflow Commands

- `npm run tdd` - Watch for changes and run tests automatically
- `npm run tdd:mcp` - Focus on MCP client implementation
- `npm run tdd:auto-stage` - Watch for changes and automatically stage passing tests
- `npm run tdd:auto-commit` - Watch for changes and automatically commit passing tests
- `npm run create:test` - Generate a new test file from template
- `npm run test:unit` - Run Jest unit tests
- `npm run test:unit:watch` - Run Jest tests in watch mode
- `npm run test:coverage` - Generate coverage reports
- `npm run identify:green` - Identify and stage passing tests and their implementations
- `npm run identify:green:commit` - Identify, stage, and commit passing tests

### Tagging System

- `REQ-XXX-YYY` - Requirement tags (e.g., REQ-MCP-001)
- `TEST-XXX-YYY` - Test tags (e.g., TEST-MCP-001)
- `IMPL-XXX-YYY` - Implementation tags (e.g., IMPL-MCP-001)

This tagging system ensures traceability between requirements, tests, and implementation code.

## Testing

### Running Tests

Run all tests:

```bash
npm test
```

Run unit tests only:

```bash
npm run test:unit
```

Run unit tests in watch mode:

```bash
npm run test:unit:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

### Test-Driven Development

For test-driven development, use the TDD script:

```bash
npm run tdd
```

For MCP-specific TDD:

```bash
npm run tdd:mcp
```

For TDD with automatic staging of passing tests:

```bash
npm run tdd:auto-stage
```

For TDD with automatic committing of passing tests:

```bash
npm run tdd:auto-commit
```

### Identifying GREEN Code-Test Pairs

To identify and stage passing tests and their implementations:

```bash
npm run identify:green
```

To identify, stage, and commit passing tests:

```bash
npm run identify:green:commit
```

To see what would be staged/committed without actually doing it:

```bash
npm run identify:green:dry
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

## Project Structure

- `src/` - Source code
  - `extension.ts` - Extension entry point
  - `mcp/` - MCP client implementation
    - `mcpClient.ts` - Main MCP client class
    - `mcpTypes.ts` - Type definitions
    - `mcpUtils.ts` - Utility functions
  - `memory/` - Memory client implementation
  - `utils/` - Utility functions
  - `test/` - Test code
    - `suite/` - Test suites
    - `templates/` - Test templates
    - `setup.ts` - Test setup
- `scripts/` - Development scripts
- `.devcontainer/` - Development container configuration
- `.github/` - GitHub workflows and templates

## Contributing

Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for contribution guidelines.

### Git Workflow

- Feature branches for all changes
- Pull requests for code review
- CI/CD pipeline must pass before merging
- Semantic versioning for releases
- Conventional commits for commit messages

## License

[MIT](./LICENSE)
