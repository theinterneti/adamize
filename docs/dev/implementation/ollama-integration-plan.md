# Ollama Integration Implementation Plan

This document outlines the implementation plan for enhancing the Ollama integration in the Adamize VS Code extension.

## Overview

The Ollama integration enables the use of local LLMs through Ollama for various features in the Adamize VS Code extension. While many components of the Ollama integration are already implemented, some enhancements and integrations with the MCP Bridge are still needed.

## Current Status

| Component | Status | Description |
|-----------|--------|-------------|
| OllamaClient | ✅ Complete | Client for interacting with the Ollama API |
| Ollama Configuration View | ✅ Complete | UI for configuring Ollama settings |
| Ollama Commands | ✅ Complete | Commands for starting, stopping, and managing Ollama |
| Model Management | ✅ Complete | Model discovery, pulling, and removal |
| MCP Bridge Integration | ⚠️ Partial | Integration with the MCP Bridge |

## Implementation Plan

The implementation plan focuses on enhancing the Ollama integration and ensuring seamless integration with the MCP Bridge.

### Phase 1: MCP Bridge Integration (High Priority)

#### 1. Enhance LLMBridgeClient for Ollama

The LLMBridgeClient needs to be enhanced to better support Ollama's capabilities.

**Key Tasks:**
- Improve streaming support for Ollama responses
- Add support for tool execution through Ollama
- Enhance error handling and recovery
- Add comprehensive tests for all methods

**Implementation Details:**
```typescript
// src/mcp/bridge/llmClient.ts

/**
 * Stream a prompt to the LLM
 * @param prompt User prompt
 * @param handlers Stream handlers
 */
async streamPrompt(
  prompt: string,
  handlers: {
    onContent: (content: string) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  try {
    this.logger.info('Streaming prompt to LLM');

    // Add user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: prompt,
    });

    // Prepare messages for Ollama
    const messages = this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Prepare request body
    const body = {
      model: this.config.model,
      messages,
      stream: true,
      options: {
        temperature: this.config.temperature,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        max_tokens: this.config.maxTokens,
      },
    };

    // Ensure Ollama is running
    await this.ensureOllamaRunning();

    // Make streaming request to Ollama
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      
      try {
        // Ollama returns JSON objects for each chunk
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const data = JSON.parse(line);
          
          if (data.message?.content) {
            const newContent = data.message.content;
            content += newContent;
            handlers.onContent(newContent);
          }
        }
      } catch (error) {
        this.logger.error(`Error parsing chunk: ${error}`);
      }
    }

    // Add assistant message to conversation history
    this.conversationHistory.push({
      role: 'assistant',
      content,
    });

    handlers.onComplete();
  } catch (error) {
    this.logger.error(`Error streaming prompt: ${error}`);
    handlers.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
```

#### 2. Implement Tool Execution through Ollama

Enable the execution of MCP tools through Ollama.

**Key Tasks:**
- Implement tool call parsing from Ollama responses
- Implement tool execution and result handling
- Add support for tool-specific instructions
- Add comprehensive tests for all methods

**Implementation Details:**
```typescript
// src/mcp/bridge/llmClient.ts

/**
 * Parse tool calls from LLM response
 * @param response LLM response
 * @returns Tool calls
 */
parseToolCalls(response: string): MCPToolCall[] {
  try {
    this.logger.info('Parsing tool calls from response');

    const toolCalls: MCPToolCall[] = [];

    // Look for function call patterns in the response
    const functionCallRegex = /```json\s*{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"function"\s*:\s*"([^"]+)"\s*,\s*"parameters"\s*:\s*({[^}]+})\s*}\s*```/g;
    
    let match;
    while ((match = functionCallRegex.exec(response)) !== null) {
      const [_, tool, func, paramsStr] = match;
      
      try {
        const parameters = JSON.parse(paramsStr);
        
        toolCalls.push({
          tool,
          function: func,
          parameters,
        });
      } catch (error) {
        this.logger.error(`Error parsing parameters: ${error}`);
      }
    }

    this.logger.info(`Found ${toolCalls.length} tool calls`);
    return toolCalls;
  } catch (error) {
    this.logger.error(`Error parsing tool calls: ${error}`);
    return [];
  }
}
```

### Phase 2: Streaming Enhancements (Medium Priority)

#### 1. Implement Streaming UI for Ollama Responses

Enhance the UI to support streaming responses from Ollama.

**Key Tasks:**
- Update MCPChatView to handle streaming responses
- Implement real-time message updates
- Add support for tool call visualization during streaming
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

### Phase 3: Model Management Enhancements (Medium Priority)

#### 1. Enhance Model Management Integration with MCP Bridge

Improve the integration between the Model Management system and the MCP Bridge.

**Key Tasks:**
- Implement model switching in the MCP Bridge
- Add support for model configuration presets
- Enhance error handling and recovery
- Add comprehensive tests for all functionality

### Phase 4: Documentation and Configuration (Low Priority)

#### 1. Update Documentation

**Key Tasks:**
- Update Ollama integration documentation
- Document configuration options
- Create user guides for Ollama features
- Document troubleshooting steps

#### 2. Add Configuration Options

**Key Tasks:**
- Add Ollama-specific configuration options
- Add model configuration options
- Add UI configuration options
- Document all configuration options

## Configuration Steps

Once the enhancements are implemented, the following configuration steps will be needed:

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

## Conclusion

This implementation plan provides a roadmap for enhancing the Ollama integration in the Adamize VS Code extension. By following this plan, the extension will achieve seamless integration between Ollama and the MCP Bridge, enabling powerful AI-powered development assistance.
