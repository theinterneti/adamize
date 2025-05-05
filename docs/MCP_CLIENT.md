# MCP Client Documentation

## Overview

The Model Context Protocol (MCP) client is a core component of the Adamize extension. It provides a way to interact with MCP servers, which expose tools and functions that can be used by the extension.

## Architecture

The MCP client consists of the following components:

- `MCPClient`: The main client class that handles communication with MCP servers
- `mcpTypes.ts`: Type definitions for MCP entities
- `mcpUtils.ts`: Utility functions for working with MCP

## Usage

### Creating a Client

```typescript
import { MCPClient } from './mcp/mcpClient';

// Create a client with the server URL
const client = new MCPClient('http://localhost:8000');
```

### Connecting to a Server

```typescript
// Connect to the server
const connected = await client.connect();

if (connected) {
  console.log('Connected to MCP server');
} else {
  console.error('Failed to connect to MCP server');
}
```

### Getting Available Tools

```typescript
// Get available tools
const tools = await client.getTools();

console.log('Available tools:', tools);
```

### Getting Tool Schema

```typescript
// Get schema for a specific tool
const schema = await client.getToolSchema('toolName');

if (schema) {
  console.log('Tool schema:', schema);
} else {
  console.error('Failed to get tool schema');
}
```

### Calling a Function

```typescript
// Call a function on a tool
const result = await client.callFunction('toolName', 'functionName', {
  param1: 'value1',
  param2: 'value2',
});

if (result.status === 'success') {
  console.log('Function result:', result.result);
} else {
  console.error('Function error:', result.error);
}
```

## API Reference

### MCPClient

#### Constructor

```typescript
constructor(serverUrl: string)
```

Creates a new MCP client with the specified server URL.

#### Methods

##### connect

```typescript
async connect(): Promise<boolean>
```

Connects to the MCP server. Returns `true` if connected successfully, `false` otherwise.

##### getTools

```typescript
async getTools(): Promise<string[]>
```

Gets the list of available tools from the MCP server. Returns an array of tool names.

##### getToolSchema

```typescript
async getToolSchema(toolName: string): Promise<IMCPToolSchema | null>
```

Gets the schema for a specific tool. Returns the tool schema or `null` if the tool is not found.

##### callFunction

```typescript
async callFunction(
  toolName: string,
  functionName: string,
  parameters: Record<string, any>
): Promise<IMCPFunctionCallResult>
```

Calls a function on a tool. Returns the function call result.

## Type Definitions

### IMCPToolSchema

```typescript
interface IMCPToolSchema {
  /** Tool name */
  name: string;
  
  /** Tool description */
  description: string;
  
  /** Tool version */
  version: string;
  
  /** Tool functions */
  functions: IMCPFunctionSchema[];
}
```

### IMCPFunctionSchema

```typescript
interface IMCPFunctionSchema {
  /** Function name */
  name: string;
  
  /** Function description */
  description: string;
  
  /** Function parameters */
  parameters: IMCPParameterSchema[];
  
  /** Function return type */
  returnType: string;
}
```

### IMCPParameterSchema

```typescript
interface IMCPParameterSchema {
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
```

### IMCPFunctionCallResult

```typescript
interface IMCPFunctionCallResult {
  /** Call status */
  status: 'success' | 'error';
  
  /** Result data (if status is success) */
  result?: any;
  
  /** Error message (if status is error) */
  error?: string;
}
```
