/**
 * MCP Bridge Client Tests
 *
 * Tests for the MCP Bridge Client implementation.
 *
 * @requirement REQ-MCPCLIENT-001 Replace process spawning with VS Code-compatible approach
 * @requirement REQ-MCPCLIENT-002 Adapt JSON-RPC communication for VS Code
 * @requirement REQ-MCPCLIENT-003 Integrate with VS Code's output channel for logging
 * @requirement REQ-MCPCLIENT-004 Add support for multiple connection methods
 * @requirement REQ-MCPCLIENT-005 Ensure compatibility with existing MCP client
 * @requirement REQ-MCPCLIENT-006 Support tool discovery and registration
 * @requirement REQ-MCPCLIENT-007 Support function calling with parameter validation
 * @requirement REQ-MCPCLIENT-008 Handle connection errors gracefully
 * @requirement REQ-MCPCLIENT-009 Support multiple MCP servers
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import axios from 'axios';
import { MCPBridgeClient } from '../../../../mcp/bridge/mcpBridgeClient';
import { ConnectionMethod, MCPServerConfig } from '../../../../mcp/bridge/bridgeTypes';
import { VSCodeLogger } from '../../../../mcp/bridge/vscodeLogger';
import { createOutputChannelStub } from '../../../helpers/testHelpers';

// Mock child_process.exec
jest.mock('child_process', () => ({
  exec: jest.fn((_command, options, callback) => {
    // Handle both forms of exec call
    const cb = typeof options === 'function' ? options : callback;
    if (typeof cb === 'function') {
      cb(null, '{"jsonrpc": "2.0", "result": {"status": "connected"}}', '');
    }
    return {};
  })
}));

// Mock util.promisify
jest.mock('util', () => {
  const originalUtil = jest.requireActual('util');
  return {
    ...originalUtil,
    promisify: jest.fn().mockImplementation((_fn) => {
      return jest.fn().mockResolvedValue({ stdout: '{"jsonrpc": "2.0", "result": {"status": "connected"}}', stderr: '' });
    })
  };
});

suite('MCP Bridge Client Tests', () => {
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;
  let logger: VSCodeLogger;
  // We only use axiosPostStub in the tests
  let axiosPostStub: sinon.SinonStub;

  setup(() => {
    // Set NODE_ENV to test
    process.env.NODE_ENV = 'test';

    // Create a stub for the VS Code output channel
    outputChannelStub = createOutputChannelStub();

    // Create a logger
    logger = new VSCodeLogger(outputChannelStub as unknown as vscode.OutputChannel);

    // Stub axios post method (we only use post in the tests)
    axiosPostStub = sinon.stub(axios, 'post');

    // Reset mocks
    jest.clearAllMocks();
  });

  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  /**
   * @test TEST-MCPCLIENT-001 Test that the client can connect to an MCP server via local process
   */
  test('should connect to an MCP server via local process', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.LocalProcess,
      command: 'node',
      args: ['server.js'],
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // No need to mock exec or promisify anymore since we're using NODE_ENV=test

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, true);
  });

  /**
   * @test TEST-MCPCLIENT-002 Test that the client can connect to an MCP server via HTTP
   */
  test('should connect to an MCP server via HTTP', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.HTTP,
      url: 'http://localhost:8000',
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // Mock the axios response
    axiosPostStub.resolves({
      data: {
        jsonrpc: '2.0',
        result: {
          status: 'connected'
        },
        id: 1
      }
    });

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, true);
    assert.strictEqual(axiosPostStub.called, true);
  });

  /**
   * @test TEST-MCPCLIENT-003 Test that the client can connect to an MCP server via Docker exec
   */
  test('should connect to an MCP server via Docker exec', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.DockerExec,
      containerId: 'test-container',
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // No need to mock exec or promisify anymore since we're using NODE_ENV=test

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, true);
  });

  /**
   * @test TEST-MCPCLIENT-004 Test that the client can get available tools
   */
  test('should get available tools', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.HTTP,
      url: 'http://localhost:8000',
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // Mock the axios response
    axiosPostStub.resolves({
      data: {
        jsonrpc: '2.0',
        result: [
          {
            name: 'tool1',
            description: 'Tool 1',
            functions: []
          },
          {
            name: 'tool2',
            description: 'Tool 2',
            functions: []
          }
        ],
        id: 1
      }
    });

    // Act
    const tools = await client.getAvailableTools();

    // Assert
    assert.strictEqual(tools.length, 2);
    assert.strictEqual(tools[0].name, 'tool1');
    assert.strictEqual(tools[1].name, 'tool2');
    assert.strictEqual(axiosPostStub.called, true);
  });

  /**
   * @test TEST-MCPCLIENT-005 Test that the client can call a tool
   */
  test('should call a tool', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.HTTP,
      url: 'http://localhost:8000',
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // Mock the axios response
    axiosPostStub.resolves({
      data: {
        jsonrpc: '2.0',
        result: {
          status: 'success',
          data: 'Tool result'
        },
        id: 1
      }
    });

    // Act
    const result = await client.callFunction('tool1', 'function1', { param1: 'value1' });

    // Assert
    assert.strictEqual(result.status, 'success');
    assert.strictEqual(result.result, 'Tool result');
    assert.strictEqual(axiosPostStub.called, true);
  });

  /**
   * @test TEST-MCPCLIENT-006 Test that the client handles connection errors gracefully
   */
  test('should handle connection errors gracefully', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.HTTP,
      url: 'http://localhost:8000',
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // Mock the axios response to throw an error
    axiosPostStub.rejects(new Error('Connection refused'));

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, false);
    assert.strictEqual(axiosPostStub.called, true);
  });

  /**
   * @test TEST-MCPCLIENT-007 Test that the client handles tool call errors gracefully
   */
  test('should handle tool call errors gracefully', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.HTTP,
      url: 'http://localhost:8000',
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // Mock the axios response to throw an error
    axiosPostStub.rejects(new Error('Tool call failed'));

    // Act
    const result = await client.callFunction('tool1', 'function1', { param1: 'value1' });

    // Assert
    assert.strictEqual(result.status, 'error');
    assert.ok(result.error?.includes('Tool call failed'));
    assert.strictEqual(axiosPostStub.called, true);
  });

  /**
   * @test TEST-MCPCLIENT-008 Test that the client can close the connection
   */
  test('should close the connection', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.HTTP,
      url: 'http://localhost:8000',
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // Mock the axios response
    axiosPostStub.resolves({
      data: {
        jsonrpc: '2.0',
        result: {
          status: 'disconnected'
        },
        id: 1
      }
    });

    // Act
    const result = await client.close();

    // Assert
    assert.strictEqual(result, true);
    assert.strictEqual(axiosPostStub.called, true);
  });

  /**
   * @test TEST-MCPCLIENT-009 Test that the client integrates with VS Code's output channel
   */
  test('should log to VS Code output channel', async () => {
    // Arrange
    const config: MCPServerConfig = {
      connectionMethod: ConnectionMethod.HTTP,
      url: 'http://localhost:8000',
    };
    const client = new MCPBridgeClient('test-server', config, logger);

    // Mock the axios response
    axiosPostStub.resolves({
      data: {
        jsonrpc: '2.0',
        result: {
          status: 'connected'
        },
        id: 1
      }
    });

    // Act
    await client.connect();

    // Assert
    assert.strictEqual(outputChannelStub.appendLine.called, true);
    const logMessages = outputChannelStub.appendLine.getCalls().map(call => call.args[0]);
    const connectionLogs = logMessages.filter(msg => msg.includes('Connecting to MCP server'));
    assert.strictEqual(connectionLogs.length > 0, true);
  });
});
