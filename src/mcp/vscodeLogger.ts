/**
 * VSCode Logger
 * 
 * A simple logger implementation for VSCode.
 * @implements REQ-MCP-060 Create a logger for MCP components
 */

import * as vscode from 'vscode';

/**
 * Log level
 */
export enum LogLevel {
  /** Debug level */
  Debug = 0,
  /** Info level */
  Info = 1,
  /** Warning level */
  Warning = 2,
  /** Error level */
  Error = 3
}

/**
 * VSCode Logger
 */
export class VSCodeLogger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel;
  
  /**
   * Create a new VSCode logger
   * @param outputChannel Output channel
   * @param logLevel Log level (default: Info)
   */
  constructor(outputChannel: vscode.OutputChannel, logLevel: LogLevel = LogLevel.Info) {
    this.outputChannel = outputChannel;
    this.logLevel = logLevel;
  }
  
  /**
   * Set the log level
   * @param level Log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  /**
   * Log a debug message
   * @param message Message to log
   */
  debug(message: string): void {
    if (this.logLevel <= LogLevel.Debug) {
      this.log('DEBUG', message);
    }
  }
  
  /**
   * Log an info message
   * @param message Message to log
   */
  info(message: string): void {
    if (this.logLevel <= LogLevel.Info) {
      this.log('INFO', message);
    }
  }
  
  /**
   * Log a warning message
   * @param message Message to log
   */
  warn(message: string): void {
    if (this.logLevel <= LogLevel.Warning) {
      this.log('WARN', message);
    }
  }
  
  /**
   * Log an error message
   * @param message Message to log
   * @param error Optional error object
   */
  error(message: string, error?: unknown): void {
    if (this.logLevel <= LogLevel.Error) {
      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.log('ERROR', `${message}: ${errorMessage}`);
        if (errorStack) {
          this.outputChannel.appendLine(errorStack);
        }
      } else {
        this.log('ERROR', message);
      }
    }
  }
  
  /**
   * Log a message with a prefix
   * @param prefix Log level prefix
   * @param message Message to log
   */
  private log(prefix: string, message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [${prefix}] ${message}`);
  }
}

export default VSCodeLogger;
