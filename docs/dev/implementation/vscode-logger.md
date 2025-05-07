# VS Code Logger Implementation Plan

This document outlines the implementation plan for the VS Code Logger component, which will replace the console-based logging in the ollama-mcp-bridge with VS Code's output channel.

## Overview

The VS Code Logger will provide a consistent logging interface for all bridge components, using VS Code's output channel for log output. It will support different log levels, log filtering, and integration with VS Code's notification system for important messages.

## Requirements

- **REQ-LOGGER-001**: Replace console logging with VS Code output channel
- **REQ-LOGGER-002**: Support different log levels (debug, info, warn, error)
- **REQ-LOGGER-003**: Support log filtering by level and component
- **REQ-LOGGER-004**: Integrate with VS Code's notification system for important messages
- **REQ-LOGGER-005**: Support log formatting with timestamps and component names
- **REQ-LOGGER-006**: Provide a consistent interface for all bridge components

## Implementation Details

### Source File

```typescript
// src/mcp/bridge/vscodeLogger.ts

import * as vscode from 'vscode';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level to display
   * @default LogLevel.INFO
   */
  minLevel: LogLevel;
  
  /**
   * Whether to show timestamps in logs
   * @default true
   */
  showTimestamps: boolean;
  
  /**
   * Whether to show component names in logs
   * @default true
   */
  showComponents: boolean;
  
  /**
   * Whether to show notifications for warnings and errors
   * @default true
   */
  showNotifications: boolean;
}

/**
 * VS Code Logger
 * 
 * A logger that uses VS Code's output channel for logging.
 */
export class VSCodeLogger {
  private outputChannel: vscode.OutputChannel;
  private config: LoggerConfig;
  
  /**
   * Create a new VS Code logger
   * @param channelName The name of the output channel
   * @param config Logger configuration
   */
  constructor(
    channelName: string,
    config: Partial<LoggerConfig> = {}
  ) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
    
    // Set default configuration
    this.config = {
      minLevel: LogLevel.INFO,
      showTimestamps: true,
      showComponents: true,
      showNotifications: true,
      ...config,
    };
  }
  
  /**
   * Log a message at the specified level
   * @param level Log level
   * @param message Message to log
   * @param component Component name
   */
  private log(level: LogLevel, message: string, component?: string): void {
    // Check if we should log this message
    if (level < this.config.minLevel) {
      return;
    }
    
    // Format the message
    let formattedMessage = '';
    
    // Add timestamp if configured
    if (this.config.showTimestamps) {
      const timestamp = new Date().toISOString();
      formattedMessage += `[${timestamp}] `;
    }
    
    // Add log level
    formattedMessage += `[${LogLevel[level]}] `;
    
    // Add component if provided and configured
    if (component && this.config.showComponents) {
      formattedMessage += `[${component}] `;
    }
    
    // Add message
    formattedMessage += message;
    
    // Log to output channel
    this.outputChannel.appendLine(formattedMessage);
    
    // Show notification for warnings and errors if configured
    if (this.config.showNotifications && level >= LogLevel.WARN) {
      if (level === LogLevel.WARN) {
        vscode.window.showWarningMessage(message);
      } else if (level === LogLevel.ERROR) {
        vscode.window.showErrorMessage(message);
      }
    }
  }
  
  /**
   * Log a debug message
   * @param message Message to log
   * @param component Component name
   */
  public debug(message: string, component?: string): void {
    this.log(LogLevel.DEBUG, message, component);
  }
  
  /**
   * Log an info message
   * @param message Message to log
   * @param component Component name
   */
  public info(message: string, component?: string): void {
    this.log(LogLevel.INFO, message, component);
  }
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param component Component name
   */
  public warn(message: string, component?: string): void {
    this.log(LogLevel.WARN, message, component);
  }
  
  /**
   * Log an error message
   * @param message Message to log
   * @param component Component name
   */
  public error(message: string, component?: string): void {
    this.log(LogLevel.ERROR, message, component);
  }
  
  /**
   * Show the output channel
   */
  public show(): void {
    this.outputChannel.show();
  }
  
  /**
   * Hide the output channel
   */
  public hide(): void {
    this.outputChannel.hide();
  }
  
  /**
   * Clear the output channel
   */
  public clear(): void {
    this.outputChannel.clear();
  }
  
  /**
   * Dispose of the output channel
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }
  
  /**
   * Update logger configuration
   * @param config New configuration
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}

/**
 * Create a default logger instance
 */
export const logger = new VSCodeLogger('Adamize MCP Bridge');

/**
 * Export default logger
 */
export default logger;
```

## Test Plan

We will create tests for the VS Code Logger to ensure it meets the requirements:

1. **TEST-LOGGER-001**: Test that logs are written to the output channel
2. **TEST-LOGGER-002**: Test that log levels are respected
3. **TEST-LOGGER-003**: Test that log filtering works
4. **TEST-LOGGER-004**: Test that notifications are shown for warnings and errors
5. **TEST-LOGGER-005**: Test that log formatting works correctly
6. **TEST-LOGGER-006**: Test that configuration updates are applied correctly

## Integration Plan

The VS Code Logger will be used by all bridge components:

1. Replace all imports of the original logger with the new VS Code Logger
2. Update all logging calls to use the new interface
3. Add component names to all logging calls
4. Configure log levels based on VS Code settings

## Next Steps

After implementing the VS Code Logger, we will move on to adapting the Bridge Types component.
