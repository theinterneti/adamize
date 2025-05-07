/**
 * Enhanced MCP Client Tests
 *
 * Tests for the Enhanced MCP client implementation.
 *
 * TEST-MCP-001: Test that the client can connect to an MCP server successfully
 * TEST-MCP-001a: Test that the client handles connection errors gracefully
 * TEST-MCP-002: Test that the client can discover available tools from the MCP server
 * TEST-MCP-002a: Test that the client handles tool discovery errors gracefully
 * TEST-MCP-003: Test that the client can retrieve the schema for a specific tool
 * TEST-MCP-003a: Test that the client handles schema retrieval errors gracefully
 * TEST-MCP-010: Test that the client can call functions on tools with parameters
 * TEST-MCP-011: Test that the client validates parameters against the function schema
 * TEST-MCP-011a: Test that the client rejects invalid parameters
 * TEST-MCP-012: Test that the client handles successful function call responses
 * TEST-MCP-013: Test that the client handles error responses from function calls
 * TEST-MCP-030: Test that the client logs connection attempts and results
 * TEST-MCP-031: Test that the client logs tool discovery attempts and results
 * TEST-MCP-032: Test that the client logs function calls and results
 * TEST-MCP-033: Test that the client logs errors with appropriate detail
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import axios from 'axios';
import { EnhancedMCPClient, ConnectionMethod } from '../../../mcp/enhancedMcpClient';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IMCPFunctionCallResult } from '../../../mcp/mcpTypes';
import { EventEmitter } from 'events';
import networkConfig, { ServiceType, Environment } from '../../../utils/networkConfig';
import processUtils from '../../../utils/processUtils';

suite('Enhanced MCP Client Test Suite', () => {
  // Stubs
  let axiosGetStub: sinon.SinonStub;
  let axiosPostStub: sinon.SinonStub;
  let executeCommandStub: sinon.SinonStub;
  let spawnProcessStub: sinon.SinonStub;
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;
  let client: EnhancedMCPClient;
  let localProcessClient: EnhancedMCPClient;
  let networkConfigStub: sinon.SinonStubbedInstance<typeof networkConfig>;

  // Mock process objects
  let mockProcess: EventEmitter;

  // Setup before each test
  setup(() => {
    // Stub axios methods
    axiosGetStub = sinon.stub(axios, 'get');
    axiosPostStub = sinon.stub(axios, 'post');

    // Create mock process for local process testing
    mockProcess = new EventEmitter();
    // Add stdout and stderr streams
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    // Add methods
    mockProcess.kill = sinon.stub();

    // Stub processUtils methods
    executeCommandStub = sinon.stub(processUtils, 'executeCommand');
    spawnProcessStub = sinon.stub(processUtils, 'spawnProcess').returns(mockProcess as any);

    // Set up default return values
    executeCommandStub.resolves({
      stdout: 'mock-stdout',
      stderr: ''
    });

    // Create output channel stub
    outputChannelStub = {
      appendLine: sinon.stub(),
      append: sinon.stub(),
      clear: sinon.stub(),
      show: sinon.stub(),
      hide: sinon.stub(),
      dispose: sinon.stub(),
      name: 'Test Channel'
    };

    // Stub VS Code window.createOutputChannel
    // Using 'as any' is necessary here due to the complex VS Code API types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannelStub as any);

    // Stub networkConfig
    networkConfigStub = sinon.stub(networkConfig);
    networkConfigStub.getServiceUrl.returns('http://localhost:8000');
    networkConfigStub.getCurrentEnvironment.returns('development');

    // Create client instances
    client = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, ConnectionMethod.HTTP);
    localProcessClient = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, ConnectionMethod.LocalProcess);
  });

  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  // Constructor Tests
  test('constructor should initialize with correct values', () => {
    // Assert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.strictEqual((client as any).serviceType, ServiceType.MCPNeo4jMemory);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.strictEqual((client as any).connectionMethod, ConnectionMethod.HTTP);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.strictEqual((client as any).serverUrl, 'http://localhost:8000');
    assert.strictEqual(outputChannelStub.show.called, true);
  });

  // Connection Tests - HTTP

  // TEST-MCP-001: Test that the client can connect to an MCP server successfully
  test('connect() should return true when HTTP server is available', async () => {
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
  test('connect() should return false when HTTP server is not available', async () => {
    // Arrange
    axiosGetStub.rejects(new Error('Connection refused'));

    // Act
    const result = await client.connect();

    // Assert
    assert.strictEqual(result, false);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Docker Exec connection tests
  test('connect() should return true when Docker container is available', async () => {
    // Arrange
    // Create a client with Docker Exec connection method
    networkConfigStub.getServiceUrl.returns('mcp-container');
    networkConfigStub.getCurrentEnvironment.returns(Environment.Development);
    const dockerClient = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, ConnectionMethod.DockerExec);

    // Manually set the containerName property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dockerClient as any).containerName = 'mcp-container';

    // Reset the stub to ensure it's called fresh
    executeCommandStub.reset();

    // Set up the executeCommand stub to return a container ID
    executeCommandStub.resolves({
      stdout: 'container123',
      stderr: ''
    });

    // Act
    const result = await dockerClient.connect();

    // Assert
    assert.strictEqual(result, true);
    assert.ok(executeCommandStub.called, 'executeCommand should be called');
    assert.ok(executeCommandStub.firstCall.args[0].includes('docker ps'), 'Should call docker ps');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  test('connect() should return false when Docker container is not available', async () => {
    // Arrange
    // Create a client with Docker Exec connection method
    networkConfigStub.getServiceUrl.returns('mcp-container');
    networkConfigStub.getCurrentEnvironment.returns(Environment.Development);
    const dockerClient = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, ConnectionMethod.DockerExec);

    // Manually set the containerName property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dockerClient as any).containerName = 'mcp-container';

    // Reset the stub to ensure it's called fresh
    executeCommandStub.reset();

    // Set up the executeCommand stub to return an empty result
    executeCommandStub.resolves({
      stdout: '',
      stderr: ''
    });

    // Act
    const result = await dockerClient.connect();

    // Assert
    assert.strictEqual(result, false);
    assert.ok(executeCommandStub.called, 'executeCommand should be called');
    assert.ok(executeCommandStub.firstCall.args[0].includes('docker ps'), 'Should call docker ps');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Local Process connection tests
  test('connect() should return false when server URL is invalid for local process', async () => {
    // Act
    const result = await localProcessClient.connect();

    // Assert
    assert.strictEqual(result, false);
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  test('connect() should return true when server URL is a valid path', async () => {
    // Arrange
    // Create a client with Local Process connection method and a valid path
    networkConfigStub.getServiceUrl.returns('/usr/local/bin/mcp-tool');
    const localClient = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, ConnectionMethod.LocalProcess);

    // Set up the executeCommand stub to return success
    executeCommandStub.resolves({
      stdout: '-rwxr-xr-x 1 user user 12345 Jan 1 12:00 /usr/local/bin/mcp-tool',
      stderr: ''
    });

    // Act
    const result = await localClient.connect();

    // Assert
    assert.strictEqual(result, true);
    assert.ok(executeCommandStub.called, 'executeCommand should be called');
    assert.ok(executeCommandStub.firstCall.args[0].includes('ls -l'), 'Should check if file exists');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  test('connect() should return false when local process path check fails', async () => {
    // Arrange
    // Create a client with Local Process connection method and a valid path
    networkConfigStub.getServiceUrl.returns('/usr/local/bin/mcp-tool');
    const localClient = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, ConnectionMethod.LocalProcess);

    // Set up the executeCommand stub to return an error
    executeCommandStub.resolves({
      stdout: '',
      stderr: 'No such file or directory'
    });

    // Act
    const result = await localClient.connect();

    // Assert
    assert.strictEqual(result, false);
    assert.ok(executeCommandStub.called, 'executeCommand should be called');
    assert.ok(executeCommandStub.firstCall.args[0].includes('ls -l'), 'Should check if file exists');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Function Call Tests - HTTP
  test('callFunction() should call function via HTTP and return result', async () => {
    // Arrange
    const functionName = 'testFunction';
    const parameters = { param1: 'value1', param2: 'value2' };
    const mockResult = { status: 'success', result: { data: 'test' } };

    axiosPostStub.resolves({ data: mockResult });

    // Act
    const result = await client.callFunction(functionName, parameters);

    // Assert
    assert.deepStrictEqual(result, mockResult);
    assert.strictEqual(axiosPostStub.calledOnce, true);
    assert.deepStrictEqual(
      axiosPostStub.firstCall.args[1],
      {
        tool: ServiceType.MCPNeo4jMemory,
        function: functionName,
        parameters
      }
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Docker Exec function call tests
  test('callFunction() should call function via Docker Exec and return result', async () => {
    // Arrange
    // Create a client with Docker Exec connection method
    networkConfigStub.getServiceUrl.returns('mcp-container');
    networkConfigStub.getCurrentEnvironment.returns(Environment.Development);
    const dockerClient = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, ConnectionMethod.DockerExec);

    // Manually set the containerName and containerId properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dockerClient as any).containerName = 'mcp-container';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dockerClient as any).containerId = 'container123';

    // Set up the executeCommand stub to return a JSON-RPC response
    executeCommandStub.resolves({
      stdout: JSON.stringify({ result: { data: 'test' } }),
      stderr: ''
    });

    const functionName = 'testFunction';
    const parameters = { param1: 'value1', param2: 'value2' };

    // Act
    const result = await dockerClient.callFunction(functionName, parameters);

    // Assert
    assert.strictEqual(result.status, 'success');
    assert.deepStrictEqual(result.result, { data: 'test' });
    assert.ok(executeCommandStub.called, 'executeCommand should be called');
    assert.ok(executeCommandStub.firstCall.args[0].includes('docker exec'), 'Should call docker exec');
    assert.ok(executeCommandStub.firstCall.args[0].includes(functionName), 'Should include function name');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Local Process function call tests
  test('callFunction() should return error when server URL is invalid', async () => {
    // Arrange
    const functionName = 'testFunction';
    const parameters = { param1: 'value1', param2: 'value2' };

    // Act
    const result = await localProcessClient.callFunction(functionName, parameters);

    // Assert
    assert.strictEqual(result.status, 'error');
    assert.ok(result.error?.includes('Invalid server URL'), 'Error should mention invalid URL');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  test('callFunction() should call function via local process and return result', async () => {
    // Arrange
    // Create a client with Local Process connection method and a valid path
    networkConfigStub.getServiceUrl.returns('/usr/local/bin/mcp-tool');
    const localClient = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, ConnectionMethod.LocalProcess);

    // Set up the executeCommand stub to return a JSON-RPC response
    executeCommandStub.resolves({
      stdout: JSON.stringify({ result: { data: 'test' } }),
      stderr: ''
    });

    const functionName = 'testFunction';
    const parameters = { param1: 'value1', param2: 'value2' };

    // Act
    const result = await localClient.callFunction(functionName, parameters);

    // Assert
    assert.strictEqual(result.status, 'success');
    assert.deepStrictEqual(result.result, { data: 'test' });
    assert.ok(executeCommandStub.called, 'executeCommand should be called');
    assert.ok(executeCommandStub.firstCall.args[0].includes('echo'), 'Should use echo to pipe input');
    assert.ok(executeCommandStub.firstCall.args[0].includes(functionName), 'Should include function name in JSON');
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Error Handling Tests
  test('callFunction() should handle error responses', async () => {
    // Arrange
    const functionName = 'testFunction';
    const parameters = { param1: 'value1', param2: 'value2' };

    axiosPostStub.rejects(new Error('Request failed'));

    // Act
    const result = await client.callFunction(functionName, parameters);

    // Assert
    assert.strictEqual(result.status, 'error');
    assert.ok(result.error?.includes('Request failed'));
    assert.strictEqual(axiosPostStub.calledOnce, true);
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Logging Tests
  test('client should log connection attempts', async () => {
    // Arrange
    axiosGetStub.resolves({ status: 200, data: {} });

    // Act
    await client.connect();

    // Assert
    // Verify that appendLine was called at least once
    assert.ok(outputChannelStub.appendLine.called, 'Should log connection attempt');
  });

  test('client should log function calls', async () => {
    // Arrange
    const functionName = 'testFunction';
    const parameters = { param1: 'value1', param2: 'value2' };
    const mockResult = { status: 'success', result: { data: 'test' } };

    axiosPostStub.resolves({ data: mockResult });

    // Act
    await client.callFunction(functionName, parameters);

    // Assert
    // Verify that appendLine was called at least once
    assert.ok(outputChannelStub.appendLine.called, 'Should log function call');
  });

  test('client should log errors', async () => {
    // Arrange
    axiosGetStub.rejects(new Error('Connection refused'));

    // Act
    await client.connect();

    // Assert
    // Verify that appendLine was called at least once
    assert.ok(outputChannelStub.appendLine.called, 'Should log error');
  });
});
