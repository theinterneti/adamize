# MCP Bridge Client Implementation Plan

This document outlines the implementation plan for the MCP Bridge Client component, which will handle communication with MCP servers in the VS Code extension.

## Overview

The MCP Bridge Client will adapt the MCP client from the ollama-mcp-bridge to work within the VS Code extension context. It will handle communication with MCP servers using JSON-RPC, support multiple connection methods, and integrate with VS Code's output channel for logging.

## Requirements

- **REQ-MCPCLIENT-001**: Replace process spawning with VS Code-compatible approach
- **REQ-MCPCLIENT-002**: Adapt JSON-RPC communication for VS Code
- **REQ-MCPCLIENT-003**: Integrate with VS Code's output channel for logging
- **REQ-MCPCLIENT-004**: Add support for multiple connection methods (HTTP, Docker exec, local process)
- **REQ-MCPCLIENT-005**: Ensure compatibility with existing MCP client
- **REQ-MCPCLIENT-006**: Support tool discovery and registration
- **REQ-MCPCLIENT-007**: Support function calling with parameter validation
- **REQ-MCPCLIENT-008**: Handle connection errors gracefully
- **REQ-MCPCLIENT-009**: Support multiple MCP servers

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/mcpBridgeClient.ts

import * as vscode from 'vscode';
import * as cp from 'child_process';
import axios from 'axios';
import { VSCodeLogger } from './vscodeLogger';
import { 
  ServerParameters, 
  ConnectionMethod,
  Tool,
  ToolCallParams,
  ToolCallResult,
  convertMCPToolToBridgeTool
} from './bridgeTypes';

/**
 * Message queue item
 */
interface MessageQueueItem {
  /**
   * Resolve function
   */
  resolve: (value: any) => void;
  
  /**
   * Reject function
   */
  reject: (reason?: any) => void;
  
  /**
   * Message
   */
  message: any;
}

/**
 * MCP Bridge Client
 * 
 * Handles communication with MCP servers using JSON-RPC.
 */
export class MCPBridgeClient {
  private logger: VSCodeLogger;
  private process: cp.ChildProcess | null = null;
  private stdin: NodeJS.WritableStream | null = null;
  private stdout: NodeJS.ReadableStream | null = null;
  private messageQueue: MessageQueueItem[] = [];
  private nextMessageId = 1;
  private initialized = false;
  private availableTools = new Map<string, Tool>();
  private serverConfig: ServerParameters;
  private serverName: string;
  private connectionMethod: ConnectionMethod;
  private httpBaseUrl: string | null = null;
  
  /**
   * Create a new MCP Bridge Client
   * @param serverConfig Server configuration
   * @param serverName Server name
   * @param logger Logger instance
   */
  constructor(
    serverConfig: ServerParameters,
    serverName: string,
    logger?: VSCodeLogger
  ) {
    this.serverConfig = serverConfig;
    this.serverName = serverName;
    this.logger = logger || new VSCodeLogger(`Adamize MCP Bridge Client (${serverName})`);
    
    // Determine connection method
    this.connectionMethod = serverConfig.connectionMethod || ConnectionMethod.LocalProcess;
    
    // Set HTTP base URL if using HTTP connection method
    if (this.connectionMethod === ConnectionMethod.HTTP && serverConfig.url) {
      this.httpBaseUrl = serverConfig.url;
    }
  }
  
  /**
   * Connect to the MCP server
   * @returns True if connected successfully
   */
  public async connect(): Promise<boolean> {
    try {
      this.logger.info(`Connecting to MCP server (${this.serverName}) using ${this.connectionMethod} method`);
      
      switch (this.connectionMethod) {
        case ConnectionMethod.HTTP:
          return await this.connectHttp();
        case ConnectionMethod.DockerExec:
          return await this.connectDockerExec();
        case ConnectionMethod.LocalProcess:
          return await this.connectLocalProcess();
        default:
          throw new Error(`Unsupported connection method: ${this.connectionMethod}`);
      }
    } catch (error) {
      this.logger.error(`Error connecting to MCP server: ${error}`);
      return false;
    }
  }
  
