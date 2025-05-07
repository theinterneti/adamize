# LLM Client Implementation Plan

This document outlines the implementation plan for the LLM Client component, which will handle communication with Ollama in the VS Code extension.

## Overview

The LLM Client will adapt the LLM client from the ollama-mcp-bridge to work within the VS Code extension context. It will handle communication with Ollama, support multiple connection methods, and integrate with VS Code's output channel for logging.

## Requirements

- **REQ-LLMCLIENT-001**: Adapt for VS Code extension context
- **REQ-LLMCLIENT-002**: Replace console logging with VS Code output channel
- **REQ-LLMCLIENT-003**: Add support for Docker-based Ollama
- **REQ-LLMCLIENT-004**: Ensure proper error handling and recovery
- **REQ-LLMCLIENT-005**: Add configuration options for Ollama URL and model
- **REQ-LLMCLIENT-006**: Support tool calls and responses
- **REQ-LLMCLIENT-007**: Support system prompts and conversation history
- **REQ-LLMCLIENT-008**: Support streaming responses
- **REQ-LLMCLIENT-009**: Support multiple LLM providers

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/llmClient.ts

import * as vscode from 'vscode';
import axios from 'axios';
import { VSCodeLogger } from './vscodeLogger';
import { 
  LLMConfig, 
  ConnectionMethod,
  Tool,
  LLMMessage,
  LLMRequest,
  LLMResponse,
  convertBridgeToolToOpenAIFormat
} from './bridgeTypes';

/**
 * LLM Client
 * 
 * Handles communication with Ollama.
 */
export class LLMClient {
  private logger: VSCodeLogger;
  private config: LLMConfig;
  private connectionMethod: ConnectionMethod;
  private tools: Tool[] = [];
  private messages: LLMMessage[] = [];
  private _systemPrompt: string = '';
  
  /**
   * Create a new LLM Client
   * @param config LLM configuration
   * @param logger Logger instance
   */
  constructor(
    config: LLMConfig,
    logger?: VSCodeLogger
  ) {
    this.config = config;
    this.logger = logger || new VSCodeLogger('Adamize LLM Client');
    this.connectionMethod = config.connectionMethod || ConnectionMethod.HTTP;
    
    // Set system prompt
    if (config.systemPrompt) {
      this._systemPrompt = config.systemPrompt;
    }
  }
  
  /**
   * Get system prompt
   */
  public get systemPrompt(): string {
    return this._systemPrompt;
  }
  
  /**
   * Set system prompt
   */
  public set systemPrompt(value: string) {
    this._systemPrompt = value;
  }
  
  /**
   * Initialize the LLM client
   * @returns True if initialized successfully
   */
  public async initialize(): Promise<boolean> {
    try {
      this.logger.info(`Initializing LLM client for model ${this.config.model}`);
      
      // Check if Ollama is available
      const response = await this.checkOllamaAvailability();
      
      if (!response) {
        this.logger.error('Ollama is not available');
        return false;
      }
      
      this.logger.info('LLM client initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`Error initializing LLM client: ${error}`);
      return false;
    }
  }
  
  /**
   * Check if Ollama is available
   * @returns True if Ollama is available
   */
  private async checkOllamaAvailability(): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl.endsWith('/v1') 
        ? this.config.baseUrl.slice(0, -3) 
        : this.config.baseUrl;
      
      const response = await axios.get(`${baseUrl}/api/tags`);
      
      if (response.status === 200) {
        // Check if the model is available
        const models = response.data.models || [];
        const modelExists = models.some((model: any) => model.name === this.config.model);
        
        if (!modelExists) {
          this.logger.warn(`Model ${this.config.model} is not available in Ollama`);
          this.logger.info('Available models:');
          models.forEach((model: any) => {
            this.logger.info(`- ${model.name}`);
          });
        }
        
        return true;
      } else {
        this.logger.error(`Failed to check Ollama availability: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error checking Ollama availability: ${error}`);
      return false;
    }
  }
  
  /**
   * Set tools for the LLM client
   * @param tools Tools to set
   */
  public setTools(tools: Tool[]): void {
    this.tools = tools;
    this.logger.info(`Set ${tools.length} tools for LLM client`);
  }
  
  /**
   * List available tools
   */
  public listTools(): void {
    this.logger.info(`Available tools (${this.tools.length}):`);
    
    this.tools.forEach(tool => {
      this.logger.info(`- ${tool.name}: ${tool.description}`);
    });
  }
  
