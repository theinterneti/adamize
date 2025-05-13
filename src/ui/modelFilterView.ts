/**
 * Model Filter View
 * 
 * This module provides UI components for filtering and sorting models.
 * 
 * @module ui/modelFilterView
 * @requires vscode
 * 
 * @implements REQ-MODEL-004 Add filtering and sorting capabilities to the model manager view
 */

import * as vscode from 'vscode';
import { IModelInfo } from '../utils/modelManager';

/**
 * Filter criteria for models
 * 
 * @interface IModelFilterCriteria
 * @implements REQ-MODEL-004 Add filtering and sorting capabilities to the model manager view
 */
export interface IModelFilterCriteria {
  /** Search term */
  searchTerm?: string;
  
  /** Provider filter */
  provider?: string;
  
  /** Capability filter */
  capability?: string;
  
  /** Size filter (min size in bytes) */
  minSize?: number;
  
  /** Size filter (max size in bytes) */
  maxSize?: number;
  
  /** Local only filter */
  localOnly?: boolean;
}

/**
 * Sort options for models
 * 
 * @enum {string}
 * @implements REQ-MODEL-004 Add filtering and sorting capabilities to the model manager view
 */
export enum ModelSortOption {
  /** Sort by name (A-Z) */
  NAME_ASC = 'name_asc',
  
  /** Sort by name (Z-A) */
  NAME_DESC = 'name_desc',
  
  /** Sort by size (smallest first) */
  SIZE_ASC = 'size_asc',
  
  /** Sort by size (largest first) */
  SIZE_DESC = 'size_desc',
  
  /** Sort by provider (A-Z) */
  PROVIDER_ASC = 'provider_asc',
  
  /** Sort by provider (Z-A) */
  PROVIDER_DESC = 'provider_desc'
}

/**
 * Model filter view provider
 * 
 * @class ModelFilterViewProvider
 * @implements REQ-MODEL-004 Add filtering and sorting capabilities to the model manager view
 */
export class ModelFilterViewProvider {
  private _extensionUri: vscode.Uri;
  private _outputChannel: vscode.OutputChannel;
  
  /**
   * Create a new model filter view provider
   * @param extensionUri Extension URI
   * @param outputChannel Output channel
   */
  constructor(extensionUri: vscode.Uri, outputChannel: vscode.OutputChannel) {
    this._extensionUri = extensionUri;
    this._outputChannel = outputChannel;
  }
  
