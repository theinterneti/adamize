# Contributing to Adamize

Thank you for your interest in contributing to Adamize! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) to foster an inclusive and respectful community.

## Development Workflow

This project follows a test-driven development (TDD) workflow:

1. **Define Requirements**: Clearly define what you want to implement or fix.
2. **Write Tests**: Write tests that validate the requirements.
3. **Implement Code**: Write code to pass the tests.
4. **Refactor**: Improve the code while maintaining test coverage.
5. **Document**: Update documentation to reflect changes.

## Git Workflow

### Branch Naming Convention

Use the following format for branch names:

- `feature/short-description` - For new features
- `bugfix/short-description` - For bug fixes
- `hotfix/short-description` - For critical fixes
- `release/version` - For release preparation
- `docs/short-description` - For documentation updates
- `refactor/short-description` - For code refactoring
- `test/short-description` - For test improvements
- `ci/short-description` - For CI/CD improvements

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or fixing tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files

### Pull Requests

1. Create a new branch from `main`
2. Make your changes
3. Run tests and ensure they pass
4. Push your branch and create a pull request
5. Fill out the pull request template
6. Wait for review and address any feedback

## Development Environment

### Prerequisites

- VS Code
- Docker
- Git

### Setup

1. Clone the repository
2. Open the project in VS Code
3. When prompted, click "Reopen in Container" to start the DevContainer
4. Wait for the container to build and initialize

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Building the Extension

```bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package the extension
npm run package
```

## Code Standards

- Use TypeScript for all code
- Follow the ESLint and Prettier configurations
- Maintain 100% test coverage for core functionality
- Document all public APIs
- Follow the project's architectural patterns

## Documentation

- Update README.md for user-facing changes
- Update API documentation for code changes
- Add examples for new features
- Keep documentation up-to-date with code

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a release branch (`release/x.y.z`)
4. Create a pull request to `main`
5. After merging, tag the release (`vx.y.z`)
6. Push the tag to trigger the release workflow

## Getting Help

If you have questions or need help, please:
- Open an issue
- Reach out to the maintainers

Thank you for contributing to Adamize!
