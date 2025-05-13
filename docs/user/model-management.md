# Model Management User Guide

This guide provides step-by-step instructions for using the model management features in the Adamize VS Code extension.

## Table of Contents

- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Discovering Models](#discovering-models)
- [Pulling Models](#pulling-models)
- [Removing Models](#removing-models)
- [Managing the Ollama Server](#managing-the-ollama-server)
- [Using Configuration Presets](#using-configuration-presets)
- [Filtering and Sorting Models](#filtering-and-sorting-models)
- [Using Models with MCP Bridge](#using-models-with-mcp-bridge)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Introduction

Adamize provides comprehensive model management capabilities for local Large Language Models (LLMs). These features allow you to discover, pull, remove, and manage models from different providers, with a focus on Ollama integration.

## Getting Started

### Prerequisites

Before using the model management features, ensure you have:

1. Installed the Adamize VS Code extension
2. Installed [Ollama](https://ollama.ai/) (for Ollama integration)
3. Started the Ollama server (or use the built-in commands to start it)

### Opening the Model Manager View

1. Click on the Adamize icon in the VS Code activity bar
2. Select the "Model Manager" view from the sidebar

![Model Manager View](../images/model-manager-view.png)

## Discovering Models

### Refreshing the Model List

1. In the Model Manager view, click the "Refresh" button
2. The extension will discover available models from all configured providers
3. Models will be displayed in the list, grouped by provider

Alternatively, you can use the command:

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize Models: Refresh Models"

### Viewing Model Details

1. Click on a model in the list to view its details
2. The details panel will show:
   - Model name and version
   - Model size
   - Model provider
   - Model capabilities
   - Additional details specific to the provider

## Pulling Models

### Pulling an Ollama Model

1. In the Model Manager view, click the "Pull Model" button
2. Enter the name of the model to pull (e.g., "llama2", "qwen3-coder")
3. Click "OK" to start the download
4. The status indicator will show the progress of the operation
5. Once complete, the model will appear in the list

Alternatively, you can use the command:

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize Models: Pull Ollama Model"
3. Enter the name of the model to pull
4. Click "OK" to start the download

### Popular Ollama Models

Here are some popular models you can pull:

- `qwen3-coder`: Optimized for coding tasks
- `llama2`: General-purpose model
- `mistral`: Efficient general-purpose model
- `codellama`: Specialized for code generation
- `phi3`: Smaller, efficient model

## Removing Models

### Removing an Ollama Model

1. In the Model Manager view, find the model you want to remove
2. Click the "Remove" button next to the model
3. Confirm the removal when prompted
4. The status indicator will show the progress of the operation
5. Once complete, the model will be removed from the list

Alternatively, you can use the command:

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize Models: Remove Ollama Model"
3. Select the model to remove from the dropdown
4. Confirm the removal when prompted

## Managing the Ollama Server

### Starting the Ollama Server

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize Models: Start Ollama Server"
3. The extension will attempt to start the Ollama server
4. A notification will appear when the server is started

### Stopping the Ollama Server

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize Models: Stop Ollama Server"
3. The extension will attempt to stop the Ollama server
4. A notification will appear when the server is stopped

## Using Configuration Presets

### Creating a Preset

1. Open the Preset Manager view from the Adamize sidebar
2. Click the "Create" button
3. Fill in the preset details:
   - Name: A descriptive name for the preset
   - Description: (Optional) A description of the preset
   - Model: The model to use
   - Provider: The model provider
   - Parameters: Configure model parameters (temperature, max tokens, etc.)
4. Click "Save" to create the preset

### Applying a Preset

1. Open the Preset Manager view from the Adamize sidebar
2. Find the preset you want to apply
3. Click the "Apply" button
4. The preset configuration will be applied to the current settings

### Exporting Presets

1. Open the Preset Manager view from the Adamize sidebar
2. Click the "Export" button
3. Choose a location to save the presets file
4. Click "Save" to export the presets

### Importing Presets

1. Open the Preset Manager view from the Adamize sidebar
2. Click the "Import" button
3. Select a presets file to import
4. Click "Open" to import the presets

## Filtering and Sorting Models

### Filtering Models

1. In the Model Manager view, use the filter panel to filter models:
   - Search: Enter text to search model names
   - Provider: Select a provider to filter by
   - Capability: Select a capability to filter by
   - Local Only: Check to show only local models
2. The model list will update to show only matching models

### Sorting Models

1. In the Model Manager view, use the sort dropdown to sort models:
   - Name (A-Z): Sort by name in ascending order
   - Name (Z-A): Sort by name in descending order
   - Size (Small-Large): Sort by size in ascending order
   - Size (Large-Small): Sort by size in descending order
   - Provider (A-Z): Sort by provider in ascending order
   - Provider (Z-A): Sort by provider in descending order
2. The model list will update to reflect the selected sort order

## Using Models with MCP Bridge

### Opening Ollama Chat

1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Adamize Models: Open Ollama Chat"
3. A chat interface will open with the selected model
4. Type messages to interact with the model

### Using Models in MCP Tools

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

## Troubleshooting

### Models Not Appearing

If models are not appearing in the Model Manager view:

1. Check that the Ollama server is running
2. Run "Adamize Models: Start Ollama Server" if needed
3. Click the "Refresh" button in the Model Manager view
4. Check the Adamize output channel for error messages

### Model Pull Failures

If pulling a model fails:

1. Check that the Ollama server is running
2. Verify that the model name is correct
3. Ensure you have sufficient disk space
4. Check your internet connection
5. Check the Adamize output channel for detailed error messages

### Model Removal Failures

If removing a model fails:

1. Check that the Ollama server is running
2. Ensure the model is not currently in use
3. Try stopping and restarting the Ollama server
4. Check the Adamize output channel for detailed error messages

## Best Practices

### Model Selection

- Choose models based on your specific needs:
  - For coding tasks: `qwen3-coder`, `codellama`
  - For general tasks: `llama2`, `mistral`
  - For efficiency: `phi3`, smaller quantized models

### Resource Management

- Be mindful of disk space when pulling large models
- Remove unused models to free up space
- Consider using smaller quantized models for better performance on limited hardware

### Configuration Presets

- Create presets for different use cases
- Share presets with team members for consistent configurations
- Document the purpose and optimal use case for each preset

### Performance Optimization

- Adjust temperature based on your needs:
  - Lower (0.1-0.3) for more deterministic responses
  - Higher (0.7-0.9) for more creative responses
- Set appropriate max tokens to balance response length and generation time
- Use system prompts to guide model behavior
