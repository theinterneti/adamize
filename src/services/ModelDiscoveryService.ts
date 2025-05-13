/**
 * Model Discovery Service
 *
 * This module provides a service for discovering models from different providers.
 *
 * @module services/ModelDiscoveryService
 * @requires vscode
 *
 * @implements REQ-REFACTOR-003 Implement Service Layer
 * @implements IMPL-REFACTOR-003 Implement ModelDiscoveryService
 */

import * as vscode from 'vscode';
import { IModelInfo } from '../utils/modelManager';
import { IModelOperationHandler, ModelProviderType } from '../handlers/IModelOperationHandler';
import ModelHandlerFactory from '../handlers/ModelHandlerFactory';

/**
 * Model filter criteria
 *
 * @interface IModelFilterCriteria
 * @implements REQ-REFACTOR-003 Implement Service Layer
 */
export interface IModelFilterCriteria {
  /** Search term */
  searchTerm?: string;
  /** Provider */
  provider?: string;
  /** Capability */
  capability?: string;
  /** Whether to only include local models */
  localOnly?: boolean;
}

/**
 * Model sort option
 *
 * @enum {string}
 * @implements REQ-REFACTOR-003 Implement Service Layer
 */
export enum ModelSortOption {
  /** Sort by name (ascending) */
  NAME_ASC = 'name_asc',
  /** Sort by name (descending) */
  NAME_DESC = 'name_desc',
  /** Sort by size (ascending) */
  SIZE_ASC = 'size_asc',
  /** Sort by size (descending) */
  SIZE_DESC = 'size_desc',
  /** Sort by provider (ascending) */
  PROVIDER_ASC = 'provider_asc',
  /** Sort by provider (descending) */
  PROVIDER_DESC = 'provider_desc',
}

/**
 * Model discovery service
 *
 * @class ModelDiscoveryService
 * @implements REQ-REFACTOR-003 Implement Service Layer
 * @implements IMPL-REFACTOR-003 Implement ModelDiscoveryService
 */
export class ModelDiscoveryService {
  private outputChannel: vscode.OutputChannel;
  private handlerFactory: ModelHandlerFactory;
  private modelsCache: Map<string, IModelInfo> = new Map();
  private lastRefreshTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Creates an instance of ModelDiscoveryService.
   *
   * @param {ModelHandlerFactory} handlerFactory - Model handler factory
   * @param {vscode.OutputChannel} outputChannel - Output channel for logging
   */
  constructor(handlerFactory: ModelHandlerFactory, outputChannel: vscode.OutputChannel) {
    this.handlerFactory = handlerFactory;
    this.outputChannel = outputChannel;
  }

  /**
   * Discover all models from all providers
   *
   * @param {boolean} [forceRefresh=false] - Whether to force a refresh of the cache
   * @returns {Promise<IModelInfo[]>} Array of all discovered models
   */
  public async discoverAllModels(forceRefresh: boolean = false): Promise<IModelInfo[]> {
    // Check if cache is still valid
    const now = Date.now();
    if (!forceRefresh && this.lastRefreshTime > 0 && now - this.lastRefreshTime < this.CACHE_TTL) {
      return Array.from(this.modelsCache.values());
    }

    this.outputChannel.appendLine('Discovering all models...');

    // Get all handlers
    const handlers = this.handlerFactory.getAllHandlers();

    // Discover models from all handlers
    const allModels: IModelInfo[] = [];

    for (const handler of handlers) {
      try {
        const models = await handler.discoverModels();
        allModels.push(...models);
      } catch (error) {
        this.outputChannel.appendLine(
          `Error discovering models from ${handler.getProviderType()}: ${error}`
        );
      }
    }

    // Update cache
    this.modelsCache.clear();
    allModels.forEach(model => this.modelsCache.set(model.id, model));
    this.lastRefreshTime = now;

    this.outputChannel.appendLine(`Discovered ${allModels.length} models in total`);

    return allModels;
  }

  /**
   * Get a model by ID
   *
   * @param {string} modelId - Model ID
   * @returns {Promise<IModelInfo | undefined>} Model information or undefined if not found
   */
  public async getModel(modelId: string): Promise<IModelInfo | undefined> {
    // Check cache first
    if (this.modelsCache.has(modelId)) {
      return this.modelsCache.get(modelId);
    }

    // If not in cache, try to discover it from each handler
    const handlers = this.handlerFactory.getAllHandlers();

    for (const handler of handlers) {
      try {
        const model = await handler.getModel(modelId);
        if (model) {
          // Add to cache
          this.modelsCache.set(model.id, model);
          return model;
        }
      } catch (error) {
        this.outputChannel.appendLine(
          `Error getting model ${modelId} from ${handler.getProviderType()}: ${error}`
        );
      }
    }

    return undefined;
  }

  /**
   * Filter and sort models
   *
   * @param {IModelInfo[]} models - Models to filter and sort
   * @param {IModelFilterCriteria} criteria - Filter criteria
   * @param {ModelSortOption} sortOption - Sort option
   * @returns {IModelInfo[]} Filtered and sorted models
   */
  public filterAndSortModels(
    models: IModelInfo[],
    criteria: IModelFilterCriteria,
    sortOption: ModelSortOption
  ): IModelInfo[] {
    // Filter models
    let filteredModels = models;

    // Apply search term filter
    if (criteria.searchTerm) {
      const searchTerm = criteria.searchTerm.toLowerCase();
      filteredModels = filteredModels.filter(
        model =>
          model.name.toLowerCase().includes(searchTerm) ||
          model.id.toLowerCase().includes(searchTerm)
      );
    }

    // Apply provider filter
    if (criteria.provider) {
      filteredModels = filteredModels.filter(model => model.provider === criteria.provider);
    }

    // Apply capability filter
    if (criteria.capability) {
      filteredModels = filteredModels.filter(model =>
        model.capabilities.includes(criteria.capability!)
      );
    }

    // Apply local only filter
    if (criteria.localOnly) {
      filteredModels = filteredModels.filter(model => model.isLocal);
    }

    // Sort models
    switch (sortOption) {
      case ModelSortOption.NAME_ASC:
        filteredModels.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case ModelSortOption.NAME_DESC:
        filteredModels.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case ModelSortOption.SIZE_ASC:
        filteredModels.sort((a, b) => a.size - b.size);
        break;
      case ModelSortOption.SIZE_DESC:
        filteredModels.sort((a, b) => b.size - a.size);
        break;
      case ModelSortOption.PROVIDER_ASC:
        filteredModels.sort((a, b) => a.provider.localeCompare(b.provider));
        break;
      case ModelSortOption.PROVIDER_DESC:
        filteredModels.sort((a, b) => b.provider.localeCompare(a.provider));
        break;
    }

    return filteredModels;
  }
}

export default ModelDiscoveryService;
