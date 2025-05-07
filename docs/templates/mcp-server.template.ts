/**
 * MCP Server Template
 * 
 * This template provides a structure for implementing an MCP server that can:
 * 1. Expose tools to MCP clients
 * 2. Handle tool discovery requests
 * 3. Execute tool functions
 * 4. Return results to clients
 * 
 * Note: This is for informational purposes only, as our project will be implementing
 * an MCP client, not a server. However, understanding the server structure helps
 * in implementing a compatible client.
 */

import * as readline from 'readline';
import * as http from 'http';
import * as express from 'express';

/**
 * MCP Tool Definition
 */
export interface IMCPTool {
  /** Tool name */
  name: string;
  
  /** Tool description */
  description: string;
  
  /** Tool functions */
  functions: IMCPFunction[];
}

/**
 * MCP Function Definition
 */
export interface IMCPFunction {
  /** Function name */
  name: string;
  
  /** Function description */
  description: string;
  
  /** Function parameters */
  parameters: IMCPParameter[];
  
  /** Function implementation */
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * MCP Parameter Definition
 */
export interface IMCPParameter {
  /** Parameter name */
  name: string;
  
  /** Parameter description */
  description: string;
  
  /** Parameter type */
  type: string;
  
  /** Whether parameter is required */
  required: boolean;
  
  /** Default value */
  defaultValue?: unknown;
}

/**
 * MCP JSON-RPC Request
 */
export interface IMCPJsonRpcRequest {
  /** JSON-RPC version */
  jsonrpc: '2.0';
  
  /** Request ID */
  id?: string | number;
  
  /** Method name */
  method: string;
  
  /** Method parameters */
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC Response
 */
export interface IMCPJsonRpcResponse {
  /** JSON-RPC version */
  jsonrpc: '2.0';
  
  /** Request ID */
  id: string | number;
  
  /** Response result */
  result?: unknown;
  
  /** Response error */
  error?: {
    /** Error code */
    code: number;
    
    /** Error message */
    message: string;
    
    /** Error data */
    data?: unknown;
  };
}

/**
 * MCP JSON-RPC Notification
 */
export interface IMCPJsonRpcNotification {
  /** JSON-RPC version */
  jsonrpc: '2.0';
  
  /** Method name */
  method: string;
  
  /** Method parameters */
  params?: Record<string, unknown>;
}

/**
 * MCP Server Base Class
 */
export abstract class MCPServerBase {
  /** Server tools */
  protected tools: IMCPTool[] = [];
  
  /** Server name */
  protected name: string;
  
  /** Server version */
  protected version: string;
  
  /**
   * Create a new MCP server
   * @param name Server name
   * @param version Server version
   */
  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }
  
  /**
   * Register a tool with the server
   * @param tool Tool to register
   */
  public registerTool(tool: IMCPTool): void {
    this.tools.push(tool);
    console.log(`Registered tool: ${tool.name}`);
  }
  
  /**
   * Handle a JSON-RPC request
   * @param request JSON-RPC request
   * @returns JSON-RPC response
   */
  protected async handleRequest(request: IMCPJsonRpcRequest): Promise<IMCPJsonRpcResponse> {
    try {
      // Check if request is valid
      if (request.jsonrpc !== '2.0') {
        return this.createErrorResponse(request.id, -32600, 'Invalid Request: Not JSON-RPC 2.0');
      }
      
      // Handle request based on method
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        case 'listTools':
          return this.handleListTools(request);
        case 'getToolSchema':
          return this.handleGetToolSchema(request);
        case 'callFunction':
          return this.handleCallFunction(request);
        default:
          return this.createErrorResponse(request.id, -32601, `Method not found: ${request.method}`);
      }
    } catch (error) {
      console.error('Error handling request:', error);
      return this.createErrorResponse(
        request.id,
        -32603,
        `Internal error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Handle initialize request
   * @param request JSON-RPC request
   * @returns JSON-RPC response
   */
  protected handleInitialize(request: IMCPJsonRpcRequest): IMCPJsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id: request.id!,
      result: {
        name: this.name,
        version: this.version,
        capabilities: {
          tools: true
        }
      }
    };
  }
  
  /**
   * Handle listTools request
   * @param request JSON-RPC request
   * @returns JSON-RPC response
   */
  protected handleListTools(request: IMCPJsonRpcRequest): IMCPJsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id: request.id!,
      result: {
        tools: this.tools.map(tool => ({
          name: tool.name,
          description: tool.description
        }))
      }
    };
  }
  
  /**
   * Handle getToolSchema request
   * @param request JSON-RPC request
   * @returns JSON-RPC response
   */
  protected handleGetToolSchema(request: IMCPJsonRpcRequest): IMCPJsonRpcResponse {
    const toolName = request.params?.toolName as string;
    
    if (!toolName) {
      return this.createErrorResponse(request.id, -32602, 'Invalid params: toolName is required');
    }
    
    const tool = this.tools.find(t => t.name === toolName);
    
    if (!tool) {
      return this.createErrorResponse(request.id, -32602, `Tool not found: ${toolName}`);
    }
    
    return {
      jsonrpc: '2.0',
      id: request.id!,
      result: {
        name: tool.name,
        description: tool.description,
        functions: tool.functions.map(fn => ({
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        }))
      }
    };
  }
  
  /**
   * Handle callFunction request
   * @param request JSON-RPC request
   * @returns JSON-RPC response
   */
  protected async handleCallFunction(request: IMCPJsonRpcRequest): Promise<IMCPJsonRpcResponse> {
    const toolName = request.params?.toolName as string;
    const functionName = request.params?.functionName as string;
    const parameters = request.params?.parameters as Record<string, unknown>;
    
    if (!toolName) {
      return this.createErrorResponse(request.id, -32602, 'Invalid params: toolName is required');
    }
    
    if (!functionName) {
      return this.createErrorResponse(request.id, -32602, 'Invalid params: functionName is required');
    }
    
    const tool = this.tools.find(t => t.name === toolName);
    
    if (!tool) {
      return this.createErrorResponse(request.id, -32602, `Tool not found: ${toolName}`);
    }
    
    const fn = tool.functions.find(f => f.name === functionName);
    
    if (!fn) {
      return this.createErrorResponse(request.id, -32602, `Function not found: ${functionName}`);
    }
    
    try {
      // Validate parameters
      this.validateParameters(fn.parameters, parameters || {});
      
      // Execute function
      const result = await fn.execute(parameters || {});
      
      return {
        jsonrpc: '2.0',
        id: request.id!,
        result
      };
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        -32602,
        `Error executing function: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Validate parameters against function schema
   * @param parameterSchemas Parameter schemas
   * @param parameters Parameters to validate
   */
  protected validateParameters(
    parameterSchemas: IMCPParameter[],
    parameters: Record<string, unknown>
  ): void {
    // Check for required parameters
    for (const schema of parameterSchemas) {
      if (schema.required && !(schema.name in parameters)) {
        throw new Error(`Missing required parameter: ${schema.name}`);
      }
    }
    
    // Check parameter types
    for (const [name, value] of Object.entries(parameters)) {
      const schema = parameterSchemas.find(p => p.name === name);
      
      if (!schema) {
        throw new Error(`Unknown parameter: ${name}`);
      }
      
      // Type validation would go here
    }
  }
  
  /**
   * Create an error response
   * @param id Request ID
   * @param code Error code
   * @param message Error message
   * @param data Error data
   * @returns JSON-RPC error response
   */
  protected createErrorResponse(
    id: string | number | undefined,
    code: number,
    message: string,
    data?: unknown
  ): IMCPJsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: {
        code,
        message,
        data
      }
    };
  }
  
