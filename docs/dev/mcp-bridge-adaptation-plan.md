# MCP Bridge Adaptation Plan

This document outlines the plan for adapting the ollama-mcp-bridge code to work within the Adamize VS Code extension.

## Overview

The ollama-mcp-bridge provides a bridge between local LLMs (via Ollama) and Model Context Protocol (MCP) servers. We will adapt this code to work within our VS Code extension, enabling local LLM-powered agents to maintain and update a memory graph of project knowledge.

## Architecture

We will create a new architecture that integrates the ollama-mcp-bridge functionality into our VS Code extension:

```
src/
├── mcp/
│   ├── bridge/
│   │   ├── mcpBridge.ts           # Adapted from bridge.ts
│   │   ├── llmClient.ts           # Adapted from llm-client.ts 
│   │   ├── mcpBridgeClient.ts     # Adapted from mcp-client.ts
│   │   ├── toolRegistry.ts        # Adapted from tool-registry.ts
│   │   ├── bridgeTypes.ts         # Adapted from types.ts
│   │   └── vscodeLogger.ts        # VS Code-specific logger
│   ├── mcpBridgeManager.ts        # VS Code extension integration
│   ├── mcpBridgeConfigManager.ts  # Configuration management
│   └── mcpBridgeCommands.ts       # VS Code commands for the bridge
```

## Component-by-Component Adaptation Plan

### 1. VS Code Logger (`vscodeLogger.ts`)

**Source**: Adapted from `logger.ts`
**Purpose**: Replace console-based logging with VS Code output channel
**Key Changes**:
- Replace console logging with VS Code output channel
- Add support for different log levels
- Add support for log filtering
- Integrate with VS Code's notification system for important messages

### 2. Bridge Types (`bridgeTypes.ts`)

**Source**: Adapted from `types.ts`
**Purpose**: Define types for the bridge components
**Key Changes**:
- Adapt types to work with VS Code extension context
- Add VS Code-specific types
- Ensure compatibility with existing MCP types
- Add types for configuration management

### 3. MCP Bridge Client (`mcpBridgeClient.ts`)

**Source**: Adapted from `mcp-client.ts`
**Purpose**: Handle communication with MCP servers
**Key Changes**:
- Replace process spawning with VS Code-compatible approach
- Adapt JSON-RPC communication for VS Code
- Integrate with VS Code's output channel for logging
- Add support for multiple connection methods (HTTP, Docker exec, local process)
- Ensure compatibility with existing MCP client

### 4. LLM Client (`llmClient.ts`)

**Source**: Adapted from `llm-client.ts`
**Purpose**: Handle communication with Ollama
**Key Changes**:
- Adapt for VS Code extension context
- Replace console logging with VS Code output channel
- Add support for Docker-based Ollama
- Ensure proper error handling and recovery
- Add configuration options for Ollama URL and model

### 5. Tool Registry (`toolRegistry.ts`)

**Source**: Adapted from `tool-registry.ts`
**Purpose**: Manage tool registration and discovery
**Key Changes**:
- Adapt for VS Code extension context
- Add support for VS Code commands as tools
- Integrate with VS Code's command system
- Add support for tool categorization and filtering

### 6. MCP Bridge (`mcpBridge.ts`)

**Source**: Adapted from `bridge.ts`
**Purpose**: Core bridge component that manages tool registration and execution
**Key Changes**:
- Adapt for VS Code extension context
- Replace console-based UI with VS Code UI
- Integrate with VS Code's command system
- Add support for VS Code's progress API for long-running operations
- Ensure proper error handling and recovery

### 7. MCP Bridge Config Manager (`mcpBridgeConfigManager.ts`)

**Source**: New file based on `config.ts`
**Purpose**: Manage bridge configuration
**Key Changes**:
- Use VS Code's configuration API instead of file-based config
- Add UI for configuration management
- Add validation for configuration
- Support multiple configuration profiles

### 8. MCP Bridge Manager (`mcpBridgeManager.ts`)

**Source**: New file
**Purpose**: Manage bridge lifecycle and integration with VS Code
**Key Changes**:
- Handle extension activation/deactivation
- Manage bridge initialization and shutdown
- Coordinate between bridge components
- Expose bridge functionality to VS Code commands

### 9. MCP Bridge Commands (`mcpBridgeCommands.ts`)

**Source**: New file
**Purpose**: Define VS Code commands for interacting with the bridge
**Key Changes**:
- Define commands for starting/stopping the bridge
- Define commands for interacting with the LLM
- Define commands for managing tools
- Define commands for configuration management

## Integration with Existing MCP Client

We will maintain compatibility with the existing MCP client while adding the new bridge functionality:

1. Keep the existing `mcpClient.ts` and `enhancedMcpClient.ts` for direct MCP server communication
2. Add the new bridge components for Ollama integration
3. Update `mcpManager.ts` to support both direct MCP connections and bridge-based connections
4. Provide a unified interface for both approaches

## VS Code Extension Integration

We will integrate the bridge with the VS Code extension:

1. Update `extension.ts` to initialize and manage the bridge
2. Add commands for interacting with the bridge
3. Add UI elements for bridge status and control
4. Add configuration options for the bridge

## Memory Graph Integration

We will extend the bridge to support memory graph operations:

1. Add MCP tools for memory graph maintenance
2. Implement persistence for memory graph data
3. Add visualization for memory graph
4. Integrate with Neo4j or other graph databases

## Testing Plan

We will follow our TDD approach for the adaptation:

1. Create tests for each adapted component
2. Ensure compatibility with existing tests
3. Add integration tests for the bridge
4. Add end-to-end tests for the VS Code extension

## Implementation Phases

### Phase 1: Core Bridge Components
- Implement VS Code Logger
- Adapt Bridge Types
- Adapt MCP Bridge Client
- Adapt LLM Client
- Adapt Tool Registry
- Implement basic MCP Bridge

### Phase 2: VS Code Integration
- Implement MCP Bridge Config Manager
- Implement MCP Bridge Manager
- Implement MCP Bridge Commands
- Update extension.ts

### Phase 3: Memory Graph Integration
- Add MCP tools for memory graph
- Implement persistence
- Add visualization
- Integrate with graph database

### Phase 4: Testing and Refinement
- Complete unit tests
- Add integration tests
- Add end-to-end tests
- Refine based on testing results

## Conclusion

This adaptation plan provides a structured approach to integrating the ollama-mcp-bridge functionality into our VS Code extension. By following this plan, we will create a powerful extension that combines the capabilities of local LLMs with the MCP protocol, enabling advanced AI-assisted development with a focus on memory and context preservation.
