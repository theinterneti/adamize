# MCP Bridge Implementation Plan

This document outlines the implementation plan for the MCP Bridge component, which will serve as the core bridge between local LLMs and MCP servers in the VS Code extension.

## Overview

The MCP Bridge will adapt the bridge from the ollama-mcp-bridge to work within the VS Code extension context. It will handle tool registration, execution, and routing, and integrate with VS Code's UI and command system.

## Requirements

- **REQ-BRIDGE-001**: Adapt for VS Code extension context
- **REQ-BRIDGE-002**: Replace console-based UI with VS Code UI
- **REQ-BRIDGE-003**: Integrate with VS Code's command system
- **REQ-BRIDGE-004**: Add support for VS Code's progress API for long-running operations
- **REQ-BRIDGE-005**: Ensure proper error handling and recovery
- **REQ-BRIDGE-006**: Support multiple MCP servers
- **REQ-BRIDGE-007**: Support tool detection and routing
- **REQ-BRIDGE-008**: Support conversation history
- **REQ-BRIDGE-009**: Support system prompts

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/mcpBridge.ts

import * as vscode from 'vscode';
import { VSCodeLogger } from './vscodeLogger';
import { MCPBridgeClient } from './mcpBridgeClient';
import { LLMClient } from './llmClient';
import { ToolRegistry } from './toolRegistry';
import { 
  BridgeConfig, 
  Tool, 
  ToolCallParams, 
  ToolCallResult,
  ServerParameters
} from './bridgeTypes';

/**
 * MCP Bridge
 * 
 * Core bridge component that manages tool registration and execution.
 */
export class MCPBridge {
  private logger: VSCodeLogger;
  private config: BridgeConfig;
  private mcpClients: Map<string, MCPBridgeClient> = new Map();
  private toolToMcp: Map<string, string> = new Map();
  private toolRegistry: ToolRegistry;
  private llmClient: LLMClient;
  private tools: Tool[] = [];
  private initialized = false;
  private outputChannel: vscode.OutputChannel;
  
  /**
   * Create a new MCP Bridge
   * @param config Bridge configuration
   * @param outputChannel Output channel
   */
  constructor(
    config: BridgeConfig,
    outputChannel?: vscode.OutputChannel
  ) {
    this.config = config;
    this.outputChannel = outputChannel || vscode.window.createOutputChannel('Adamize MCP Bridge');
    this.logger = new VSCodeLogger('Adamize MCP Bridge', { showNotifications: true });
    
    // Create tool registry
    this.toolRegistry = new ToolRegistry(this.logger);
    
    // Create LLM client
    this.llmClient = new LLMClient(config.llmConfig, this.logger);
    
    // Create primary MCP client
    this.mcpClients.set(
      config.mcpServerName,
      new MCPBridgeClient(config.mcpServer, config.mcpServerName, this.logger)
    );
    
    // Create other MCP clients if available
    if (config.mcpServers) {
      Object.entries(config.mcpServers).forEach(([name, serverConfig]) => {
        if (name !== config.mcpServerName) {
          // Skip primary as it's already initialized
          this.mcpClients.set(
            name,
            new MCPBridgeClient(serverConfig, name, this.logger)
          );
        }
      });
    }
  }
  
  /**
   * Initialize the bridge
   * @returns True if initialized successfully
   */
  public async initialize(): Promise<boolean> {
    try {
      this.logger.info('Initializing MCP Bridge');
      
      // Show initialization progress
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Initializing MCP Bridge',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Connecting to MCP servers...' });
        
        // Initialize all MCP clients
        let clientsInitialized = 0;
        const totalClients = this.mcpClients.size;
        
