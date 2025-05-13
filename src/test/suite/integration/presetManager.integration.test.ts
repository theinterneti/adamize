/**
 * @file Integration tests for PresetManager
 * @description Tests the integration of PresetManager with VS Code and ModelManager
 *
 * @requirement REQ-MODEL-INT-004 Test configuration preset system with actual model configurations
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { PresetManager, IModelConfigurationPreset } from '../../../utils/presetManager';
import ModelManager from '../../../utils/modelManager';
import * as fs from 'fs';
import * as path from 'path';

// Mock the ModelManager
jest.mock('../../../utils/modelManager');

// Mock fs
jest.mock('fs');

describe('PresetManager Integration Tests', () => {
  let presetManager: PresetManager;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockOutputChannel: vscode.OutputChannel;
  let mockContext: vscode.ExtensionContext;
  
  // Sample preset for testing
  const samplePreset: IModelConfigurationPreset = {
    id: 'preset1',
    name: 'Test Preset',
    description: 'A test preset',
    modelName: 'llama2',
    provider: 'ollama',
    parameters: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
      systemPrompt: 'You are a helpful assistant.'
    },
    metadata: {
      createdAt: '2023-01-01T00:00:00Z',
      modifiedAt: '2023-01-01T00:00:00Z',
      createdBy: 'test-user',
      tags: ['test', 'integration']
    }
  };
  
  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      name: 'Adamize',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    } as unknown as jest.Mocked<vscode.OutputChannel>;
    
    // Create mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/path',
      globalState: {
        get: jest.fn().mockReturnValue(null),
        update: jest.fn().mockResolvedValue(undefined),
        keys: jest.fn().mockReturnValue([])
      } as unknown as vscode.Memento,
      workspaceState: {} as vscode.Memento,
      extensionUri: vscode.Uri.file('/test/path'),
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      asAbsolutePath: jest.fn().mockImplementation(path => `/test/path/${path}`),
      storageUri: vscode.Uri.file('/test/storage'),
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      logUri: vscode.Uri.file('/test/log'),
      extensionMode: vscode.ExtensionMode.Test,
      extension: {} as vscode.Extension<any>
    } as unknown as vscode.ExtensionContext;
    
    // Create mock model manager
    mockModelManager = new ModelManager(mockContext, mockOutputChannel) as jest.Mocked<ModelManager>;
    
    // Create preset manager
    presetManager = new PresetManager(mockContext, mockModelManager, mockOutputChannel);
  });
  
  /**
   * @test TEST-MODEL-INT-004a Test that the preset manager loads presets from VS Code global state
   */
  test('should load presets from VS Code global state', async () => {
    // Setup mock
    (mockContext.globalState.get as jest.Mock).mockReturnValue({
      preset1: samplePreset
    });
    
    // Initialize
    await presetManager.initialize();
    
    // Verify that presets were loaded
    expect(mockContext.globalState.get).toHaveBeenCalledWith('adamize.modelPresets');
    
    // Verify that the preset was loaded
    const presets = presetManager.getPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('preset1');
    expect(presets[0].name).toBe('Test Preset');
  });
  
  /**
   * @test TEST-MODEL-INT-004b Test that the preset manager saves presets to VS Code global state
   */
  test('should save presets to VS Code global state', async () => {
    // Create preset
    const result = await presetManager.createPreset(samplePreset);
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify that the preset was saved
    expect(mockContext.globalState.update).toHaveBeenCalledWith(
      'adamize.modelPresets',
      expect.objectContaining({
        preset1: samplePreset
      })
    );
  });
  
  /**
   * @test TEST-MODEL-INT-004c Test that the preset manager applies presets to model configuration
   */
  test('should apply presets to model configuration', async () => {
    // Create preset
    await presetManager.createPreset(samplePreset);
    
    // Mock the VS Code configuration
    const mockConfig = {
      update: jest.fn().mockResolvedValue(undefined)
    };
    
    const getConfigurationSpy = jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(mockConfig as any);
    
    // Apply preset
    const result = await presetManager.applyPreset('preset1');
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify that the configuration was updated
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('adamize.ollama');
    expect(mockConfig.update).toHaveBeenCalledWith('model', 'llama2', vscode.ConfigurationTarget.Global);
    expect(mockConfig.update).toHaveBeenCalledWith('temperature', 0.7, vscode.ConfigurationTarget.Global);
    expect(mockConfig.update).toHaveBeenCalledWith('maxTokens', 1000, vscode.ConfigurationTarget.Global);
    expect(mockConfig.update).toHaveBeenCalledWith('systemPrompt', 'You are a helpful assistant.', vscode.ConfigurationTarget.Global);
    
    // Restore the spy
    getConfigurationSpy.mockRestore();
  });
  
  /**
   * @test TEST-MODEL-INT-004d Test that the preset manager exports and imports presets
   */
  test('should export and import presets', async () => {
    // Create preset
    await presetManager.createPreset(samplePreset);
    
    // Mock fs functions
    (fs.writeFileSync as jest.Mock) = jest.fn();
    (fs.readFileSync as jest.Mock) = jest.fn().mockReturnValue(JSON.stringify({
      preset1: samplePreset,
      preset2: {
        ...samplePreset,
        id: 'preset2',
        name: 'Test Preset 2'
      }
    }));
    (fs.existsSync as jest.Mock) = jest.fn().mockReturnValue(true);
    
    // Export presets
    const exportResult = await presetManager.exportPresets('test-file.json');
    
    // Verify export result
    expect(exportResult).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'test-file.json',
      expect.any(String)
    );
    
    // Clear presets
    await presetManager.deletePreset('preset1');
    expect(presetManager.getPresets()).toHaveLength(0);
    
    // Import presets
    const importResult = await presetManager.importPresets('test-file.json');
    
    // Verify import result
    expect(importResult).toBe(2);
    expect(fs.readFileSync).toHaveBeenCalledWith('test-file.json', 'utf8');
    
    // Verify that presets were imported
    const presets = presetManager.getPresets();
    expect(presets).toHaveLength(2);
    expect(presets[0].id).toBe('preset1');
    expect(presets[1].id).toBe('preset2');
  });
});
