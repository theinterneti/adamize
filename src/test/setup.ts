/**
 * Jest Test Setup
 *
 * This file is run before each test file to set up the test environment.
 */

// Import Jest types
import '../types/jest.d';

// Mock VS Code API
jest.mock('vscode', () => require('./mocks/vscode'), { virtual: true });

// Set up global test timeout
jest.setTimeout(30000);

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Define Mocha test functions for Jest
interface IGlobal {
  suite: typeof describe;
  test: typeof it;
  suiteSetup: typeof beforeEach;
  suiteTeardown: typeof afterEach;
  setup: typeof beforeEach;
  teardown: typeof afterEach;
}

// Add Mocha-style functions to global scope
(global as unknown as IGlobal).suite = describe;
(global as unknown as IGlobal).test = it;
(global as unknown as IGlobal).suiteSetup = beforeEach;
(global as unknown as IGlobal).suiteTeardown = afterEach;
(global as unknown as IGlobal).setup = beforeEach;
(global as unknown as IGlobal).teardown = afterEach;