  /**
   * Get HTML for the filter panel
   * @returns HTML for the filter panel
   */
  public getFilterPanelHtml(): string {
    return `
      <div class="filter-panel">
        <div class="filter-header">
          <h3>Filter Models</h3>
          <button id="clearFilters" class="clear-button">Clear</button>
        </div>
        
        <div class="filter-section">
          <div class="filter-group">
            <label for="searchInput">Search:</label>
            <input type="text" id="searchInput" placeholder="Search models...">
          </div>
          
          <div class="filter-group">
            <label for="providerFilter">Provider:</label>
            <select id="providerFilter">
              <option value="">All Providers</option>
              <option value="ollama">Ollama</option>
              <option value="local">Local</option>
              <option value="huggingface">Hugging Face</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="capabilityFilter">Capability:</label>
            <select id="capabilityFilter">
              <option value="">All Capabilities</option>
              <option value="text-generation">Text Generation</option>
              <option value="code-generation">Code Generation</option>
              <option value="image-generation">Image Generation</option>
              <option value="embedding">Embedding</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="sortOption">Sort By:</label>
            <select id="sortOption">
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="size_asc">Size (Smallest First)</option>
              <option value="size_desc">Size (Largest First)</option>
              <option value="provider_asc">Provider (A-Z)</option>
              <option value="provider_desc">Provider (Z-A)</option>
            </select>
          </div>
          
          <div class="filter-group checkbox-group">
            <input type="checkbox" id="localOnlyFilter">
            <label for="localOnlyFilter">Local Models Only</label>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Get JavaScript for the filter panel
   * @returns JavaScript for the filter panel
   */
  public getFilterPanelScript(): string {
    return `
      // Filter and sort models
      function filterAndSortModels(models, criteria, sortOption) {
        // Filter models
        let filteredModels = models;
        
        if (criteria) {
          // Filter by search term
          if (criteria.searchTerm) {
            const searchTermLower = criteria.searchTerm.toLowerCase();
            filteredModels = filteredModels.filter(model => 
              model.name.toLowerCase().includes(searchTermLower) ||
              model.provider.toLowerCase().includes(searchTermLower)
            );
          }
          
          // Filter by provider
          if (criteria.provider) {
            filteredModels = filteredModels.filter(model => 
              model.provider === criteria.provider
            );
          }
          
          // Filter by capability
          if (criteria.capability) {
            filteredModels = filteredModels.filter(model => 
              model.capabilities && model.capabilities.includes(criteria.capability)
            );
          }
          
          // Filter by size
          if (criteria.minSize !== undefined) {
            filteredModels = filteredModels.filter(model => 
              model.size >= criteria.minSize
            );
          }
          
          if (criteria.maxSize !== undefined) {
            filteredModels = filteredModels.filter(model => 
              model.size <= criteria.maxSize
            );
          }
          
          // Filter by local only
          if (criteria.localOnly) {
            filteredModels = filteredModels.filter(model => 
              model.isLocal === true
            );
          }
        }
        
        // Sort models
        if (sortOption) {
          filteredModels.sort((a, b) => {
            switch (sortOption) {
              case 'name_asc':
                return a.name.localeCompare(b.name);
              case 'name_desc':
                return b.name.localeCompare(a.name);
              case 'size_asc':
                return a.size - b.size;
              case 'size_desc':
                return b.size - a.size;
              case 'provider_asc':
                return a.provider.localeCompare(b.provider);
              case 'provider_desc':
                return b.provider.localeCompare(a.provider);
              default:
                return 0;
            }
          });
        }
        
        return filteredModels;
      }
      
      // Initialize filter panel
      function initializeFilterPanel() {
        // Get filter elements
        const searchInput = document.getElementById('searchInput');
        const providerFilter = document.getElementById('providerFilter');
        const capabilityFilter = document.getElementById('capabilityFilter');
        const sortOption = document.getElementById('sortOption');
        const localOnlyFilter = document.getElementById('localOnlyFilter');
        const clearFiltersButton = document.getElementById('clearFilters');
        
        // Add event listeners
        searchInput.addEventListener('input', applyFilters);
        providerFilter.addEventListener('change', applyFilters);
        capabilityFilter.addEventListener('change', applyFilters);
        sortOption.addEventListener('change', applyFilters);
        localOnlyFilter.addEventListener('change', applyFilters);
        clearFiltersButton.addEventListener('click', clearFilters);
        
        // Clear filters
        function clearFilters() {
          searchInput.value = '';
          providerFilter.value = '';
          capabilityFilter.value = '';
          sortOption.value = 'name_asc';
          localOnlyFilter.checked = false;
          
          applyFilters();
        }
        
        // Apply filters
        function applyFilters() {
          const criteria = {
            searchTerm: searchInput.value,
            provider: providerFilter.value,
            capability: capabilityFilter.value,
            localOnly: localOnlyFilter.checked
          };
          
          const sort = sortOption.value;
          
          // Apply filters and update model list
          updateFilteredModelList(criteria, sort);
        }
      }
      
      // Update filtered model list
      function updateFilteredModelList(criteria, sortOption) {
        // Filter and sort models
        const filteredModels = filterAndSortModels(allModels, criteria, sortOption);
        
        // Update model list
        updateModelList(filteredModels);
        
        // Update filter count
        const filterCount = document.getElementById('filter-count');
        if (filterCount) {
          filterCount.textContent = \`Showing \${filteredModels.length} of \${allModels.length} models\`;
        }
      }
    `;
  }
  
  /**
   * Filter and sort models
   * @param models Models to filter and sort
   * @param criteria Filter criteria
   * @param sortOption Sort option
   * @returns Filtered and sorted models
   * @implements REQ-MODEL-004 Add filtering and sorting capabilities to the model manager view
   */
  public filterAndSortModels(
    models: IModelInfo[],
    criteria?: IModelFilterCriteria,
    sortOption?: ModelSortOption
  ): IModelInfo[] {
    try {
      // Filter models
      let filteredModels = [...models];
      
      if (criteria) {
        // Filter by search term
        if (criteria.searchTerm) {
          const searchTermLower = criteria.searchTerm.toLowerCase();
          filteredModels = filteredModels.filter(model => 
            model.name.toLowerCase().includes(searchTermLower) ||
            model.provider.toLowerCase().includes(searchTermLower)
          );
        }
        
        // Filter by provider
        if (criteria.provider) {
          filteredModels = filteredModels.filter(model => 
            model.provider === criteria.provider
          );
        }
        
        // Filter by capability
        if (criteria.capability) {
          filteredModels = filteredModels.filter(model => 
            model.capabilities && model.capabilities.includes(criteria.capability)
          );
        }
        
        // Filter by size
        if (criteria.minSize !== undefined) {
          filteredModels = filteredModels.filter(model => 
            model.size >= criteria.minSize
          );
        }
        
        if (criteria.maxSize !== undefined) {
          filteredModels = filteredModels.filter(model => 
            model.size <= criteria.maxSize
          );
        }
        
        // Filter by local only
        if (criteria.localOnly) {
          filteredModels = filteredModels.filter(model => 
            model.isLocal === true
          );
        }
      }
      
      // Sort models
      if (sortOption) {
        filteredModels.sort((a, b) => {
          switch (sortOption) {
            case ModelSortOption.NAME_ASC:
              return a.name.localeCompare(b.name);
            case ModelSortOption.NAME_DESC:
              return b.name.localeCompare(a.name);
            case ModelSortOption.SIZE_ASC:
              return a.size - b.size;
            case ModelSortOption.SIZE_DESC:
              return b.size - a.size;
            case ModelSortOption.PROVIDER_ASC:
              return a.provider.localeCompare(b.provider);
            case ModelSortOption.PROVIDER_DESC:
              return b.provider.localeCompare(a.provider);
            default:
              return 0;
          }
        });
      }
      
      return filteredModels;
    } catch (error) {
      this._outputChannel.appendLine(`Error filtering and sorting models: ${error}`);
      return models;
    }
  }
}

export default ModelFilterViewProvider;
