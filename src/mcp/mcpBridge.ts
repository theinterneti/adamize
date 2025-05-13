/**
 * MCP Bridge
 *
 * Bridge between LLM and MCP tools.
 * @implements REQ-MCP-070 Connect LLM with MCP tools
 * @implements REQ-MCP-071 Process user prompts and generate responses
 * @implements REQ-MCP-072 Execute tool calls and handle results
 * @implements REQ-MCP-073 Manage conversation context
 * @implements REQ-OLLAMA-012 Support streaming responses from Ollama
 */

import * as vscode from 'vscode';
import { LLMClient, LLMProvider } from './llmClient';
import { MCPToolRegistry } from './mcpToolRegistry';
import { MCPTool } from './mcpTypes';

/**
 * Streaming event handlers
 */
export interface StreamingEventHandlers {
  /** Called when content is received */
  onContent: (content: string) => void;
  /** Called when a tool call is detected */
  onToolCall?: (toolCall: any) => void;
  /** Called when streaming is complete */
  onComplete: () => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * MCP Bridge options
 */
export interface MCPBridgeOptions {
  /** LLM provider */
  llmProvider: LLMProvider;
  /** LLM model name */
  llmModel: string;
  /** LLM API endpoint */
  llmEndpoint: string;
  /** LLM API key */
  llmApiKey?: string;
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
}

/**
 * MCP Bridge event types
 */
export enum MCPBridgeEventType {
  /** Bridge started */
  Started = 'started',
  /** Bridge stopped */
  Stopped = 'stopped',
  /** User prompt received */
  PromptReceived = 'prompt-received',
  /** LLM response received */
  ResponseReceived = 'response-received',
  /** Tool call executed */
  ToolCallExecuted = 'tool-call-executed',
  /** Error occurred */
  Error = 'error',
}

/**
 * MCP Bridge event
 */
export interface MCPBridgeEvent {
  /** Event type */
  type: MCPBridgeEventType;
  /** Event data */
  data?: unknown;
  /** Timestamp */
  timestamp: number;
}

/**
 * MCP Bridge event listener
 */
export type MCPBridgeEventListener = (event: MCPBridgeEvent) => void;

/**
 * MCP Bridge
 */
export class MCPBridge {
  private llmClient: LLMClient;
  private toolRegistry: MCPToolRegistry;
  private outputChannel: vscode.OutputChannel;
  // Store options for configuration reference
  // This is stored for future use but not directly accessed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  private readonly _options: MCPBridgeOptions;
  private eventListeners: Map<MCPBridgeEventType, MCPBridgeEventListener[]> = new Map();
  private isRunning: boolean = false;

  /**
   * Create a new MCP bridge
   * @param options Bridge options
   * @param outputChannel Output channel for logging
   */
  constructor(options: MCPBridgeOptions, outputChannel: vscode.OutputChannel) {
    this._options = options;
    this.outputChannel = outputChannel;
    this.toolRegistry = new MCPToolRegistry(outputChannel);
    this.llmClient = new LLMClient(
      {
        model: options.llmModel,
        endpoint: options.llmEndpoint,
        apiKey: options.llmApiKey,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
        stop: options.stop,
        provider: options.llmProvider,
      },
      this.toolRegistry,
      outputChannel
    );
  }

  /**
   * Start the bridge
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.log('Starting MCP bridge');
    this.isRunning = true;
    this.emitEvent(MCPBridgeEventType.Started);
  }

  /**
   * Stop the bridge
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.log('Stopping MCP bridge');
    this.isRunning = false;
    this.emitEvent(MCPBridgeEventType.Stopped);
  }

  /**
   * Register a tool
   * @param tool Tool to register
   */
  registerTool(tool: MCPTool): void {
    this.toolRegistry.registerTool(tool);
  }

  /**
   * Unregister a tool
   * @param toolName Tool name
   */
  unregisterTool(toolName: string): void {
    this.toolRegistry.unregisterTool(toolName);
  }

  /**
   * Get all registered tools
   * @returns Array of registered tools
   */
  getAllTools(): MCPTool[] {
    return this.toolRegistry.getAllTools();
  }

