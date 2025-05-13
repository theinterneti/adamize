# UI Components Implementation Plan

This document outlines the implementation plan for completing the UI components in the Adamize VS Code extension.

## Overview

The UI components provide the user interface for interacting with the MCP Bridge and Ollama integration. While some components are already implemented, others need to be completed or enhanced to provide a seamless user experience.

## Current Status

| Component | Status | Description |
|-----------|--------|-------------|
| OllamaConfigView | ✅ Complete | UI for configuring Ollama settings |
| ModelManagerView | ✅ Complete | UI for managing models |
| MCPChatView | ⚠️ Partial | Chat interface for LLMs |
| MCPServerExplorerView | ⚠️ Partial | Server management UI |
| MemoryGraphView | ⚠️ Partial | Memory graph visualization |

## Implementation Plan

The implementation plan focuses on completing the MCPChatView and MCPServerExplorerView components, which are critical for interacting with the MCP Bridge.

### Phase 1: MCPChatView Implementation (High Priority)

The MCPChatView provides a chat interface for interacting with LLMs through the MCP Bridge.

#### 1. Complete Message Handling

**Key Tasks:**
- Implement message sending and receiving
- Implement conversation history management
- Add support for system messages
- Add comprehensive tests for all functionality

**Implementation Details:**
```typescript
// src/ui/mcpChatView.ts

/**
 * Send a message to the LLM
 */
private async sendMessage(text: string, bridgeId: string): Promise<void> {
  if (!this.panel) {
    return;
  }

  const bridge = this.mcpBridgeManager.getBridge(bridgeId);
  if (!bridge) {
    vscode.window.showErrorMessage(`Bridge ${bridgeId} not found`);
    return;
  }

  // Add user message to conversation history
  const userMessage: ChatMessage = { role: 'user', content: text };
  this.addMessageToHistory(bridgeId, userMessage);

  // Send user message to webview
  this.panel.webview.postMessage({
    command: 'addMessage',
    message: userMessage,
  });

  try {
    // Check if streaming is supported
    const useStreaming = this.supportsStreaming(bridge);
    const messageId = this.generateMessageId();

    if (useStreaming) {
      // Create an initial empty assistant message
      const initialAssistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        toolCalls: [],
        isStreaming: true,
      };

      // Send initial message to webview
      this.panel.webview.postMessage({
        command: 'addMessage',
        message: initialAssistantMessage,
        messageId: messageId,
      });

      // Start streaming
      await this.streamResponse(bridge, text, messageId, bridgeId);
    } else {
      // Use non-streaming approach
      const response = await bridge.sendMessage(text);

      // Parse tool calls from the response
      const toolCalls = this.parseToolCalls(response);

      // Add assistant message to conversation history
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        toolCalls: toolCalls,
      };
      this.addMessageToHistory(bridgeId, assistantMessage);

      // Send assistant message to webview
      this.panel.webview.postMessage({
        command: 'addMessage',
        message: assistantMessage,
      });
    }
  } catch (error) {
    this.outputChannel.appendLine(`Error sending message: ${error}`);
    vscode.window.showErrorMessage(`Error sending message: ${error}`);
  }
}
```

#### 2. Implement Streaming Support

**Key Tasks:**
- Implement streaming response handling
- Add real-time message updates
- Implement tool call visualization during streaming
- Add comprehensive tests for all functionality

