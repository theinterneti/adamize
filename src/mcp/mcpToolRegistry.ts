/**
 * MCP Tool Registry
 * 
 * Registry for MCP tools and functions.
 * @implements REQ-MCP-002, REQ-MCP-003
 */

import * as vscode from 'vscode';
import { MCPTool, IMCPParameterSchema, IMCPFunctionSchema } from './mcpTypes';

/**
 * MCP Tool Registry
 */
export class MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
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
   */
  registerTool(tool: MCPTool): void {
    this.log(`Registering tool: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Unregister a tool
   * @param toolName Name of the tool to unregister
   */
  unregisterTool(toolName: string): void {
    this.log(`Unregistering tool: ${toolName}`);
    this.tools.delete(toolName);
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
      
      for (const func of tool.schema.functions) {
        instructions += `### ${func.name}\n${func.description}\n\n`;
        instructions += 'Parameters:\n';
        
        for (const param of func.parameters) {
          instructions += `- ${param.name} (${param.type}${param.required ? ', required' : ''}): ${param.description}\n`;
        }
        
        instructions += '\n';
      }
    }
    
    instructions += 'To use a tool, respond with a message in this format:\n';
    instructions += '```json\n{\n  "tool": "tool_name",\n  "function": "function_name",\n  "parameters": {\n    "param1": "value1",\n    "param2": "value2"\n  }\n}\n```\n';
    
    return instructions;
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