  /**
   * Connect to MCP server via HTTP
   * @returns True if connected successfully
   */
  private async connectHttp(): Promise<boolean> {
    try {
      if (!this.httpBaseUrl) {
        throw new Error('HTTP base URL not set');
      }
      
      // Check if server is available
      const response = await axios.get(`${this.httpBaseUrl}/connection`);
      
      if (response.status === 200) {
        this.logger.info(`Connected to MCP server via HTTP: ${this.httpBaseUrl}`);
        this.initialized = true;
        return true;
      } else {
        this.logger.error(`Failed to connect to MCP server via HTTP: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error connecting to MCP server via HTTP: ${error}`);
      return false;
    }
  }
  
  /**
   * Connect to MCP server via Docker exec
   * @returns True if connected successfully
   */
  private async connectDockerExec(): Promise<boolean> {
    try {
      if (!this.serverConfig.containerId) {
        throw new Error('Docker container ID not set');
      }
      
      // Start process using docker exec
      const dockerCommand = 'docker';
      const dockerArgs = [
        'exec',
        '-i',
        this.serverConfig.containerId,
        this.serverConfig.command,
        ...(this.serverConfig.args || [])
      ];
      
      this.logger.debug(`Starting Docker exec: ${dockerCommand} ${dockerArgs.join(' ')}`);
      
      // Spawn process
      this.process = cp.spawn(dockerCommand, dockerArgs, {
        env: {
          ...process.env,
          ...this.serverConfig.env
        }
      });
      
      // Set up streams
      this.stdin = this.process.stdin;
      this.stdout = this.process.stdout;
      
      // Set up event handlers
      return this.setupProcessEventHandlers();
    } catch (error) {
      this.logger.error(`Error connecting to MCP server via Docker exec: ${error}`);
      return false;
    }
  }
  
  /**
   * Connect to MCP server via local process
   * @returns True if connected successfully
   */
  private async connectLocalProcess(): Promise<boolean> {
    try {
      // Start process
      this.logger.debug(`Starting local process: ${this.serverConfig.command} ${(this.serverConfig.args || []).join(' ')}`);
      
      // Spawn process
      this.process = cp.spawn(this.serverConfig.command, this.serverConfig.args || [], {
        env: {
          ...process.env,
          ...this.serverConfig.env
        }
      });
      
      // Set up streams
      this.stdin = this.process.stdin;
      this.stdout = this.process.stdout;
      
      // Set up event handlers
      return this.setupProcessEventHandlers();
    } catch (error) {
      this.logger.error(`Error connecting to MCP server via local process: ${error}`);
      return false;
    }
  }
  
  /**
   * Set up process event handlers
   * @returns True if set up successfully
   */
  private setupProcessEventHandlers(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.process || !this.stdout) {
        this.logger.error('Process or stdout not available');
        resolve(false);
        return;
      }
      
      // Handle process exit
      this.process.on('exit', (code) => {
        this.logger.info(`MCP server process exited with code ${code}`);
        this.initialized = false;
        this.process = null;
        this.stdin = null;
        this.stdout = null;
      });
      
      // Handle process error
      this.process.on('error', (error) => {
        this.logger.error(`MCP server process error: ${error}`);
        this.initialized = false;
      });
      
      // Handle stdout data
      let buffer = '';
      this.stdout.on('data', (data) => {
        const chunk = data.toString();
        buffer += chunk;
        
        // Process complete lines
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.substring(0, newlineIndex);
          buffer = buffer.substring(newlineIndex + 1);
          
          if (line.trim()) {
            this.handleResponse(line);
          }
        }
      });
      