**Implementation Details:**
```typescript
// src/ui/mcpChatView.ts

/**
 * Stream a response from the LLM
 */
private async streamResponse(
  bridge: any,
  text: string,
  messageId: string,
  bridgeId: string
): Promise<void> {
  let fullContent = '';
  const toolCalls: MCPToolCall[] = [];

  try {
    await bridge.streamMessage(text, {
      onContent: (content: string) => {
        fullContent += content;

        // Update the message in the webview
        this.panel?.webview.postMessage({
          command: 'updateStreamingMessage',
          messageId: messageId,
          content: content,
        });

        // Parse tool calls from the content
        const newToolCalls = this.parseToolCalls(fullContent);
        
        // If we found new tool calls, update the message
        if (newToolCalls.length > toolCalls.length) {
          toolCalls.length = 0;
          toolCalls.push(...newToolCalls);
          
          this.panel?.webview.postMessage({
            command: 'updateToolCalls',
            messageId: messageId,
            toolCalls: toolCalls,
          });
        }
      },
      onComplete: () => {
        // Create the final message
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: fullContent,
          toolCalls: toolCalls,
          isStreaming: false,
        };

        // Add to conversation history
        this.addMessageToHistory(bridgeId, assistantMessage);

        // Send completion to webview
        this.panel?.webview.postMessage({
          command: 'completeStreamingMessage',
          messageId: messageId,
          message: assistantMessage,
          done: true,
        });
      },
      onError: (error: Error) => {
        this.outputChannel.appendLine(`Error streaming message: ${error.message}`);
        
        // Complete the message with error
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: fullContent || 'Error: Failed to stream response',
          toolCalls: toolCalls,
          isStreaming: false,
        };
        
        // Add to conversation history
        this.addMessageToHistory(bridgeId, errorMessage);
        
        // Send error to webview
        this.panel?.webview.postMessage({
          command: 'completeStreamingMessage',
          messageId: messageId,
          message: errorMessage,
          error: error.message,
          done: true,
        });
      },
    });
  } catch (error) {
    this.outputChannel.appendLine(`Error streaming message: ${error}`);
    
    // Complete the message with error
    const errorMessage: ChatMessage = {
      role: 'assistant',
      content: fullContent || 'Error: Failed to stream response',
      toolCalls: toolCalls,
      isStreaming: false,
    };
    
    // Add to conversation history
    this.addMessageToHistory(bridgeId, errorMessage);
    
    // Send error to webview
    this.panel?.webview.postMessage({
      command: 'completeStreamingMessage',
      messageId: messageId,
      message: errorMessage,
      error: error instanceof Error ? error.message : String(error),
      done: true,
    });
  }
}
```

#### 3. Implement Tool Call Visualization

**Key Tasks:**
- Implement tool call visualization in the chat
- Add support for tool call results
- Add support for tool call errors
- Add comprehensive tests for all functionality

### Phase 2: MCPServerExplorerView Implementation (Medium Priority)

The MCPServerExplorerView provides a UI for managing MCP servers and tools.

#### 1. Complete Server Management

**Key Tasks:**
- Implement server management (add, remove, start, stop)
- Add support for server configuration
- Implement server status visualization
- Add comprehensive tests for all functionality

**Implementation Details:**
```typescript
// src/ui/mcpServerExplorerView.ts

/**
 * Add a new server
 */
async addServer(): Promise<void> {
  // Get provider
  const provider = await vscode.window.showQuickPick(
    [
      { label: 'Ollama', value: 'ollama' },
      { label: 'HuggingFace', value: 'huggingface' },
      { label: 'OpenAI', value: 'openai' },
      { label: 'Custom', value: 'custom' },
    ],
    {
      placeHolder: 'Select LLM provider',
    }
  );

  if (!provider) {
    return;
  }

  // Get model
  const model = await vscode.window.showInputBox({
    placeHolder: 'Enter model name (e.g., qwen3-coder)',
    value: provider.value === 'ollama' ? 'qwen3-coder' : '',
  });

  if (!model) {
    return;
  }

  // Get endpoint
  let endpoint = '';
  if (provider.value === 'ollama') {
    endpoint = 'http://localhost:11434/v1/chat/completions';
  } else if (provider.value === 'huggingface') {
    endpoint = 'https://api-inference.huggingface.co/models/';
  } else if (provider.value === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
  }

  endpoint = await vscode.window.showInputBox({
    placeHolder: 'Enter endpoint URL',
    value: endpoint,
  });

  if (!endpoint) {
    return;
  }

  // Create bridge
  this.mcpBridgeManager.createBridge({
    llmProvider: provider.value as LLMProvider,
    llmModel: model,
    llmEndpoint: endpoint,
    systemPrompt: 'You are a helpful assistant',
  });

  this.outputChannel.appendLine(`Created MCP server: ${model} (${provider.value})`);

  // Refresh the view
  this.refresh();
}
```

#### 2. Implement Tool Discovery and Display

**Key Tasks:**
- Implement tool discovery from MCP servers
- Add support for tool categorization and filtering
- Implement tool details visualization
- Add comprehensive tests for all functionality

