/**
 * @file Test suite for Model Tool Registration
 * @description Tests for the Model Tool Registration component
 *
 * @requirement REQ-MODEL-030 Create a dedicated ModelManagementTool class
 */

import * as vscode from 'vscode';
import { expect } from '@jest/globals';
import { registerModelTools } from '../../../../mcp/tools/modelToolRegistration';
import { MCPBridgeManager } from '../../../../mcp/mcpBridgeManager';
import ModelManager from '../../../../utils/modelManager';
import { ModelManagementTool } from '../../../../mcp/tools/modelManagementTool';

// Mock dependencies
jest.mock('../../../../mcp/mcpBridgeManager');
jest.mock('../../../../utils/modelManager');
jest.mock('../../../../mcp/tools/modelManagementTool');

describe('Model Tool Registration', () => {
  let mockContext: vscode.ExtensionContext;
  let mockBridgeManager: jest.Mocked<MCPBridgeManager>;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockOutputChannel: vscode.OutputChannel;
  
  beforeEach(() => {
    // Create mock context
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([])
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        setKeysForSync: jest.fn(),
        keys: jest.fn().mockReturnValue([])
      },
      extensionPath: '',
      asAbsolutePath: jest.fn(str => str),
      storagePath: '',
      globalStoragePath: '',
      logPath: '',
      extensionUri: {} as vscode.Uri,
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      extensionMode: vscode.ExtensionMode.Test,
      storageUri: null,
      globalStorageUri: {} as vscode.Uri,
      logUri: {} as vscode.Uri,
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn()
      }
    };
    
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
    
    // Create mock bridge manager
    mockBridgeManager = new MCPBridgeManager(mockContext, mockOutputChannel) as jest.Mocked<MCPBridgeManager>;
    mockBridgeManager.getBridges = jest.fn().mockReturnValue(['bridge1', 'bridge2']);
    mockBridgeManager.registerTool = jest.fn();
    
    // Create mock model manager
    mockModelManager = new ModelManager(mockContext, mockOutputChannel) as jest.Mocked<ModelManager>;
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  /**
   * @test TEST-MODEL-030a Test that the tool is registered with all bridges
   */
  test('should register the tool with all bridges', () => {
    // Register tools
    const disposable = registerModelTools(
      mockContext,
      mockBridgeManager,
      mockModelManager,
      mockOutputChannel
    );
    
    // Verify that the tool was registered with all bridges
    expect(mockBridgeManager.registerTool).toHaveBeenCalledTimes(2);
    expect(mockBridgeManager.registerTool).toHaveBeenCalledWith('bridge1', expect.any(ModelManagementTool));
    expect(mockBridgeManager.registerTool).toHaveBeenCalledWith('bridge2', expect.any(ModelManagementTool));
    
    // Verify that the output channel was used
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Registering model management tools...');
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Model management tools registered successfully');
    
    // Dispose
    disposable.dispose();
  });
  
  /**
   * @test TEST-MODEL-030b Test that the command is registered
   */
  test('should register the command', () => {
    // Mock command registration
    const mockRegisterCommand = jest.fn().mockReturnValue({ dispose: jest.fn() });
    (vscode.commands.registerCommand as jest.Mock) = mockRegisterCommand;
    
    // Register tools
    const disposable = registerModelTools(
      mockContext,
      mockBridgeManager,
      mockModelManager,
      mockOutputChannel
    );
    
    // Verify that the command was registered
    expect(mockRegisterCommand).toHaveBeenCalledWith(
      'adamize.registerModelTool',
      expect.any(Function)
    );
    
    // Verify that the command was added to subscriptions
    expect(mockContext.subscriptions).toHaveLength(1);
    
    // Dispose
    disposable.dispose();
  });
  
  /**
   * @test TEST-MODEL-030c Test that errors are handled
   */
  test('should handle errors', () => {
    // Mock error
    mockBridgeManager.getBridges = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Register tools
    const disposable = registerModelTools(
      mockContext,
      mockBridgeManager,
      mockModelManager,
      mockOutputChannel
    );
    
    // Verify that the error was logged
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Error registering model management tools')
    );
    
    // Dispose
    disposable.dispose();
  });
});
