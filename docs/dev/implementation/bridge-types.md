# Bridge Types Implementation Plan

This document outlines the implementation plan for the Bridge Types component, which will define the types used by the bridge components in the VS Code extension.

## Overview

The Bridge Types component will adapt the types from the ollama-mcp-bridge to work within the VS Code extension context. It will define types for the bridge components, MCP servers, LLM configuration, and tool registry.

## Requirements

- **REQ-TYPES-001**: Adapt types to work with VS Code extension context
- **REQ-TYPES-002**: Add VS Code-specific types
- **REQ-TYPES-003**: Ensure compatibility with existing MCP types
- **REQ-TYPES-004**: Add types for configuration management
- **REQ-TYPES-005**: Support multiple connection methods
- **REQ-TYPES-006**: Support multiple MCP servers

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/bridgeTypes.ts

import * as vscode from 'vscode';
import { IMCPToolSchema, IMCPFunctionSchema } from '../mcpTypes';

/**
 * Connection method for MCP servers
 */
export enum ConnectionMethod {
  /**
   * Connect via HTTP
   */
  HTTP = 'http',
  
  /**
   * Connect via Docker exec
   */
  DockerExec = 'docker-exec',
  
  /**
   * Connect via local process
   */
  LocalProcess = 'local-process',
}

/**
 * MCP server parameters
 */
export interface ServerParameters {
  /**
   * Command to run
   */
  command: string;
  
  /**
   * Command arguments
   */
  args?: string[];
  
  /**
   * Allowed directory for filesystem operations
   */
  allowedDirectory?: string;
  
  /**
   * Environment variables
   */
  env?: Record<string, string>;
  
  /**
   * Connection method
   */
  connectionMethod?: ConnectionMethod;
  
  /**
   * HTTP URL (for HTTP connection method)
   */
  url?: string;
  
  /**
   * Docker container ID (for Docker exec connection method)
   */
  containerId?: string;
}

/**
 * LLM configuration
 */
export interface LLMConfig {
  /**
   * Model name
   */
  model: string;
  
  /**
   * Base URL for Ollama API
   */
  baseUrl: string;
  
  /**
   * API key (if required)
   */
  apiKey?: string;
  
  /**
   * Temperature (0.0 - 1.0)
   */
  temperature?: number;
  
  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;
  
  /**
   * System prompt
   */
  systemPrompt?: string;
  
  /**
   * Connection method
   */
  connectionMethod?: ConnectionMethod;
  
  /**
   * Docker container ID (for Docker exec connection method)
   */
  containerId?: string;
}

/**
 * Bridge configuration
 */
export interface BridgeConfig {
  /**
   * Primary MCP server
   */
  mcpServer: ServerParameters;
  
  /**
   * Primary MCP server name
   */
  mcpServerName: string;
  
  /**
   * All MCP servers
   */
  mcpServers?: {
    [key: string]: ServerParameters;
  };
  
  /**
   * LLM configuration
   */
  llmConfig: LLMConfig;
  
  /**
   * System prompt
   */
  systemPrompt?: string;
  
  /**
   * Output channel
   */
  outputChannel?: vscode.OutputChannel;
}

/**
 * Tool definition
 */
export interface Tool {
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool description
   */
  description: string;
  
  /**
   * Input schema
   */
  inputSchema: {
    /**
     * Schema type
     */
    type: string;
    
    /**
     * Schema properties
     */
    properties: Record<string, any>;
    
    /**
     * Required properties
     */
    required?: string[];
  };
  
  /**
   * MCP server name
   */
  mcpServer?: string;
  
  /**
   * Keywords for tool detection
   */
  keywords?: string[];
  
  /**
   * VS Code command (for VS Code tools)
   */
  command?: string;
}

/**
 * Tool call parameters
 */
export interface ToolCallParams {
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool arguments
   */
  arguments: Record<string, any>;
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  /**
   * Result content
   */
  content: any;
  
  /**
   * Error message (if any)
   */
  error?: string;
}

/**
 * Message from LLM
 */
export interface LLMMessage {
  /**
   * Message role (system, user, assistant)
   */
  role: 'system' | 'user' | 'assistant';
  
  /**
   * Message content
   */
  content: string;
  
  /**
   * Tool calls (if any)
   */
  tool_calls?: {
    /**
     * Tool call ID
     */
    id: string;
    
    /**
     * Tool call type
     */
    type: 'function';
    
    /**
     * Tool call function
     */
    function: {
      /**
       * Function name
       */
      name: string;
      
      /**
       * Function arguments (JSON string)
       */
      arguments: string;
    };
  }[];
}

/**
 * LLM request
 */
export interface LLMRequest {
  /**
   * Model name
   */
  model: string;
  
  /**
   * Messages
   */
  messages: LLMMessage[];
  
  /**
   * Temperature
   */
  temperature?: number;
  
  /**
   * Maximum tokens to generate
   */
  max_tokens?: number;
  
  /**
   * Tools
   */
  tools?: {
    /**
     * Tool type
     */
    type: 'function';
    
    /**
     * Tool function
     */
    function: {
      /**
       * Function name
       */
      name: string;
      
      /**
       * Function description
       */
      description: string;
      
      /**
       * Function parameters schema
       */
      parameters: Record<string, any>;
    };
  }[];
}

/**
 * LLM response
 */
export interface LLMResponse {
  /**
   * Response ID
   */
  id: string;
  
  /**
   * Response object
   */
  object: string;
  
  /**
   * Created timestamp
   */
  created: number;
  
  /**
   * Model name
   */
  model: string;
  
  /**
   * Response choices
   */
  choices: {
    /**
     * Choice index
     */
    index: number;
    
    /**
     * Choice message
     */
    message: LLMMessage;
    
    /**
     * Finish reason
     */
    finish_reason: string;
  }[];
}

/**
 * Convert MCP tool schema to bridge tool
 * @param mcpTool MCP tool schema
 * @param mcpServer MCP server name
 * @returns Bridge tool
 */
export function convertMCPToolToBridgeTool(
  mcpTool: IMCPToolSchema,
  mcpServer: string
): Tool {
  return {
    name: mcpTool.name,
    description: mcpTool.description || '',
    inputSchema: mcpTool.inputSchema || { type: 'object', properties: {} },
    mcpServer,
  };
}

/**
 * Convert bridge tool to OpenAI format
 * @param tool Bridge tool
 * @returns OpenAI tool
 */
export function convertBridgeToolToOpenAIFormat(tool: Tool): any {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  };
}
```

## Test Plan

We will create tests for the Bridge Types to ensure they meet the requirements:

1. **TEST-TYPES-001**: Test that types are compatible with VS Code extension context
2. **TEST-TYPES-002**: Test that VS Code-specific types are defined correctly
3. **TEST-TYPES-003**: Test that types are compatible with existing MCP types
4. **TEST-TYPES-004**: Test that configuration management types are defined correctly
5. **TEST-TYPES-005**: Test that multiple connection methods are supported
6. **TEST-TYPES-006**: Test that multiple MCP servers are supported
7. **TEST-TYPES-007**: Test that conversion functions work correctly

## Integration Plan

The Bridge Types will be used by all bridge components:

1. Update all bridge components to use the new types
2. Ensure compatibility with existing MCP types
3. Add support for VS Code-specific features

## Next Steps

After implementing the Bridge Types, we will move on to adapting the MCP Bridge Client component.
