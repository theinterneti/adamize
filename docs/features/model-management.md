# Model Management

This document describes the model management features in the Adamize VS Code extension.

## Overview

Adamize provides comprehensive model management capabilities for local Large Language Models (LLMs). The model management features allow users to:

- Discover available models from different providers
- Pull new models from model providers
- Remove existing models
- View detailed model information
- Start and stop model servers
- Configure model settings
- Test models with a benchmark tool
- Share model configurations with team members

## Components

The model management system consists of several components:

### ModelManager

The `ModelManager` class in `src/utils/modelManager.ts` is responsible for:

- Discovering available local models
- Pulling models from remote sources
- Removing models
- Getting model details
- Managing model servers

### ModelManagerViewProvider

The `ModelManagerViewProvider` class in `src/ui/modelManagerView.ts` provides a UI for:

- Displaying available models
- Pulling new models
- Removing existing models
- Viewing model details
- Starting and stopping model servers

### ModelFilterViewProvider

The `ModelFilterViewProvider` class in `src/ui/modelFilterView.ts` provides UI components for filtering and sorting models:

- Filter by search term
- Filter by provider
- Filter by capability
- Filter by size
- Filter by local only
- Sort by name, size, or provider

### PresetManager

The `PresetManager` class in `src/utils/presetManager.ts` provides methods for managing model configuration presets:

- Create, update, and delete presets
- Apply presets to the current configuration
- Export and import presets
- Share presets with team members

### MCP Bridge Integration

The `ModelManagementTool` class in `src/mcp/tools/modelManagementTool.ts` implements the `MCPTool` interface and provides the following functions:

- `listModels`: List all available models
- `getModel`: Get details about a specific model
- `pullModel`: Pull a new model
- `removeModel`: Remove an existing model

## Features

### Model Discovery

Adamize automatically discovers available models from different providers:

- **Ollama Models**: Models available through the Ollama API
- **Local Models**: Models stored in the extension's storage path
- **Hugging Face Models**: (Coming soon) Models from Hugging Face Hub

### Model Management

Adamize provides several commands for managing models:

- **Refresh Models**: Refresh the list of available models
- **Pull Ollama Model**: Pull a new model from Ollama
- **Remove Ollama Model**: Remove an existing Ollama model
- **Start Ollama Server**: Start the Ollama server
- **Stop Ollama Server**: Stop the Ollama server
- **Open Ollama Chat**: Open a chat interface with the selected model

### Model Information

The Model Manager view displays detailed information about each model:

- Model name and version
- Model size
- Model provider
- Model capabilities
- Local path (if available)
- Download URL (if available)

### Model Filtering

The Model Filter view provides advanced filtering and sorting capabilities:

- Filter by search term
- Filter by provider
- Filter by capability
- Filter by size
- Filter by local only
- Sort by name (ascending/descending)
- Sort by size (ascending/descending)
- Sort by provider (ascending/descending)

### Configuration Presets

The Preset Manager allows users to save and load model configuration presets:

- Save current configuration as a preset
- Load a preset to apply its configuration
- Export presets to a file
- Import presets from a file
- Share presets with team members

### MCP Bridge Integration

LLM agents can use the model management tool through the MCP Bridge to:

- List all available models
- Get details about specific models
- Pull new models
- Remove existing models

### Error Handling

The model management system includes robust error handling:

- Connection errors when communicating with model providers
- Model not found errors when trying to use a non-existent model
- Permission errors when trying to access model files
- Download errors when pulling models
- Server errors when starting or stopping model servers
- Disk space checks before pulling models
- Validation of model names and parameters
- Detailed error messages with recovery suggestions
- Retry mechanisms for transient errors

### Status Indicators

The UI includes status indicators to show the progress of operations:

- In-progress indicators for long-running operations
- Success indicators for completed operations
- Error indicators for failed operations
- Status messages with details about the operation

## Usage

### Model Manager View

The Model Manager view is available in the Adamize sidebar. To open it:

