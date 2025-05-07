/**
 * Enhanced Neo4j Memory Client
 *
 * An enhanced client for interacting with the Neo4j Memory MCP tool
 * that supports multiple connection methods and environments.
 */

import * as vscode from 'vscode';
import { EnhancedMCPClient, ConnectionMethod } from '../mcp/enhancedMcpClient';
import { IMCPFunctionCallResult } from '../mcp/mcpTypes';
import networkConfig, { ServiceType } from '../utils/networkConfig';

/**
 * Enhanced Neo4j Memory Client for interacting with the Neo4j Memory MCP tool
 */
export class EnhancedNeo4jMemoryClient {
  private mcpClient: EnhancedMCPClient;
  private outputChannel: vscode.OutputChannel;

  /**
   * Create a new Enhanced Neo4j Memory client
   * @param connectionMethod Optional connection method (auto-detected if not provided)
   */
  constructor(connectionMethod?: ConnectionMethod) {
    this.mcpClient = new EnhancedMCPClient(ServiceType.MCPNeo4jMemory, connectionMethod);
    this.outputChannel = vscode.window.createOutputChannel('Adamize Neo4j Memory Client');

    // Show output channel in development environment
    if (networkConfig.getCurrentEnvironment() === 'development') {
      this.outputChannel.show();
    }
  }

  /**
   * Connect to the Neo4j Memory MCP tool
   * @returns True if connected successfully
   */
  public async connect(): Promise<boolean> {
    this.logInfo('Connecting to Neo4j Memory MCP tool');
    return this.mcpClient.connect();
  }

  /**
   * Search for nodes in the memory graph
   * @param query The search query
   * @returns The search results
   */
  public async searchNodes(query: string): Promise<IMCPFunctionCallResult> {
    this.logInfo(`Searching for nodes with query: ${query}`);
    return this.mcpClient.callFunction('search_nodes', { query });
  }

  /**
   * Read the entire memory graph
   * @returns The memory graph
   */
  public async readGraph(): Promise<IMCPFunctionCallResult> {
    this.logInfo('Reading entire memory graph');
    return this.mcpClient.callFunction('read_graph', {});
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
    this.logInfo(`Creating ${entities.length} entities`);
    return this.mcpClient.callFunction('create_entities', { entities });
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
    this.logInfo(`Creating ${relations.length} relations`);
    return this.mcpClient.callFunction('create_relations', { relations });
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
    this.logInfo(`Adding observations to ${observations.length} entities`);
    return this.mcpClient.callFunction('add_observations', { observations });
  }

  /**
   * Delete entities from the memory graph
   * @param entityNames The names of the entities to delete
   * @returns The result of the operation
   */
  public async deleteEntities(entityNames: string[]): Promise<IMCPFunctionCallResult> {
    this.logInfo(`Deleting ${entityNames.length} entities`);
    return this.mcpClient.callFunction('delete_entities', { entityNames });
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
    this.logInfo(`Deleting observations from ${deletions.length} entities`);
    return this.mcpClient.callFunction('delete_observations', { deletions });
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
    this.logInfo(`Deleting ${relations.length} relations`);
    return this.mcpClient.callFunction('delete_relations', { relations });
  }

  /**
   * Open specific nodes in the memory graph
   * @param names The names of the nodes to open
   * @returns The result of the operation
   */
  public async openNodes(names: string[]): Promise<IMCPFunctionCallResult> {
    this.logInfo(`Opening ${names.length} nodes`);
    return this.mcpClient.callFunction('open_nodes', { names });
  }

  /**
   * Log an info message
   * @param message The message to log
   */
  private logInfo(message: string): void {
    this.outputChannel.appendLine(`[INFO] ${message}`);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param error Optional error object
   */
  /* private logError(message: string, error?: any): void {
    this.outputChannel.appendLine(`[ERROR] ${message}`);
    if (error) {
      this.outputChannel.appendLine(`Error details: ${error}`);
    }
  } */
}
