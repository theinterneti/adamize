/**
 * MCP Server Connection
 *
 * This module provides a class for connecting to MCP servers via different transports:
 * 1. stdio: Spawn a local process and communicate via stdin/stdout
 * 2. SSE: Connect to a server via Server-Sent Events
 *
 * @module mcp/mcpServerConnection
 * @implements REQ-MCP-001 Connect to an MCP server
 * @implements REQ-MCP-020 Handle connection errors gracefully
 * @implements REQ-MCP-030 Log connection attempts and results
 */

import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import axios from 'axios';
import { EventSource } from 'eventsource';
import { IMCPServerConfig } from './mcpTypes';
import { MCPError, MCPErrorCode } from './mcpTypes';

// Note: The eventsource package supports headers, but TypeScript definitions don't include it

/**
 * Message handler function type
 */
export type MessageHandler = (message: unknown) => void;

/**
 * MCP Server Connection
 *
 * This class provides a connection to an MCP server via stdio or SSE.
 */
export class MCPServerConnection {
  private process?: ChildProcess;
  private eventSource?: EventSource;
  private outputChannel: vscode.OutputChannel;
  private isConnected: boolean = false;
  private messageHandler?: MessageHandler;

  /**
   * Create a new MCP server connection
   * @param config Server configuration
   * @param outputChannel Output channel for logging
   */
  constructor(
    private config: IMCPServerConfig,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
  }

  /**
   * Connect to the MCP server
   * @returns True if connected successfully
   */
  public async connect(): Promise<boolean> {
    try {
      this.outputChannel.appendLine(`Connecting to MCP server: ${this.config.name}`);

      if (this.config.type === 'stdio') {
        return this.connectStdio();
      } else if (this.config.type === 'sse') {
        return this.connectSSE();
      } else {
        throw new MCPError(
          `Unsupported server type: ${this.config.type}`,
          MCPErrorCode.CONNECTION_ERROR
        );
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error connecting to MCP server: ${error}`);
      return false;
    }
  }

  /**
   * Connect to stdio server
   * @returns True if connected successfully
   */
  private async connectStdio(): Promise<boolean> {
    try {
      if (!this.config.command) {
        throw new MCPError(
          'Command is required for stdio servers',
          MCPErrorCode.CONNECTION_ERROR
        );
      }

      // Prepare environment variables
      const env = { ...process.env, ...this.config.env };

      // Spawn process
      this.process = spawn(this.config.command, this.config.args || [], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle process events
      this.process.on('error', (error) => {
        this.outputChannel.appendLine(`Process error: ${error}`);
        this.isConnected = false;
      });

      this.process.on('exit', (code) => {
        this.outputChannel.appendLine(`Process exited with code: ${code}`);
        this.isConnected = false;
      });

      // Handle stdout and stderr
      this.process.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        this.outputChannel.appendLine(`[stdout] ${message}`);

        // Process JSON-RPC messages from stdout
        try {
          if (message && this.messageHandler) {
            const jsonMessage = JSON.parse(message);
            this.messageHandler(jsonMessage);
          }
        } catch (error) {
          this.outputChannel.appendLine(`Error parsing message: ${error}`);
        }
      });

      this.process.stderr?.on('data', (data) => {
        this.outputChannel.appendLine(`[stderr] ${data.toString()}`);
      });

      this.isConnected = true;
      this.outputChannel.appendLine(`Connected to stdio server: ${this.config.name}`);
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error connecting to stdio server: ${error}`);
      return false;
    }
  }

  /**
   * Connect to SSE server
   * @returns True if connected successfully
   */
  private async connectSSE(): Promise<boolean> {
    try {
      if (!this.config.url) {
        throw new MCPError(
          'URL is required for SSE servers',
          MCPErrorCode.CONNECTION_ERROR
        );
      }

      // Create EventSource
      // Note: The eventsource package supports headers, but TypeScript definitions don't include it
      // We need to use type assertion to make TypeScript happy
      const options = this.config.headers ?
        { withCredentials: false } : undefined;

      this.eventSource = new EventSource(this.config.url, options);

      // Add custom headers using a workaround
      if (this.config.headers) {
        // This is a hack to add headers to the EventSource
        // The actual eventsource package supports headers, but TypeScript definitions don't
        (this.eventSource as any)._headers = this.config.headers;
      }

      // Handle EventSource events
      this.eventSource.onopen = () => {
        this.outputChannel.appendLine('SSE connection opened');
        this.isConnected = true;
      };

      this.eventSource.onerror = (error) => {
        this.outputChannel.appendLine(`SSE error: ${error}`);
        this.isConnected = false;
      };

      this.eventSource.onmessage = (event) => {
        this.outputChannel.appendLine(`SSE message: ${event.data}`);

        // Process JSON-RPC messages from SSE
        try {
          if (event.data && this.messageHandler) {
            const jsonMessage = JSON.parse(event.data);
            this.messageHandler(jsonMessage);
          }
        } catch (error) {
          this.outputChannel.appendLine(`Error parsing message: ${error}`);
        }
      };

      // Wait for connection to be established
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.outputChannel.appendLine('SSE connection timed out');
          resolve(false);
        }, 5000);

        this.eventSource!.onopen = () => {
          clearTimeout(timeout);
          this.outputChannel.appendLine('SSE connection opened');
          this.isConnected = true;
          resolve(true);
        };

        this.eventSource!.onerror = (error) => {
          clearTimeout(timeout);
          this.outputChannel.appendLine(`SSE error: ${error}`);
          this.isConnected = false;
          resolve(false);
        };
      });
    } catch (error) {
      this.outputChannel.appendLine(`Error connecting to SSE server: ${error}`);
      return false;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  public disconnect(): void {
    try {
      if (this.config.type === 'stdio' && this.process) {
        this.process.kill();
        this.process = undefined;
      } else if (this.config.type === 'sse' && this.eventSource) {
        this.eventSource.close();
        this.eventSource = undefined;
      }

      this.isConnected = false;
      this.outputChannel.appendLine(`Disconnected from MCP server: ${this.config.name}`);
    } catch (error) {
      this.outputChannel.appendLine(`Error disconnecting from MCP server: ${error}`);
    }
  }

  /**
   * Check if connected to the MCP server
   * @returns True if connected
   */
  public isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Set message handler
   * @param handler Message handler function
   */
  public setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Send a message to the MCP server
   * @param message Message to send
   */
  public sendMessage(message: unknown): void {
    try {
      if (!this.isConnected) {
        throw new MCPError(
          'Not connected to MCP server',
          MCPErrorCode.CONNECTION_ERROR
        );
      }

      const messageStr = JSON.stringify(message);

      if (this.config.type === 'stdio' && this.process) {
        this.process.stdin?.write(messageStr + '\n');
      } else if (this.config.type === 'sse' && this.config.url) {
        // For SSE, we need to send messages via HTTP POST
        axios.post(this.config.url, messageStr, {
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers
          }
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error sending message: ${error}`);
    }
  }
}
