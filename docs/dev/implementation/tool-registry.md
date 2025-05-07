# Tool Registry Implementation Plan

This document outlines the implementation plan for the Tool Registry component, which will manage tool registration and discovery in the VS Code extension.

## Overview

The Tool Registry will adapt the tool registry from the ollama-mcp-bridge to work within the VS Code extension context. It will handle tool registration, discovery, and detection from user prompts, and integrate with VS Code's command system.

## Requirements

- **REQ-TOOLREG-001**: Adapt for VS Code extension context
- **REQ-TOOLREG-002**: Add support for VS Code commands as tools
- **REQ-TOOLREG-003**: Integrate with VS Code's command system
- **REQ-TOOLREG-004**: Add support for tool categorization and filtering
- **REQ-TOOLREG-005**: Support tool detection from user prompts
- **REQ-TOOLREG-006**: Generate format instructions for tools
- **REQ-TOOLREG-007**: Generate example arguments for tool schemas
- **REQ-TOOLREG-008**: Support multiple MCP servers

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/toolRegistry.ts

import * as vscode from 'vscode';
import { VSCodeLogger } from './vscodeLogger';
import { Tool } from './bridgeTypes';

/**
 * Tool Registry
 * 
 * Manages tool registration and discovery.
 */
export class ToolRegistry {
  private logger: VSCodeLogger;
  private tools: Map<string, Tool> = new Map();
  private toolsByCategory: Map<string, Set<string>> = new Map();
  private toolsByKeyword: Map<string, Set<string>> = new Map();
  private vsCodeCommands: Map<string, vscode.Disposable> = new Map();
  
  /**
   * Create a new Tool Registry
   * @param logger Logger instance
   */
  constructor(logger?: VSCodeLogger) {
    this.logger = logger || new VSCodeLogger('Adamize Tool Registry');
  }
  
