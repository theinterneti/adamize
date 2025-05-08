/**
 * MCP Tool Registry
 *
 * Registry for MCP tools and functions.
 * @implements REQ-MCP-002, REQ-MCP-003
 * @implements REQ-MCP-050 Register tools with metadata
 * @implements REQ-MCP-051 Detect appropriate tools from user prompts
 * @implements REQ-MCP-052 Generate format instructions for tools
 * @implements REQ-MCP-053 Generate example arguments for tool schemas
 */

import * as vscode from 'vscode';
import { MCPTool, IMCPParameterSchema } from './mcpTypes';

/**
 * Tool metadata for enhanced tool discovery and usage
 */
export interface ToolMetadata {
  /** Keywords that help identify when this tool should be used */
  keywords: string[];
  /** Example arguments for this tool */
  exampleArgs?: Record<string, unknown>;
  /** Custom format instructions for this tool */
  formatInstructions?: string;
  /** Categories this tool belongs to */
  categories?: string[];
  /** Priority for tool selection (higher = more likely to be selected) */
  priority?: number;
}

/**
 * MCP Tool Registry
 */
export class MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private metadata: Map<string, ToolMetadata> = new Map();
  private outputChannel: vscode.OutputChannel;

  /**
   * Create a new MCP tool registry
   * @param outputChannel Output channel for logging
   */
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Register a tool
   * @param tool Tool to register
   * @param metadata Optional metadata for the tool
   */
  registerTool(tool: MCPTool, metadata?: ToolMetadata): void {
    this.log(`Registering tool: ${tool.name}`);
    this.tools.set(tool.name, tool);

    // Register metadata if provided, or create default metadata
    if (metadata) {
      this.metadata.set(tool.name, metadata);
    } else {
      // Create default metadata with tool name and description as keywords
      const defaultKeywords = [
        tool.name,
        ...tool.description.toLowerCase().split(/\s+/).filter(word => word.length > 3)
      ];

      this.metadata.set(tool.name, {
        keywords: [...new Set(defaultKeywords)], // Remove duplicates
        exampleArgs: this.generateExampleArgs(tool.name, tool.schema.functions[0]?.name)
      });
    }
  }

  /**
   * Unregister a tool
   * @param toolName Name of the tool to unregister
   */
  unregisterTool(toolName: string): void {
    this.log(`Unregistering tool: ${toolName}`);
    this.tools.delete(toolName);
    this.metadata.delete(toolName);
  }

  /**
   * Get a tool by name
   * @param toolName Tool name
   * @returns Tool or undefined if not found
   */
  getTool(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get tool metadata
   * @param toolName Tool name
   * @returns Tool metadata or undefined if not found
   */
  getToolMetadata(toolName: string): ToolMetadata | undefined {
    return this.metadata.get(toolName);
  }

  /**
   * Update tool metadata
   * @param toolName Tool name
   * @param metadata New metadata
   */
  updateToolMetadata(toolName: string, metadata: Partial<ToolMetadata>): void {
    const existingMetadata = this.metadata.get(toolName);
    if (existingMetadata) {
      this.metadata.set(toolName, { ...existingMetadata, ...metadata });
      this.log(`Updated metadata for tool: ${toolName}`);
    } else {
      this.log(`Cannot update metadata for non-existent tool: ${toolName}`);
    }
  }

  /**
   * Get all registered tools
   * @returns Array of registered tools
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool function
   * @param toolName Tool name
   * @param functionName Function name
   * @param parameters Function parameters
   * @returns Function result
   */
  async executeFunction(
    toolName: string,
    functionName: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    const tool = this.getTool(toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    this.log(`Executing function: ${toolName}.${functionName}`);
    return tool.execute(functionName, parameters);
  }

  /**
   * Get tool instructions for LLM
   * @returns Tool instructions as a string
   */
  getToolInstructions(): string | undefined {
    if (this.tools.size === 0) {
      return undefined;
    }

    let instructions = 'You have access to the following tools:\n\n';

    for (const tool of this.tools.values()) {
      instructions += `## ${tool.name}\n${tool.description}\n\n`;

      // Add metadata keywords if available
      const metadata = this.metadata.get(tool.name);
      if (metadata && metadata.keywords && metadata.keywords.length > 0) {
        instructions += `Keywords: ${metadata.keywords.join(', ')}\n\n`;
      }

      for (const func of tool.schema.functions) {
        instructions += `### ${func.name}\n${func.description}\n\n`;
        instructions += 'Parameters:\n';

        for (const param of func.parameters) {
          instructions += `- ${param.name} (${param.type}${param.required ? ', required' : ''}): ${param.description}\n`;
        }

        // Add example usage
        const exampleArgs = this.generateExampleArgs(tool.name, func.name);
        if (exampleArgs) {
          instructions += '\nExample usage:\n```json\n';
          instructions += JSON.stringify({
            tool: tool.name,
            function: func.name,
            parameters: exampleArgs
          }, null, 2);
          instructions += '\n```\n\n';
        }
      }

      // Add custom format instructions if available
      if (metadata && metadata.formatInstructions) {
        instructions += `\nSpecial instructions for ${tool.name}:\n${metadata.formatInstructions}\n\n`;
      }
    }

    instructions += 'To use a tool, respond with a message in this format:\n';
    instructions += '```json\n{\n  "tool": "tool_name",\n  "function": "function_name",\n  "parameters": {\n    "param1": "value1",\n    "param2": "value2"\n  }\n}\n```\n';

    return instructions;
  }

  /**
   * Detect appropriate tools for a user prompt
   * @param prompt User prompt
   * @param maxTools Maximum number of tools to return (default: 3)
   * @returns Array of tool names sorted by relevance
   */
  detectToolsForPrompt(prompt: string, maxTools: number = 3): string[] {
    if (this.tools.size === 0) {
      return [];
    }

    const promptLower = prompt.toLowerCase();
    const toolScores: Array<{ name: string; score: number }> = [];

    // Score each tool based on keyword matches and priority
    for (const [toolName, tool] of this.tools.entries()) {
      const metadata = this.metadata.get(toolName);
      if (!metadata) continue;

      let score = 0;

      // Score based on keyword matches
      for (const keyword of metadata.keywords) {
        if (promptLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      // Add priority if available
      if (metadata.priority !== undefined) {
        score += metadata.priority;
      }

      toolScores.push({ name: toolName, score });
    }

    // Sort by score (descending) and take top N
    return toolScores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxTools)
      .filter(tool => tool.score > 0) // Only include tools with matches
      .map(tool => tool.name);
  }

  /**
   * Generate example arguments for a function
   * @param toolName Tool name
   * @param functionName Function name
   * @returns Example arguments
   */
  generateExampleArgs(toolName: string, functionName: string): Record<string, unknown> | undefined {
    const tool = this.getTool(toolName);

    if (!tool) {
      return undefined;
    }

    const func = tool.schema.functions.find(f => f.name === functionName);

    if (!func) {
      return undefined;
    }

    // Check if we have pre-defined example args in metadata
    const metadata = this.metadata.get(toolName);
    if (metadata && metadata.exampleArgs) {
      return metadata.exampleArgs;
    }

    // Otherwise generate example args from schema
    const exampleArgs: Record<string, unknown> = {};

    for (const param of func.parameters) {
      exampleArgs[param.name] = this.generateExampleValue(param);
    }

    return exampleArgs;
  }

  /**
   * Generate an example value for a parameter
   * @param param Parameter schema
   * @returns Example value
   */
  private generateExampleValue(param: IMCPParameterSchema): unknown {
    if (param.defaultValue !== undefined) {
      return param.defaultValue;
    }

    switch (param.type) {
      case 'string':
        return `Example ${param.name}`;
      case 'number':
        return 42;
      case 'boolean':
        return true;
      case 'object':
        return { example: 'value' };
      case 'array':
        return ['example'];
      default:
        return null;
    }
  }

  /**
   * Log a message to the output channel
   * @param message Message to log
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[MCP Tool Registry] ${message}`);
  }
}
