/**
 * MCP Bridge Manager
 *
 * Manages MCP bridges and their lifecycle.
 * @implements REQ-MCP-080 Manage MCP bridge lifecycle
 * @implements REQ-MCP-081 Configure MCP bridge settings
 * @implements REQ-MCP-082 Integrate with VS Code extension
 * @implements REQ-MCP-083 Handle multiple MCP bridges
 * @implements REQ-OLLAMA-012 Support streaming responses from Ollama
 */

import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import { MCPBridge, MCPBridgeEventType, MCPBridgeOptions } from './mcpBridge';
import { MCPTool } from './mcpTypes';

/**
 * Bridge info
 */
export interface BridgeInfo {
  /** Bridge ID */
  id: string;
  /** Bridge instance */
  bridge: MCPBridge;
  /** Bridge options */
  options: MCPBridgeOptions;
  /** Bridge status */
  status: 'stopped' | 'running';
}

/**
 * MCP Bridge Manager
 */
export class MCPBridgeManager {
  private bridges: Map<string, BridgeInfo> = new Map();
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private disposables: vscode.Disposable[] = [];

  /**
   * Create a new MCP bridge manager
   * @param context Extension context
   * @param outputChannel Output channel for logging
   */
  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
    this.log('MCP Bridge Manager initialized');
  }

  /**
   * Create a new bridge
   * @param options Bridge options
   * @returns Bridge ID
   */
  createBridge(options: MCPBridgeOptions): string {
    const id = uuidv4();
    const bridge = new MCPBridge(options, this.outputChannel);

    this.bridges.set(id, {
      id,
      bridge,
      options,
      status: 'stopped',
    });

    this.log(`Created bridge ${id}`);
    return id;
  }

  /**
   * Get a bridge by ID
   * @param id Bridge ID
   * @returns Bridge or undefined if not found
   */
  getBridge(id: string): MCPBridge | undefined {
    const bridgeInfo = this.bridges.get(id);
    return bridgeInfo?.bridge;
  }

  /**
   * Get all bridges
   * @returns Array of bridge info
   */
  getAllBridges(): BridgeInfo[] {
    return Array.from(this.bridges.values());
  }

  /**
   * Remove a bridge
   * @param id Bridge ID
   */
  removeBridge(id: string): void {
    const bridgeInfo = this.bridges.get(id);
    if (bridgeInfo) {
      if (bridgeInfo.status === 'running') {
        bridgeInfo.bridge.stop();
      }
      this.bridges.delete(id);
      this.log(`Removed bridge ${id}`);
    }
  }

  /**
   * Start a bridge
   * @param id Bridge ID
   */
  startBridge(id: string): void {
    const bridgeInfo = this.bridges.get(id);
    if (bridgeInfo && bridgeInfo.status === 'stopped') {
      bridgeInfo.bridge.start();
      bridgeInfo.status = 'running';
      this.log(`Started bridge ${id}`);
    }
  }

  /**
   * Stop a bridge
   * @param id Bridge ID
   */
  stopBridge(id: string): void {
    const bridgeInfo = this.bridges.get(id);
    if (bridgeInfo && bridgeInfo.status === 'running') {
      bridgeInfo.bridge.stop();
      bridgeInfo.status = 'stopped';
      this.log(`Stopped bridge ${id}`);
    }
  }

  /**
   * Start all bridges
   */
  startAllBridges(): void {
    for (const [id, bridgeInfo] of this.bridges.entries()) {
      if (bridgeInfo.status === 'stopped') {
        bridgeInfo.bridge.start();
        bridgeInfo.status = 'running';
        this.log(`Started bridge ${id}`);
      }
    }
  }

  /**
   * Stop all bridges
   */
  stopAllBridges(): void {
    for (const [id, bridgeInfo] of this.bridges.entries()) {
      if (bridgeInfo.status === 'running') {
        bridgeInfo.bridge.stop();
        bridgeInfo.status = 'stopped';
        this.log(`Stopped bridge ${id}`);
      }
    }
  }

  /**
   * Update bridge settings
   * @param id Bridge ID
   * @param options New options
   */
  updateBridgeSettings(id: string, options: Partial<MCPBridgeOptions>): void {
    const bridgeInfo = this.bridges.get(id);
    if (bridgeInfo) {
      const wasRunning = bridgeInfo.status === 'running';
      if (wasRunning) {
        bridgeInfo.bridge.stop();
      }

      const newOptions = { ...bridgeInfo.options, ...options };
      const newBridge = new MCPBridge(newOptions, this.outputChannel);

      this.bridges.set(id, {
        id,
        bridge: newBridge,
        options: newOptions,
        status: 'stopped',
      });

      if (wasRunning) {
        newBridge.start();
        this.bridges.get(id)!.status = 'running';
      }

      this.log(`Updated bridge ${id} settings`);
    }
  }

  /**
   * Register a VS Code command
   * @param command Command name
   * @param callback Command callback
   * @returns Disposable
   */
  registerCommand(command: string, callback: (...args: any[]) => any): vscode.Disposable {
    const disposable = vscode.commands.registerCommand(command, callback);
    this.context.subscriptions.push(disposable);
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Register a tool with a bridge
   * @param bridgeId Bridge ID
   * @param tool Tool to register
   */
  registerTool(bridgeId: string, tool: MCPTool): void {
    const bridge = this.getBridge(bridgeId);
    if (bridge) {
      bridge.registerTool(tool);
      this.log(`Registered tool ${tool.name} with bridge ${bridgeId}`);
    }
  }

  /**
   * Unregister a tool from a bridge
   * @param bridgeId Bridge ID
   * @param toolName Tool name
   */
  unregisterTool(bridgeId: string, toolName: string): void {
    const bridge = this.getBridge(bridgeId);
    if (bridge) {
      bridge.unregisterTool(toolName);
      this.log(`Unregistered tool ${toolName} from bridge ${bridgeId}`);
    }
  }

  /**
   * Send a prompt to a bridge
   * @param bridgeId Bridge ID
   * @param prompt User prompt
   * @returns LLM response
   */
  async sendPrompt(bridgeId: string, prompt: string): Promise<string> {
    const bridge = this.getBridge(bridgeId);
    if (!bridge) {
      throw new Error(`Bridge ${bridgeId} not found`);
    }

    return bridge.sendPrompt(prompt);
  }

  /**
   * Clear conversation history for a bridge
   * @param bridgeId Bridge ID
   * @param keepSystemPrompt Whether to keep the system prompt
   */
  clearConversationHistory(bridgeId: string, keepSystemPrompt: boolean = true): void {
    const bridge = this.getBridge(bridgeId);
    if (bridge) {
      bridge.clearConversationHistory(keepSystemPrompt);
      this.log(`Cleared conversation history for bridge ${bridgeId}`);
    }
  }

  /**
   * Stream a message to a bridge
   * @param bridgeId Bridge ID
   * @param message Message to send
   * @param handlers Event handlers for streaming
   */
  async streamMessage(
    bridgeId: string,
    message: string,
    handlers: {
      onContent: (content: string) => void;
      onToolCall?: (toolCall: any) => void;
      onComplete: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    const bridge = this.getBridge(bridgeId);
    if (!bridge) {
      throw new Error(`Bridge ${bridgeId} not found`);
    }

    try {
      this.log(`Streaming message to bridge ${bridgeId}`);
      await bridge.streamMessage(message, handlers);
    } catch (error) {
      this.log(
        `Error streaming message to bridge ${bridgeId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Add an event listener to a bridge
   * @param bridgeId Bridge ID
   * @param eventType Event type
   * @param listener Event listener
   */
  addEventListener(
    bridgeId: string,
    eventType: MCPBridgeEventType,
    listener: (event: any) => void
  ): void {
    const bridge = this.getBridge(bridgeId);
    if (bridge) {
      bridge.addEventListener(eventType, listener);
    }
  }

  /**
   * Remove an event listener from a bridge
   * @param bridgeId Bridge ID
   * @param eventType Event type
   * @param listener Event listener
   */
  removeEventListener(
    bridgeId: string,
    eventType: MCPBridgeEventType,
    listener: (event: any) => void
  ): void {
    const bridge = this.getBridge(bridgeId);
    if (bridge) {
      bridge.removeEventListener(eventType, listener);
    }
  }

  /**
   * Get the tool registry from the first bridge
   * @returns Tool registry or undefined if no bridges exist
   */
  getToolRegistry(): any | undefined {
    const bridges = this.getAllBridges();
    if (bridges.length > 0) {
      const bridge = bridges[0].bridge;
      return bridge.getToolRegistry();
    }
    return undefined;
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    this.stopAllBridges();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.log('MCP Bridge Manager disposed');
  }

  /**
   * Log a message to the output channel
   * @param message Message to log
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[MCP Bridge Manager] ${message}`);
  }
}
