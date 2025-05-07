/**
 * Bridge Types
 *
 * Type definitions for the MCP Bridge components.
 *
 * @implements REQ-TYPES-001 Adapt types to work with VS Code extension context
 * @implements REQ-TYPES-002 Add VS Code-specific types
 * @implements REQ-TYPES-003 Ensure compatibility with existing MCP types
 * @implements REQ-TYPES-004 Add types for configuration management
 * @implements REQ-TYPES-005 Support multiple connection methods
 * @implements REQ-TYPES-006 Support multiple MCP servers
 */

import * as vscode from 'vscode';
import { IMCPToolSchema } from '../mcpTypes';

/**
 * Connection method for MCP servers
 */
export enum ConnectionMethod {
  HTTP = 'http',
  DockerExec = 'docker-exec',
  LocalProcess = 'local-process'
}

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  /** Connection method */
  connectionMethod: ConnectionMethod;
  /** Server URL for HTTP connections */
  url?: string;
  /** Container ID for Docker Exec connections */
  containerId?: string;
  /** Command for Local Process connections */
  command?: string;
  /** Arguments for Local Process connections */
  args?: string[];
  /** Environment variables for Local Process connections */
  env?: Record<string, string>;
  /** Working directory for Local Process connections */
  cwd?: string;
}

/**
 * LLM Provider type
 */
export enum LLMProvider {
  Ollama = 'ollama',
  HuggingFace = 'huggingface',
  OpenAI = 'openai'
}

/**
 * LLM configuration
 */
export interface LLMConfig {
  /** LLM provider */
  provider: LLMProvider;
  /** Model name */
  model: string;
  /** API endpoint */
  endpoint: string;
  /** API key (if required) */
  apiKey?: string;
  /** System prompt */
  systemPrompt?: string;
  /** Temperature */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
  /** Top P */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Stop sequences */
  stop?: string[];
}

/**
 * Bridge configuration
 */
export interface BridgeConfig {
  /** Primary MCP server name */
  primaryMCPServer: string;
  /** MCP servers */
  mcpServers: Record<string, MCPServerConfig>;
  /** LLM configuration */
  llm: LLMConfig;
  /** System prompt */
  systemPrompt?: string;
}

/**
 * Bridge status
 */
export enum BridgeStatus {
  Initializing = 'initializing',
  Running = 'running',
  Stopped = 'stopped',
  Error = 'error'
}

/**
 * Bridge instance
 */
export interface BridgeInstance {
  /** Bridge ID */
  id: string;
  /** Bridge name */
  name: string;
  /** Bridge status */
  status: BridgeStatus;
  /** Bridge instance */
  bridge: any; // Will be replaced with MCPBridge type once implemented
  /** Bridge configuration */
  config: BridgeConfig;
}

/**
 * Bridge profile
 */
export interface BridgeProfile {
  /** Profile ID */
  id: string;
  /** Profile name */
  name: string;
  /** Profile configuration */
  config: BridgeConfig;
  /** Is this the active profile? */
  isActive: boolean;
}

/**
 * Tool definition
 */
export interface Tool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool schema */
  schema: IMCPToolSchema;
  /** MCP server name */
  mcpServer: string;
}

/**
 * Tool call
 */
export interface ToolCall {
  /** Tool name */
  toolName: string;
  /** Function name */
  functionName: string;
  /** Function arguments */
  arguments: Record<string, unknown>;
}

/**
 * Tool response
 */
export interface ToolResponse {
  /** Tool name */
  toolName: string;
  /** Function name */
  functionName: string;
  /** Response data */
  response: unknown;
}

/**
 * Message role
 */
export enum MessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool'
}

/**
 * Message
 */
export interface Message {
  /** Message role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Tool calls (if role is assistant) */
  toolCalls?: ToolCall[];
  /** Tool name (if role is tool) */
  toolName?: string;
  /** Tool response (if role is tool) */
  toolResponse?: unknown;
}