**Implementation Details:**
```typescript
// src/ui/mcpServerExplorerView.ts

/**
 * Get tool items for a server
 */
private getToolItems(bridgeId: string): MCPServerTreeItem[] {
  const bridge = this.mcpBridgeManager.getBridge(bridgeId);

  if (!bridge) {
    return [];
  }

  const tools = bridge.getAllTools();

  return tools.map(tool => {
    return new MCPServerTreeItem(
      tool.name,
      vscode.TreeItemCollapsibleState.None,
      bridgeId,
      tool.name,
      tool.description
    );
  });
}
```

### Phase 3: MemoryGraphView Implementation (Low Priority)

The MemoryGraphView provides a visualization of the memory graph.

**Key Tasks:**
- Implement memory graph visualization
- Add support for memory graph navigation
- Add support for memory graph filtering
- Add comprehensive tests for all functionality

### Phase 4: UI Testing (Medium Priority)

#### 1. Add UI Component Tests

**Key Tasks:**
- Add tests for MCPChatView
- Add tests for MCPServerExplorerView
- Add tests for MemoryGraphView
- Add integration tests for UI components

**Implementation Details:**
```typescript
// src/test/suite/ui/mcpChatView.test.ts

/**
 * MCPChatView Tests
 */
describe('MCPChatView', () => {
  let provider: MCPChatViewProvider;
  let mockMCPBridgeManager: any;
  let mockOutputChannel: any;
  let mockContext: any;
  let mockPanel: any;
  let mockWebview: any;

  beforeEach(() => {
    // Mock dependencies
    mockOutputChannel = {
      appendLine: jest.fn(),
    };

    mockMCPBridgeManager = {
      getBridge: jest.fn(),
      getAllBridges: jest.fn(),
    };

    mockWebview = {
      html: '',
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn(),
    };

    mockPanel = {
      webview: mockWebview,
      reveal: jest.fn(),
      onDidDispose: jest.fn(),
      onDidChangeViewState: jest.fn(),
    };

    mockContext = {
      subscriptions: [],
      extensionPath: '/path/to/extension',
    };

    // Create provider
    provider = new MCPChatViewProvider(
      mockContext as any,
      mockMCPBridgeManager as any,
      mockOutputChannel as any
    );

    // Mock createWebviewPanel
    (vscode.window.createWebviewPanel as jest.Mock) = jest.fn().mockReturnValue(mockPanel);
  });

  test('should create or show panel', async () => {
    // Call createOrShowPanel
    await provider.createOrShowPanel();

    // Verify that createWebviewPanel was called
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'mcpChat',
      'MCP Chat',
      vscode.ViewColumn.One,
      expect.objectContaining({
        enableScripts: true,
        retainContextWhenHidden: true,
      })
    );

    // Verify that onDidReceiveMessage was called
    expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
  });

  test('should handle send message', async () => {
    // Mock bridge
    const mockBridge = {
      sendMessage: jest.fn().mockResolvedValue('Response from LLM'),
    };

    // Mock getBridge to return the mock bridge
    mockMCPBridgeManager.getBridge.mockReturnValue(mockBridge);

    // Create panel
    await provider.createOrShowPanel();

    // Get the message handler
    const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

    // Call the message handler with a send message
    await messageHandler({
      command: 'sendMessage',
      text: 'Hello, LLM!',
      bridgeId: 'bridge-id',
    });

    // Verify that getBridge was called
    expect(mockMCPBridgeManager.getBridge).toHaveBeenCalledWith('bridge-id');

    // Verify that sendMessage was called
    expect(mockBridge.sendMessage).toHaveBeenCalledWith('Hello, LLM!');

    // Verify that postMessage was called to add the user message
    expect(mockWebview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'addMessage',
        message: expect.objectContaining({
          role: 'user',
          content: 'Hello, LLM!',
        }),
      })
    );

    // Verify that postMessage was called to add the assistant message
    expect(mockWebview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'addMessage',
        message: expect.objectContaining({
          role: 'assistant',
          content: 'Response from LLM',
        }),
      })
    );
  });
});
```

## Conclusion

This implementation plan provides a roadmap for completing the UI components in the Adamize VS Code extension. By following this plan, the extension will achieve a seamless user experience for interacting with the MCP Bridge and Ollama integration.
