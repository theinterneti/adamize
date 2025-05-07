/**
 * Neo4j Memory Client Tests
 *
 * Tests for the Neo4j Memory client implementation.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { MCPClient } from '../../../mcp/mcpClient';
import { Neo4jMemoryClient } from '../../../memory/neo4jMemoryClient';
import { IMCPFunctionCallResult } from '../../../mcp/mcpTypes';

suite('Neo4j Memory Client Test Suite', () => {
  // Stubs
  let mcpClientStub: sinon.SinonStubbedInstance<MCPClient>;
  let memoryClient: Neo4jMemoryClient;

  // Setup before each test
  setup(() => {
    // Create a stubbed MCP client
    mcpClientStub = sinon.createStubInstance(MCPClient);
    
    // Create memory client with stubbed MCP client
    memoryClient = new Neo4jMemoryClient(mcpClientStub as unknown as MCPClient);
  });

  // Teardown after each test
  teardown(() => {
    // Restore all stubs
    sinon.restore();
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
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.searchNodes(query);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'search_nodes', { query }]
    );
  });

  // Test readGraph method
  test('readGraph() should call MCP client with correct parameters', async () => {
    // Arrange
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { graph: {} }
    };
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.readGraph();

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'read_graph', {}]
    );
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
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.createEntities(entities);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'create_entities', { entities }]
    );
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
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.createRelations(relations);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'create_relations', { relations }]
    );
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
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.addObservations(observations);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'add_observations', { observations }]
    );
  });

  // Test deleteEntities method
  test('deleteEntities() should call MCP client with correct parameters', async () => {
    // Arrange
    const entityNames = ['Entity1', 'Entity2'];
    const mockResult: IMCPFunctionCallResult = {
      status: 'success',
      result: { deleted: 2 }
    };
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.deleteEntities(entityNames);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'delete_entities', { entityNames }]
    );
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
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.deleteObservations(deletions);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'delete_observations', { deletions }]
    );
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
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.deleteRelations(relations);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'delete_relations', { relations }]
    );
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
    mcpClientStub.callFunction.resolves(mockResult);

    // Act
    const result = await memoryClient.openNodes(names);

    // Assert
    assert.strictEqual(result, mockResult);
    assert.strictEqual(mcpClientStub.callFunction.calledOnce, true);
    assert.deepStrictEqual(
      mcpClientStub.callFunction.firstCall.args,
      ['neo4j-memory', 'open_nodes', { names }]
    );
  });
});
