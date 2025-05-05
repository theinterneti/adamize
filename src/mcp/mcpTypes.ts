/**
 * MCP Types
 *
 * Type definitions for the Model-Control-Protocol (MCP).
 */

/**
 * MCP Tool Schema
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
  defaultValue?: any;
}

/**
 * MCP Function Call Result
 */
export interface IMCPFunctionCallResult {
  /** Call status */
  status: 'success' | 'error';
  
  /** Result data (if status is success) */
  result?: any;
  
  /** Error message (if status is error) */
  error?: string;
}

/**
 * MCP Tool Invocation
 */
export interface IMCPToolInvocation {
  /** Tool name */
  tool: string;
  
  /** Function name */
  function: string;
  
  /** Function parameters */
  parameters: Record<string, any>;
}