1. Click on the Adamize icon in the activity bar
2. Select the "Model Manager" view
3. Browse the list of available models
4. Click on a model to view its details
5. Click "Pull" to download a new model
6. Click "Remove" to remove an existing model
7. Click "Refresh" to update the model list

### Model Commands

The following commands are available for model management:

- **Adamize Models: Refresh Models**: Refresh the list of available models
- **Adamize Models: Pull Ollama Model**: Pull a new Ollama model
- **Adamize Models: Remove Ollama Model**: Remove an existing Ollama model
- **Adamize Models: Start Ollama Server**: Start the Ollama server
- **Adamize Models: Stop Ollama Server**: Stop the Ollama server
- **Adamize Models: Open Ollama Chat**: Open the Ollama chat interface

These commands are accessible from the command palette, the Model Manager view, and context menus.

### Configuration Presets

To manage configuration presets:

1. Open the Adamize sidebar
2. Click on the "Presets" view
3. Click "Create" to create a new preset
4. Fill in the preset details and click "Save"
5. Click "Apply" on a preset to apply it to the current configuration
6. Click "Export" to export presets to a file
7. Click "Import" to import presets from a file

### MCP Bridge Integration

LLM agents can use the model management tool through the MCP Bridge:

```javascript
// List all models
const result = await mcpBridge.callTool('model-management', 'listModels', {});

// Get details about a specific model
const result = await mcpBridge.callTool('model-management', 'getModel', {
  modelId: 'model1',
});

// Pull a new model
const result = await mcpBridge.callTool('model-management', 'pullModel', {
  modelName: 'llama2',
});

// Remove an existing model
const result = await mcpBridge.callTool('model-management', 'removeModel', {
  modelName: 'llama2',
});
```

## Configuration

Model management can be configured through VS Code settings:

- `adamize.ollama.enabled`: Enable/disable Ollama integration
- `adamize.ollama.provider`: The LLM provider to use
- `adamize.ollama.model`: The Ollama model to use
- `adamize.ollama.baseUrl`: The base URL for the Ollama API
- `adamize.ollama.endpoint`: The endpoint for the Ollama API
- `adamize.ollama.temperature`: The temperature for Ollama model generation
- `adamize.ollama.maxTokens`: The maximum tokens to generate
- `adamize.ollama.systemPrompt`: The system prompt for Ollama

## Troubleshooting

### Models Not Appearing

If models are not appearing in the Model Manager view:

1. Check that the model provider (e.g., Ollama) is running
2. Check that the model provider is accessible at the configured URL
3. Click the "Refresh" button in the Model Manager view
4. Check the output channel for error messages

### Model Pull Failures

If pulling a model fails:

1. Check that the model provider is running
2. Check that the model name is correct
3. Check that you have sufficient disk space
4. Check the output channel for error messages

### Model Removal Failures

If removing a model fails:

1. Check that the model provider is running
2. Check that the model is not currently in use
3. Check the output channel for error messages

## Implementation Details

The model management system is implemented with a focus on:

- **Extensibility**: Support for multiple model providers
- **Performance**: Efficient model discovery and management
- **Usability**: Intuitive UI for model management
- **Integration**: Seamless integration with the MCP Bridge

## Future Improvements

- **Model Usage Statistics**: Track and display model usage statistics
- **Model Benchmarking**: Test model performance with a benchmark tool
- **Model Playground**: Test models with a playground interface
- **Model Evaluation**: Evaluate models with standardized tests
- **Visual Configuration UI**: Configure models with a visual UI
- **Model Comparison**: Side-by-side comparison of models
- **Model Customization**: Fine-tuning and customization of models

## References

- [Ollama Documentation](https://ollama.ai/docs)
- [Hugging Face Documentation](https://huggingface.co/docs)
- [Model Context Protocol (MCP) Documentation](https://learn.microsoft.com/en/us/microsoft-copilot-studio/agent-extend-action-mcp)
- [Adamize Documentation](https://github.com/theinterneti/adamize)
