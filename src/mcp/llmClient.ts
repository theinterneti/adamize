/**
 * LLM Client
 *
 * Client for interacting with Large Language Models through the MCP protocol.
 * @implements REQ-MCP-010
 */

import * as vscode from 'vscode';
import { MCPToolRegistry } from './mcpToolRegistry';

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
}

/**
 * LLM Client for interacting with language models
 */
export class LLMClient {
  private options: LLMClientOptions;
  private toolRegistry: MCPToolRegistry;
  private outputChannel: vscode.OutputChannel;

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
  }

  /**
   * Send a prompt to the LLM
   * @param prompt User prompt
   * @returns LLM response
   */
  async sendPrompt(prompt: string): Promise<string> {
    try {
      const formattedPrompt = this.formatPrompt(prompt);
      this.log(`Sending prompt to ${this.options.endpoint}`);

      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey ? { 'Authorization': `Bearer ${this.options.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            { role: 'system', content: this.options.systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: formattedPrompt }
          ],
          temperature: this.options.temperature || 0.7,
          max_tokens: this.options.maxTokens || 1000
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Type assertion for the response data
      const typedData = data as {
        message: {
          content: string
        }
      };
      return typedData.message.content;
    } catch (error) {
      this.log(`Error sending prompt: ${error instanceof Error ? error.message : String(error)}`);
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
   * Log a message to the output channel
   * @param message Message to log
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[LLM Client] ${message}`);
  }
}