  /**
   * Send a notification to the client
   * @param method Notification method
   * @param params Notification parameters
   */
  protected sendNotification(method: string, params?: Record<string, unknown>): void {
    const notification: IMCPJsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params
    };
    
    this.sendMessage(notification);
  }
  
  /**
   * Send a message to the client
   * @param message Message to send
   */
  protected abstract sendMessage(message: unknown): void;
  
  /**
   * Start the server
   */
  public abstract start(): void;
  
  /**
   * Stop the server
   */
  public abstract stop(): void;
}

/**
 * MCP Stdio Server
 */
export class MCPStdioServer extends MCPServerBase {
  private rl: readline.Interface;
  
  /**
   * Create a new MCP stdio server
   * @param name Server name
   * @param version Server version
   */
  constructor(name: string, version: string) {
    super(name, version);
    
    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  
  /**
   * Start the server
   */
  public start(): void {
    console.log(`Starting MCP stdio server: ${this.name} v${this.version}`);
    
    // Handle input
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line) as IMCPJsonRpcRequest;
        const response = await this.handleRequest(request);
        this.sendMessage(response);
      } catch (error) {
        console.error('Error processing request:', error);
        
        // Send error response
        this.sendMessage({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`
          }
        });
      }
    });
  }
  
  /**
   * Stop the server
   */
  public stop(): void {
    this.rl.close();
  }
  
  /**
   * Send a message to the client
   * @param message Message to send
   */
  protected sendMessage(message: unknown): void {
    console.log(JSON.stringify(message));
  }
}

/**
 * MCP SSE Server
 */
export class MCPSseServer extends MCPServerBase {
  private app: express.Express;
  private server: http.Server;
  private clients: Map<string, express.Response> = new Map();
  
  /**
   * Create a new MCP SSE server
   * @param name Server name
   * @param version Server version
   * @param port Server port
   */
  constructor(name: string, version: string, private port: number = 3000) {
    super(name, version);
    
    // Create Express app
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Configure Express
    this.app.use(express.json());
    
    // Set up routes
    this.setupRoutes();
  }
  
  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // SSE endpoint
    this.app.get('/sse', (req, res) => {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Generate client ID
      const clientId = Date.now().toString();
      
      // Store client
      this.clients.set(clientId, res);
      
      // Handle client disconnect
      req.on('close', () => {
        this.clients.delete(clientId);
      });
    });
    
    // Message endpoint
    this.app.post('/message', async (req, res) => {
      try {
        const request = req.body as IMCPJsonRpcRequest;
        const response = await this.handleRequest(request);
        res.json(response);
      } catch (error) {
        res.status(400).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`
          }
        });
      }
    });
  }
  
  /**
   * Start the server
   */
  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`MCP SSE server started on port ${this.port}`);
    });
  }
  
  /**
   * Stop the server
   */
  public stop(): void {
    this.server.close();
  }
  
  /**
   * Send a message to all clients
   * @param message Message to send
   */
  protected sendMessage(message: unknown): void {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    
    for (const client of this.clients.values()) {
      client.write(data);
    }
  }
}
