/**
 * MCP Bridge Manager
 *
 * Manages MCP bridges and their lifecycle.
 * @implements REQ-MCP-080 Manage MCP bridge lifecycle
 * @implements REQ-MCP-081 Configure MCP bridge settings
 * @implements REQ-MCP-082 Integrate with VS Code extension
 * @implements REQ-MCP-083 Handle multiple MCP bridges
 * @implements REQ-MCP-084 Validate bridge configuration
 * @implements REQ-MCP-085 Implement comprehensive event system
 * @implements REQ-MCP-086 Implement error recovery mechanisms
 * @implements REQ-OLLAMA-012 Support streaming responses from Ollama
 */

import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import { MCPBridge, MCPBridgeEventType, MCPBridgeOptions } from './mcpBridge';
import { MCPTool } from './mcpTypes';

/**
 * Bridge status enum
 */
export enum BridgeStatus {
  /** Bridge is stopped */
  Stopped = 'stopped',
  /** Bridge is running */
  Running = 'running',
  /** Bridge is connecting */
  Connecting = 'connecting',
  /** Bridge has an error */
  Error = 'error',
  /** Bridge is reconnecting */
  Reconnecting = 'reconnecting',
}

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
  status: BridgeStatus;
  /** Error message if status is Error */
  error?: string;
  /** Reconnection attempts if status is Reconnecting */
  reconnectAttempts?: number;
}

/**
 * Bridge event types
 */
export enum BridgeManagerEventType {
  /** Bridge created */
  BridgeCreated = 'bridge:created',
  /** Bridge started */
  BridgeStarted = 'bridge:started',
  /** Bridge stopped */
  BridgeStopped = 'bridge:stopped',
  /** Bridge connected */
  BridgeConnected = 'bridge:connected',
  /** Bridge disconnected */
  BridgeDisconnected = 'bridge:disconnected',
  /** Bridge error */
  BridgeError = 'bridge:error',
  /** Bridge tools discovered */
  BridgeToolsDiscovered = 'bridge:toolsDiscovered',
  /** Bridge removed */
  BridgeRemoved = 'bridge:removed',
  /** Bridge settings updated */
  BridgeSettingsUpdated = 'bridge:settingsUpdated',
}

/**
 * Bridge event
 */
export interface BridgeManagerEvent {
  /** Event type */
  type: BridgeManagerEventType;
  /** Bridge ID */
  bridgeId: string;
  /** Event data */
  data?: any;
  /** Timestamp */
  timestamp: number;
}

/**
 * Bridge event listener
 */
export type BridgeManagerEventListener = (event: BridgeManagerEvent) => void;

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
}

/**
 * MCP Bridge Manager
 */
export class MCPBridgeManager {
  private bridges: Map<string, BridgeInfo> = new Map();
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private disposables: vscode.Disposable[] = [];
  private eventListeners: Map<BridgeManagerEventType, BridgeManagerEventListener[]> = new Map();
  private maxReconnectAttempts: number = 3;
  private reconnectInterval: number = 5000; // 5 seconds

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
   * Validate bridge configuration
   * @param options Bridge options
   * @returns Array of validation errors, empty if valid
   */
  validateConfiguration(options: MCPBridgeOptions): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    // Required fields
    if (!options.llmProvider) {
      errors.push({ field: 'llmProvider', message: 'LLM provider is required' });
    }

    if (!options.llmModel) {
      errors.push({ field: 'llmModel', message: 'LLM model is required' });
    }

    if (!options.llmEndpoint) {
      errors.push({ field: 'llmEndpoint', message: 'LLM endpoint is required' });
    } else {
      // Validate endpoint URL format
      try {
        new URL(options.llmEndpoint);
      } catch (error) {
        errors.push({ field: 'llmEndpoint', message: 'Invalid endpoint URL format' });
      }
    }

