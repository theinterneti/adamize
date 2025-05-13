/**
 * Model Error Types
 *
 * This module defines error types for model operations.
 *
 * @module utils/modelError
 * @implements REQ-MODEL-020 Improve error handling for model operations
 * @implements REQ-MODEL-021 Provide detailed error messages with recovery suggestions
 */

/**
 * Model error types
 *
 * @enum {string}
 * @implements REQ-MODEL-020 Improve error handling for model operations
 */
export enum ModelErrorType {
  /** Connection error when communicating with model provider */
  CONNECTION = 'connection',
  /** Model not found error */
  NOT_FOUND = 'not_found',
  /** Permission error when accessing model files */
  PERMISSION = 'permission',
  /** Download error when pulling models */
  DOWNLOAD = 'download',
  /** Server error when starting or stopping model servers */
  SERVER = 'server',
  /** Unknown error */
  UNKNOWN = 'unknown',
}

/**
 * Model error class
 *
 * @class ModelError
 * @extends Error
 * @implements REQ-MODEL-021 Provide detailed error messages with recovery suggestions
 */
export class ModelError extends Error {
  /** Error type */
  public type: ModelErrorType;
  /** Recovery suggestion */
  public recoverySuggestion: string;
  /** Original error */
  public originalError?: Error;

  /**
   * Creates an instance of ModelError.
   *
   * @param {string} message - Error message
   * @param {ModelErrorType} type - Error type
   * @param {string} recoverySuggestion - Recovery suggestion
   * @param {Error} [originalError] - Original error
   */
  constructor(
    message: string,
    type: ModelErrorType,
    recoverySuggestion: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ModelError';
    this.type = type;
    this.recoverySuggestion = recoverySuggestion;
    this.originalError = originalError;
  }

  /**
   * Get a user-friendly error message with recovery suggestion
   *
   * @returns {string} User-friendly error message
   */
  public getUserFriendlyMessage(): string {
    return `${this.message}\n\nTry this: ${this.recoverySuggestion}`;
  }
}
