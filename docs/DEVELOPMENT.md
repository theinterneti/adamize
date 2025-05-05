# Adamize Development Guide

## Development Environment

Adamize uses a dedicated DevContainer for development to ensure consistency and isolation from the host system. The DevContainer includes all the necessary tools and dependencies for development.

### Prerequisites

- VS Code
- Docker
- Git

### Setup

1. Clone the repository
2. Open the project in VS Code
3. When prompted, click "Reopen in Container" to start the DevContainer
4. Wait for the container to build and initialize

## Project Structure

- `src/` - Source code
  - `extension.ts` - Extension entry point
  - `mcp/` - MCP client implementation
  - `test/` - Test code
- `docs/` - Documentation
- `.devcontainer/` - Development container configuration
- `.github/` - GitHub workflows and templates

## Development Workflow

This project follows a strict test-driven development workflow:

1. Define requirements and acceptance criteria
2. Write tests that validate the requirements
3. Implement code to pass the tests
4. Refactor while maintaining test coverage
5. Document the implementation

### Writing Tests

Tests are written using Mocha and the VS Code Extension Testing API. Tests are located in the `src/test/suite` directory.

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('adamize.adamize'));
  });
});
```

### Running Tests

Run tests with:

```bash
npm test
```

Generate coverage report:

```bash
npm run test:coverage
```

### Building

Build the extension with:

```bash
npm run compile
```

Watch for changes and rebuild automatically:

```bash
npm run watch
```

### Packaging

Package the extension for distribution:

```bash
npm run package
```

## Code Style

This project uses ESLint and Prettier for code style and formatting. The configuration is defined in `.eslintrc.js` and `.prettierrc`.

Format code with:

```bash
npm run format
```

Lint code with:

```bash
npm run lint
```

## Git Workflow

1. Create a feature branch from `main`
2. Make changes and commit with descriptive messages
3. Push the branch to GitHub
4. Create a pull request
5. Wait for CI/CD to pass
6. Get code review and approval
7. Merge the pull request

## Documentation

Documentation is written in Markdown and located in the `docs/` directory. The documentation includes:

- `REQUIREMENTS.md` - Project requirements
- `DEVELOPMENT.md` - Development guide
- `TESTING.md` - Testing guide
- `MCP_CLIENT.md` - MCP client documentation

## CI/CD

This project uses GitHub Actions for CI/CD. The workflows are defined in `.github/workflows/`:

- `ci.yml` - Continuous integration workflow
- `release.yml` - Release workflow

The CI workflow runs on every push and pull request, and includes:

- Building the extension
- Running tests
- Linting code
- Generating coverage report

The release workflow runs when a tag is pushed, and includes:

- Building the extension
- Running tests
- Packaging the extension
- Publishing the extension to the VS Code Marketplace
