/**
 * LLM Client
 *
 * Client for interacting with Large Language Models through the MCP protocol.
 * @implements REQ-MCP-010 Call functions on tools with parameters
 * @implements REQ-MCP-060 Connect to local LLM providers
 * @implements REQ-MCP-061 Format prompts for LLM consumption
 * @implements REQ-MCP-062 Process LLM responses and extract tool calls
 * @implements REQ-MCP-063 Support multiple LLM providers
 */

import * as vscode from 'vscode';
import { MCPToolRegistry } from './mcpToolRegistry';

/**
 * LLM Provider type
 */
export enum LLMProvider {
  Ollama = 'ollama',
  HuggingFace = 'huggingface',
  OpenAI = 'openai',
  Custom = 'custom',
}

/**
 * LLM Client options
 */
export interface LLMClientOptions {
  /** Model name */
  model: string;

  /** API endpoint */
  endpoint: string;

  /** API key */
  apiKey?: string;

  /** System prompt */
  systemPrompt?: string;

  /** Temperature */
  temperature?: number;

  /** Max tokens */
  maxTokens?: number;

  /** Top P */
  topP?: number;

  /** Frequency penalty */
  frequencyPenalty?: number;

  /** Presence penalty */
  presencePenalty?: number;

  /** Stop sequences */
  stop?: string[];

  /** Provider type */
  provider?: LLMProvider;
}

/**
 * Message role
 */
export enum MessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

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
 * LLM Client for interacting with language models
 */
export class LLMClient {
  private options: LLMClientOptions;
  private toolRegistry: MCPToolRegistry;
  private outputChannel: vscode.OutputChannel;
  private conversationHistory: ChatMessage[] = [];

  /**
   * Create a new LLM client
   * @param options Client options
   * @param toolRegistry Tool registry
   * @param outputChannel Output channel for logging
   */
  constructor(
    options: LLMClientOptions,
    toolRegistry: MCPToolRegistry,
    outputChannel: vscode.OutputChannel
  ) {
    this.options = options;
    this.toolRegistry = toolRegistry;
    this.outputChannel = outputChannel;

    // Set default provider if not specified
    if (!this.options.provider) {
      if (this.options.endpoint.includes('ollama')) {
        this.options.provider = LLMProvider.Ollama;
      } else if (this.options.endpoint.includes('huggingface')) {
        this.options.provider = LLMProvider.HuggingFace;
      } else if (this.options.endpoint.includes('openai')) {
        this.options.provider = LLMProvider.OpenAI;
      } else {
        this.options.provider = LLMProvider.Custom;
      }
    }

    // Initialize conversation history with system message
    this.conversationHistory.push({
      role: MessageRole.System,
      content: this.options.systemPrompt || 'You are a helpful assistant.',
    });
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
      this.log(`Sending prompt to ${this.options.endpoint}`);

      // Add user message to conversation history
      this.conversationHistory.push({
        role: MessageRole.User,
        content: formattedPrompt,
      });

      // Create request body based on provider
      const requestBody = this.createRequestBody();

      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}),
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

      // Check for tool calls in the response
      const toolCalls = this.extractToolCalls(responseContent);
      if (toolCalls.length > 0) {
        this.log(`Extracted ${toolCalls.length} tool calls from response`);

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
            this.log(
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
    } catch (error) {
      this.log(`Error sending prompt: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create request body based on provider
   * @returns Request body
   */
  private createRequestBody(): any {
    const baseBody = {
      model: this.options.model,
      messages: this.conversationHistory.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
        ...(msg.name ? { name: msg.name } : {}),
      })),
      temperature: this.options.temperature || 0.7,
      max_tokens: this.options.maxTokens || 1000,
    };

    // Add provider-specific parameters
    switch (this.options.provider) {
      case LLMProvider.Ollama:
        return {
          ...baseBody,
          stream: false,
        };
      case LLMProvider.HuggingFace:
        return {
          ...baseBody,
          top_p: this.options.topP || 0.9,
          repetition_penalty: 1.0,
        };
      case LLMProvider.OpenAI:
        return {
          ...baseBody,
          top_p: this.options.topP || 0.9,
          frequency_penalty: this.options.frequencyPenalty || 0,
          presence_penalty: this.options.presencePenalty || 0,
          ...(this.options.stop ? { stop: this.options.stop } : {}),
        };
      default:
        return baseBody;
    }
  }

  /**
   * Extract response content from LLM response
   * @param data Response data
   * @returns Response content
   */
  private extractResponseContent(data: any): string {
    // Handle different response formats based on provider
    switch (this.options.provider) {
      case LLMProvider.Ollama:
        return data.message?.content || '';
      case LLMProvider.HuggingFace:
        return data.generated_text || data.message?.content || '';
      case LLMProvider.OpenAI:
        return data.choices?.[0]?.message?.content || '';
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
      this.log(
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

    this.log(`Executing tool call: ${toolName}.${functionName}`);
    return this.toolRegistry.executeFunction(toolName, functionName, args);
  }

  /**
   * Send a follow-up request with tool results
   * @returns LLM response
   */
  private async sendFollowUpWithToolResults(): Promise<string> {
    try {
      this.log('Sending follow-up request with tool results');

      // Create request body based on provider
      const requestBody = this.createRequestBody();

      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}),
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
      this.log(
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
      this.conversationHistory.push({
        role: MessageRole.System,
        content: this.options.systemPrompt || 'You are a helpful assistant.',
      });
    }
  }

  /**
   * Update the system prompt
   * @param systemPrompt New system prompt
   */
  updateSystemPrompt(systemPrompt: string): void {
    this.log(`Updating system prompt: ${systemPrompt}`);

    // Update the options
    this.options.systemPrompt = systemPrompt;

    // Update the system message in the conversation history
    if (
      this.conversationHistory.length > 0 &&
      this.conversationHistory[0].role === MessageRole.System
    ) {
      // Replace existing system message
      this.conversationHistory[0].content = systemPrompt;
    } else {
      // Add system message at the beginning
      this.conversationHistory.unshift({
        role: MessageRole.System,
        content: systemPrompt,
      });
    }
  }

  /**
   * Log a message to the output channel
   * @param message Message to log
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[LLM Client] ${message}`);
  }
}
