# MCP Bridge Implementation Plan

This document outlines the comprehensive implementation plan for completing the MCP Bridge components in the Adamize VS Code extension.

## Overview

The MCP Bridge is a critical component that connects local LLMs (through Ollama) with MCP tools, enabling AI-powered development assistance. The bridge consists of several components that need to be completed to achieve full functionality.

## Current Status

| Component             | Status      | Description                                                                                                             |
| --------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| VS Code Logger        | ✅ Complete | Logging adapter for VS Code                                                                                             |
| Bridge Types          | ✅ Complete | Type definitions for bridge components                                                                                  |
| MCP Bridge Client     | ✅ Complete | Client for communicating with MCP servers                                                                               |
| LLM Client            | ✅ Complete | Client for interacting with LLMs                                                                                        |
| Tool Registry         | ✅ Complete | Registry for MCP tools and functions with enhanced tool detection, categorization, and context-aware example generation |
| MCP Bridge            | ⚠️ Partial  | Core bridge component                                                                                                   |
| MCP Bridge Manager    | ⚠️ Partial  | Manager for MCP bridges                                                                                                 |
| MCPChatView           | ⚠️ Partial  | Chat interface for LLMs                                                                                                 |
| MCPServerExplorerView | ⚠️ Partial  | Server management UI                                                                                                    |

## Implementation Plan

The implementation plan is divided into four phases, with each phase focusing on specific components and functionality.

### Phase 1: Core Functionality (High Priority)

#### 1. ✅ Complete MCPToolRegistry

The Tool Registry is responsible for registering, discovering, and managing MCP tools. This component has been completed with enhanced functionality.

**Completed Tasks:**

- Implemented `detectToolsForPrompt` method with sophisticated scoring algorithm
- Implemented `detectToolFromPrompt` method to identify the most appropriate tool for a given prompt
- Enhanced `getToolInstructions` method with support for categorized tools and better formatting
- Improved `generateExampleArgs` method with context-aware example generation
- Added support for tool categorization and filtering
- Added defensive checks for parameters to improve robustness
- Added comprehensive tests for all methods

**Implementation Highlights:**

```typescript
// src/mcp/mcpToolRegistry.ts

/**
 * Detect appropriate tools for a user prompt
 * @param prompt User prompt
 * @param maxTools Maximum number of tools to return (default: 3)
 * @returns Array of tool names sorted by relevance
 * @implements REQ-MCP-051 Detect appropriate tools from user prompts
 */
detectToolsForPrompt(prompt: string, maxTools: number = 3): string[] {
  // ...

  // Score each tool based on keyword matches and priority
  for (const [toolName, tool] of toolEntries) {
    // ...

    // Score based on keyword matches with different weights
    for (const keyword of metadata.keywords) {
      const keywordLower = keyword.toLowerCase();
      // Exact match gets higher score
      if (promptLower === keywordLower) {
        score += 5;
      }
      // Word boundary match gets medium score
      else if (new RegExp(`\\b${keywordLower}\\b`).test(promptLower)) {
        score += 3;
      }
      // Substring match gets lower score
      else if (promptLower.includes(keywordLower)) {
        score += 1;
      }
    }

    // Score based on function names and descriptions
    // Score based on categories
    // ...
  }

  // ...
}

/**
 * Generate example arguments for a function
 * @param toolName Tool name
 * @param functionName Function name
 * @returns Example arguments
 * @implements REQ-MCP-053 Generate example arguments for tool schemas
 */
generateExampleArgs(toolName: string, functionName: string): Record<string, unknown> | undefined {
  // ...

  // Generate context-aware examples based on function and tool names
  const contextHints = {
    toolName: toolName.toLowerCase(),
    funcName: functionName.toLowerCase(),
    description: tool.description.toLowerCase(),
    funcDescription: func.description.toLowerCase(),
  };

  // Check if parameters is iterable
  if (func.parameters && Array.isArray(func.parameters)) {
    for (const param of func.parameters) {
      exampleArgs[param.name] = this.generateExampleValue(param, contextHints);
    }
  }

  // ...
}
```

#### 2. Complete MCPBridge

The MCP Bridge is the core component that connects LLMs with MCP tools.

**Key Tasks:**

- Implement `executeToolCall` method to execute tool calls
- Implement `processMessage` method with tool detection
- Implement streaming support for real-time responses
- Implement conversation context management
- Add comprehensive tests for all methods

**Implementation Details:**

```typescript
// src/mcp/mcpBridge.ts

/**
 * Process a message
 * @param message Message to process
 * @returns Response from LLM
 */
async processMessage(message: string): Promise<string> {
  if (!this.isRunning) {
    throw new Error('MCP bridge is not running');
  }

  try {
    this.log(`Processing message: ${message}`);
    this.emitEvent(MCPBridgeEventType.PromptReceived, { prompt: message });

    // Detect tool from prompt
    const detectedTool = this.toolRegistry.detectToolFromPrompt(message);

    if (detectedTool) {
      this.log(`Detected tool: ${detectedTool}`);

      // Get tool instructions
      const instructions = this.toolRegistry.getToolInstructions(detectedTool);

      if (instructions) {
        // Update system prompt with tool instructions
        this.llmClient.updateSystemPrompt(instructions);
        this.log('Using tool-specific instructions');
      }
    }

    // Send prompt to LLM
    const response = await this.llmClient.sendPrompt(message);

    // Parse tool calls from response
    const toolCalls = this.parseToolCalls(response);

    // Execute tool calls if any
    if (toolCalls.length > 0) {
      this.log(`Found ${toolCalls.length} tool calls in response`);

      for (const toolCall of toolCalls) {
        this.log(`Executing tool call: ${toolCall.tool}.${toolCall.function}`);

        try {
          const result = await this.executeToolCall(toolCall);
          this.log(`Tool call result: ${JSON.stringify(result)}`);

          // Add tool call result to conversation history
          this.llmClient.addToolCallResult(toolCall, result);
        } catch (error) {
          this.log(`Error executing tool call: ${error}`);

          // Add error to conversation history
          this.llmClient.addToolCallError(toolCall, error);
        }
      }

      // Generate a new response with tool call results
      const finalResponse = await this.llmClient.generateResponseWithToolResults();

      this.log(`Final response: ${finalResponse}`);
      this.emitEvent(MCPBridgeEventType.ResponseReceived, { response: finalResponse });

      return finalResponse;
    }

    this.log(`Response: ${response}`);
    this.emitEvent(MCPBridgeEventType.ResponseReceived, { response });

    return response;
  } catch (error) {
    this.log(`Error processing message: ${error}`);
    this.emitEvent(MCPBridgeEventType.Error, { error });
    throw error;
  }
}
```

