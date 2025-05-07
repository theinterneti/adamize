/**
 * Jest Test Setup
 *
 * This file is run before each test file to set up the test environment.
 */

// Mock VS Code API
jest.mock('vscode', () => require('./mocks/vscode'), { virtual: true });

// Set up global test timeout
jest.setTimeout(30000);

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Define Mocha test functions for Jest
(global as any).suite = describe;
(global as any).test = it;
(global as any).suiteSetup = beforeEach;
(global as any).suiteTeardown = afterEach;
(global as any).setup = beforeEach;
(global as any).teardown = afterEach;
