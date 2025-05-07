/**
 * @file Type definitions for MCP Bridge components
 * @description Type definitions for the MCP Bridge components adapted from ollama-mcp-bridge
 * 
 * @requirement REQ-MCP-040 Integrate with local LLM providers via MCP bridge
 * @requirement REQ-MCP-041 Support multiple MCP servers for different tool types
 */

/**
 * Configuration for an MCP server
 */
export interface MCPServerConfig {
    /**
     * Name of the MCP server
     */
    name: string;
    
    /**
     * Command to run the MCP server
     */
    command: string;
    
    /**
     * Arguments to pass to the command
     */
    args?: string[];
    
    /**
     * Directory to run the command in
     */
    allowedDirectory?: string;
    
    /**
     * Environment variables to set for the command
     */
    env?: Record<string, string>;
}

/**
 * Configuration for an LLM provider
 */
export interface LLMConfig {
    /**
     * Model to use
     */
    model: string;
    
    /**
     * Base URL for the LLM provider
     */
    baseUrl: string;
    
    /**
     * Provider type (ollama, huggingface, etc.)
     */
    provider?: string;
    
    /**
     * Temperature for the LLM
     */
    temperature?: number;
    
    /**
     * Maximum tokens to generate
     */
    maxTokens?: number;
    
    /**
     * API key for the LLM provider
     */
    apiKey?: string;
}

/**
 * Configuration for the MCP Bridge
 */
export interface MCPBridgeConfig {
    /**
     * Primary MCP server configuration
     */
    mcpServer: MCPServerConfig;
    
    /**
     * Name of the primary MCP server
     */
    mcpServerName: string;
    
    /**
     * LLM configuration
     */
    llmConfig: LLMConfig;
    
    /**
     * Additional MCP servers
     */
    mcpServers?: Record<string, MCPServerConfig>;
}

/**
 * Tool definition
 */
export interface MCPTool {
    /**
     * Name of the tool
     */
    name: string;
    
    /**
     * Description of the tool
     */
    description?: string;
    
    /**
     * Input schema for the tool
     */
    inputSchema?: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

/**
 * Tool metadata
 */
export interface MCPToolMetadata {
    /**
     * Keywords for tool detection
     */
    keywords: string[];
    
    /**
     * Example arguments for the tool
     */
    exampleArgs: Record<string, any>;
    
    /**
     * Format instructions for the tool
     */
    formatInstructions: string;
}

/**
 * Tool registry
 */
export interface ToolRegistry {
    [toolName: string]: MCPToolMetadata;
}

/**
 * LLM response
 */
export interface LLMResponse {
    /**
     * Content of the response
     */
    content: string;
    
    /**
     * Whether the response is a tool call
     */
    isToolCall: boolean;
    
    /**
     * Tool calls in the response
     */
    toolCalls?: Array<{
        id: string;
        function: {
            name: string;
            arguments: string;
        };
    }>;
}

/**
 * Tool call result
 */
export interface ToolCallResult {
    /**
     * ID of the tool call
     */
    tool_call_id: string;
    
    /**
     * Output of the tool call
     */
    output: string;
}
