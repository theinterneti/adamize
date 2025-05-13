/**
 * LLM Client for MCP Bridge
 *
 * Client for interacting with Large Language Models through the MCP bridge.
 * Adapted from ollama-mcp-bridge for VS Code extension.
 *
 * @implements REQ-MCP-060 Connect to local LLM providers
 * @implements REQ-MCP-061 Format prompts for LLM consumption
 * @implements REQ-MCP-062 Process LLM responses and extract tool calls
 * @implements REQ-MCP-063 Support multiple LLM providers
 * @implements REQ-OLLAMA-012 Support streaming responses from Ollama
 */

import { ChildProcess, exec } from 'child_process';
import { LLMProvider } from '../llmClient';
import { MCPToolRegistry } from '../mcpToolRegistry';
import { LLMConfig, MessageRole } from './bridgeTypes';
import { VSCodeLogger } from './vscodeLogger';

/**
 * Chat message
 */
export interface ChatMessage {
  /** Message role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Tool calls (if role is assistant) */
  tool_calls?: ToolCall[];
  /** Tool name (if role is tool) */
  name?: string;
}

/**
 * Tool call
 */
export interface ToolCall {
  /** Tool call ID */
  id: string;
  /** Tool type */
  type: 'function';
  /** Function details */
  function: {
    /** Function name */
    name: string;
    /** Function arguments as JSON string */
    arguments: string;
  };
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  /** Tool call ID */
  tool_call_id: string;
  /** Tool name */
  name: string;
  /** Tool result */
  content: string;
}

/**
 * LLM Client for MCP Bridge
 */
/**
 * Streaming event handlers
 */
export interface StreamingEventHandlers {
  /** Called when content is received */
  onContent: (content: string) => void;
  /** Called when a tool call is detected */
  onToolCall?: (toolCall: ToolCall) => void;
  /** Called when streaming is complete */
  onComplete: () => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

export class LLMBridgeClient {
  private config: LLMConfig;
  private logger: VSCodeLogger;
  private toolRegistry: MCPToolRegistry;
  private conversationHistory: ChatMessage[] = [];
  private ollamaProcess: ChildProcess | null = null;
  private static REQUEST_TIMEOUT = 300000; // 5 minutes

  /**
   * Create a new LLM client
   * @param config LLM configuration
   * @param toolRegistry Tool registry
   * @param logger VS Code logger
   */
  constructor(config: LLMConfig, toolRegistry: MCPToolRegistry, logger: VSCodeLogger) {
    this.config = config;
    this.toolRegistry = toolRegistry;
    this.logger = logger;

    // Initialize conversation history with system message
    if (this.config.systemPrompt) {
      this.conversationHistory.push({
        role: MessageRole.System,
        content: this.config.systemPrompt,
      });
    }

    // Fix localhost to 127.0.0.1 for better compatibility
    if (this.config.endpoint.includes('localhost')) {
      this.config.endpoint = this.config.endpoint.replace('localhost', '127.0.0.1');
    }
  }

  /**
   * Send a prompt to the LLM
   * @param prompt User prompt
   * @param includeTools Whether to include tool instructions
   * @returns LLM response
   */
  async sendPrompt(prompt: string, includeTools: boolean = true): Promise<string> {
    try {
      const formattedPrompt = includeTools ? this.formatPrompt(prompt) : prompt;
      this.logger.info(`Sending prompt to ${this.config.endpoint}`);

      // Add user message to conversation history
      this.conversationHistory.push({
        role: MessageRole.User,
        content: formattedPrompt,
      });

      // Ensure Ollama is running
      await this.ensureOllamaRunning();

      // Create request body
      const requestBody = this.createRequestBody();

      // Send request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.logger.error(
          `Request timed out after ${LLMBridgeClient.REQUEST_TIMEOUT / 1000} seconds`
        );
      }, LLMBridgeClient.REQUEST_TIMEOUT);

