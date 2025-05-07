/**
 * MCP Types
 *
 * Type definitions for the Model-Control-Protocol (MCP).
 */

/**
 * MCP Server Configuration
 * @implements REQ-MCP-001
 */
export interface IMCPServerConfig {
  /** Server name */
  name: string;

  /** Server URL */
  url: string;

  /** API key (if required) */
  apiKey?: string;

  /** Whether this is the default server */
  isDefault?: boolean;

  /** Additional server options */
  options?: Record<string, unknown>;
}

/**
 * MCP Input Variable
 */
export interface IMCPInputVariable {
  /** Variable name */
  name: string;

  /** Variable description */
  description: string;

  /** Variable type */
  type: string;

  /** Whether the variable is required */
  required: boolean;

  /** Default value */
  defaultValue?: unknown;
}

/**
 * MCP Tool
 */
export interface MCPTool {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Tool schema */
  schema: IMCPToolSchema;

  /** Execute function */
  execute: (functionName: string, parameters: Record<string, unknown>) => Promise<unknown>;
}

/**
 * MCP Tool Schema
 * @implements REQ-MCP-003
 */
export interface IMCPToolSchema {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Tool version */
  version: string;

  /** Tool functions */
  functions: IMCPFunctionSchema[];
}

/**
 * MCP Function Schema
 * @implements REQ-MCP-003, REQ-MCP-011
 */
export interface IMCPFunctionSchema {
  /** Function name */
  name: string;

  /** Function description */
  description: string;

  /** Function parameters */
  parameters: IMCPParameterSchema[];

  /** Function return type */
  returnType: string;
}

/**
 * MCP Parameter Schema
 * @implements REQ-MCP-011
 */
export interface IMCPParameterSchema {
  /** Parameter name */
  name: string;

  /** Parameter description */
  description: string;

  /** Parameter type */
  type: string;

  /** Whether the parameter is required */
  required: boolean;

  /** Default value for the parameter */
  defaultValue?: unknown;
}

/**
 * MCP Function Call Result
 * @implements REQ-MCP-012, REQ-MCP-013
 */
export interface IMCPFunctionCallResult {
  /** Call status */
  status: 'success' | 'error';

  /** Result data (if status is success) */
  result?: unknown;

  /** Error message (if status is error) */
  error?: string;
}

/**
 * MCP Tool Invocation
 * @implements REQ-MCP-010
 */
export interface IMCPToolInvocation {
  /** Tool name */
  tool: string;

  /** Function name */
  function: string;

  /** Function parameters */
  parameters: Record<string, unknown>;
}

/**
 * MCP Server Info
 * @implements REQ-MCP-001
 */
export interface IMCPServerInfo {
  /** Server name */
  name: string;

  /** Server version */
  version: string;

  /** Server description */
  description: string;
}

/**
 * MCP Connection Options
 * @implements REQ-MCP-001
 */
export interface IMCPConnectionOptions {
  /** Server URL */
  serverUrl: string;

  /** Connection timeout in milliseconds */
  timeout?: number;

  /** Whether to enable logging */
  enableLogging?: boolean;
}

/**
 * MCP Error
 * @implements REQ-MCP-020, REQ-MCP-021, REQ-MCP-022, REQ-MCP-023
 */
export class MCPError extends Error {
  /** Error code */
  code: string;

  /** Error details */
  details?: unknown;

  /**
   * Create a new MCP error
   * @param message Error message
   * @param code Error code
   * @param details Error details
   */
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;
  }
}

/**
 * MCP Error Codes
 */
export enum MCPErrorCode {
  /** Connection error */
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  /** Tool discovery error */
  TOOL_DISCOVERY_ERROR = 'TOOL_DISCOVERY_ERROR',

  /** Schema retrieval error */
  SCHEMA_ERROR = 'SCHEMA_ERROR',

  /** Parameter validation error */
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  /** Function call error */
  FUNCTION_CALL_ERROR = 'FUNCTION_CALL_ERROR',
}