  /**
   * Send a message to the LLM
   * @param message Message to send
   * @returns LLM response
   */
  public async sendMessage(message: string): Promise<LLMResponse> {
    try {
      this.logger.info('Sending message to LLM');
      this.logger.debug(`Message: ${message}`);
      
      // Add user message to history
      this.messages.push({
        role: 'user',
        content: message
      });
      
      // Prepare request
      const request: LLMRequest = {
        model: this.config.model,
        messages: [
          // Add system prompt if set
          ...(this._systemPrompt ? [{
            role: 'system',
            content: this._systemPrompt
          }] : []),
          // Add conversation history
          ...this.messages
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      };
      
      // Add tools if available
      if (this.tools.length > 0) {
        request.tools = this.tools.map(convertBridgeToolToOpenAIFormat);
      }
      
      // Send request
      const response = await this.sendRequest(request);
      
      // Add assistant response to history
      if (response.choices && response.choices.length > 0) {
        this.messages.push(response.choices[0].message);
      }
      
      return response;
    } catch (error) {
      this.logger.error(`Error sending message to LLM: ${error}`);
      throw error;
    }
  }
  
  /**
   * Send a request to the LLM
   * @param request Request to send
   * @returns LLM response
   */
  private async sendRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const baseUrl = this.config.baseUrl.endsWith('/v1') 
        ? this.config.baseUrl 
        : `${this.config.baseUrl}/v1`;
      
      this.logger.debug(`Sending request to ${baseUrl}/chat/completions`);
      this.logger.debug(`Request: ${JSON.stringify(request)}`);
      
      const response = await axios.post(`${baseUrl}/chat/completions`, request, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
        }
      });
      
      this.logger.debug(`Response: ${JSON.stringify(response.data)}`);
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending request to LLM: ${error}`);
      throw error;
    }
  }
  
  /**
   * Extract tool calls from LLM response
   * @param response LLM response
   * @returns Tool calls
   */
  public extractToolCalls(response: LLMResponse): any[] {
    try {
      if (!response.choices || response.choices.length === 0) {
        return [];
      }
      
      const message = response.choices[0].message;
      
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return [];
      }
      
      return message.tool_calls.map(toolCall => {
        try {
          return {
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments)
          };
        } catch (error) {
          this.logger.error(`Error parsing tool call arguments: ${error}`);
          return {
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: {}
          };
        }
      });
    } catch (error) {
      this.logger.error(`Error extracting tool calls: ${error}`);
      return [];
    }
  }
  
  /**
   * Add tool call result to conversation
   * @param toolCallId Tool call ID
   * @param toolName Tool name
   * @param result Tool call result
   */
  public addToolCallResult(toolCallId: string, toolName: string, result: any): void {
    try {
      this.logger.info(`Adding tool call result for ${toolName}`);
      this.logger.debug(`Result: ${JSON.stringify(result)}`);
      
      // Add tool call result to history
      this.messages.push({
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: toolCallId,
          type: 'function',
          function: {
            name: toolName,
            arguments: '{}'
          }
        }]
      });
      
      // Add tool result to history
      this.messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCallId
      } as any);
    } catch (error) {
      this.logger.error(`Error adding tool call result: ${error}`);
    }
  }
  
  /**
   * Clear conversation history
   */
  public clearConversation(): void {
    this.messages = [];
    this.logger.info('Cleared conversation history');
  }
  
  /**
   * Get conversation history
   * @returns Conversation history
   */
  public getConversation(): LLMMessage[] {
    return this.messages;
  }
  
  /**
   * Update LLM configuration
   * @param config New configuration
   */
  public updateConfig(config: Partial<LLMConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    this.logger.info('Updated LLM configuration');
    this.logger.debug(`New configuration: ${JSON.stringify(this.config)}`);
  }
}
```

## Test Plan

We will create tests for the LLM Client to ensure it meets the requirements:

1. **TEST-LLMCLIENT-001**: Test that the client can initialize successfully
2. **TEST-LLMCLIENT-002**: Test that the client can send messages to the LLM
3. **TEST-LLMCLIENT-003**: Test that the client can extract tool calls from LLM responses
4. **TEST-LLMCLIENT-004**: Test that the client can add tool call results to the conversation
5. **TEST-LLMCLIENT-005**: Test that the client can clear the conversation history
6. **TEST-LLMCLIENT-006**: Test that the client can update its configuration
7. **TEST-LLMCLIENT-007**: Test that the client handles errors gracefully
8. **TEST-LLMCLIENT-008**: Test that the client integrates with VS Code's output channel
9. **TEST-LLMCLIENT-009**: Test that the client supports system prompts

## Integration Plan

The LLM Client will be used by the MCP Bridge component:

1. Update the MCP Bridge to use the new LLM Client
2. Ensure compatibility with existing LLM client
3. Add support for VS Code-specific features

## Next Steps

After implementing the LLM Client, we will move on to adapting the Tool Registry component.