      try {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const responseContent = this.extractResponseContent(data);

        // Add assistant message to conversation history
        this.conversationHistory.push({
          role: MessageRole.Assistant,
          content: responseContent,
        });

        // Check for tool calls in the response
        const toolCalls = this.extractToolCalls(responseContent);
        if (toolCalls.length > 0) {
          this.logger.info(`Extracted ${toolCalls.length} tool calls from response`);

          // Process tool calls and add results to conversation history
          for (const toolCall of toolCalls) {
            try {
              const result = await this.executeToolCall(toolCall);
              this.conversationHistory.push({
                role: MessageRole.Tool,
                name: toolCall.function.name,
                content: JSON.stringify(result),
              });
            } catch (error) {
              this.logger.error(
                `Error executing tool call: ${error instanceof Error ? error.message : String(error)}`
              );
              this.conversationHistory.push({
                role: MessageRole.Tool,
                name: toolCall.function.name,
                content: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                }),
              });
            }
          }

          // Send a follow-up request with tool results
          return this.sendFollowUpWithToolResults();
        }

        return responseContent;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      this.logger.error(
        `Error sending prompt: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Create request body
   * @param streaming Whether to enable streaming
   * @returns Request body
   */
  private createRequestBody(streaming: boolean = false): any {
    const baseBody = {
      model: this.config.model,
      messages: this.conversationHistory.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
        ...(msg.name ? { name: msg.name } : {}),
      })),
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 1000,
    };

    // Add provider-specific parameters
    switch (this.config.provider) {
      case LLMProvider.Ollama:
        return {
          ...baseBody,
          stream: streaming,
        };
      default:
        return {
          ...baseBody,
          stream: streaming,
        };
    }
  }

  /**
   * Extract response content from LLM response
   * @param data Response data
   * @returns Response content
   */
  private extractResponseContent(data: any): string {
    // Handle different response formats based on provider
    switch (this.config.provider) {
      case LLMProvider.Ollama:
        return data.message?.content || '';
      default:
        // Try to extract content from various formats
        return (
          data.message?.content ||
          data.generated_text ||
          data.choices?.[0]?.message?.content ||
          data.response ||
          ''
        );
    }
  }

  /**
   * Extract tool calls from response
   * @param response Response text
   * @returns Array of tool calls
   */
  private extractToolCalls(response: string): ToolCall[] {
    try {
      // Check if the response contains a JSON block
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        const jsonData = JSON.parse(jsonMatch[1]);

        // Check if it's a tool call
        if (jsonData.tool && jsonData.function && jsonData.parameters) {
          return [
            {
              id: `call-${Date.now()}`,
              type: 'function',
              function: {
                name: jsonData.function,
                arguments: JSON.stringify(jsonData.parameters),
              },
            },
          ];
        }
      }

      // Try to find any JSON object in the response
      const jsonObjects = response.match(/\{[\s\S]*?\}/g);
      if (jsonObjects) {
        for (const jsonStr of jsonObjects) {
          try {
            const jsonData = JSON.parse(jsonStr);
            if (jsonData.tool && jsonData.function && jsonData.parameters) {
              return [
                {
                  id: `call-${Date.now()}`,
                  type: 'function',
                  function: {
                    name: jsonData.function,
                    arguments: JSON.stringify(jsonData.parameters),
                  },
                },
              ];
            }
          } catch (e) {
            // Ignore parsing errors for invalid JSON
          }
        }
      }

      return [];
    } catch (error) {
      this.logger.error(
        `Error extracting tool calls: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Execute a tool call
   * @param toolCall Tool call to execute
   * @returns Tool call result
   */
  private async executeToolCall(toolCall: ToolCall): Promise<unknown> {
    const { name, arguments: argsStr } = toolCall.function;
    const args = JSON.parse(argsStr);

    // Extract tool and function names
    const parts = name.split('.');
    const toolName = parts.length > 1 ? parts[0] : name;
    const functionName = parts.length > 1 ? parts[1] : 'default';

    this.logger.info(`Executing tool call: ${toolName}.${functionName}`);
    return this.toolRegistry.executeFunction(toolName, functionName, args);
  }

  /**
   * Send a follow-up request with tool results
   * @returns LLM response
   */
  private async sendFollowUpWithToolResults(): Promise<string> {
    try {
      this.logger.info('Sending follow-up request with tool results');

      // Create request body
      const requestBody = this.createRequestBody();

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseContent = this.extractResponseContent(data);

      // Add assistant message to conversation history
      this.conversationHistory.push({
        role: MessageRole.Assistant,
        content: responseContent,
      });

      return responseContent;
    } catch (error) {
      this.logger.error(
        `Error sending follow-up: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Format the prompt with available tools
   * @param prompt User prompt
   * @returns Formatted prompt
   */
  private formatPrompt(prompt: string): string {
    const toolInstructions = this.toolRegistry.getToolInstructions();

    if (!toolInstructions) {
      return prompt;
    }

    return `${prompt}\n\n${toolInstructions}`;
  }

  /**
   * Get the conversation history
   * @returns Conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear the conversation history
   * @param keepSystemPrompt Whether to keep the system prompt
   */
  clearConversationHistory(keepSystemPrompt: boolean = true): void {
    if (
      keepSystemPrompt &&
      this.conversationHistory.length > 0 &&
      this.conversationHistory[0].role === MessageRole.System
    ) {
      this.conversationHistory = [this.conversationHistory[0]];
    } else {
      this.conversationHistory = [];
      // Re-add system message
      if (this.config.systemPrompt) {
        this.conversationHistory.push({
          role: MessageRole.System,
          content: this.config.systemPrompt,
        });
      }
    }
  }

  /**
   * Ensure Ollama is running
   */
  private async ensureOllamaRunning(): Promise<void> {
    // Check if Ollama is already running
    try {
      const response = await fetch(`${this.config.endpoint.split('/v1')[0]}/api/tags`);
      if (response.ok) {
        this.logger.debug('Ollama is already running');
        return;
      }
    } catch (error) {
      this.logger.debug('Ollama is not running, starting it...');
    }

    // Start Ollama
    if (!this.ollamaProcess) {
      this.logger.info('Starting Ollama...');
      this.ollamaProcess = exec('ollama serve', { windowsHide: true });

      this.ollamaProcess.stdout?.on('data', data => {
        this.logger.debug(`Ollama stdout: ${data.toString()}`);
      });

      this.ollamaProcess.stderr?.on('data', data => {
        this.logger.debug(`Ollama stderr: ${data.toString()}`);
      });

      this.ollamaProcess.on('error', error => {
        this.logger.error(`Error starting Ollama: ${error.message}`);
      });

      this.ollamaProcess.on('exit', code => {
        this.logger.info(`Ollama process exited with code ${code}`);
        this.ollamaProcess = null;
      });

      // Wait for Ollama to start
      for (let i = 0; i < 10; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const response = await fetch(`${this.config.endpoint.split('/v1')[0]}/api/tags`);
          if (response.ok) {
            this.logger.info('Ollama server is ready');
            return;
          }
        } catch (error) {
          this.logger.debug(`Waiting for Ollama server... attempt ${i + 1}`);
        }
      }

      throw new Error('Failed to start Ollama server');
    }
  }

  /**
   * Stream a prompt to the LLM
   * @param prompt User prompt
   * @param handlers Event handlers for streaming
   * @param includeTools Whether to include tool instructions
   */
  async streamPrompt(
    prompt: string,
    handlers: StreamingEventHandlers,
    includeTools: boolean = true
  ): Promise<void> {
    try {
      const formattedPrompt = includeTools ? this.formatPrompt(prompt) : prompt;
      this.logger.info(`Streaming prompt to ${this.config.endpoint}`);

      // Add user message to conversation history
      this.conversationHistory.push({
        role: MessageRole.User,
        content: formattedPrompt,
      });

      // Ensure Ollama is running
      await this.ensureOllamaRunning();

      // Create request body with streaming enabled
      const requestBody = this.createRequestBody(true);

      // Send request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.logger.error(
          `Request timed out after ${LLMBridgeClient.REQUEST_TIMEOUT / 1000} seconds`
        );
        if (handlers.onError) {
          handlers.onError(
            new Error(`Request timed out after ${LLMBridgeClient.REQUEST_TIMEOUT / 1000} seconds`)
          );
        }
      }, LLMBridgeClient.REQUEST_TIMEOUT);

      try {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`LLM API error: ${response.status} ${response.statusText}`);
          if (handlers.onError) {
            handlers.onError(error);
          }
          throw error;
        }

        if (!response.body) {
          const error = new Error('Response body is null');
          if (handlers.onError) {
            handlers.onError(error);
          }
          throw error;
        }

        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Process complete JSON objects
            let startIndex = 0;
            let endIndex = buffer.indexOf('\n', startIndex);

            while (endIndex !== -1) {
              const line = buffer.substring(startIndex, endIndex).trim();
              if (line) {
                try {
                  const data = JSON.parse(line);

                  // Extract content based on provider
                  let content = '';
                  switch (this.config.provider) {
                    case LLMProvider.Ollama:
                      content = data.message?.content || '';
                      break;
                    default:
                      content =
                        data.message?.content ||
                        data.choices?.[0]?.delta?.content ||
                        data.choices?.[0]?.message?.content ||
                        '';
                  }

                  if (content) {
                    fullContent += content;
                    handlers.onContent(content);
                  }

                  // Check for tool calls
                  if (data.message?.tool_calls) {
                    for (const toolCall of data.message.tool_calls) {
                      if (handlers.onToolCall) {
                        handlers.onToolCall(toolCall);
                      }
                    }
                  }

                  // Check if streaming is complete
                  if (data.done) {
                    break;
                  }
                } catch (error) {
                  this.logger.debug(`Error parsing JSON: ${error}`);
                }
              }

              startIndex = endIndex + 1;
              endIndex = buffer.indexOf('\n', startIndex);
            }

            // Keep the remaining part for the next iteration
            buffer = buffer.substring(startIndex);
          }
        } finally {
          reader.releaseLock();
        }

        // Add assistant message to conversation history
        this.conversationHistory.push({
          role: MessageRole.Assistant,
          content: fullContent,
        });

        // Check for tool calls in the full response
        const toolCalls = this.extractToolCalls(fullContent);
        if (toolCalls.length > 0) {
          this.logger.info(`Extracted ${toolCalls.length} tool calls from response`);

          // Process tool calls and add results to conversation history
          for (const toolCall of toolCalls) {
            try {
              const result = await this.executeToolCall(toolCall);
              this.conversationHistory.push({
                role: MessageRole.Tool,
                name: toolCall.function.name,
                content: JSON.stringify(result),
              });

              if (handlers.onToolCall) {
                handlers.onToolCall(toolCall);
              }
            } catch (error) {
              this.logger.error(
                `Error executing tool call: ${error instanceof Error ? error.message : String(error)}`
              );
              this.conversationHistory.push({
                role: MessageRole.Tool,
                name: toolCall.function.name,
                content: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                }),
              });
            }
          }
        }

        // Call the completion handler
        handlers.onComplete();
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      this.logger.error(
        `Error streaming prompt: ${error instanceof Error ? error.message : String(error)}`
      );
      if (handlers.onError) {
        handlers.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Close the client and stop Ollama if it was started by this client
   */
  async close(): Promise<void> {
    if (this.ollamaProcess) {
      this.logger.info('Stopping Ollama...');
      this.ollamaProcess.kill();
      this.ollamaProcess = null;
    }
  }
}
