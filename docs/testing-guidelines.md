# Testing Guidelines for Adamize

This document outlines the testing guidelines and best practices for the Adamize project to ensure all tests pass CI/CD checks and GitHub Actions.

## Table of Contents

- [Test-Driven Development Workflow](#test-driven-development-workflow)
- [Test Templates](#test-templates)
- [Test Scripts](#test-scripts)
- [CI/CD Compatibility](#cicd-compatibility)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Best Practices](#best-practices)

## Test-Driven Development Workflow

Adamize follows a strict test-driven development (TDD) workflow:

1. **Define Requirements**: Clearly define requirements with REQ-XXX-YYY tags
2. **Write Tests**: Write tests that validate the requirements with TEST-XXX-YYY tags
3. **Run Tests**: Verify that tests fail (Red phase)
4. **Implement Code**: Write the minimum code to make tests pass (Green phase)
5. **Refactor**: Improve code while keeping tests passing (Refactor phase)
6. **Repeat**: Continue with the next requirement

### TDD Commands

- `npm run tdd`: Watch for changes and run tests automatically
- `npm run tdd:mcp`: Focus on MCP client implementation
- `npm run create:test`: Generate a new test file from basic template
- `npm run create:enhanced-test`: Generate a new test file from enhanced template
- `npm run test:unit`: Run Jest unit tests
- `npm run test:unit:watch`: Run Jest tests in watch mode
- `npm run test:coverage`: Generate coverage reports

## Test Templates

We provide two test templates:

### Basic Template

The basic template (`src/test/templates/test.template.ts`) provides a simple structure for tests.

### Enhanced Template

The enhanced template (`src/test/templates/enhanced-test.template.ts`) includes:

- Requirement tags (REQ-XXX-YYY)
- Test tags (TEST-XXX-YYY)
- Proper VS Code API mocking
- Error handling tests
- CI/CD compatibility features

To create a test using the enhanced template:

```bash
npm run create:enhanced-test src/path/to/module [--suite=suite-name] [--req=REQ-PREFIX]
```

Example:

```bash
npm run create:enhanced-test src/mcp/mcpClient --suite=mcp --req=MCP
```

## Test Scripts

### Create Test Scripts

- `scripts/create-test.js`: Creates a test file using the basic template
- `scripts/create-enhanced-test.js`: Creates a test file using the enhanced template

### Update and Check Scripts

- `scripts/update-tests.js`: Updates existing tests to meet CI/CD requirements
- `scripts/check-ci-compatibility.js`: Checks if tests will pass CI/CD checks

To update existing tests:

```bash
npm run update:tests [--path=src/test/suite/path]
```

To check CI compatibility:

```bash
npm run check:ci [--path=src/test/suite/path]
```

## CI/CD Compatibility

Our CI/CD pipeline runs the following checks:

1. **Linting**: ESLint checks for code quality issues
2. **Type Checking**: TypeScript checks for type errors
3. **Unit Tests**: Jest runs unit tests
4. **Coverage**: Ensures code coverage meets thresholds (80% for branches, functions, lines, and statements)
5. **Integration Tests**: Tests that interact with VS Code API

Before creating a PR, run:

```bash
npm run pre:pr
```

This will run linting, type checking, unit tests, and CI compatibility checks.

## Common Issues and Solutions

### ESLint Errors

1. **Using require() without eslint-disable**:
   ```typescript
   // eslint-disable-next-line @typescript-eslint/no-var-requires
   const someModule = require('some-module');
   ```

2. **Using 'as any' without eslint-disable**:
   ```typescript
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);
   ```

3. **Unused variables**:
   ```typescript
   // Prefix with underscore
   function example(_unusedParam: string): void {
     // Implementation
   }
   ```

### Test Coverage Issues

1. **Missing error handling tests**: Add tests for error scenarios
2. **Missing edge case tests**: Add tests for boundary conditions
3. **Uncovered code paths**: Add tests for all code branches

### CI Environment Issues

1. **Hardcoded file paths**: Use relative paths or environment variables
2. **Hardcoded environment variables**: Use configuration or defaults
3. **Docker dependencies**: Skip tests that require Docker in CI environment

## Best Practices

1. **Use descriptive test names**: Tests should clearly describe what they're testing
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies**: Use sinon to mock external dependencies
4. **Restore stubs in teardown**: Always call `sinon.restore()` in teardown
5. **Test error handling**: Always include tests for error scenarios
6. **Link tests to requirements**: Use REQ-XXX-YYY and TEST-XXX-YYY tags
7. **Keep tests isolated**: Tests should not depend on each other
8. **Use CI-compatible approaches**: Avoid dependencies on local environment
9. **Meet coverage thresholds**: Aim for at least 80% coverage
10. **Run pre:pr before creating PRs**: Ensure all checks pass locally before pushing

By following these guidelines, we ensure that our tests are robust, maintainable, and pass all CI/CD checks.
