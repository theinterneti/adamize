/**
 * @file Test suite for Model Preset Tool
 * @description Tests for the Model Preset Tool component
 *
 * @requirement REQ-MODEL-040 Add configuration presets for models
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as vscode from 'vscode';
import { ModelPresetTool } from '../../../../mcp/tools/modelPresetTool';
import { IModelConfigurationPreset, PresetManager } from '../../../../utils/presetManager';

// Mock the PresetManager
jest.mock('../../../../utils/presetManager');

describe('ModelPresetTool', () => {
  let modelPresetTool: ModelPresetTool;
  let mockPresetManager: jest.Mocked<PresetManager>;
  let mockOutputChannel: vscode.OutputChannel;

  // Sample preset data for testing
  const samplePreset: IModelConfigurationPreset = {
    id: 'preset1',
    name: 'Test Preset',
    description: 'A test preset',
    modelName: 'model1',
    provider: 'ollama',
    parameters: {
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are a helpful assistant.',
    },
    metadata: {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      tags: ['test', 'sample'],
    },
  };

  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      name: 'Test Output Channel',
      append: jest.fn(),
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    } as unknown as vscode.OutputChannel;

    // Create mock preset manager
    mockPresetManager = new PresetManager(
      {} as vscode.ExtensionContext,
      mockOutputChannel
    ) as jest.Mocked<PresetManager>;

    // Create model preset tool
    modelPresetTool = new ModelPresetTool(mockPresetManager, mockOutputChannel);
  });

  /**
   * @test TEST-MODEL-040a Test that the tool has the correct name and description
   */
  test('should have the correct name and description', () => {
    expect(modelPresetTool.name).toBe('model-preset');
    expect(modelPresetTool.description).toBe('Tool for managing model configuration presets');
  });

  /**
   * @test TEST-MODEL-040b Test that the tool schema has the correct functions
   */
  test('should have the correct schema with functions', () => {
    expect(modelPresetTool.schema.name).toBe('model-preset');
    expect(modelPresetTool.schema.version).toBe('1.0.0');
    expect(modelPresetTool.schema.functions).toHaveLength(6);

    // Check function names
    const functionNames = modelPresetTool.schema.functions.map(f => f.name);
    expect(functionNames).toContain('listPresets');
    expect(functionNames).toContain('getPreset');
    expect(functionNames).toContain('createPreset');
    expect(functionNames).toContain('updatePreset');
    expect(functionNames).toContain('deletePreset');
    expect(functionNames).toContain('applyPreset');
  });

  /**
   * @test TEST-MODEL-040c Test that the listPresets function returns the correct result
   */
  test('should list presets correctly', async () => {
    // Setup mock
    mockPresetManager.getPresets = jest.fn().mockReturnValue([samplePreset]);

    // Execute function
    const result = await modelPresetTool.execute('listPresets', {});

    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('presets');
    expect(Array.isArray(result.result.presets)).toBe(true);
    expect(result.result.presets).toHaveLength(1);
    expect(result.result.presets[0].id).toBe('preset1');

    // Verify mock was called
    expect(mockPresetManager.getPresets).toHaveBeenCalledTimes(1);
  });

  /**
   * @test TEST-MODEL-040d Test that the getPreset function returns the correct result
   */
  test('should get preset details correctly', async () => {
    // Setup mock
    mockPresetManager.getPreset = jest.fn().mockImplementation(id => {
      return id === 'preset1' ? samplePreset : undefined;
    });

    // Execute function
    const result = await modelPresetTool.execute('getPreset', { presetId: 'preset1' });

    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('id', 'preset1');
    expect(result.result).toHaveProperty('name', 'Test Preset');
    expect(result.result).toHaveProperty('description', 'A test preset');
    expect(result.result).toHaveProperty('modelName', 'model1');
    expect(result.result).toHaveProperty('provider', 'ollama');
    expect(result.result).toHaveProperty('parameters');
    expect(result.result.parameters).toHaveProperty('temperature', 0.7);

    // Verify mock was called
    expect(mockPresetManager.getPreset).toHaveBeenCalledTimes(1);
    expect(mockPresetManager.getPreset).toHaveBeenCalledWith('preset1');
  });

  /**
   * @test TEST-MODEL-040e Test that the getPreset function handles errors correctly
   */
  test('should handle errors when getting preset details', async () => {
    // Setup mock
    mockPresetManager.getPreset = jest.fn().mockReturnValue(undefined);

    // Execute function
    const result = await modelPresetTool.execute('getPreset', { presetId: 'nonexistent' });

    // Verify result
    expect(result.status).toBe('error');
    expect(result.error).toContain('not found');

    // Verify mock was called
    expect(mockPresetManager.getPreset).toHaveBeenCalledTimes(1);
    expect(mockPresetManager.getPreset).toHaveBeenCalledWith('nonexistent');
  });

  /**
   * @test TEST-MODEL-040f Test that the createPreset function works correctly
   */
  test('should create preset correctly', async () => {
    // Setup mock
    mockPresetManager.createPreset = jest.fn().mockResolvedValue(true);

    // Execute function
    const result = await modelPresetTool.execute('createPreset', { preset: samplePreset });

    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('message');
    expect(result.result.message).toContain('Successfully created preset');

    // Verify mock was called
    expect(mockPresetManager.createPreset).toHaveBeenCalledTimes(1);
    expect(mockPresetManager.createPreset).toHaveBeenCalledWith(samplePreset);
  });

  /**
   * @test TEST-MODEL-040g Test that the updatePreset function works correctly
   */
  test('should update preset correctly', async () => {
    // Setup mock
    mockPresetManager.updatePreset = jest.fn().mockResolvedValue(true);

    // Execute function
    const result = await modelPresetTool.execute('updatePreset', {
      presetId: 'preset1',
      preset: samplePreset,
    });

    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('message');
    expect(result.result.message).toContain('Successfully updated preset');

    // Verify mock was called
    expect(mockPresetManager.updatePreset).toHaveBeenCalledTimes(1);
    expect(mockPresetManager.updatePreset).toHaveBeenCalledWith('preset1', samplePreset);
  });

  /**
   * @test TEST-MODEL-040h Test that the deletePreset function works correctly
   */
  test('should delete preset correctly', async () => {
    // Setup mock
    mockPresetManager.deletePreset = jest.fn().mockResolvedValue(true);

    // Execute function
    const result = await modelPresetTool.execute('deletePreset', { presetId: 'preset1' });

    // Verify result
    expect(result.status).toBe('success');
    expect(result.result).toHaveProperty('message');
    expect(result.result.message).toContain('Successfully deleted preset');

    // Verify mock was called
    expect(mockPresetManager.deletePreset).toHaveBeenCalledTimes(1);
    expect(mockPresetManager.deletePreset).toHaveBeenCalledWith('preset1');
  });

  /**
   * @test TEST-MODEL-040i Test that the applyPreset function works correctly
   */
  test('should apply preset correctly', async () => {
    // Setup mocks
    mockPresetManager.getPreset = jest.fn().mockReturnValue(samplePreset);

    // Set NODE_ENV to test
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    try {
      // Execute function
      const result = await modelPresetTool.execute('applyPreset', { presetId: 'preset1' });

      // Verify result
      expect(result.status).toBe('success');
      expect(result.result).toHaveProperty('message');
      expect(result.result.message).toContain('Successfully applied preset');
      expect(result.result).toHaveProperty('appliedSettings');
      expect(result.result.appliedSettings).toHaveProperty('model', 'model1');
      expect(result.result.appliedSettings).toHaveProperty('temperature', 0.7);

      // Verify mocks were called
      expect(mockPresetManager.getPreset).toHaveBeenCalledTimes(1);
      expect(mockPresetManager.getPreset).toHaveBeenCalledWith('preset1');
    } finally {
      // Restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  /**
   * @test TEST-MODEL-040j Test that the tool handles unknown functions
   */
  test('should handle unknown functions', async () => {
    // Execute function
    const result = await modelPresetTool.execute('unknownFunction', {});

    // Verify result
    expect(result.status).toBe('error');
    expect(result.error).toContain('Unknown function');
  });
});
