/**
 * Ollama API Types
 * 
 * This module defines types for the Ollama API.
 * 
 * @module ollama/types
 * @implements REQ-REFACTOR-001 Extract Ollama API interaction
 */

/**
 * Ollama Model
 */
export interface OllamaModel {
  /** Model name */
  name: string;
  /** Model modified date */
  modified_at?: string;
  /** Model size in bytes */
  size?: number;
  /** Model digest */
  digest?: string;
  /** Model details */
  details?: {
    /** Model format */
    format?: string;
    /** Model family */
    family?: string;
    /** Model families */
    families?: string[];
    /** Model parameter size */
    parameter_size?: string;
    /** Model quantization level */
    quantization_level?: string;
  };
}

/**
 * Ollama API List Models Response
 */
export interface ListModelsResponse {
  /** List of models */
  models: OllamaModel[];
}

/**
 * Ollama API Pull Options
 */
export interface PullOptions {
  /** Whether to stream the response */
  stream?: boolean;
  /** Whether to insecurely pull the model */
  insecure?: boolean;
}

/**
 * Ollama API Pull Response
 */
export interface PullResponse {
  /** Response status */
  status: string;
  /** Error message if status is not success */
  error?: string;
}

/**
 * Ollama API Remove Response
 */
export interface RemoveResponse {
  /** Response status */
  status: string;
  /** Error message if status is not success */
  error?: string;
}

/**
 * Ollama API Model Info Response
 */
export interface ModelInfoResponse {
  /** Model name */
  name: string;
  /** Model modified date */
  modified_at?: string;
  /** Model size in bytes */
  size?: number;
  /** Model digest */
  digest?: string;
  /** Model details */
  details?: {
    /** Model format */
    format?: string;
    /** Model family */
    family?: string;
    /** Model families */
    families?: string[];
    /** Model parameter size */
    parameter_size?: string;
    /** Model quantization level */
    quantization_level?: string;
  };
}

/**
 * Ollama API Server Response
 */
export interface ServerResponse {
  /** Response status */
  status: string;
  /** Error message if status is not success */
  error?: string;
}

/**
 * Ollama API Chat Message
 */
export interface OllamaChatMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant';
  /** Message content */
  content: string;
}

/**
 * Ollama API Chat Request
 */
export interface OllamaChatRequest {
  /** Model name */
  model: string;
  /** Chat messages */
  messages: OllamaChatMessage[];
  /** Stream response */
  stream?: boolean;
  /** Temperature */
  temperature?: number;
  /** Top P */
  top_p?: number;
  /** Top K */
  top_k?: number;
  /** Number of tokens to predict */
  num_predict?: number;
}
