# Model Management Enhancements

This document describes the enhancements to the model management features in the Adamize VS Code extension.

## Overview

The model management enhancements provide additional capabilities for working with local Large Language Models (LLMs):

1. **MCP Bridge Integration**: Expose model management functionality to LLM agents through the MCP Bridge
2. **Configuration Presets**: Save and load model configuration presets
3. **UI Enhancements**: Add filtering and sorting capabilities to the model manager view

## MCP Bridge Integration

The MCP Bridge integration allows LLM agents to discover, pull, and remove models through the Model Context Protocol (MCP).

### ModelManagementTool

The `ModelManagementTool` class implements the `MCPTool` interface and provides the following functions:

- `listModels`: List all available models
- `getModel`: Get details about a specific model
- `pullModel`: Pull a new model
- `removeModel`: Remove an existing model

### Conversation Context Tracking

The `ModelManagementTool` maintains conversation context to help LLM agents remember which models are available. This context is updated whenever models are listed, pulled, or removed.

### Tool Registration

The `modelToolRegistration` module registers the `ModelManagementTool` with all available MCP bridges. It also provides a command to manually register the tool with a specific bridge.

## Configuration Presets

Configuration presets allow users to save and load model configurations for quick switching between different settings.

### ModelConfigurationPreset Interface

The `IModelConfigurationPreset` interface defines the structure of a model configuration preset:

```typescript
interface IModelConfigurationPreset {
  id: string;
  name: string;
  description?: string;
  modelName: string;
  provider: string;
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    systemPrompt?: string;
    [key: string]: any;
  };
  metadata: {
    createdAt: string;
    modifiedAt: string;
    createdBy?: string;
    tags?: string[];
    [key: string]: any;
  };
}
```

### PresetManager

The `PresetManager` class provides methods for managing presets:

- `getPresets`: Get all presets
- `getPreset`: Get a preset by ID
- `createPreset`: Create a new preset
- `updatePreset`: Update an existing preset
- `deletePreset`: Delete a preset
- `exportPresets`: Export presets to a file
- `importPresets`: Import presets from a file

### PresetManagerView

The `PresetManagerViewProvider` class provides a UI for managing presets:

- View all presets
- Create new presets
- Edit existing presets
- Delete presets
- Export presets to a file
- Import presets from a file
- Apply presets to the current configuration

## UI Enhancements

The UI enhancements add filtering and sorting capabilities to the model manager view.

### ModelFilterView

The `ModelFilterViewProvider` class provides UI components for filtering and sorting models:

- Filter by search term
- Filter by provider
- Filter by capability
- Filter by size
- Filter by local only
- Sort by name (ascending/descending)
- Sort by size (ascending/descending)
- Sort by provider (ascending/descending)

### Filter Criteria

The `IModelFilterCriteria` interface defines the structure of filter criteria:

```typescript
interface IModelFilterCriteria {
  searchTerm?: string;
  provider?: string;
  capability?: string;
  minSize?: number;
  maxSize?: number;
  localOnly?: boolean;
}
```

### Sort Options

The `ModelSortOption` enum defines the available sort options:

```typescript
enum ModelSortOption {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  SIZE_ASC = 'size_asc',
  SIZE_DESC = 'size_desc',
  PROVIDER_ASC = 'provider_asc',
  PROVIDER_DESC = 'provider_desc'
}
```

## Usage

### MCP Bridge Integration

LLM agents can use the model management tool through the MCP Bridge:

```javascript
// List all models
const result = await mcpBridge.callTool('model-management', 'listModels', {});

// Get details about a specific model
const result = await mcpBridge.callTool('model-management', 'getModel', {
  modelId: 'model1'
});

// Pull a new model
const result = await mcpBridge.callTool('model-management', 'pullModel', {
  modelName: 'llama2'
});

// Remove an existing model
const result = await mcpBridge.callTool('model-management', 'removeModel', {
  modelName: 'llama2'
});
```

### Configuration Presets

Users can manage presets through the Preset Manager view:

1. Open the Preset Manager view from the Adamize sidebar
2. Click the "Create" button to create a new preset
3. Fill in the preset details and click "Save"
4. Click "Apply" on a preset to apply it to the current configuration
5. Click "Edit" to modify a preset
6. Click "Delete" to remove a preset
7. Click "Import" to import presets from a file
8. Click "Export" to export presets to a file

### UI Enhancements

Users can filter and sort models in the Model Manager view:

1. Open the Model Manager view from the Adamize sidebar
2. Use the search box to filter models by name or provider
3. Use the provider dropdown to filter models by provider
4. Use the capability dropdown to filter models by capability
5. Use the sort dropdown to sort models by name, size, or provider
6. Check the "Local Models Only" checkbox to show only local models
7. Click "Clear" to reset all filters

## Implementation Details

### MCP Bridge Integration

- `src/mcp/tools/modelManagementTool.ts`: Implements the `ModelManagementTool` class
- `src/mcp/tools/modelToolRegistration.ts`: Registers the tool with MCP bridges

### Configuration Presets

- `src/utils/presetManager.ts`: Implements the `PresetManager` class
- `src/ui/presetManagerView.ts`: Implements the `PresetManagerViewProvider` class
- `media/presetManager.js`: Client-side JavaScript for the preset manager view
- `media/presetManager.css`: Styles for the preset manager view

### UI Enhancements

- `src/ui/modelFilterView.ts`: Implements the `ModelFilterViewProvider` class
- `media/modelManager.js`: Client-side JavaScript for the model manager view
- `media/modelManager.css`: Styles for the model manager view
