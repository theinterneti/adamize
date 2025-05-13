/**
 * Model Types
 * 
 * This module defines types related to model management.
 * 
 * @module types/modelTypes
 * 
 * @implements REQ-MODEL-002 Add status indicator to show operation status
 */

/**
 * Status of model operations
 *
 * @enum {string}
 * @implements REQ-MODEL-002 Add status indicator to show operation status
 */
export enum ModelOperationStatus {
  /** Operation is idle */
  IDLE = 'idle',
  /** Operation is in progress */
  IN_PROGRESS = 'in-progress',
  /** Operation succeeded */
  SUCCESS = 'success',
  /** Operation failed */
  ERROR = 'error',
}

/**
 * Model configuration preset interface
 * 
 * @interface IModelConfigurationPreset
 * @implements REQ-MODEL-040 Add configuration presets for models
 */
export interface IModelConfigurationPreset {
  /** Preset ID */
  id: string;
  /** Preset name */
  name: string;
  /** Model ID */
  modelId: string;
  /** Temperature */
  temperature: number;
  /** Max tokens */
  maxTokens: number;
  /** System prompt */
  systemPrompt: string;
  /** Top P */
  topP?: number;
  /** Top K */
  topK?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Created date */
  createdAt: Date;
  /** Updated date */
  updatedAt: Date;
  /** Description */
  description?: string;
  /** Tags */
  tags?: string[];
  /** Is shared */
  isShared?: boolean;
  /** Creator ID */
  creatorId?: string;
}

/**
 * Model benchmark result interface
 * 
 * @interface IModelBenchmarkResult
 * @implements REQ-MODEL-010 Add benchmark tools for models
 */
export interface IModelBenchmarkResult {
  /** Model ID */
  modelId: string;
  /** Benchmark ID */
  benchmarkId: string;
  /** Benchmark name */
  benchmarkName: string;
  /** Score */
  score: number;
  /** Metrics */
  metrics: Record<string, number>;
  /** Run date */
  runDate: Date;
  /** Duration in milliseconds */
  durationMs: number;
  /** Raw results */
  rawResults?: any;
}

/**
 * Model usage statistics interface
 * 
 * @interface IModelUsageStats
 * @implements REQ-MODEL-005 Add usage statistics for models
 */
export interface IModelUsageStats {
  /** Model ID */
  modelId: string;
  /** Total tokens generated */
  totalTokensGenerated: number;
  /** Total tokens consumed */
  totalTokensConsumed: number;
  /** Total requests */
  totalRequests: number;
  /** Average response time in milliseconds */
  avgResponseTimeMs: number;
  /** First used date */
  firstUsedAt: Date;
  /** Last used date */
  lastUsedAt: Date;
  /** Usage by day */
  usageByDay?: Record<string, number>;
}
