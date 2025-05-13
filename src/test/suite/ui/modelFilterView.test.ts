/**
 * @file Test suite for Model Filter View
 * @description Tests for the Model Filter View component
 *
 * @requirement REQ-MODEL-004 Add filtering and sorting capabilities to the model manager view
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { ModelFilterViewProvider, ModelSortOption, IModelFilterCriteria } from '../../../ui/modelFilterView';
import { IModelInfo } from '../../../utils/modelManager';

describe('ModelFilterViewProvider', () => {
  let provider: ModelFilterViewProvider;
  let mockOutputChannel: vscode.OutputChannel;
  let mockExtensionUri: vscode.Uri;
  
  // Sample models for testing
  const sampleModels: IModelInfo[] = [
    {
      id: 'model1',
      name: 'model1',
      version: '1.0.0',
      size: 1000,
      isLocal: true,
      capabilities: ['text-generation'],
      provider: 'ollama'
    },
    {
      id: 'model2',
      name: 'model2',
      version: '1.0.0',
      size: 2000,
      isLocal: true,
      capabilities: ['text-generation', 'code-generation'],
      provider: 'ollama'
    },
    {
      id: 'model3',
      name: 'model3',
      version: '1.0.0',
      size: 3000,
      isLocal: false,
      capabilities: ['text-generation'],
      provider: 'huggingface'
    },
    {
      id: 'local-model',
      name: 'local-model',
      version: '1.0.0',
      size: 500,
      isLocal: true,
      capabilities: ['embedding'],
      provider: 'local'
    }
  ];
  
  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      name: 'Test Output Channel',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };
    
    // Create mock extension URI
    mockExtensionUri = {
      scheme: 'file',
      authority: '',
      path: '/test',
      query: '',
      fragment: '',
      fsPath: '/test',
      with: jest.fn().mockReturnThis(),
      toJSON: jest.fn()
    } as unknown as vscode.Uri;
    
    // Create provider
    provider = new ModelFilterViewProvider(mockExtensionUri, mockOutputChannel);
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  /**
   * @test TEST-MODEL-004a Test that the provider returns HTML for the filter panel
   */
  test('should return HTML for the filter panel', () => {
    // Get HTML
    const html = provider.getFilterPanelHtml();
    
    // Verify HTML
    expect(html).toContain('filter-panel');
    expect(html).toContain('searchInput');
    expect(html).toContain('providerFilter');
    expect(html).toContain('capabilityFilter');
    expect(html).toContain('sortOption');
    expect(html).toContain('localOnlyFilter');
    expect(html).toContain('clearFilters');
  });
  
  /**
   * @test TEST-MODEL-004b Test that the provider returns JavaScript for the filter panel
   */
  test('should return JavaScript for the filter panel', () => {
    // Get JavaScript
    const js = provider.getFilterPanelScript();
    
    // Verify JavaScript
    expect(js).toContain('filterAndSortModels');
    expect(js).toContain('initializeFilterPanel');
    expect(js).toContain('updateFilteredModelList');
    expect(js).toContain('clearFilters');
    expect(js).toContain('applyFilters');
  });
  
  /**
   * @test TEST-MODEL-004c Test that the provider filters models by search term
   */
  test('should filter models by search term', () => {
    // Filter models
    const criteria: IModelFilterCriteria = {
      searchTerm: 'model1'
    };
    
    const filteredModels = provider.filterAndSortModels(sampleModels, criteria);
    
    // Verify filtered models
    expect(filteredModels).toHaveLength(1);
    expect(filteredModels[0].id).toBe('model1');
  });
  
  /**
   * @test TEST-MODEL-004d Test that the provider filters models by provider
   */
  test('should filter models by provider', () => {
    // Filter models
    const criteria: IModelFilterCriteria = {
      provider: 'ollama'
    };
    
    const filteredModels = provider.filterAndSortModels(sampleModels, criteria);
    
    // Verify filtered models
    expect(filteredModels).toHaveLength(2);
    expect(filteredModels[0].id).toBe('model1');
    expect(filteredModels[1].id).toBe('model2');
  });
  
  /**
   * @test TEST-MODEL-004e Test that the provider filters models by capability
   */
  test('should filter models by capability', () => {
    // Filter models
    const criteria: IModelFilterCriteria = {
      capability: 'code-generation'
    };
    
    const filteredModels = provider.filterAndSortModels(sampleModels, criteria);
    
    // Verify filtered models
    expect(filteredModels).toHaveLength(1);
    expect(filteredModels[0].id).toBe('model2');
  });
  
  /**
   * @test TEST-MODEL-004f Test that the provider filters models by size
   */
  test('should filter models by size', () => {
    // Filter models
    const criteria: IModelFilterCriteria = {
      minSize: 1000,
      maxSize: 2000
    };
    
    const filteredModels = provider.filterAndSortModels(sampleModels, criteria);
    
    // Verify filtered models
    expect(filteredModels).toHaveLength(2);
    expect(filteredModels[0].id).toBe('model1');
    expect(filteredModels[1].id).toBe('model2');
  });
  
  /**
   * @test TEST-MODEL-004g Test that the provider filters models by local only
   */
  test('should filter models by local only', () => {
    // Filter models
    const criteria: IModelFilterCriteria = {
      localOnly: true
    };
    
    const filteredModels = provider.filterAndSortModels(sampleModels, criteria);
    
    // Verify filtered models
    expect(filteredModels).toHaveLength(3);
    expect(filteredModels[0].id).toBe('model1');
    expect(filteredModels[1].id).toBe('model2');
    expect(filteredModels[2].id).toBe('local-model');
  });
  
  /**
   * @test TEST-MODEL-004h Test that the provider sorts models by name ascending
   */
  test('should sort models by name ascending', () => {
    // Sort models
    const filteredModels = provider.filterAndSortModels(sampleModels, undefined, ModelSortOption.NAME_ASC);
    
    // Verify sorted models
    expect(filteredModels).toHaveLength(4);
    expect(filteredModels[0].id).toBe('local-model');
    expect(filteredModels[1].id).toBe('model1');
    expect(filteredModels[2].id).toBe('model2');
    expect(filteredModels[3].id).toBe('model3');
  });
  
  /**
   * @test TEST-MODEL-004i Test that the provider sorts models by name descending
   */
  test('should sort models by name descending', () => {
    // Sort models
    const filteredModels = provider.filterAndSortModels(sampleModels, undefined, ModelSortOption.NAME_DESC);
    
    // Verify sorted models
    expect(filteredModels).toHaveLength(4);
    expect(filteredModels[0].id).toBe('model3');
    expect(filteredModels[1].id).toBe('model2');
    expect(filteredModels[2].id).toBe('model1');
    expect(filteredModels[3].id).toBe('local-model');
  });
  
  /**
   * @test TEST-MODEL-004j Test that the provider sorts models by size ascending
   */
  test('should sort models by size ascending', () => {
    // Sort models
    const filteredModels = provider.filterAndSortModels(sampleModels, undefined, ModelSortOption.SIZE_ASC);
    
    // Verify sorted models
    expect(filteredModels).toHaveLength(4);
    expect(filteredModels[0].id).toBe('local-model');
    expect(filteredModels[1].id).toBe('model1');
    expect(filteredModels[2].id).toBe('model2');
    expect(filteredModels[3].id).toBe('model3');
  });
  
  /**
   * @test TEST-MODEL-004k Test that the provider sorts models by size descending
   */
  test('should sort models by size descending', () => {
    // Sort models
    const filteredModels = provider.filterAndSortModels(sampleModels, undefined, ModelSortOption.SIZE_DESC);
    
    // Verify sorted models
    expect(filteredModels).toHaveLength(4);
    expect(filteredModels[0].id).toBe('model3');
    expect(filteredModels[1].id).toBe('model2');
    expect(filteredModels[2].id).toBe('model1');
    expect(filteredModels[3].id).toBe('local-model');
  });
  
  /**
   * @test TEST-MODEL-004l Test that the provider sorts models by provider ascending
   */
  test('should sort models by provider ascending', () => {
    // Sort models
    const filteredModels = provider.filterAndSortModels(sampleModels, undefined, ModelSortOption.PROVIDER_ASC);
    
    // Verify sorted models
    expect(filteredModels).toHaveLength(4);
    expect(filteredModels[0].id).toBe('model3'); // huggingface
    expect(filteredModels[1].id).toBe('local-model'); // local
    expect(filteredModels[2].id).toBe('model1'); // ollama
    expect(filteredModels[3].id).toBe('model2'); // ollama
  });
  
  /**
   * @test TEST-MODEL-004m Test that the provider sorts models by provider descending
   */
  test('should sort models by provider descending', () => {
    // Sort models
    const filteredModels = provider.filterAndSortModels(sampleModels, undefined, ModelSortOption.PROVIDER_DESC);
    
    // Verify sorted models
    expect(filteredModels).toHaveLength(4);
    expect(filteredModels[0].id).toBe('model1'); // ollama
    expect(filteredModels[1].id).toBe('model2'); // ollama
    expect(filteredModels[2].id).toBe('local-model'); // local
    expect(filteredModels[3].id).toBe('model3'); // huggingface
  });
  
  /**
   * @test TEST-MODEL-004n Test that the provider combines filtering and sorting
   */
  test('should combine filtering and sorting', () => {
    // Filter and sort models
    const criteria: IModelFilterCriteria = {
      provider: 'ollama',
      capability: 'text-generation'
    };
    
    const filteredModels = provider.filterAndSortModels(sampleModels, criteria, ModelSortOption.SIZE_DESC);
    
    // Verify filtered and sorted models
    expect(filteredModels).toHaveLength(2);
    expect(filteredModels[0].id).toBe('model2');
    expect(filteredModels[1].id).toBe('model1');
  });
  
  /**
   * @test TEST-MODEL-004o Test that the provider handles errors gracefully
   */
  test('should handle errors gracefully', () => {
    // Create invalid models
    const invalidModels = [
      {
        id: 'invalid',
        name: null, // This will cause an error when sorting
        version: '1.0.0',
        size: 1000,
        isLocal: true,
        capabilities: ['text-generation'],
        provider: 'ollama'
      }
    ] as unknown as IModelInfo[];
    
    // Filter and sort models
    const filteredModels = provider.filterAndSortModels(invalidModels, undefined, ModelSortOption.NAME_ASC);
    
    // Verify that the error was logged and the original models were returned
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('Error filtering and sorting models'));
    expect(filteredModels).toBe(invalidModels);
  });
});
