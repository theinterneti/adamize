# Model Context Protocol (MCP) Research

## Overview

The Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to Large Language Models (LLMs). It creates a standardized way for AI models to interact with external tools, applications, and data sources. MCP follows a client-server architecture where a host application can connect to multiple servers.

Key components:
- **MCP Hosts**: Programs like Claude Desktop, IDEs, or AI tools that want to access data through MCP
- **MCP Clients**: Protocol clients that maintain 1:1 connections with servers
- **MCP Servers**: Lightweight programs that expose specific capabilities through the standardized Model Context Protocol
- **Local Data Sources**: Computer files, databases, and services that MCP servers can securely access
- **Remote Services**: External systems available over the internet that MCP servers can connect to

## Core Architecture

MCP follows a client-server architecture:
- **Protocol Layer**: Handles message framing, request/response linking, and high-level communication patterns
- **Transport Layer**: Handles the actual communication between clients and servers
- **Message Types**: Requests, Results, Errors, and Notifications

### Connection Lifecycle

1. **Initialization**:
   - Client sends `initialize` request with protocol version and capabilities
   - Server responds with its protocol version and capabilities
   - Client sends `initialized` notification as acknowledgment
   - Normal message exchange begins

2. **Message Exchange**:
   - Request-Response: Client or server sends requests, the other responds
   - Notifications: Either party sends one-way messages

3. **Termination**:
   - Clean shutdown via `close()`
   - Transport disconnection
   - Error conditions

## Transport Types

MCP supports multiple transport mechanisms:

1. **Standard Input/Output (stdio)**:
   - Uses standard input/output for communication
   - Ideal for local processes
   - Simple process management

2. **HTTP with Server-Sent Events (SSE)**:
   - Uses Server-Sent Events for server-to-client messages
   - HTTP POST for client-to-server messages
   - Works well with web-based applications

All transports use JSON-RPC 2.0 to exchange messages.

## MCP Capabilities

MCP servers can provide three main types of capabilities:

1. **Tools**: Functions that can be called to perform actions
2. **Prompts**: Reusable prompt templates
3. **Resources**: Data and content that can be accessed

Currently, VS Code only supports the `tools` capability in its MCP integration.

## VS Code MCP Integration

VS Code provides built-in support for MCP servers through GitHub Copilot's agent mode. The integration allows you to:

1. **Configure MCP Servers**: Add servers in workspace settings (`.vscode/mcp.json`) or user settings
2. **Discover Available Tools**: View and select tools provided by MCP servers
3. **Use Tools in Agent Mode**: Invoke tools automatically or explicitly in chat

### Configuration Format

VS Code supports configuring MCP servers in the following ways:

1. **Workspace Settings**: Add a `.vscode/mcp.json` file with server configurations
2. **User Settings**: Configure servers in the `mcp.servers` setting
3. **Automatic Discovery**: Discover servers configured in other tools like Claude Desktop

The configuration format follows this structure:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "api-key",
      "description": "API Key",
      "password": true
    }
  ],
  "servers": {
    "server-name": {
      "type": "stdio",
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value",
        "API_KEY": "${input:api-key}"
      }
    },
    "remote-server": {
      "type": "sse",
      "url": "http://server-url",
      "headers": {
        "Authorization": "Bearer ${input:api-key}"
      }
    }
  }
}
```

### Server Types

#### stdio Servers

For local processes, VS Code supports stdio servers with the following configuration:

```json
{
  "type": "stdio",
  "command": "command-to-run",
  "args": ["arg1", "arg2"],
  "env": {
    "ENV_VAR": "value"
  },
  "envFile": "path/to/.env"
}
```

- `command`: The command to run (required)
- `args`: Array of command arguments (optional)
- `env`: Environment variables for the process (optional)
- `envFile`: Path to a .env file to load additional environment variables (optional)

#### SSE Servers

For remote servers, VS Code supports SSE servers with the following configuration:

```json
{
  "type": "sse",
  "url": "http://server-url",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

- `url`: The URL of the SSE endpoint (required)
- `headers`: HTTP headers to include in requests (optional)

### Input Variables

VS Code supports input variables to avoid hardcoding sensitive information like API keys:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "api-key",
      "description": "API Key",
      "password": true
    }
  ],
  "servers": {
    "server-name": {
      "env": {
        "API_KEY": "${input:api-key}"
      }
    }
  }
}
```

When a server is started for the first time, VS Code prompts the user for the input values and securely stores them for subsequent use.

### Security Considerations

When using MCP servers:
- MCP servers can run arbitrary code on your machine
- Only add servers from trusted sources
- Review server configurations before starting
- Use input variables for sensitive information instead of hardcoding
- For SSE transports, validate Origin headers to prevent DNS rebinding attacks
- For local SSE servers, bind only to localhost (127.0.0.1) instead of all interfaces (0.0.0.0)

## Implementing MCP in Adamize

For our Adamize VS Code extension, we need to implement:

1. **MCP Manager**: Central component for managing MCP server configurations and connections
   - Read configurations from settings.json
   - Handle environment variables and input variables
   - Start, stop, and restart servers
   - Provide a unified interface for the rest of the application

2. **MCP Client**: Component for interacting with MCP servers
   - Connect to MCP servers (both stdio and SSE)
   - Discover available tools
   - Call functions on tools
   - Handle responses and errors

3. **VS Code Integration**: UI components for interacting with MCP
   - Commands for managing servers
   - Views for displaying server status and tools
   - Integration with the chat interface

### Implementation Plan

1. **Create MCP Manager**:
   - Implement `MCPManager` class to read and manage server configurations
   - Support both workspace and user settings
   - Handle input variables and environment variables

2. **Enhance MCP Client**:
   - Extend existing `MCPClient` class to support both stdio and SSE transports
   - Implement proper message handling for JSON-RPC
   - Add support for tool discovery and function calls

3. **Add VS Code Commands**:
   - `mcp.listServers`: List all configured servers
   - `mcp.startServer`: Start a server
   - `mcp.stopServer`: Stop a server
   - `mcp.restartServer`: Restart a server

4. **Create UI Components**:
   - Server status view
   - Tool selection interface
   - Integration with chat interface

## References

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [VS Code MCP Servers Documentation](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
- [MCP GitHub Repository](https://github.com/modelcontextprotocol)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