  /**
   * Register a tool
   * @param tool Tool to register
   * @returns True if registered successfully
   */
  public registerTool(tool: Tool): boolean {
    try {
      // Check if tool already exists
      if (this.tools.has(tool.name)) {
        this.logger.warn(`Tool ${tool.name} already registered`);
        return false;
      }
      
      // Register tool
      this.tools.set(tool.name, tool);
      this.logger.info(`Registered tool: ${tool.name}`);
      
      // Register tool by category
      const category = tool.mcpServer || 'default';
      if (!this.toolsByCategory.has(category)) {
        this.toolsByCategory.set(category, new Set());
      }
      this.toolsByCategory.get(category)!.add(tool.name);
      
      // Register tool by keywords
      if (tool.keywords && tool.keywords.length > 0) {
        tool.keywords.forEach(keyword => {
          if (!this.toolsByKeyword.has(keyword)) {
            this.toolsByKeyword.set(keyword, new Set());
          }
          this.toolsByKeyword.get(keyword)!.add(tool.name);
        });
      }
      
      // Register VS Code command if specified
      if (tool.command) {
        this.registerVSCodeCommand(tool);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error registering tool ${tool.name}: ${error}`);
      return false;
    }
  }
  
  /**
   * Register a VS Code command for a tool
   * @param tool Tool to register command for
   */
  private registerVSCodeCommand(tool: Tool): void {
    try {
      // Check if command already registered
      if (this.vsCodeCommands.has(tool.command!)) {
        this.logger.warn(`Command ${tool.command} already registered`);
        return;
      }
      
      // Register command
      const disposable = vscode.commands.registerCommand(tool.command!, async (...args) => {
        try {
          this.logger.info(`Executing command ${tool.command}`);
          
          // Show tool execution in progress
          vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Executing ${tool.name}`,
            cancellable: false
          }, async (progress) => {
            progress.report({ increment: 0 });
            
            // Execute command
            const result = await vscode.commands.executeCommand(tool.command!, ...args);
            
            progress.report({ increment: 100 });
            
            return result;
          });
        } catch (error) {
          this.logger.error(`Error executing command ${tool.command}: ${error}`);
          vscode.window.showErrorMessage(`Error executing ${tool.name}: ${error}`);
        }
      });
      
      // Store disposable
      this.vsCodeCommands.set(tool.command!, disposable);
      
      this.logger.info(`Registered command: ${tool.command}`);
    } catch (error) {
      this.logger.error(`Error registering command ${tool.command}: ${error}`);
    }
  }
  
  /**
   * Unregister a tool
   * @param toolName Tool name
   * @returns True if unregistered successfully
   */
  public unregisterTool(toolName: string): boolean {
    try {
      // Check if tool exists
      if (!this.tools.has(toolName)) {
        this.logger.warn(`Tool ${toolName} not registered`);
        return false;
      }
      
      const tool = this.tools.get(toolName)!;
      
      // Unregister tool
      this.tools.delete(toolName);
      
      // Unregister tool by category
      const category = tool.mcpServer || 'default';
      if (this.toolsByCategory.has(category)) {
        this.toolsByCategory.get(category)!.delete(toolName);
      }
      
      // Unregister tool by keywords
      if (tool.keywords && tool.keywords.length > 0) {
        tool.keywords.forEach(keyword => {
          if (this.toolsByKeyword.has(keyword)) {
            this.toolsByKeyword.get(keyword)!.delete(toolName);
          }
        });
      }
      
      // Unregister VS Code command if specified
      if (tool.command && this.vsCodeCommands.has(tool.command)) {
        this.vsCodeCommands.get(tool.command)!.dispose();
        this.vsCodeCommands.delete(tool.command);
      }
      
      this.logger.info(`Unregistered tool: ${toolName}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error unregistering tool ${toolName}: ${error}`);
      return false;
    }
  }
  
  /**
   * Get a tool by name
   * @param toolName Tool name
   * @returns Tool or undefined if not found
   */
  public getTool(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }
  
  /**
   * Get all tools
   * @returns Map of tool names to tools
   */
  public getTools(): Map<string, Tool> {
    return this.tools;
  }
  
  /**
   * Get tools by category
   * @param category Category name
   * @returns Array of tools
   */
  public getToolsByCategory(category: string): Tool[] {
    if (!this.toolsByCategory.has(category)) {
      return [];
    }
    
    return Array.from(this.toolsByCategory.get(category)!)
      .map(toolName => this.tools.get(toolName)!)
      .filter(Boolean);
  }
  
  /**
   * Get tools by keyword
   * @param keyword Keyword
   * @returns Array of tools
   */
  public getToolsByKeyword(keyword: string): Tool[] {
    if (!this.toolsByKeyword.has(keyword)) {
      return [];
    }
    
    return Array.from(this.toolsByKeyword.get(keyword)!)
      .map(toolName => this.tools.get(toolName)!)
      .filter(Boolean);
  }
  
  /**
   * Detect tool from user prompt
   * @param prompt User prompt
   * @returns Tool name or undefined if no tool detected
   */
  public detectToolFromPrompt(prompt: string): string | undefined {
    try {
      // Convert prompt to lowercase for case-insensitive matching
      const lowerPrompt = prompt.toLowerCase();
      
      // Check for exact tool name matches
      for (const [toolName, tool] of this.tools.entries()) {
        if (lowerPrompt.includes(toolName.toLowerCase())) {
          this.logger.info(`Detected tool ${toolName} from prompt`);
          return toolName;
        }
      }
      
      // Check for keyword matches
      for (const [keyword, toolNames] of this.toolsByKeyword.entries()) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          // Get first tool with this keyword
          const toolName = Array.from(toolNames)[0];
          this.logger.info(`Detected tool ${toolName} from keyword ${keyword}`);
          return toolName;
        }
      }
      
      // No tool detected
      return undefined;
    } catch (error) {
      this.logger.error(`Error detecting tool from prompt: ${error}`);
      return undefined;
    }
  }
  
  /**
   * Get tool instructions
   * @param toolName Tool name
   * @returns Tool instructions or undefined if not found
   */
  public getToolInstructions(toolName: string): string | undefined {
    try {
      const tool = this.tools.get(toolName);
      
      if (!tool) {
        return undefined;
      }
      
      // Generate instructions
      let instructions = `You are a helpful assistant that can use the ${tool.name} tool.\n\n`;
      
      instructions += `Tool: ${tool.name}\n`;
      instructions += `Description: ${tool.description}\n\n`;
      
      instructions += 'To use this tool, you need to generate a JSON object with the following structure:\n\n';
      
      // Add schema information
      instructions += '```json\n';
      instructions += JSON.stringify(tool.inputSchema, null, 2);
      instructions += '\n```\n\n';
      
      // Add example if available
      const example = this.generateExampleArguments(tool);
      
      if (example) {
        instructions += 'Example:\n\n';
        instructions += '```json\n';
        instructions += JSON.stringify(example, null, 2);
        instructions += '\n```\n\n';
      }
      
      instructions += 'When you want to use this tool, format your response like this:\n\n';
      instructions += '```\n';
      instructions += `I'll use the ${tool.name} tool to help with that.\n\n`;
      instructions += `<tool>${tool.name}</tool>\n`;
      instructions += `<args>\n`;
      instructions += `{\n  // JSON arguments here\n}\n`;
      instructions += `</args>\n`;
      instructions += '```\n\n';
      
      instructions += 'Wait for the tool response before continuing.';
      
      return instructions;
    } catch (error) {
      this.logger.error(`Error generating tool instructions: ${error}`);
      return undefined;
    }
  }
  
  /**
   * Generate example arguments for a tool
   * @param tool Tool
   * @returns Example arguments or undefined if not possible
   */
  public generateExampleArguments(tool: Tool): Record<string, any> | undefined {
    try {
      const schema = tool.inputSchema;
      
      if (!schema || !schema.properties) {
        return undefined;
      }
      
      const example: Record<string, any> = {};
      
      // Generate example for each property
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        example[propName] = this.generateExampleValue(propSchema);
      }
      
      return example;
    } catch (error) {
      this.logger.error(`Error generating example arguments: ${error}`);
      return undefined;
    }
  }
  
  /**
   * Generate example value for a schema
   * @param schema Schema
   * @returns Example value
   */
  private generateExampleValue(schema: any): any {
    // Handle different schema types
    switch (schema.type) {
      case 'string':
        return schema.example || schema.default || 'example';
      case 'number':
        return schema.example || schema.default || 42;
      case 'integer':
        return schema.example || schema.default || 42;
      case 'boolean':
        return schema.example || schema.default || true;
      case 'array':
        if (schema.items) {
          return [this.generateExampleValue(schema.items)];
        }
        return [];
      case 'object':
        if (schema.properties) {
          const example: Record<string, any> = {};
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            example[propName] = this.generateExampleValue(propSchema);
          }
          return example;
        }
        return {};
      default:
        return null;
    }
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    try {
      // Dispose of VS Code commands
      for (const disposable of this.vsCodeCommands.values()) {
        disposable.dispose();
      }
      
      this.vsCodeCommands.clear();
      this.tools.clear();
      this.toolsByCategory.clear();
      this.toolsByKeyword.clear();
      
      this.logger.info('Tool registry disposed');
    } catch (error) {
      this.logger.error(`Error disposing tool registry: ${error}`);
    }
  }
}
```

## Test Plan

We will create tests for the Tool Registry to ensure it meets the requirements:

1. **TEST-TOOLREG-001**: Test that tools can be registered and unregistered
2. **TEST-TOOLREG-002**: Test that tools can be retrieved by name, category, and keyword
3. **TEST-TOOLREG-003**: Test that tools can be detected from user prompts
4. **TEST-TOOLREG-004**: Test that tool instructions can be generated
5. **TEST-TOOLREG-005**: Test that example arguments can be generated
6. **TEST-TOOLREG-006**: Test that VS Code commands can be registered and executed
7. **TEST-TOOLREG-007**: Test that the registry integrates with VS Code's command system
8. **TEST-TOOLREG-008**: Test that the registry handles errors gracefully

## Integration Plan

The Tool Registry will be used by the MCP Bridge component:

1. Update the MCP Bridge to use the new Tool Registry
2. Ensure compatibility with existing tool registry
3. Add support for VS Code-specific features

## Next Steps

After implementing the Tool Registry, we will move on to adapting the MCP Bridge component.
