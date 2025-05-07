/**
 * MCP Client Tests
 *
 * Tests for the MCP client implementation.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import axios from 'axios';
import * as vscode from 'vscode';
import { MCPClient } from '../../../mcp/mcpClient';
// Commented out unused imports
// import { IMCPFunctionCallResult, IMCPFunctionSchema, IMCPToolSchema } from '../../../mcp/mcpTypes';

suite('MCP Client Test Suite', () => {
  // Stubs
  let axiosGetStub: sinon.SinonStub;
  let axiosPostStub: sinon.SinonStub;
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;
  let client: MCPClient;

  // Setup before each test
  setup(() => {
    // Stub axios methods
    axiosGetStub = sinon.stub(axios, 'get');
    axiosPostStub = sinon.stub(axios, 'post');

    // Stub VS Code output channel
    outputChannelStub = {
      name: 'Adamize MCP Client',
      append: sinon.stub(),
      appendLine: sinon.stub(),
      clear: sinon.stub(),
      show: sinon.stub(),
      hide: sinon.stub(),
      dispose: sinon.stub(),
      replace: sinon.stub()
    } as sinon.SinonStubbedInstance<vscode.OutputChannel>;

    // Stub VS Code window.createOutputChannel
    // Using 'as any' is necessary here due to the complex VS Code API types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);

    // Create client instance
    client = new MCPClient('http://localhost:8000');
  });

  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  // Connection Tests

  // TEST-MCP-001: Test that the client can connect to an MCP server successfully
  test('connect() should return true when server is available', async () => {
    // Arrange
    axiosGetStub.resolves({ status: 200, data: {} });

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, true);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(axiosGetStub.firstCall.args[0], 'http://localhost:8000/connection');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // TEST-MCP-001a: Test that the client handles connection errors gracefully
  test('connect() should return false when server is not available', async () => {
    // Arrange
    axiosGetStub.rejects(new Error('Connection refused'));

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, false);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Tool Discovery Tests

  // TEST-MCP-002: Test that the client can discover available tools from the MCP server
  test('getTools() should return list of tools', async () => {
    // Arrange
    const mockTools = [
      { name: 'tool1', description: 'Tool 1', version: '1.0.0', functions: [] },
      { name: 'tool2', description: 'Tool 2', version: '1.0.0', functions: [] }
    ];
    axiosGetStub.resolves({ status: 200, data: mockTools });

    // Act
    const result = await client.getTools();

    // Assert
    assert.deepStrictEqual(result, ['tool1', 'tool2']);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(axiosGetStub.firstCall.args[0], 'http://localhost:8000/tools');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // TEST-MCP-002a: Test that the client handles tool discovery errors gracefully
  test('getTools() should return empty array when server returns error', async () => {
    // Arrange
    axiosGetStub.rejects(new Error('Server error'));

    // Act
    const result = await client.getTools();

    // Assert
    assert.deepStrictEqual(result, []);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Tool Schema Tests

  // TEST-MCP-003: Test that the client can retrieve the schema for a specific tool
  test('getToolSchema() should return tool schema', async () => {
    // Arrange
    const mockSchema = {
      name: 'tool1',
      description: 'Tool 1',
      version: '1.0.0',
      functions: [
        {
          name: 'function1',
          description: 'Function 1',
          parameters: [],
          returnType: 'string'
        }
      ]
    };
    axiosGetStub.resolves({ status: 200, data: mockSchema });

    // Act
    const result = await client.getToolSchema('tool1');

    // Assert
    assert.deepStrictEqual(result, mockSchema);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(axiosGetStub.firstCall.args[0], 'http://localhost:8000/tools/tool1');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // TEST-MCP-003a: Test that the client handles schema retrieval errors gracefully
  test('getToolSchema() should return null when server returns error', async () => {
    // Arrange
    axiosGetStub.rejects(new Error('Server error'));

    // Act
    const result = await client.getToolSchema('tool1');

    // Assert
    assert.strictEqual(result, null);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Function Calling Tests

  // TEST-MCP-010: Test that the client can call functions on tools with parameters
  test('callFunction() should call function and return result', async () => {
    // Arrange
    const mockSchema = {
      name: 'tool1',
      description: 'Tool 1',
      version: '1.0.0',
      functions: [
        {
          name: 'function1',
          description: 'Function 1',
          parameters: [],
          returnType: 'string'
        }
      ]
    };
    const mockResult = {
      status: 'success',
      result: 'Function result'
    };
    axiosGetStub.resolves({ status: 200, data: mockSchema });
    axiosPostStub.resolves({ status: 200, data: mockResult });

    // Act
    const result = await client.callFunction('tool1', 'function1', {});

    // Assert
    assert.deepStrictEqual(result, mockResult);
    assert.strictEqual(axiosPostStub.calledOnce, true);
    assert.strictEqual(axiosPostStub.firstCall.args[0], 'http://localhost:8000/call');
    assert.deepStrictEqual(axiosPostStub.firstCall.args[1], {
      tool: 'tool1',
      function: 'function1',
      parameters: {}
    });
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // TEST-MCP-011: Test that the client validates parameters against the function schema
  test('callFunction() should validate parameters against function schema', async () => {
    // Arrange
    const mockSchema = {
      name: 'tool1',
      description: 'Tool 1',
      version: '1.0.0',
      functions: [
        {
          name: 'function1',
          description: 'Function 1',
          parameters: [
            {
              name: 'param1',
              description: 'Parameter 1',
              type: 'string',
              required: true
            },
            {
              name: 'param2',
              description: 'Parameter 2',
              type: 'number',
              required: false
            }
          ],
          returnType: 'string'
        }
      ]
    };
    const mockResult = {
      status: 'success',
      result: 'Function result'
    };

    // Mock the getToolSchema method to return the mock schema
    axiosGetStub.resolves({ status: 200, data: mockSchema });
    axiosPostStub.resolves({ status: 200, data: mockResult });

    // Valid parameters
    const validParams = {
      param1: 'test',
      param2: 42
    };

    // Act
    const result = await client.callFunction('tool1', 'function1', validParams);

    // Assert
    assert.deepStrictEqual(result, mockResult);
    assert.strictEqual(axiosPostStub.calledOnce, true);
    assert.strictEqual(outputChannelStub.appendLine.called, true);

    // Check that the parameters were validated
    const appendLineCalls = outputChannelStub.appendLine.getCalls();
    const validationSuccessLog = appendLineCalls.find(call =>
      call.args[0].includes('Parameters validated successfully'));
    assert.ok(validationSuccessLog, 'Should log successful parameter validation');
  });

  // TEST-MCP-011a: Test that the client rejects invalid parameters
  test('callFunction() should reject invalid parameters', async () => {
    // Arrange
    const mockSchema = {
      name: 'tool1',
      description: 'Tool 1',
      version: '1.0.0',
      functions: [
        {
          name: 'function1',
          description: 'Function 1',
          parameters: [
            {
              name: 'param1',
              description: 'Parameter 1',
              type: 'string',
              required: true
            }
          ],
          returnType: 'string'
        }
      ]
    };

    // Mock the getToolSchema method to return the mock schema
    axiosGetStub.resolves({ status: 200, data: mockSchema });

    // Invalid parameters (missing required param1)
    const invalidParams = {};

    // Act
    const result = await client.callFunction('tool1', 'function1', invalidParams);

    // Assert
    assert.strictEqual(result.status, 'error');
    assert.ok(result.error?.includes('Missing required parameter: param1'),
      'Error message should indicate missing required parameter');
    assert.strictEqual(axiosPostStub.called, false, 'Should not call the API with invalid parameters');

    // Check that the validation error was logged
    const appendLineCalls = outputChannelStub.appendLine.getCalls();
    const validationErrorLog = appendLineCalls.find(call =>
      call.args[0].includes('Parameter validation failed'));
    assert.ok(validationErrorLog, 'Should log parameter validation failure');
  });

  // TEST-MCP-012: Test that the client handles successful function call responses
  test('callFunction() should handle successful responses', async () => {
    // Arrange
    const mockSchema = {
      name: 'tool1',
      description: 'Tool 1',
      version: '1.0.0',
      functions: [
        {
          name: 'function1',
          description: 'Function 1',
          parameters: [],
          returnType: 'object'
        }
      ]
    };

    // Mock successful response with complex data
    const mockResult = {
      status: 'success',
      result: {
        id: '12345',
        data: {
          name: 'Test Data',
          values: [1, 2, 3, 4, 5],
          metadata: {
            created: '2023-01-01T00:00:00Z',
            modified: '2023-01-02T00:00:00Z'
          }
        }
      }
    };

    axiosGetStub.resolves({ status: 200, data: mockSchema });
    axiosPostStub.resolves({ status: 200, data: mockResult });

    // Act
    const result = await client.callFunction('tool1', 'function1', {});

    // Assert
    assert.deepStrictEqual(result, mockResult);
    assert.strictEqual(result.status, 'success');
    assert.ok(result.result, 'Result should be present');
    assert.strictEqual(result.result.id, '12345');
    assert.strictEqual(result.result.data.name, 'Test Data');
    assert.deepStrictEqual(result.result.data.values, [1, 2, 3, 4, 5]);

    // Check that success was logged
    const appendLineCalls = outputChannelStub.appendLine.getCalls();
    const successLog = appendLineCalls.find(call =>
      call.args[0].includes('called successfully'));
    assert.ok(successLog, 'Should log successful function call');
  });

  // TEST-MCP-013: Test that the client handles error responses from function calls
  test('callFunction() should handle error responses', async () => {
    // Arrange
    const mockSchema = {
      name: 'tool1',
      description: 'Tool 1',
      version: '1.0.0',
      functions: [
        {
          name: 'function1',
          description: 'Function 1',
          parameters: [],
          returnType: 'string'
        }
      ]
    };

    // Mock error response from the server
    const mockErrorResult = {
      status: 'error',
      error: 'Function execution failed: Internal server error'
    };

    axiosGetStub.resolves({ status: 200, data: mockSchema });
    axiosPostStub.resolves({ status: 200, data: mockErrorResult });

    // Act
    const result = await client.callFunction('tool1', 'function1', {});

    // Assert
    assert.deepStrictEqual(result, mockErrorResult);
    assert.strictEqual(result.status, 'error');
    assert.ok(result.error, 'Error message should be present');
    assert.strictEqual(result.error, 'Function execution failed: Internal server error');

    // Now test when the HTTP request itself fails
    axiosPostStub.rejects(new Error('Network error'));

    // Act
    const networkErrorResult = await client.callFunction('tool1', 'function1', {});

    // Assert
    assert.strictEqual(networkErrorResult.status, 'error');
    assert.ok(networkErrorResult.error?.includes('Network error'),
      'Error message should include the network error');

    // Check that errors were logged
    const appendLineCalls = outputChannelStub.appendLine.getCalls();
    const errorLog = appendLineCalls.find(call =>
      call.args[0].includes('Error calling function'));
    assert.ok(errorLog, 'Should log function call error');
  });

  // Logging Tests

  // TEST-MCP-030: Test that the client logs connection attempts and results
  test('connect() should log connection attempts and results', async () => {
    // Arrange
    axiosGetStub.resolves({ status: 200, data: {} });

    // Act
    await client.connect();

    // Assert
    const appendLineCalls = outputChannelStub.appendLine.getCalls();

    // Check for connection attempt log
    const connectionAttemptLog = appendLineCalls.find(call =>
      call.args[0].includes('Connecting to MCP server'));
    assert.ok(connectionAttemptLog, 'Should log connection attempt');

    // Check for successful connection log
    const connectionSuccessLog = appendLineCalls.find(call =>
      call.args[0].includes('Connected to MCP server'));
    assert.ok(connectionSuccessLog, 'Should log successful connection');

    // Test failed connection
    outputChannelStub.appendLine.resetHistory();
    axiosGetStub.resolves({ status: 404, data: {} });

    // Act
    await client.connect();

    // Assert
    const failedAppendLineCalls = outputChannelStub.appendLine.getCalls();

    // Check for failed connection log
    const connectionFailedLog = failedAppendLineCalls.find(call =>
      call.args[0].includes('Failed to connect to MCP server'));
    assert.ok(connectionFailedLog, 'Should log failed connection');
  });

  // TEST-MCP-031: Test that the client logs tool discovery attempts and results
  test('getTools() should log tool discovery attempts and results', async () => {
    // Arrange
    const mockTools = [
      { name: 'tool1', description: 'Tool 1', version: '1.0.0', functions: [] },
      { name: 'tool2', description: 'Tool 2', version: '1.0.0', functions: [] }
    ];
    axiosGetStub.resolves({ status: 200, data: mockTools });

    // Reset log history
    outputChannelStub.appendLine.resetHistory();

    // Act
    await client.getTools();

    // Assert
    const appendLineCalls = outputChannelStub.appendLine.getCalls();

    // Check for tool discovery attempt log
    const discoveryAttemptLog = appendLineCalls.find(call =>
      call.args[0].includes('Getting available tools'));
    assert.ok(discoveryAttemptLog, 'Should log tool discovery attempt');

    // Check for successful discovery log
    const discoverySuccessLog = appendLineCalls.find(call =>
      call.args[0].includes('Found 2 tools'));
    assert.ok(discoverySuccessLog, 'Should log successful tool discovery');

    // Test failed discovery
    outputChannelStub.appendLine.resetHistory();
    axiosGetStub.rejects(new Error('Network error'));

    // Act
    await client.getTools();

    // Assert
    const failedAppendLineCalls = outputChannelStub.appendLine.getCalls();

    // Check for failed discovery log
    const discoveryFailedLog = failedAppendLineCalls.find(call =>
      call.args[0].includes('Error getting tools'));
    assert.ok(discoveryFailedLog, 'Should log failed tool discovery');
  });

  // TEST-MCP-032: Test that the client logs function calls and results
  test('callFunction() should log function calls and results', async () => {
    // Arrange
    const mockSchema = {
      name: 'tool1',
      description: 'Tool 1',
      version: '1.0.0',
      functions: [
        {
          name: 'function1',
          description: 'Function 1',
          parameters: [
            {
              name: 'param1',
              description: 'Parameter 1',
              type: 'string',
              required: true
            }
          ],
          returnType: 'string'
        }
      ]
    };
    const mockResult = {
      status: 'success',
      result: 'Function result'
    };

    axiosGetStub.resolves({ status: 200, data: mockSchema });
    axiosPostStub.resolves({ status: 200, data: mockResult });

    // Reset log history
    outputChannelStub.appendLine.resetHistory();

    // Act
    await client.callFunction('tool1', 'function1', { param1: 'test' });

    // Assert
    const appendLineCalls = outputChannelStub.appendLine.getCalls();

    // Check for function call attempt log
    const callAttemptLog = appendLineCalls.find(call =>
      call.args[0].includes('Calling function function1 on tool tool1'));
    assert.ok(callAttemptLog, 'Should log function call attempt');

    // Check for parameter validation log
    const validationLog = appendLineCalls.find(call =>
      call.args[0].includes('Parameters validated successfully'));
    assert.ok(validationLog, 'Should log parameter validation');

    // Check for parameter formatting log
    const parameterLog = appendLineCalls.find(call =>
      call.args[0].includes('Parameters:') && call.args[0].includes('param1'));
    assert.ok(parameterLog, 'Should log formatted parameters');

    // Check for successful call log
    const callSuccessLog = appendLineCalls.find(call =>
      call.args[0].includes('called successfully'));
    assert.ok(callSuccessLog, 'Should log successful function call');
  });

  // TEST-MCP-033: Test that the client logs errors with appropriate detail
  test('client should log errors with appropriate detail', async () => {
    // Arrange
    const mockSchema = {
      name: 'tool1',
      description: 'Tool 1',
      version: '1.0.0',
      functions: [
        {
          name: 'function1',
          description: 'Function 1',
          parameters: [
            {
              name: 'param1',
              description: 'Parameter 1',
              type: 'string',
              required: true
            }
          ],
          returnType: 'string'
        }
      ]
    };

    axiosGetStub.resolves({ status: 200, data: mockSchema });

    // Reset log history
    outputChannelStub.appendLine.resetHistory();

    // Act - Test validation error
    await client.callFunction('tool1', 'function1', {});

    // Assert
    let appendLineCalls = outputChannelStub.appendLine.getCalls();

    // Check for validation error log
    const validationErrorLog = appendLineCalls.find(call =>
      call.args[0].includes('Parameter validation failed'));
    assert.ok(validationErrorLog, 'Should log validation error');

    // Check for function call error log
    const callErrorLog = appendLineCalls.find(call =>
      call.args[0].includes('Error calling function'));
    assert.ok(callErrorLog, 'Should log function call error');

    // Reset log history
    outputChannelStub.appendLine.resetHistory();

    // Act - Test network error
    axiosPostStub.rejects(new Error('Network error: Connection refused'));
    await client.callFunction('tool1', 'function1', { param1: 'test' });

    // Assert
    appendLineCalls = outputChannelStub.appendLine.getCalls();

    // Check for network error log
    const networkErrorLog = appendLineCalls.find(call =>
      call.args[0].includes('Error calling function') &&
      call.args[0].includes('Network error'));
    assert.ok(networkErrorLog, 'Should log network error with details');
  });
});