  /**
   * Get the tool registry
   * @returns Tool registry
   */
  getToolRegistry(): MCPToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Send a prompt to the LLM
   * @param prompt User prompt
   * @returns LLM response
   */
  async sendPrompt(prompt: string): Promise<string> {
    if (!this.isRunning) {
      throw new Error('MCP bridge is not running');
    }

    try {
      this.log(`Sending prompt: ${prompt}`);
      this.emitEvent(MCPBridgeEventType.PromptReceived, { prompt });

      const response = await this.llmClient.sendPrompt(prompt);

      this.log(`Received response: ${response}`);
      this.emitEvent(MCPBridgeEventType.ResponseReceived, { response });

      return response;
    } catch (error) {
      this.log(`Error sending prompt: ${error instanceof Error ? error.message : String(error)}`);
      this.emitEvent(MCPBridgeEventType.Error, { error });
      throw error;
    }
  }

  /**
   * Clear the conversation history
   * @param keepSystemPrompt Whether to keep the system prompt
   */
  clearConversationHistory(keepSystemPrompt: boolean = true): void {
    this.llmClient.clearConversationHistory(keepSystemPrompt);
  }

  /**
   * Send a message to the MCP server
   * @param message Message to send
   * @returns Server response
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.isRunning) {
      throw new Error('MCP bridge is not running');
    }

    try {
      this.log(`Sending message: ${message}`);
      const response = await this.sendPrompt(message);
      return response;
    } catch (error) {
      this.log(`Error sending message: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Stream a message to the MCP server
   * @param message Message to send
   * @param handlers Event handlers for streaming
   */
  async streamMessage(message: string, handlers: StreamingEventHandlers): Promise<void> {
    if (!this.isRunning) {
      throw new Error('MCP bridge is not running');
    }

    try {
      this.log(`Streaming message: ${message}`);
      this.emitEvent(MCPBridgeEventType.PromptReceived, { prompt: message });

      // Check if the LLM client supports streaming
      if (typeof this.llmClient.streamPrompt !== 'function') {
        this.log('LLM client does not support streaming, falling back to non-streaming mode');

        // Fall back to non-streaming mode
        const response = await this.sendPrompt(message);

        // Simulate streaming with the full response
        handlers.onContent(response);
        handlers.onComplete();

        return;
      }

      // Create streaming handlers
      const streamingHandlers = {
        onContent: (content: string) => {
          handlers.onContent(content);
          this.emitEvent(MCPBridgeEventType.ResponseReceived, {
            response: content,
            streaming: true,
          });
        },
        onToolCall: (toolCall: any) => {
          if (handlers.onToolCall) {
            handlers.onToolCall(toolCall);
          }
          this.emitEvent(MCPBridgeEventType.ToolCallExecuted, {
            toolCall,
            streaming: true,
          });
        },
        onComplete: () => {
          handlers.onComplete();
          this.emitEvent(MCPBridgeEventType.ResponseReceived, {
            complete: true,
            streaming: true,
          });
        },
        onError: (error: Error) => {
          if (handlers.onError) {
            handlers.onError(error);
          }
          this.emitEvent(MCPBridgeEventType.Error, {
            error,
            streaming: true,
          });
        },
      };

      // Stream the prompt
      await this.llmClient.streamPrompt(message, streamingHandlers);
    } catch (error) {
      this.log(
        `Error streaming message: ${error instanceof Error ? error.message : String(error)}`
      );
      if (handlers.onError) {
        handlers.onError(error instanceof Error ? error : new Error(String(error)));
      }
      this.emitEvent(MCPBridgeEventType.Error, { error });
      throw error;
    }
  }

  /**
   * Add an event listener
   * @param eventType Event type
   * @param listener Event listener
   */
  addEventListener(eventType: MCPBridgeEventType, listener: MCPBridgeEventListener): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove an event listener
   * @param eventType Event type
   * @param listener Event listener
   */
  removeEventListener(eventType: MCPBridgeEventType, listener: MCPBridgeEventListener): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  /**
   * Emit an event
   * @param eventType Event type
   * @param data Event data
   */
  private emitEvent(eventType: MCPBridgeEventType, data?: unknown): void {
    const event: MCPBridgeEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    const listeners = this.eventListeners.get(eventType) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        this.log(
          `Error in event listener: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Log a message to the output channel
   * @param message Message to log
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[MCP Bridge] ${message}`);
  }
}
