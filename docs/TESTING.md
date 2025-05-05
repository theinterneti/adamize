# Adamize Testing Guide

## Testing Philosophy

Adamize follows a test-driven development (TDD) approach, where tests are written before implementation. This ensures that:

1. Requirements are clearly understood before implementation
2. Code is designed to be testable
3. All code is covered by tests
4. Regressions are caught early

## Testing Frameworks

Adamize uses the following testing frameworks:

- **Mocha**: For running tests
- **VS Code Extension Testing API**: For testing VS Code extensions
- **Jest**: For unit testing and code coverage
- **Sinon**: For mocking and stubbing

## Types of Tests

### Unit Tests

Unit tests test individual functions and classes in isolation. They are located in the `src/test/suite` directory and have the `.test.ts` extension.

Example:

```typescript
import * as assert from 'assert';
import { MCPClient } from '../../mcp/mcpClient';

suite('MCP Client Test Suite', () => {
  test('connect() should return true when server is available', async () => {
    // Arrange
    const client = new MCPClient('http://localhost:8000');
    
    // Act
    const result = await client.connect();
    
    // Assert
    assert.strictEqual(result, true);
  });
});
```

### Integration Tests

Integration tests test how different parts of the system work together. They are located in the `src/test/suite` directory and have the `.test.ts` extension.

Example:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Test Suite', () => {
  test('Extension should register commands', async () => {
    // Get all registered commands
    const commands = await vscode.commands.getCommands();
    
    // Check if our commands are registered
    assert.ok(commands.includes('adamize.showWelcome'));
  });
});
```

### End-to-End Tests

End-to-end tests test the entire system from the user's perspective. They are located in the `src/test/e2e` directory and have the `.test.ts` extension.

Example:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('End-to-End Test Suite', () => {
  test('Should show welcome message', async () => {
    // Execute the command
    await vscode.commands.executeCommand('adamize.showWelcome');
    
    // Check if the message was shown
    // This would require a custom test helper to check for notifications
  });
});
```

## Running Tests

### Running All Tests

```bash
npm test
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

### Running Specific Tests

```bash
npm test -- --grep "MCP Client"
```

## Test Coverage

Adamize aims for 100% test coverage for core functionality. Coverage reports are generated using Jest and can be viewed in the `coverage` directory.

To view the coverage report:

1. Run `npm run test:coverage`
2. Open `coverage/lcov-report/index.html` in a browser

## Writing Good Tests

### Test Structure

Tests should follow the Arrange-Act-Assert (AAA) pattern:

1. **Arrange**: Set up the test environment and inputs
2. **Act**: Execute the code being tested
3. **Assert**: Verify the results

### Test Naming

Test names should clearly describe what is being tested and the expected outcome:

```typescript
test('connect() should return true when server is available', async () => {
  // ...
});
```

### Test Independence

Tests should be independent of each other and should not rely on the state of other tests. Each test should set up its own environment and clean up after itself.

### Mocking and Stubbing

Use Sinon to mock external dependencies:

```typescript
import * as sinon from 'sinon';
import axios from 'axios';

suite('MCP Client Test Suite', () => {
  let axiosGetStub: sinon.SinonStub;
  
  setup(() => {
    // Stub axios methods
    axiosGetStub = sinon.stub(axios, 'get');
  });
  
  teardown(() => {
    // Restore stubs
    axiosGetStub.restore();
  });
  
  test('connect() should return true when server is available', async () => {
    // Arrange
    axiosGetStub.resolves({ status: 200, data: {} });
    const client = new MCPClient('http://localhost:8000');
    
    // Act
    const result = await client.connect();
    
    // Assert
    assert.strictEqual(result, true);
  });
});
```

## Continuous Integration

Tests are run automatically on every push and pull request using GitHub Actions. The CI workflow is defined in `.github/workflows/ci.yml`.