    // Validate numeric parameters
    if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 1)) {
      errors.push({ field: 'temperature', message: 'Temperature must be between 0 and 1' });
    }

    if (options.maxTokens !== undefined && options.maxTokens <= 0) {
      errors.push({ field: 'maxTokens', message: 'Max tokens must be greater than 0' });
    }

    if (options.topP !== undefined && (options.topP < 0 || options.topP > 1)) {
      errors.push({ field: 'topP', message: 'Top P must be between 0 and 1' });
    }

    if (
      options.frequencyPenalty !== undefined &&
      (options.frequencyPenalty < 0 || options.frequencyPenalty > 2)
    ) {
      errors.push({
        field: 'frequencyPenalty',
        message: 'Frequency penalty must be between 0 and 2',
      });
    }

    if (
      options.presencePenalty !== undefined &&
      (options.presencePenalty < 0 || options.presencePenalty > 2)
    ) {
      errors.push({
        field: 'presencePenalty',
        message: 'Presence penalty must be between 0 and 2',
      });
    }

    return errors;
  }

  /**
   * Create a new bridge
   * @param options Bridge options
   * @returns Bridge ID or null if validation fails
   * @throws Error if validation fails and throwOnError is true
   */
  createBridge(options: MCPBridgeOptions, throwOnError: boolean = false): string | null {
    // Validate configuration
    const validationErrors = this.validateConfiguration(options);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => `${err.field}: ${err.message}`).join(', ');
      this.log(`Failed to create bridge: ${errorMessages}`);

      if (throwOnError) {
        throw new Error(`Invalid bridge configuration: ${errorMessages}`);
      }

      return null;
    }

    const id = uuidv4();
    const bridge = new MCPBridge(options, this.outputChannel);

    // Set up bridge event listeners
    bridge.addEventListener(MCPBridgeEventType.Started, event => {
      this.emitEvent(BridgeManagerEventType.BridgeStarted, id, event.data);
    });

    bridge.addEventListener(MCPBridgeEventType.Stopped, event => {
      this.emitEvent(BridgeManagerEventType.BridgeStopped, id, event.data);
    });

    bridge.addEventListener(MCPBridgeEventType.Error, event => {
      const bridgeInfo = this.bridges.get(id);
      if (bridgeInfo) {
        bridgeInfo.status = BridgeStatus.Error;
        bridgeInfo.error = event.data?.error?.message || 'Unknown error';

        // Attempt to reconnect if appropriate
        this.handleBridgeError(id, event.data?.error);
      }

      this.emitEvent(BridgeManagerEventType.BridgeError, id, event.data);
    });

    this.bridges.set(id, {
      id,
      bridge,
      options,
      status: BridgeStatus.Stopped,
    });

    this.log(`Created bridge ${id}`);
    this.emitEvent(BridgeManagerEventType.BridgeCreated, id, { options });
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
   * @returns True if the bridge was started, false otherwise
   */
  startBridge(id: string): boolean {
    const bridgeInfo = this.bridges.get(id);
    if (bridgeInfo && bridgeInfo.status === BridgeStatus.Stopped) {
      try {
        bridgeInfo.status = BridgeStatus.Connecting;
        bridgeInfo.bridge.start();
        bridgeInfo.status = BridgeStatus.Running;
        this.log(`Started bridge ${id}`);
        return true;
      } catch (error) {
        bridgeInfo.status = BridgeStatus.Error;
        bridgeInfo.error = error instanceof Error ? error.message : String(error);
        this.log(`Error starting bridge ${id}: ${bridgeInfo.error}`);
        this.emitEvent(BridgeManagerEventType.BridgeError, id, { error });
        return false;
      }
    }
    return false;
  }

  /**
   * Stop a bridge
   * @param id Bridge ID
   * @returns True if the bridge was stopped, false otherwise
   */
  stopBridge(id: string): boolean {
    const bridgeInfo = this.bridges.get(id);
    if (
      bridgeInfo &&
      (bridgeInfo.status === BridgeStatus.Running ||
        bridgeInfo.status === BridgeStatus.Error ||
        bridgeInfo.status === BridgeStatus.Reconnecting)
    ) {
      try {
        bridgeInfo.bridge.stop();
        bridgeInfo.status = BridgeStatus.Stopped;
        this.log(`Stopped bridge ${id}`);
        return true;
      } catch (error) {
        this.log(
          `Error stopping bridge ${id}: ${error instanceof Error ? error.message : String(error)}`
        );
        return false;
      }
    }
    return false;
  }

  /**
   * Handle bridge error
   * @param id Bridge ID
   * @param error Error object
   */
  private handleBridgeError(id: string, error: any): void {
    const bridgeInfo = this.bridges.get(id);
    if (!bridgeInfo) {
      return;
    }

    // Check if we should attempt to reconnect
    if (bridgeInfo.status === BridgeStatus.Running) {
      // Initialize reconnect attempts
      bridgeInfo.reconnectAttempts = 0;
      this.attemptReconnect(id);
    } else if (bridgeInfo.status === BridgeStatus.Reconnecting) {
      // Increment reconnect attempts
      if (bridgeInfo.reconnectAttempts !== undefined) {
        bridgeInfo.reconnectAttempts++;
      } else {
        bridgeInfo.reconnectAttempts = 1;
      }

      // Check if we've reached the maximum number of reconnect attempts
      if (bridgeInfo.reconnectAttempts >= this.maxReconnectAttempts) {
        bridgeInfo.status = BridgeStatus.Error;
        bridgeInfo.error = 'Maximum reconnect attempts reached';
        this.log(`Maximum reconnect attempts reached for bridge ${id}`);
        this.emitEvent(BridgeManagerEventType.BridgeError, id, {
          error: new Error('Maximum reconnect attempts reached'),
          reconnectAttempts: bridgeInfo.reconnectAttempts,
        });
      } else {
        // Try to reconnect again
        this.attemptReconnect(id);
      }
    }
  }

  /**
   * Attempt to reconnect a bridge
   * @param id Bridge ID
   */
  private attemptReconnect(id: string): void {
    const bridgeInfo = this.bridges.get(id);
    if (!bridgeInfo) {
      return;
    }

    bridgeInfo.status = BridgeStatus.Reconnecting;
    this.log(`Attempting to reconnect bridge ${id} (attempt ${bridgeInfo.reconnectAttempts})`);

    // Schedule reconnect attempt
    setTimeout(() => {
      try {
        // Stop the bridge if it's still running
        bridgeInfo.bridge.stop();

        // Create a new bridge with the same options
        const newBridge = new MCPBridge(bridgeInfo.options, this.outputChannel);

        // Update the bridge info
        bridgeInfo.bridge = newBridge;

        // Start the new bridge
        newBridge.start();

        // Update status
        bridgeInfo.status = BridgeStatus.Running;
        delete bridgeInfo.error;

        this.log(`Successfully reconnected bridge ${id}`);
        this.emitEvent(BridgeManagerEventType.BridgeConnected, id, {
          reconnectAttempts: bridgeInfo.reconnectAttempts,
        });
      } catch (error) {
        this.log(
          `Error reconnecting bridge ${id}: ${error instanceof Error ? error.message : String(error)}`
        );
        this.handleBridgeError(id, error);
      }
    }, this.reconnectInterval);
  }

  /**
   * Start all bridges
   * @returns Number of bridges successfully started
   */
  startAllBridges(): number {
    let startedCount = 0;
    for (const [id, bridgeInfo] of this.bridges.entries()) {
      if (bridgeInfo.status === BridgeStatus.Stopped) {
        if (this.startBridge(id)) {
          startedCount++;
        }
      }
    }
    return startedCount;
  }

  /**
   * Stop all bridges
   * @returns Number of bridges successfully stopped
   */
  stopAllBridges(): number {
    let stoppedCount = 0;
    for (const [id, bridgeInfo] of this.bridges.entries()) {
      if (
        bridgeInfo.status === BridgeStatus.Running ||
        bridgeInfo.status === BridgeStatus.Error ||
        bridgeInfo.status === BridgeStatus.Reconnecting
      ) {
        if (this.stopBridge(id)) {
          stoppedCount++;
        }
      }
    }
    return stoppedCount;
  }

  /**
   * Add an event listener
   * @param eventType Event type
   * @param listener Event listener
   */
  addEventListenerManager(
    eventType: BridgeManagerEventType,
    listener: BridgeManagerEventListener
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove an event listener
   * @param eventType Event type
   * @param listener Event listener
   */
  removeEventListenerManager(
    eventType: BridgeManagerEventType,
    listener: BridgeManagerEventListener
  ): void {
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
   * @param bridgeId Bridge ID
   * @param data Event data
   */
  private emitEvent(eventType: BridgeManagerEventType, bridgeId: string, data?: any): void {
    const event: BridgeManagerEvent = {
      type: eventType,
      bridgeId,
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
   * Update bridge settings
   * @param id Bridge ID
   * @param options New options
   * @returns True if settings were updated successfully, false otherwise
   */
  updateBridgeSettings(id: string, options: Partial<MCPBridgeOptions>): boolean {
    const bridgeInfo = this.bridges.get(id);
    if (!bridgeInfo) {
      this.log(`Bridge ${id} not found`);
      return false;
    }

    // Merge options
    const newOptions = { ...bridgeInfo.options, ...options };

    // Validate new options
    const validationErrors = this.validateConfiguration(newOptions);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => `${err.field}: ${err.message}`).join(', ');
      this.log(`Failed to update bridge ${id} settings: ${errorMessages}`);
      this.emitEvent(BridgeManagerEventType.BridgeError, id, {
        error: new Error(`Invalid bridge configuration: ${errorMessages}`),
        validationErrors,
      });
      return false;
    }

    try {
      const wasRunning = bridgeInfo.status === BridgeStatus.Running;

      // Stop the bridge if it's running
      if (wasRunning) {
        bridgeInfo.bridge.stop();
      }

      // Create a new bridge with the updated options
      const newBridge = new MCPBridge(newOptions, this.outputChannel);

      // Set up bridge event listeners
      newBridge.addEventListener(MCPBridgeEventType.Started, event => {
        this.emitEvent(BridgeManagerEventType.BridgeStarted, id, event.data);
      });

      newBridge.addEventListener(MCPBridgeEventType.Stopped, event => {
        this.emitEvent(BridgeManagerEventType.BridgeStopped, id, event.data);
      });

      newBridge.addEventListener(MCPBridgeEventType.Error, event => {
        const bridgeInfo = this.bridges.get(id);
        if (bridgeInfo) {
          bridgeInfo.status = BridgeStatus.Error;
          bridgeInfo.error = event.data?.error?.message || 'Unknown error';

          // Attempt to reconnect if appropriate
          this.handleBridgeError(id, event.data?.error);
        }

        this.emitEvent(BridgeManagerEventType.BridgeError, id, event.data);
      });

      // Update the bridge info
      this.bridges.set(id, {
        id,
        bridge: newBridge,
        options: newOptions,
        status: BridgeStatus.Stopped,
      });

      // Restart the bridge if it was running
      if (wasRunning) {
        newBridge.start();
        this.bridges.get(id)!.status = BridgeStatus.Running;
      }

      this.log(`Updated bridge ${id} settings`);
      this.emitEvent(BridgeManagerEventType.BridgeSettingsUpdated, id, {
        oldOptions: bridgeInfo.options,
        newOptions,
      });

      return true;
    } catch (error) {
      this.log(
        `Error updating bridge ${id} settings: ${error instanceof Error ? error.message : String(error)}`
      );
      this.emitEvent(BridgeManagerEventType.BridgeError, id, { error });
      return false;
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
   * Set the maximum number of reconnect attempts
   * @param attempts Maximum number of reconnect attempts
   */
  setMaxReconnectAttempts(attempts: number): void {
    if (attempts < 0) {
      throw new Error('Maximum reconnect attempts must be non-negative');
    }
    this.maxReconnectAttempts = attempts;
  }

  /**
   * Set the reconnect interval
   * @param interval Reconnect interval in milliseconds
   */
  setReconnectInterval(interval: number): void {
    if (interval < 1000) {
      throw new Error('Reconnect interval must be at least 1000ms');
    }
    this.reconnectInterval = interval;
  }

  /**
   * Get bridge status
   * @param id Bridge ID
   * @returns Bridge status or undefined if bridge not found
   */
  getBridgeStatus(id: string): BridgeStatus | undefined {
    return this.bridges.get(id)?.status;
  }

  /**
   * Get bridge error
   * @param id Bridge ID
   * @returns Bridge error or undefined if bridge not found or has no error
   */
  getBridgeError(id: string): string | undefined {
    return this.bridges.get(id)?.error;
  }

  /**
   * Reset bridge error
   * @param id Bridge ID
   * @returns True if error was reset, false otherwise
   */
  resetBridgeError(id: string): boolean {
    const bridgeInfo = this.bridges.get(id);
    if (bridgeInfo && bridgeInfo.status === BridgeStatus.Error) {
      delete bridgeInfo.error;
      bridgeInfo.status = BridgeStatus.Stopped;
      return true;
    }
    return false;
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
    this.eventListeners.clear();
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
