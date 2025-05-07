/**
 * Enhanced Neo4j Memory Client Tests
 *
 * Tests for the Enhanced Neo4j Memory client implementation.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { EnhancedMCPClient, ConnectionMethod } from '../../../mcp/enhancedMcpClient';
import { EnhancedNeo4jMemoryClient } from '../../../memory/enhancedNeo4jMemoryClient';
import { IMCPFunctionCallResult } from '../../../mcp/mcpTypes';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import networkConfig from '../../../utils/networkConfig';

suite('Enhanced Neo4j Memory Client Test Suite', () => {
  // Stubs
  let enhancedMcpClientStub: sinon.SinonStubbedInstance<EnhancedMCPClient>;
  let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;
  let memoryClient: EnhancedNeo4jMemoryClient;

  // Setup before each test
  setup(() => {
    // Mock VS Code workspace configuration
    const mockConfig = {
      get: sinon.stub().callsFake((key: string) => {
        if (key === 'environment') return 'development';
        if (key === 'services') return { 'mcp-neo4j-memory': 'http://localhost:8001' };
        return undefined;
      })
    };

    // Stub VS Code workspace.getConfiguration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

    // Create a stubbed Enhanced MCP client
    enhancedMcpClientStub = sinon.createStubInstance(EnhancedMCPClient);

    // Stub VS Code output channel
    outputChannelStub = {
      name: 'Adamize Neo4j Memory Client',
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

    // Create memory client
    memoryClient = new EnhancedNeo4jMemoryClient(ConnectionMethod.HTTP);

    // Replace the internal MCP client with our stub
    // This is a bit of a hack, but it's the easiest way to test the client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (memoryClient as any).mcpClient = enhancedMcpClientStub;
  });

  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
  });

  // Test connect method
  test('connect() should call MCP client connect method', async () => {
    // Arrange
    enhancedMcpClientStub.connect.resolves(true);

    // Act
    const result = await memoryClient.connect();

    // Assert
    assert.strictEqual(result, true);
    assert.strictEqual(enhancedMcpClientStub.connect.calledOnce, true);
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test searchNodes method
  test('searchNodes() should call MCP client with correct parameters', async () => {
    // Arrange
    const query = 'test query';
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: {
        entities: [
          { name: 'Entity1', entityType: 'Type1', observations: ['Observation1'] }
        ]
      }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.searchNodes(query);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['search_nodes', { query }]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test readGraph method
  test('readGraph() should call MCP client with correct parameters', async () => {
    // Arrange
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { graph: {} }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.readGraph();

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['read_graph', {}]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test createEntities method
  test('createEntities() should call MCP client with correct parameters', async () => {
    // Arrange
    const entities = [
      {
        name: 'Entity1',
        entityType: 'Type1',
        observations: ['Observation1', 'Observation2']
      }
    ];
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { created: 1 }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.createEntities(entities);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['create_entities', { entities }]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test createRelations method
  test('createRelations() should call MCP client with correct parameters', async () => {
    // Arrange
    const relations = [
      {
        from: 'Entity1',
        to: 'Entity2',
        relationType: 'RELATES_TO'
      }
    ];
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { created: 1 }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.createRelations(relations);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['create_relations', { relations }]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test addObservations method
  test('addObservations() should call MCP client with correct parameters', async () => {
    // Arrange
    const observations = [
      {
        entityName: 'Entity1',
        contents: ['New observation 1', 'New observation 2']
      }
    ];
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { added: 2 }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.addObservations(observations);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['add_observations', { observations }]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test deleteEntities method
  test('deleteEntities() should call MCP client with correct parameters', async () => {
    // Arrange
    const entityNames = ['Entity1', 'Entity2'];
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { deleted: 2 }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.deleteEntities(entityNames);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['delete_entities', { entityNames }]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test deleteObservations method
  test('deleteObservations() should call MCP client with correct parameters', async () => {
    // Arrange
    const deletions = [
      {
        entityName: 'Entity1',
        observations: ['Observation to delete']
      }
    ];
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { deleted: 1 }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.deleteObservations(deletions);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['delete_observations', { deletions }]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test deleteRelations method
  test('deleteRelations() should call MCP client with correct parameters', async () => {
    // Arrange
    const relations = [
      {
        from: 'Entity1',
        to: 'Entity2',
        relationType: 'RELATES_TO'
      }
    ];
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { deleted: 1 }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.deleteRelations(relations);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['delete_relations', { relations }]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });

  // Test openNodes method
  test('openNodes() should call MCP client with correct parameters', async () => {
    // Arrange
    const names = ['Entity1', 'Entity2'];
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: {
        entities: [
          { name: 'Entity1', entityType: 'Type1', observations: ['Observation1'] },
          { name: 'Entity2', entityType: 'Type2', observations: ['Observation2'] }
        ]
      }
    };
    enhancedMcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.openNodes(names);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(enhancedMcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      enhancedMcpClientStub.callFunction.firstCall.args,
      ['open_nodes', { names }]
    );
    assert.strictEqual(outputChannelStub.appendLine.called, true);
  });
});
