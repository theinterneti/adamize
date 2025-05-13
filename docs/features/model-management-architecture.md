# Model Management Architecture

This document describes the architecture of the model management system in the Adamize VS Code extension after the refactoring.

## Overview

The model management system has been refactored to follow a more modular, maintainable, and testable architecture. The refactoring introduces:

1. A clear interface hierarchy with provider-specific implementations
2. A service layer for different model operations
3. A factory pattern for creating provider-specific handlers
4. Improved error handling and recovery mechanisms

This architecture enables better separation of concerns, easier testing, and more straightforward extension to support additional model providers in the future.

## Architecture Components

### Interface Hierarchy

The core of the architecture is the `IModelOperationHandler` interface, which defines the operations that can be performed on models:

```typescript
export interface IModelOperationHandler {
  getProviderType(): ModelProviderType;
  discoverModels(): Promise<IModelInfo[]>;
  getModel(modelId: string): Promise<IModelInfo | undefined>;
  pullModel(modelName: string, options?: Record<string, any>): Promise<void>;
  removeModel(modelName: string): Promise<void>;
}
```

Provider-specific implementations of this interface handle the details of interacting with different model providers:

- `OllamaModelHandler`: Handles operations for Ollama models
- `LocalModelHandler`: Handles operations for local models
- `HuggingFaceModelHandler`: (Planned) Will handle operations for HuggingFace models

### Factory Pattern

The `ModelHandlerFactory` class creates and manages instances of model operation handlers:

```typescript
export class ModelHandlerFactory {
  createHandler(providerType: ModelProviderType): IModelOperationHandler;
  getAllHandlers(): IModelOperationHandler[];
}
```

This factory pattern allows the system to:
- Create the appropriate handler based on the provider type
- Cache handlers for better performance
- Provide a unified way to access all available handlers

### Service Layer

The service layer consists of three main services:

1. **ModelDiscoveryService**: Handles discovering models from different providers
   ```typescript
   export class ModelDiscoveryService {
     discoverAllModels(forceRefresh?: boolean): Promise<IModelInfo[]>;
     getModel(modelId: string): Promise<IModelInfo | undefined>;
     filterAndSortModels(models: IModelInfo[], criteria: IModelFilterCriteria, sortOption: ModelSortOption): IModelInfo[];
   }
   ```

2. **ModelManagementService**: Handles operations like pulling and removing models
   ```typescript
   export class ModelManagementService {
     pullModel(modelName: string, providerType: ModelProviderType, options?: Record<string, any>, progressCallback?: (progress: IModelOperationProgress) => void): Promise<IModelOperationResult>;
     removeModel(modelName: string, providerType: ModelProviderType, progressCallback?: (progress: IModelOperationProgress) => void): Promise<IModelOperationResult>;
     startServer(providerType: ModelProviderType, progressCallback?: (progress: IModelOperationProgress) => void): Promise<IModelOperationResult>;
   }
   ```

3. **ModelConfigurationService**: Handles model configuration presets
   ```typescript
   export class ModelConfigurationService {
     getPresets(): IModelConfigurationPreset[];
     getPreset(presetId: string): IModelConfigurationPreset | undefined;
     createPreset(preset: IModelConfigurationPreset): Promise<boolean>;
     updatePreset(presetId: string, preset: IModelConfigurationPreset): Promise<boolean>;
     deletePreset(presetId: string): Promise<boolean>;
     applyPreset(presetId: string): Promise<boolean>;
   }
   ```

### Refactored ModelManager

The `ModelManager` class has been refactored to use the new components:

```typescript
export class ModelManager {
  private handlerFactory: ModelHandlerFactory;
  private discoveryService: ModelDiscoveryService;
  private managementService: ModelManagementService;
  private configurationService: ModelConfigurationService;
  
  // Methods that delegate to the appropriate service
  discoverLocalModels(): Promise<IModelInfo[]>;
  discoverOllamaModels(): Promise<IModelInfo[]>;
  getModel(modelId: string): Promise<IModelInfo | undefined>;
  listModels(): Promise<IModelInfo[]>;
  pullOllamaModel(modelName: string): Promise<void>;
  removeOllamaModel(modelName: string): Promise<void>;
  startOllamaServer(): Promise<void>;
  stopOllamaServer(): Promise<void>;
  // ...
}
```

## Error Handling

The architecture includes a robust error handling system:

- `ModelError` class with error types and recovery suggestions
- Progress reporting for long-running operations
- Detailed error messages for users
- Retry mechanisms for transient errors

## Benefits of the New Architecture

1. **Separation of Concerns**: Each component has a clear responsibility
2. **Testability**: Components can be tested in isolation with mocks
3. **Extensibility**: New providers can be added by implementing the `IModelOperationHandler` interface
4. **Maintainability**: Code is more organized and easier to understand
5. **Error Handling**: Improved error handling with recovery suggestions
6. **Progress Reporting**: Better progress reporting for long-running operations

## Usage Examples

### Discovering Models

```typescript
// Get all models from all providers
const models = await modelManager.listModels();

// Get Ollama models specifically
const ollamaModels = await modelManager.discoverOllamaModels();
```

### Managing Models

```typescript
// Pull an Ollama model
await modelManager.pullOllamaModel('llama2');

// Remove an Ollama model
await modelManager.removeOllamaModel('llama2');
```

### Using Model Presets

```typescript
// Get all presets
const presets = modelManager.configurationService.getPresets();

// Apply a preset
await modelManager.configurationService.applyPreset('preset1');
```

## Future Improvements

1. **Additional Providers**: Implement handlers for more model providers (HuggingFace, etc.)
2. **Advanced Filtering**: Enhance model filtering and sorting capabilities
3. **Model Benchmarking**: Add benchmarking tools for model performance comparison
4. **Model Usage Statistics**: Track and display model usage statistics
5. **Visual Configuration UI**: Provide a visual UI for model configuration

## References

- [Model Management Documentation](./model-management.md)
- [Model Management Enhancements](./model-management-enhancements.md)
- [Ollama Documentation](https://ollama.ai/docs)
