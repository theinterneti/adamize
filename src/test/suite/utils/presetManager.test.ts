/**
 * @file Test suite for Preset Manager
 * @description Tests for the Preset Manager component
 *
 * @requirement REQ-MODEL-040 Create a ModelConfigurationPreset interface with fields for model name, parameters, and metadata
 */

import { expect } from '@jest/globals';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { IModelConfigurationPreset, PresetManager } from '../../../utils/presetManager';

// Mock dependencies
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));
jest.mock('path');

describe('PresetManager', () => {
  let presetManager: PresetManager;
  let mockContext: vscode.ExtensionContext;
  let mockOutputChannel: vscode.OutputChannel;
  let mockGlobalState: Map<string, any> = new Map();

  // Sample preset for testing
  const samplePreset: IModelConfigurationPreset = {
    id: 'preset1',
    name: 'Test Preset',
    description: 'A test preset',
    modelName: 'test-model',
    provider: 'ollama',
    parameters: {
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful assistant.',
    },
    metadata: {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: 'test-user',
      tags: ['test', 'sample'],
    },
  };

  beforeEach(() => {
    // Reset mock global state
    mockGlobalState = new Map();

    // Create mock context
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([]),
      },
      globalState: {
        get: jest.fn().mockImplementation((key: string) => mockGlobalState.get(key)),
        update: jest.fn().mockImplementation((key: string, value: any) => {
          mockGlobalState.set(key, value);
          return Promise.resolve();
        }),
        setKeysForSync: jest.fn(),
        keys: jest.fn().mockReturnValue([]),
      },
      extensionPath: '',
      asAbsolutePath: jest.fn(str => str),
      storagePath: '',
      globalStoragePath: '',
      logPath: '',
      extensionUri: {} as vscode.Uri,
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      extensionMode: 1, // Use 1 for Development mode
      storageUri: null,
      globalStorageUri: {} as vscode.Uri,
      logUri: {} as vscode.Uri,
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
      },
    };

    // Create mock output channel
    mockOutputChannel = {
      name: 'Test Output Channel',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    };

    // Create preset manager
    presetManager = new PresetManager(mockContext, mockOutputChannel);

    // Reset mocks
    jest.clearAllMocks();
  });

  /**
   * @test TEST-MODEL-040a Test that the preset manager initializes correctly
   */
  test('should initialize correctly', async () => {
    // Setup mock
    mockContext.globalState.get = jest.fn().mockReturnValue({
      preset1: samplePreset,
    });

    // Initialize
    await presetManager.initialize();

    // Verify that presets were loaded
    expect(mockContext.globalState.get).toHaveBeenCalledWith('adamize.modelPresets');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Initializing preset manager...');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Loaded 1 presets');

    // Verify that the preset was loaded
    const presets = presetManager.getPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('preset1');
  });

  /**
   * @test TEST-MODEL-040b Test that the preset manager creates presets correctly
   */
  test('should create presets correctly', async () => {
    // Create preset
    const result = await presetManager.createPreset(samplePreset);

    // Verify result
    expect(result).toBe(true);

    // Verify that the preset was saved
    expect(mockContext.globalState.update).toHaveBeenCalledWith(
      'adamize.modelPresets',
      expect.objectContaining({
        preset1: samplePreset,
      })
    );

    // Verify that the preset can be retrieved
    const preset = presetManager.getPreset('preset1');
    expect(preset).toEqual(samplePreset);
  });

  /**
   * @test TEST-MODEL-040c Test that the preset manager updates presets correctly
   */
  test('should update presets correctly', async () => {
    // Create preset
    await presetManager.createPreset(samplePreset);

    // Update preset
    const updatedPreset = {
      ...samplePreset,
      name: 'Updated Preset',
      parameters: {
        ...samplePreset.parameters,
        temperature: 0.5,
      },
    };

    const result = await presetManager.updatePreset('preset1', updatedPreset);

    // Verify result
    expect(result).toBe(true);

    // Verify that the preset was updated
    const preset = presetManager.getPreset('preset1');
    expect(preset).toEqual(updatedPreset);
    expect(preset?.name).toBe('Updated Preset');
    expect(preset?.parameters.temperature).toBe(0.5);
  });

  /**
   * @test TEST-MODEL-040d Test that the preset manager deletes presets correctly
   */
  test('should delete presets correctly', async () => {
    // Create preset
    await presetManager.createPreset(samplePreset);

    // Delete preset
    const result = await presetManager.deletePreset('preset1');

    // Verify result
    expect(result).toBe(true);

    // Verify that the preset was deleted
    const preset = presetManager.getPreset('preset1');
    expect(preset).toBeUndefined();

    // Verify that the presets were saved
    expect(mockContext.globalState.update).toHaveBeenCalledWith('adamize.modelPresets', {});
  });

  /**
   * @test TEST-MODEL-040e Test that the preset manager exports presets correctly
   */
  test('should export presets correctly', async () => {
    // Reset mock
    jest.clearAllMocks();

    // Create preset
    await presetManager.createPreset(samplePreset);

    // Export presets
    const result = await presetManager.exportPresets('test-file.json');

    // Verify result
    expect(result).toBe(true);

    // Verify that the file was written
    expect(fs.writeFileSync).toHaveBeenCalledWith('test-file.json', expect.any(String));

    // Verify the content
    const content = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
    const exportedPresets = JSON.parse(content);
    expect(exportedPresets).toHaveProperty('preset1');
    expect(exportedPresets.preset1).toEqual(samplePreset);
  });

  /**
   * @test TEST-MODEL-040f Test that the preset manager imports presets correctly
   */
  test('should import presets correctly', async () => {
    // Reset mock
    jest.clearAllMocks();

    // Setup mock
    (fs.readFileSync as any).mockReturnValue(
      JSON.stringify({
        preset2: {
          ...samplePreset,
          id: 'preset2',
          name: 'Imported Preset',
        },
      })
    );

    // Import presets
    const result = await presetManager.importPresets('test-file.json');

    // Verify result
    expect(result).toBe(1);

    // Verify that the preset was imported
    const preset = presetManager.getPreset('preset2');
    expect(preset).toBeDefined();
    expect(preset?.name).toBe('Imported Preset');

    // Verify that the presets were saved
    expect(mockContext.globalState.update).toHaveBeenCalledWith(
      'adamize.modelPresets',
      expect.objectContaining({
        preset2: expect.objectContaining({
          id: 'preset2',
          name: 'Imported Preset',
        }),
      })
    );
  });

  /**
   * @test TEST-MODEL-040g Test that the preset manager handles errors correctly
   */
  test('should handle errors correctly', async () => {
    // Reset mock
    jest.clearAllMocks();

    // Setup mock to throw an error
    mockContext.globalState.update = jest.fn().mockRejectedValue(new Error('Test error'));

    // Create preset
    const result = await presetManager.createPreset(samplePreset);

    // Verify that the error was logged
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Error saving presets')
    );
  });
});
