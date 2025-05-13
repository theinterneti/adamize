# MCP Module

This module contains the implementation of the Model Context Protocol (MCP) Bridge for the Adamize VS Code extension.

## Components

### Core Components

- **MCPToolRegistry** ✅ - Registry for MCP tools and functions with enhanced tool detection, categorization, and context-aware example generation
- **MCPBridge** ⚠️ - Core bridge component for connecting LLMs with MCP tools
- **MCPBridgeManager** ⚠️ - Manager for MCP bridges

### Supporting Components

- **VSCodeLogger** ✅ - Logging adapter for VS Code
- **MCPTypes** ✅ - Type definitions for MCP components
- **MCPBridgeClient** ✅ - Client for communicating with MCP servers
- **LLMClient** ✅ - Client for interacting with LLMs

## MCPToolRegistry

The MCPToolRegistry is responsible for registering, discovering, and managing MCP tools. It provides the following features:

### Tool Registration and Management

```typescript
// Register a tool
registry.registerTool(tool, metadata);

// Get a tool by name
const tool = registry.getTool('toolName');

// Get all tools
const tools = registry.getAllTools();

// Remove a tool
registry.removeTool('toolName');
```

### Tool Detection

```typescript
// Detect tools for a prompt
const toolNames = registry.detectToolsForPrompt('I need to calculate something');
// Returns: ['calculator', 'math', ...]

// Detect the most appropriate tool
const toolName = registry.detectToolFromPrompt('I need to calculate something');
// Returns: 'calculator'
```

### Tool Instructions

```typescript
// Get instructions for all tools
const instructions = registry.getToolInstructions();
// Returns formatted instructions for all registered tools
```

### Example Generation

```typescript
// Generate example arguments for a function
const exampleArgs = registry.generateExampleArgs('calculator', 'add');
// Returns: { a: 42, b: 42 }
```

## Implementation Status

| Component | Status | Description |
| --- | --- | --- |
| MCPToolRegistry | ✅ Complete | Registry for MCP tools and functions |
| MCPBridge | ⚠️ Partial | Core bridge component |
| MCPBridgeManager | ⚠️ Partial | Manager for MCP bridges |
| VSCodeLogger | ✅ Complete | Logging adapter for VS Code |
| MCPTypes | ✅ Complete | Type definitions for MCP components |
| MCPBridgeClient | ✅ Complete | Client for communicating with MCP servers |
| LLMClient | ✅ Complete | Client for interacting with LLMs |

## Next Steps

1. Complete the MCPBridge implementation with streaming support
2. Complete the MCPBridgeManager implementation
3. Enhance the MCPChatView with streaming support
4. Complete the MCPServerExplorerView