#### 3. Complete MCPBridgeManager

The Bridge Manager handles the lifecycle of MCP bridges.

**Key Tasks:**

- Implement `createBridge` method to create and configure bridges
- Implement `startBridge` and `stopBridge` methods for lifecycle management
- Implement bridge configuration management
- Add support for multiple bridges
- Add comprehensive tests for all methods

**Implementation Details:**

```typescript
// src/mcp/mcpBridgeManager.ts

/**
 * Create a new bridge
 * @param options Bridge options
 * @returns Bridge ID
 */
createBridge(options: MCPBridgeOptions): string {
  try {
    const id = uuidv4();
    const name = options.name || `${options.llmModel} (${options.llmProvider})`;

    this.logger.info(`Creating bridge: ${name}`);

    // Create bridge
    const bridge = new MCPBridge(options, this.outputChannel);

    // Add bridge to map
    this.bridges.set(id, {
      id,
      name,
      status: 'stopped',
      bridge,
      options
    });

    // Update status bar
    this.updateStatusBar('stopped');

    this.logger.info(`Created bridge: ${name} (${id})`);

    return id;
  } catch (error) {
    this.logger.error(`Error creating bridge: ${error}`);
    throw error;
  }
}
```

### Phase 2: UI Components (Medium Priority)

#### 1. Complete MCPChatView

The Chat View provides a user interface for interacting with the MCP Bridge.

**Key Tasks:**

- Implement message sending and receiving
- Implement conversation history management
- Add support for streaming responses
- Implement tool call visualization
- Add comprehensive tests for all functionality

#### 2. Complete MCPServerExplorerView

The Server Explorer View provides a UI for managing MCP servers.

**Key Tasks:**

- Implement server management (add, remove, start, stop)
- Implement tool discovery and display
- Add support for server configuration
- Add comprehensive tests for all functionality

### Phase 3: Integration and Testing (Medium Priority)

#### 1. Create Integration Tests

**Key Tasks:**

- Test MCP Bridge with Tool Registry
- Test MCP Bridge with LLM Client
- Test MCP Bridge Manager with MCP Bridge
- Test UI components with MCP Bridge

#### 2. Create End-to-End Tests

**Key Tasks:**

- Test extension activation
- Test Ollama integration
- Test MCP server connection
- Test chat functionality
- Test tool execution

#### 3. Implement Skipped Tests

**Key Tasks:**

- Identify and implement skipped tests
- Ensure all components have comprehensive test coverage
- Fix any failing tests

### Phase 4: Documentation and Configuration (Low Priority)

#### 1. Update Documentation

**Key Tasks:**

- Update README.md with project overview and setup
- Update API documentation for all components
- Create user guides for the extension
- Document configuration options

#### 2. Add Configuration Options

**Key Tasks:**

- Add MCP Bridge configuration options
- Add Tool Registry configuration options
- Add UI configuration options
- Document all configuration options

## Configuration Steps

Once the components are implemented, the following configuration steps will be needed:

1. **Install Ollama**

   - Download and install Ollama from [ollama.ai](https://ollama.ai/)
   - Pull a compatible model: `ollama pull qwen3-coder`

2. **Configure Ollama in VS Code**

   - Open VS Code settings
   - Set `adamize.ollama.enabled` to `true`
   - Set `adamize.ollama.model` to your preferred model (e.g., `qwen3-coder`)
   - Set `adamize.ollama.baseUrl` to your Ollama server URL (default: `http://localhost:11434`)

3. **Start Ollama Server**

   - Use the command `Adamize Models: Start Ollama Server`
   - Verify that Ollama is running

4. **Open Ollama Chat**

   - Use the command `Adamize Models: Open Ollama Chat`
   - Test that you can send messages and receive responses

5. **Configure MCP Bridge**

   - Open VS Code settings
   - Set `adamize.mcp.enabled` to `true`
   - Set `adamize.mcp.serverUrl` to your MCP server URL (default: `http://localhost:8000`)

6. **Start MCP Bridge**

   - Use the command `Adamize: Start MCP Server`
   - Verify that the MCP Bridge is running

7. **Test MCP Tools**
   - Open the MCP Server Explorer view
   - Verify that tools are displayed
   - Test tool execution through the chat interface

## Conclusion

This implementation plan provides a comprehensive roadmap for completing the MCP Bridge components in the Adamize VS Code extension. By following this plan, the extension will achieve full functionality with Ollama integration and MCP server connectivity, enabling AI-powered development assistance.
