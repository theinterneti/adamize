/**
 * MCP Utilities
 *
 * Utility functions for working with Model-Control-Protocol (MCP).
 */

import { IMCPFunctionSchema, IMCPParameterSchema, MCPError, MCPErrorCode } from './mcpTypes';

/**
 * Validate parameters against function schema
 * @param parameters The parameters to validate
 * @param functionSchema The function schema
 * @throws {MCPError} If parameters are invalid
 * @implements REQ-MCP-011, REQ-MCP-023
 */
export function validateParameters(
  parameters: Record<string, any>,
  functionSchema: IMCPFunctionSchema
): void {
  // Check for required parameters
  for (const paramSchema of functionSchema.parameters) {
    if (paramSchema.required && !(paramSchema.name in parameters)) {
      throw new MCPError(
        `Missing required parameter: ${paramSchema.name}`,
        MCPErrorCode.VALIDATION_ERROR,
        { paramName: paramSchema.name }
      );
    }
  }

  // Check for unknown parameters
  const knownParams = new Set(functionSchema.parameters.map((p) => p.name));
  for (const paramName in parameters) {
    if (!knownParams.has(paramName)) {
      throw new MCPError(
        `Unknown parameter: ${paramName}`,
        MCPErrorCode.VALIDATION_ERROR,
        { paramName }
      );
    }
  }

  // Validate parameter types
  for (const paramName in parameters) {
    const paramSchema = functionSchema.parameters.find((p) => p.name === paramName);
    if (paramSchema) {
      validateParameterType(paramName, parameters[paramName], paramSchema);
    }
  }
}

/**
 * Validate parameter type
 * @param paramName The parameter name
 * @param paramValue The parameter value
 * @param paramSchema The parameter schema
 * @throws {MCPError} If validation fails
 * @implements REQ-MCP-011, REQ-MCP-023
 */
function validateParameterType(
  paramName: string,
  paramValue: any,
  paramSchema: IMCPParameterSchema
): void {
  // Handle null/undefined
  if (paramValue === null || paramValue === undefined) {
    if (paramSchema.required) {
      throw new MCPError(
        `Parameter ${paramName} cannot be null or undefined`,
        MCPErrorCode.VALIDATION_ERROR,
        { paramName, paramValue, expectedType: paramSchema.type }
      );
    }
    return;
  }

  // Validate based on type
  switch (paramSchema.type.toLowerCase()) {
    case 'string':
      if (typeof paramValue !== 'string') {
        throw new Error(`Parameter ${paramName} must be a string`);
      }
      break;
    case 'number':
    case 'integer':
      if (typeof paramValue !== 'number') {
        throw new Error(`Parameter ${paramName} must be a number`);
      }
      if (paramSchema.type.toLowerCase() === 'integer' && !Number.isInteger(paramValue)) {
        throw new Error(`Parameter ${paramName} must be an integer`);
      }
      break;
    case 'boolean':
      if (typeof paramValue !== 'boolean') {
        throw new Error(`Parameter ${paramName} must be a boolean`);
      }
      break;
    case 'array':
      if (!Array.isArray(paramValue)) {
        throw new Error(`Parameter ${paramName} must be an array`);
      }
      break;
    case 'object':
      if (typeof paramValue !== 'object' || Array.isArray(paramValue)) {
        throw new Error(`Parameter ${paramName} must be an object`);
      }
      break;
    default:
      // For custom types, we just check that it's not null/undefined
      // More complex validation would require additional schema information
      break;
  }
}

/**
 * Format parameters for logging
 * @param parameters The parameters to format
 * @param maxLength Maximum length for string values
 * @returns Formatted parameters string
 * @implements REQ-MCP-032, REQ-MCP-033
 */
export function formatParameters(
  parameters: Record<string, any>,
  maxLength: number = 100
): string {
  return JSON.stringify(parameters, (_key, value) => {
    // Truncate long strings
    if (typeof value === 'string' && value.length > maxLength) {
      return value.substring(0, maxLength) + '...';
    }
    return value;
  }, 2);
}

/**
 * Format error for logging
 * @param error Error to format
 * @returns Formatted error string
 * @implements REQ-MCP-033
 */
export function formatError(error: any): string {
  if (error instanceof MCPError) {
    return `MCPError [${error.code}]: ${error.message}${
      error.details ? ` - Details: ${JSON.stringify(error.details)}` : ''
    }`;
  } else if (error instanceof Error) {
    return `Error: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}`;
  } else {
    return `Unknown error: ${String(error)}`;
  }
}