        for (const [name, client] of this.mcpClients.entries()) {
          this.logger.info(`Connecting to MCP server: ${name}`);
          
          const connected = await client.connect();
          
          if (!connected) {
            this.logger.error(`Failed to connect to MCP server: ${name}`);
            continue;
          }
          
          clientsInitialized++;
          progress.report({ 
            increment: (clientsInitialized / totalClients) * 50,
            message: `Connected to ${clientsInitialized} of ${totalClients} MCP servers` 
          });
          
          // Get available tools
          const mcpTools = await client.getAvailableTools();
          this.logger.info(`Received ${mcpTools.length} tools from ${name}`);
          
          // Register tools and map them to this MCP
          mcpTools.forEach(tool => {
            this.toolRegistry.registerTool(tool);
            this.toolToMcp.set(tool.name, name);
            this.tools.push(tool);
          });
        }
        
        if (clientsInitialized === 0) {
          this.logger.error('Failed to connect to any MCP servers');
          return false;
        }
        
        progress.report({ 
          increment: 50,
          message: 'Initializing LLM client...' 
        });
        
        // Initialize LLM client
        const llmInitialized = await this.llmClient.initialize();
        
        if (!llmInitialized) {
          this.logger.error('Failed to initialize LLM client');
          return false;
        }
        
        // Set tools for LLM client
        this.llmClient.setTools(this.tools);
        
        progress.report({ 
          increment: 100,
          message: 'MCP Bridge initialized' 
        });
        
        this.initialized = true;
        this.logger.info('MCP Bridge initialized successfully');
        
