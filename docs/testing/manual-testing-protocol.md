# Manual Testing Protocol for Adamize

This document outlines the manual testing protocol for the Adamize VS Code extension, focusing on the integration between MCP Bridge and Ollama.

## Prerequisites

Before starting the manual testing, ensure you have:

1. Ollama installed and running locally
2. At least one model pulled in Ollama (e.g., `qwen3-coder`)
3. VS Code with the Adamize extension installed
4. A clean workspace for testing

## Test Scenarios

### 1. Extension Activation

**Objective**: Verify that the extension activates correctly.

**Steps**:
1. Open VS Code with the Adamize extension installed
2. Check the Output panel for "Adamize" channel
3. Verify that the extension has activated without errors

**Expected Results**:
- The extension should activate without errors
- The Output panel should show initialization messages
- The Adamize icon should appear in the Activity Bar

### 2. Ollama Integration

**Objective**: Verify that the extension can connect to Ollama and manage models.

**Steps**:
1. Click on the Adamize icon in the Activity Bar
2. Verify that the Model Manager view shows available Ollama models
3. Click "Refresh Models" to update the model list
4. Try pulling a new model using the "Pull Ollama Model" command
5. Try removing a model using the context menu

**Expected Results**:
- The Model Manager should display available Ollama models
- Pulling a new model should work and show progress
- Removing a model should work and update the model list

### 3. MCP Bridge Creation

**Objective**: Verify that the extension can create and manage MCP bridges.

**Steps**:
1. Open the Command Palette (Ctrl+Shift+P)
2. Run the "Adamize: Open Ollama Chat" command
3. Verify that a new MCP bridge is created for Ollama
4. Check the MCP Server Explorer view to see the bridge

**Expected Results**:
- A new MCP bridge should be created for Ollama
- The bridge should appear in the MCP Server Explorer view
- The bridge status should be "running"

### 4. Chat Interface

**Objective**: Verify that the chat interface works correctly with Ollama.

**Steps**:
1. Open the Ollama Chat using the "Adamize: Open Ollama Chat" command
2. Send a simple message like "Hello, how are you?"
3. Verify that the LLM responds appropriately
4. Send a more complex message that might trigger tool usage
5. Clear the conversation and start a new one

**Expected Results**:
- The chat interface should display user messages and LLM responses
- Messages should be streamed with visible progress indicators
- Tool calls should be displayed with their results
- Clearing the conversation should work correctly

### 5. Tool Discovery and Execution

**Objective**: Verify that tools are discovered and can be executed.

**Steps**:
1. Open the MCP Server Explorer view
2. Expand a running MCP bridge to see available tools
3. Click on a tool to view its details
4. In the chat interface, send a message that should trigger a tool call
   (e.g., "What models are available?")

**Expected Results**:
- The MCP Server Explorer should show available tools
- Tool details should display the schema and description
- The chat interface should show tool calls and their results

### 6. Streaming Responses

**Objective**: Verify that streaming responses work correctly.

**Steps**:
1. Open the Ollama Chat
2. Send a message that should generate a long response
   (e.g., "Write a detailed explanation of how LLMs work")
3. Observe the response as it streams in

**Expected Results**:
- The response should stream in chunks with visible progress
- The UI should update smoothly as new content arrives
- The final response should be complete and formatted correctly

### 7. Error Handling

**Objective**: Verify that errors are handled gracefully.

**Steps**:
1. Stop the Ollama server using the "Adamize: Stop Ollama Server" command
2. Try to send a message in the chat interface
3. Restart the Ollama server using the "Adamize: Start Ollama Server" command
4. Try sending a message again

**Expected Results**:
- The extension should display an appropriate error message when Ollama is not running
- After restarting Ollama, the chat should work correctly again

### 8. Configuration Changes

**Objective**: Verify that configuration changes are applied correctly.

**Steps**:
1. Open the VS Code settings (File > Preferences > Settings)
2. Search for "adamize.ollama"
3. Change the model to a different one (e.g., from "qwen3-coder" to "llama2")
4. Open a new chat and send a message

**Expected Results**:
- The new model should be used for the chat
- The response should reflect the capabilities of the new model

## Reporting Issues

When reporting issues found during manual testing, please include:

1. The test scenario and steps that revealed the issue
2. Expected vs. actual behavior
3. Any error messages or logs
4. Screenshots if applicable
5. Environment details (OS, VS Code version, Ollama version, etc.)

## Test Tracking

Use the following table to track test results:

| Test Scenario | Status | Notes |
|---------------|--------|-------|
| Extension Activation | | |
| Ollama Integration | | |
| MCP Bridge Creation | | |
| Chat Interface | | |
| Tool Discovery and Execution | | |
| Streaming Responses | | |
| Error Handling | | |
| Configuration Changes | | |
