/**
 * MCP Client
 *
 * Client for interacting with Model-Control-Protocol (MCP) tools.
 */

import axios from 'axios';
import * as vscode from 'vscode';
import { IMCPFunctionCallResult, IMCPFunctionSchema, IMCPToolSchema } from './mcpTypes';

/**
 * MCP Client for interacting with MCP servers
 */
export class MCPClient {
  private outputChannel: vscode.OutputChannel;
  private toolSchemas: Record<string, IMCPToolSchema> = {};
  private serverUrl: string;

  /**
   * Create a new MCP client
   * @param serverUrl The URL of the MCP server
   */
  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.outputChannel = vscode.window.createOutputChannel('Adamize MCP Client');
    this.outputChannel.show();
  }

  /**
   * Connect to the MCP server
   * @returns True if connected successfully
   */
  public async connect(): Promise<boolean> {
    try {
      this.outputChannel.appendLine(`Connecting to MCP server at ${this.serverUrl}`);
      
      // Check if server is available
      const response = await axios.get(`${this.serverUrl}/connection`);
      
      if (response.status === 200) {
        this.outputChannel.appendLine('Connected to MCP server');
        return true;
      } else {
        this.outputChannel.appendLine(`Failed to connect to MCP server: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error connecting to MCP server: ${error}`);
      return false;
    }
  }

  /**
   * Get available tools from the MCP server
   * @returns List of available tools
   */
  public async getTools(): Promise<string[]> {
    try {
      this.outputChannel.appendLine('Getting available tools');
      
      const response = await axios.get(`${this.serverUrl}/tools`);
      
      if (response.status === 200) {
        const tools = response.data;
        this.outputChannel.appendLine(`Found ${tools.length} tools`);
        
        // Cache tool schemas
        for (const tool of tools) {
          this.toolSchemas[tool.name] = tool;
        }
        
        return tools.map((tool: IMCPToolSchema) => tool.name);
      } else {
        this.outputChannel.appendLine(`Failed to get tools: ${response.status}`);
        return [];
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error getting tools: ${error}`);
      return [];
    }
  }

  /**
   * Get schema for a specific tool
   * @param toolName The name of the tool
   * @returns The tool schema
   */
  public async getToolSchema(toolName: string): Promise<IMCPToolSchema | null> {
    try {
      // Check if we already have the schema
      if (this.toolSchemas[toolName]) {
        return this.toolSchemas[toolName];
      }
      
      this.outputChannel.appendLine(`Getting schema for tool ${toolName}`);
      
      const response = await axios.get(`${this.serverUrl}/tools/${toolName}`);
      
      if (response.status === 200) {
        const schema = response.data;
        this.toolSchemas[toolName] = schema;
        return schema;
      } else {
        this.outputChannel.appendLine(`Failed to get tool schema: ${response.status}`);
        return null;
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error getting tool schema: ${error}`);
      return null;
    }
  }

  /**
   * Call a function on a tool
   * @param toolName The name of the tool
   * @param functionName The name of the function
   * @param parameters The function parameters
   * @returns The function call result
   */
  public async callFunction(
    toolName: string,
    functionName: string,
    parameters: Record<string, any>
  ): Promise<IMCPFunctionCallResult> {
    try {
      this.outputChannel.appendLine(`Calling function ${functionName} on tool ${toolName}`);

      // Check if tool is available
      if (!this.toolSchemas[toolName]) {
        // Try to fetch schema
        const schema = await this.getToolSchema(toolName);
        if (!schema) {
          throw new Error(`Tool ${toolName} is not available`);
        }
      }

      // Check if function exists
      const functionSchema = this.toolSchemas[toolName].functions.find(
        (f) => f.name === functionName
      );
      if (!functionSchema) {
        throw new Error(`Function ${functionName} not found in tool ${toolName}`);
      }

      // Validate parameters
      this._validateParameters(parameters, functionSchema);

      // Call function
      const response = await axios.post(`${this.serverUrl}/call`, {
        tool: toolName,
        function: functionName,
        parameters,
      });

      const result = response.data;

      this.outputChannel.appendLine(
        `Function ${functionName} called successfully on tool ${toolName}`
      );

      return result;
    } catch (error) {
      this.outputChannel.appendLine(
        `Error calling function ${functionName} on tool ${toolName}: ${error}`
      );

      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate parameters against function schema
   * @param parameters The parameters to validate
   * @param functionSchema The function schema
   */
  private _validateParameters(
    parameters: Record<string, any>,
    functionSchema: IMCPFunctionSchema
  ): void {
    // TODO: Implement parameter validation
  }
}