        return true;
      });
    } catch (error) {
      this.logger.error(`Error initializing MCP Bridge: ${error}`);
      return false;
    }
  }
  
  /**
   * Process a message
   * @param message Message to process
   * @returns Response from LLM
   */
  public async processMessage(message: string): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('MCP Bridge not initialized');
      }
      
      this.logger.info('Processing message');
      
      // Detect tool from prompt
      const detectedTool = this.toolRegistry.detectToolFromPrompt(message);
      
      if (detectedTool) {
        this.logger.info(`Detected tool: ${detectedTool}`);
        
        // Get tool instructions
        const instructions = this.toolRegistry.getToolInstructions(detectedTool);
        
        if (instructions) {
          this.llmClient.systemPrompt = instructions;
          this.logger.debug('Using tool-specific instructions');
        }
      }
      
      // Show processing progress
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Processing message',
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Sending message to LLM...' });
        
        // Send message to LLM
        const response = await this.llmClient.sendMessage(message);
        
        progress.report({ increment: 50, message: 'Processing LLM response...' });
        
        // Extract tool calls
        const toolCalls = this.llmClient.extractToolCalls(response);
        
        if (toolCalls.length === 0) {
          // No tool calls, return response directly
          progress.report({ increment: 100, message: 'Done' });
          
          if (response.choices && response.choices.length > 0) {
            return response.choices[0].message.content;
          }
          
          return 'No response from LLM';
        }
        
        // Process tool calls
        this.logger.info(`Processing ${toolCalls.length} tool calls`);
        
        let finalResponse = '';
        
        for (let i = 0; i < toolCalls.length; i++) {
          const toolCall = toolCalls[i];
          
          progress.report({ 
            increment: 50 + (i / toolCalls.length) * 50,
            message: `Executing tool call ${i + 1} of ${toolCalls.length}...` 
          });
          
          // Execute tool call
          const result = await this.executeToolCall(toolCall.name, toolCall.arguments);
          
          // Add tool call result to conversation
          this.llmClient.addToolCallResult(toolCall.id, toolCall.name, result.content);
          
          // If this is the last tool call, get final response from LLM
          if (i === toolCalls.length - 1) {
            const finalLLMResponse = await this.llmClient.sendMessage('');
            
            if (finalLLMResponse.choices && finalLLMResponse.choices.length > 0) {
              finalResponse = finalLLMResponse.choices[0].message.content;
            }
          }
        }
        
        progress.report({ increment: 100, message: 'Done' });
        
        return finalResponse || 'No response from LLM';
      });
    } catch (error) {
      this.logger.error(`Error processing message: ${error}`);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Execute a tool call
   * @param toolName Tool name
   * @param args Tool arguments
   * @returns Tool call result
   */
  private async executeToolCall(toolName: string, args: any): Promise<ToolCallResult> {
    try {
      this.logger.info(`Executing tool call: ${toolName}`);
      this.logger.debug(`Tool arguments: ${JSON.stringify(args)}`);
      
      // Check if tool exists
      if (!this.toolToMcp.has(toolName)) {
        throw new Error(`Tool ${toolName} not found`);
      }
      
      // Get MCP client for this tool
      const mcpName = this.toolToMcp.get(toolName)!;
      const mcpClient = this.mcpClients.get(mcpName);
      
      if (!mcpClient) {
        throw new Error(`MCP client ${mcpName} not found`);
      }
      
      // Call tool
      const result = await mcpClient.callTool({
        name: toolName,
        arguments: args
      });
      
      this.logger.info(`Tool call executed: ${toolName}`);
      this.logger.debug(`Tool result: ${JSON.stringify(result)}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error executing tool call: ${error}`);
      
      return {
        content: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Close the bridge
   */
  public async close(): Promise<void> {
    try {
      this.logger.info('Closing MCP Bridge');
      
      // Close all MCP clients
      for (const [name, client] of this.mcpClients.entries()) {
        this.logger.info(`Closing MCP client: ${name}`);
        await client.close();
      }
      
      // Clear tool registry
      this.toolRegistry.dispose();
      
      // Clear LLM client
      this.llmClient.clearConversation();
      
      this.initialized = false;
      this.tools = [];
      this.toolToMcp.clear();
      
      this.logger.info('MCP Bridge closed');
    } catch (error) {
      this.logger.error(`Error closing MCP Bridge: ${error}`);
    }
  }
  
  /**
   * Get all tools
   * @returns Array of tools
   */
  public getTools(): Tool[] {
    return this.tools;
  }
  
  /**
   * Get LLM client
   * @returns LLM client
   */
  public getLLMClient(): LLMClient {
    return this.llmClient;
  }
  
  /**
   * Get tool registry
   * @returns Tool registry
   */
  public getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
  
  /**
   * Get MCP client
   * @param name MCP name
   * @returns MCP client or undefined if not found
   */
  public getMCPClient(name: string): MCPBridgeClient | undefined {
    return this.mcpClients.get(name);
  }
  
  /**
   * Get all MCP clients
   * @returns Map of MCP names to clients
   */
  public getMCPClients(): Map<string, MCPBridgeClient> {
    return this.mcpClients;
  }
  
  /**
   * Check if bridge is initialized
   * @returns True if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Update bridge configuration
   * @param config New configuration
   */
  public async updateConfig(config: Partial<BridgeConfig>): Promise<void> {
    try {
      // Close existing bridge
      await this.close();
      
      // Update configuration
      this.config = {
        ...this.config,
        ...config
      };
      
      // Reinitialize bridge
      await this.initialize();
    } catch (error) {
      this.logger.error(`Error updating bridge configuration: ${error}`);
    }
  }
}
```

## Test Plan

We will create tests for the MCP Bridge to ensure it meets the requirements:

1. **TEST-BRIDGE-001**: Test that the bridge can initialize successfully
2. **TEST-BRIDGE-002**: Test that the bridge can process messages
3. **TEST-BRIDGE-003**: Test that the bridge can execute tool calls
4. **TEST-BRIDGE-004**: Test that the bridge can detect tools from prompts
5. **TEST-BRIDGE-005**: Test that the bridge can handle multiple MCP servers
6. **TEST-BRIDGE-006**: Test that the bridge can handle errors gracefully
7. **TEST-BRIDGE-007**: Test that the bridge integrates with VS Code's UI
8. **TEST-BRIDGE-008**: Test that the bridge can be closed and reinitialized
9. **TEST-BRIDGE-009**: Test that the bridge can update its configuration

## Integration Plan

The MCP Bridge will be used by the MCP Bridge Manager component:

1. Create the MCP Bridge Manager to manage the bridge lifecycle
2. Integrate the bridge with VS Code's command system
3. Add UI for interacting with the bridge
4. Add configuration options for the bridge

## Next Steps

After implementing the MCP Bridge, we will move on to implementing the MCP Bridge Config Manager component.
