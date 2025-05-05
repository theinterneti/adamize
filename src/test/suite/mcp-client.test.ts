import * as assert from 'assert';
import * as sinon from 'sinon';
import axios from 'axios';
import { MCPClient } from '../../mcp/mcpClient';

suite('MCP Client Test Suite', () => {
  let axiosGetStub: sinon.SinonStub;
  let axiosPostStub: sinon.SinonStub;
  
  setup(() => {
    // Stub axios methods
    axiosGetStub = sinon.stub(axios, 'get');
    axiosPostStub = sinon.stub(axios, 'post');
  });
  
  teardown(() => {
    // Restore stubs
    axiosGetStub.restore();
    axiosPostStub.restore();
  });
  
  test('connect() should return true when server is available', async () => {
    // Arrange
    axiosGetStub.resolves({ status: 200, data: {} });
    const client = new MCPClient('http://localhost:8000');
    
    // Act
    const result = await client.connect();
    
    // Assert
    assert.strictEqual(result, true);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(axiosGetStub.firstCall.args[0], 'http://localhost:8000/connection');
  });
  
  test('connect() should return false when server is not available', async () => {
    // Arrange
    axiosGetStub.rejects(new Error('Connection refused'));
    const client = new MCPClient('http://localhost:8000');
    
    // Act
    const result = await client.connect();
    
    // Assert
    assert.strictEqual(result, false);
    assert.strictEqual(axiosGetStub.calledOnce, true);
  });
  
  test('getTools() should return list of tools', async () => {
    // Arrange
    const mockTools = [
      { name: 'tool1', description: 'Tool 1', version: '1.0.0', functions: [] },
      { name: 'tool2', description: 'Tool 2', version: '1.0.0', functions: [] }
    ];
    axiosGetStub.resolves({ status: 200, data: mockTools });
    const client = new MCPClient('http://localhost:8000');
    
    // Act
    const result = await client.getTools();
    
    // Assert
    assert.deepStrictEqual(result, ['tool1', 'tool2']);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(axiosGetStub.firstCall.args[0], 'http://localhost:8000/tools');
  });
  
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
    const client = new MCPClient('http://localhost:8000');
    
    // Act
    const result = await client.getToolSchema('tool1');
    
    // Assert
    assert.deepStrictEqual(result, mockSchema);
    assert.strictEqual(axiosGetStub.calledOnce, true);
    assert.strictEqual(axiosGetStub.firstCall.args[0], 'http://localhost:8000/tools/tool1');
  });
  
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
    const client = new MCPClient('http://localhost:8000');
    
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
  });
});