      // Initialize connection
      this.sendMessage({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {},
        id: this.nextMessageId++
      }).then(() => {
        this.logger.info('MCP server initialized');
        this.initialized = true;
        resolve(true);
      }).catch((error) => {
        this.logger.error(`Error initializing MCP server: ${error}`);
        resolve(false);
      });
    });
  }
  
  /**
   * Handle response from MCP server
   * @param line Response line
   */
  private handleResponse(line: string): void {
    try {
      const response = JSON.parse(line);
      this.logger.debug(`Received response: ${JSON.stringify(response)}`);
      
      // Find matching request in queue
      if (response.id !== undefined) {
        const index = this.messageQueue.findIndex(item => item.message.id === response.id);
        
        if (index !== -1) {
          const item = this.messageQueue[index];
          this.messageQueue.splice(index, 1);
          
          if (response.error) {
            item.reject(new Error(response.error.message));
          } else {
            item.resolve(response.result);
          }
        } else {
          this.logger.warn(`Received response for unknown request ID: ${response.id}`);
        }
      } else if (response.method === 'tools/update') {
        // Handle tools update notification
        this.logger.info('Received tools update notification');
        this.getAvailableTools().catch(error => {
          this.logger.error(`Error updating tools: ${error}`);
        });
      }
    } catch (error) {
      this.logger.error(`Error handling response: ${error}`);
    }
  }
  
  /**
   * Send message to MCP server
   * @param message Message to send
   * @returns Promise that resolves with the response
   */
  private async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.connectionMethod === ConnectionMethod.HTTP) {
        // Send message via HTTP
        this.sendHttpMessage(message).then(resolve).catch(reject);
        return;
      }
      
      if (!this.stdin || !this.stdout) {
        reject(new Error('Connection not established'));
        return;
      }
      
      // Only add to message queue if it's a request (has an id)
      if (message.id !== undefined) {
        this.messageQueue.push({ resolve, reject, message });
      }
      
      const messageStr = JSON.stringify(message) + '\n';
      this.logger.debug(`Sending message: ${messageStr.trim()}`);
      
      this.stdin.write(messageStr, (error) => {
        if (error) {
          this.logger.error(`Failed to send message: ${error.message}`);
          reject(error);
          return;
        }
        
        // If it's a notification (no id), resolve immediately
        if (message.id === undefined) {
          resolve(undefined);
        }
      });
    });
  }
  
  /**
   * Send message to MCP server via HTTP
   * @param message Message to send
   * @returns Promise that resolves with the response
   */
  private async sendHttpMessage(message: any): Promise<any> {
    try {
      if (!this.httpBaseUrl) {
        throw new Error('HTTP base URL not set');
      }
      
      this.logger.debug(`Sending HTTP message: ${JSON.stringify(message)}`);
      
      const response = await axios.post(this.httpBaseUrl, message);
      
      this.logger.debug(`Received HTTP response: ${JSON.stringify(response.data)}`);
      
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      
      return response.data.result;
    } catch (error) {
      this.logger.error(`Error sending HTTP message: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get available tools from MCP server
   * @returns Available tools
   */
  public async getAvailableTools(): Promise<Tool[]> {
    try {
      if (!this.initialized) {
        throw new Error('MCP server not initialized');
      }
      
      this.logger.info('Getting available tools');
      
      const message = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: this.nextMessageId++
      };
      
      const response = await this.sendMessage(message);
      
      this.logger.debug(`Available tools: ${JSON.stringify(response)}`);
      
      // Clear existing tools
      this.availableTools.clear();
      
      // Convert and store tools
      const tools: Tool[] = [];
      
      for (const tool of response) {
        const convertedTool = convertMCPToolToBridgeTool(tool, this.serverName);
        this.availableTools.set(convertedTool.name, convertedTool);
        tools.push(convertedTool);
      }
      
      this.logger.info(`Found ${tools.length} tools`);
      
      return tools;
    } catch (error) {
      this.logger.error(`Error getting available tools: ${error}`);
      return [];
    }
  }
  
  /**
   * Call a tool
   * @param params Tool call parameters
   * @returns Tool call result
   */
  public async callTool(params: ToolCallParams): Promise<ToolCallResult> {
    try {
      if (!this.initialized) {
        throw new Error('MCP server not initialized');
      }
      
      this.logger.info(`Calling tool: ${params.name}`);
      this.logger.debug(`Tool arguments: ${JSON.stringify(params.arguments)}`);
      
      const message = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: params.name,
          arguments: params.arguments
        },
        id: this.nextMessageId++
      };
      
      const response = await this.sendMessage(message);
      
      this.logger.debug(`Tool call response: ${JSON.stringify(response)}`);
      
      return {
        content: response
      };
    } catch (error) {
      this.logger.error(`Error calling tool: ${error}`);
      
      return {
        content: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Close connection to MCP server
   */
  public async close(): Promise<void> {
    this.logger.info('Closing connection');
    
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    this.stdin = null;
    this.stdout = null;
    this.initialized = false;
    this.availableTools.clear();
    
    this.logger.info('Connection closed');
  }
  
  /**
   * Get tool by name
   * @param name Tool name
   * @returns Tool or undefined if not found
   */
  public getTool(name: string): Tool | undefined {
    return this.availableTools.get(name);
  }
  
  /**
   * Check if tool exists
   * @param name Tool name
   * @returns True if tool exists
   */
  public hasTool(name: string): boolean {
    return this.availableTools.has(name);
  }
  
  /**
   * Get all available tools
   * @returns Map of tool names to tools
   */
  public getTools(): Map<string, Tool> {
    return this.availableTools;
  }
}
```

## Test Plan

We will create tests for the MCP Bridge Client to ensure it meets the requirements:

1. **TEST-MCPCLIENT-001**: Test that the client can connect to an MCP server via local process
2. **TEST-MCPCLIENT-002**: Test that the client can connect to an MCP server via HTTP
3. **TEST-MCPCLIENT-003**: Test that the client can connect to an MCP server via Docker exec
4. **TEST-MCPCLIENT-004**: Test that the client can get available tools
5. **TEST-MCPCLIENT-005**: Test that the client can call a tool
6. **TEST-MCPCLIENT-006**: Test that the client handles connection errors gracefully
7. **TEST-MCPCLIENT-007**: Test that the client handles tool call errors gracefully
8. **TEST-MCPCLIENT-008**: Test that the client can close the connection
9. **TEST-MCPCLIENT-009**: Test that the client integrates with VS Code's output channel

## Integration Plan

The MCP Bridge Client will be used by the MCP Bridge component:

1. Update the MCP Bridge to use the new MCP Bridge Client
2. Ensure compatibility with existing MCP client
3. Add support for VS Code-specific features

## Next Steps

After implementing the MCP Bridge Client, we will move on to adapting the LLM Client component.
