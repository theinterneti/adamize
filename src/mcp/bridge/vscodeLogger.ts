/**
 * VS Code Logger
 *
 * A logger implementation that uses VS Code's output channel for logging.
 *
 * @implements REQ-LOGGER-001 Replace console-based logging with VS Code output channel
 * @implements REQ-LOGGER-002 Support different log levels (debug, info, warn, error)
 * @implements REQ-LOGGER-003 Support log formatting
 * @implements REQ-LOGGER-004 Support log filtering by level
 */

import * as vscode from 'vscode';

/**
 * Log levels for the VS Code Logger
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * VS Code Logger
 * 
 * A logger implementation that uses VS Code's output channel for logging.
 */
export class VSCodeLogger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel;

  /**
   * Create a new VS Code Logger
   * @param outputChannel The VS Code output channel to use for logging
   * @param logLevel The minimum log level to display (default: DEBUG)
   */
  constructor(outputChannel: vscode.OutputChannel, logLevel: LogLevel = LogLevel.DEBUG) {
    this.outputChannel = outputChannel;
    this.logLevel = logLevel;
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Log a message at the specified level
   * @param level The log level
   * @param message The message to log
   * @param args Additional arguments to log
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    // Check if the message should be logged based on the log level
    if (level < this.logLevel) {
      return;
    }

    // Get the level name
    const levelName = LogLevel[level];

    // Format the timestamp
    const timestamp = new Date().toISOString();

    // Format the message
    let formattedMessage = `${timestamp} [${levelName}] ${message}`;

    // Add additional arguments if provided
    if (args.length > 0) {
      formattedMessage += ' ' + args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (error) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
    }

    // Log the message
    this.outputChannel.appendLine(formattedMessage);
  }

  /**
   * Set the log level
   * @param level The new log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get the current log level
   * @returns The current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
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
}
