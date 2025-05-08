# Ollama Integration

This document describes the Ollama integration in the Adamize VS Code extension.

## Overview

Adamize integrates with [Ollama](https://ollama.ai/) to provide local LLM capabilities for various features. Ollama is a tool that allows running large language models locally on your machine. This integration enables Adamize to use local LLMs through Ollama to power features like code generation, test generation, and chat.

## Features

- **Ollama Configuration**: Configure Ollama settings through the VS Code settings or the Ollama Configuration UI.
- **Ollama Chat**: Chat with local LLMs through Ollama.
- **Ollama Commands**: Start, stop, and configure Ollama from within VS Code.
- **MCP Bridge Integration**: Use local LLMs with MCP tools through the MCP Bridge.

## Requirements

- [Ollama](https://ollama.ai/) installed on your machine.
- A compatible LLM model pulled in Ollama (e.g., `qwen3-coder`).

## Installation

1. Install Ollama from [ollama.ai](https://ollama.ai/).
2. Pull a compatible model:
   ```bash
   ollama pull qwen3-coder
   ```
3. Install the Adamize VS Code extension.

## Configuration

### VS Code Settings

Ollama can be configured through VS Code settings:

- `adamize.ollama.enabled`: Enable/disable Ollama integration.
- `adamize.ollama.provider`: The LLM provider to use (default: `ollama`).
- `adamize.ollama.model`: The Ollama model to use (default: `qwen3-coder`).
- `adamize.ollama.baseUrl`: The base URL for the Ollama API (default: `http://localhost:11434`).
- `adamize.ollama.endpoint`: The endpoint for the Ollama API (default: `http://localhost:11434/v1/chat/completions`).
- `adamize.ollama.temperature`: The temperature for Ollama model generation (default: `0.7`).
- `adamize.ollama.maxTokens`: The maximum tokens to generate (default: `2000`).
- `adamize.ollama.systemPrompt`: The system prompt for Ollama (default: `You are a helpful assistant that can use tools to help answer questions.`).

### Ollama Configuration UI

You can also configure Ollama through the Ollama Configuration UI:

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Run the command `Adamize: Configure Ollama`.
3. Configure the settings in the UI:
   - Select a provider (currently only Ollama is supported)
   - Choose a model from the dropdown (automatically populated from available models)
   - Configure the base URL and endpoint
   - Adjust temperature and max tokens
   - Customize the system prompt
4. Click "Save Configuration" to save the settings.
5. Use "Test Connection" to verify connectivity to Ollama.
6. Use "Refresh Models" to update the list of available models.

## Usage

### Starting Ollama

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Run the command `Adamize: Start Ollama`.
3. Ollama will start in a terminal window.

### Stopping Ollama

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Run the command `Adamize: Stop Ollama`.
3. Ollama will be stopped.

### Using Ollama Chat

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Run the command `Adamize: Open Ollama Chat`.
3. A chat window will open where you can interact with the local LLM through Ollama.

## Architecture

The Ollama integration consists of the following components:

### LLM Bridge Client

The `LLMBridgeClient` class in `src/mcp/bridge/llmClient.ts` is responsible for communicating with Ollama. It handles:

- Sending prompts to Ollama.
- Processing responses from Ollama.
- Extracting tool calls from responses.
- Managing conversation history.
- Starting and stopping Ollama.

### Ollama Configuration View

The `OllamaConfigViewProvider` class in `src/ui/ollamaConfigView.ts` provides a UI for configuring Ollama settings. It handles:

- Displaying the current Ollama configuration.
- Saving changes to the Ollama configuration.
- Testing the connection to Ollama.
- Dynamically loading and displaying available Ollama models.
- Supporting multiple LLM providers (framework in place).
- Providing a responsive grid-based UI with loading indicators.
- Automatically updating the endpoint URL based on the selected provider and base URL.

### MCP Bridge Integration

The Ollama integration is integrated with the MCP Bridge to enable local LLMs to use MCP tools. This is done through:

- The `MCPBridge` class in `src/mcp/mcpBridge.ts`.
- The `MCPBridgeManager` class in `src/mcp/mcpBridgeManager.ts`.
- The `MCPToolRegistry` class in `src/mcp/mcpToolRegistry.ts`.

## Troubleshooting

### Ollama Not Starting

If Ollama fails to start:

1. Check that Ollama is installed correctly.
2. Check that the Ollama executable is in your PATH.
3. Try starting Ollama manually from the command line:
   ```bash
   ollama serve
   ```

### Connection Issues

If Adamize fails to connect to Ollama:

1. Check that Ollama is running.
2. Check that the Ollama API is accessible at the configured URL.
3. Try accessing the Ollama API manually:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Model Issues

If Adamize fails to use a specific model:

1. Check that the model is pulled in Ollama:
   ```bash
   ollama list
   ```
2. If the model is not listed, pull it:
   ```bash
   ollama pull <model-name>
   ```

## Future Improvements

- **Streaming Responses**: Add support for streaming responses from Ollama.
- **Multiple Models**: Add support for using multiple models simultaneously.
- **Model Management**: Add UI for managing Ollama models (pulling, removing, etc.).
- **Advanced Configuration**: Add more advanced configuration options for Ollama.
- **Tool Integration**: Improve integration with MCP tools for more powerful local LLM capabilities.

## References

- [Ollama Documentation](https://ollama.ai/docs)
- [Model Context Protocol (MCP) Documentation](https://learn.microsoft.com/en/us/microsoft-copilot-studio/agent-extend-action-mcp)
- [Adamize Documentation](https://github.com/theinterneti/adamize)
