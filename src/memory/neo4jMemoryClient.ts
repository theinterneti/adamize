/**
 * Neo4j Memory Client
 *
 * A client for interacting with the Neo4j Memory MCP tool.
 */

import { MCPClient } from '../mcp/mcpClient';
import { IMCPFunctionCallResult } from '../mcp/mcpTypes';

/**
 * Neo4j Memory Client for interacting with the Neo4j Memory MCP tool
 */
export class Neo4jMemoryClient {
  private mcpClient: MCPClient;
  private toolName = 'neo4j-memory';

  /**
   * Create a new Neo4j Memory client
   * @param mcpClient The MCP client to use
   */
  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Search for nodes in the memory graph
   * @param query The search query
   * @returns The search results
   */
  public async searchNodes(query: string): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'search_nodes', { query });
  }

  /**
   * Read the entire memory graph
   * @returns The memory graph
   */
  public async readGraph(): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'read_graph', {});
  }

  /**
   * Create entities in the memory graph
   * @param entities The entities to create
   * @returns The result of the operation
   */
  public async createEntities(entities: Array<{
    name: string;
    entityType: string;
    observations: string[];
  }>): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'create_entities', { entities });
  }

  /**
   * Create relations between entities in the memory graph
   * @param relations The relations to create
   * @returns The result of the operation
   */
  public async createRelations(relations: Array<{
    from: string;
    to: string;
    relationType: string;
  }>): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'create_relations', { relations });
  }

  /**
   * Add observations to entities in the memory graph
   * @param observations The observations to add
   * @returns The result of the operation
   */
  public async addObservations(observations: Array<{
    entityName: string;
    contents: string[];
  }>): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'add_observations', { observations });
  }

  /**
   * Delete entities from the memory graph
   * @param entityNames The names of the entities to delete
   * @returns The result of the operation
   */
  public async deleteEntities(entityNames: string[]): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'delete_entities', { entityNames });
  }

  /**
   * Delete observations from entities in the memory graph
   * @param deletions The observations to delete
   * @returns The result of the operation
   */
  public async deleteObservations(deletions: Array<{
    entityName: string;
    observations: string[];
  }>): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'delete_observations', { deletions });
  }

  /**
   * Delete relations from the memory graph
   * @param relations The relations to delete
   * @returns The result of the operation
   */
  public async deleteRelations(relations: Array<{
    from: string;
    to: string;
    relationType: string;
  }>): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'delete_relations', { relations });
  }

  /**
   * Open specific nodes in the memory graph
   * @param names The names of the nodes to open
   * @returns The result of the operation
   */
  public async openNodes(names: string[]): Promise<IMCPFunctionCallResult> {
    return this.mcpClient.callFunction(this.toolName, 'open_nodes', { names });
  }
}
