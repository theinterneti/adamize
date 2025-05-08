/**
 * Enhanced MCP Client
 *
 * An enhanced client for interacting with Model-Control-Protocol (MCP) tools
 * that supports multiple connection methods and environments.
 */

import axios from 'axios';
import { exec } from 'child_process';
import * as vscode from 'vscode';
import { promisify } from 'util';
import { IMCPFunctionCallResult } from './mcpTypes';
// Commented out unused imports
// import { validateParameters, formatParameters } from './mcpUtils';
import networkConfig, { Environment, ServiceType } from '../utils/networkConfig';

// Promisify exec
const execPromise = promisify(exec);

/**
 * Connection method for MCP
 */
export enum ConnectionMethod {
  HTTP = 'http',
  DockerExec = 'docker-exec',
  LocalProcess = 'local-process'
}

/**
 * Enhanced MCP Client for interacting with MCP servers
 */
export class EnhancedMCPClient {
  private outputChannel: vscode.OutputChannel;
  // private toolSchemas: Record<string, any> = {};
  private serverUrl: string;
  private connectionMethod: ConnectionMethod;
  private containerName: string | null = null;
  private containerId: string | null = null;
  private requestId: number = 1;

  /**
   * Create a new Enhanced MCP client
   * @param serviceType The type of MCP service to connect to
   * @param connectionMethod Optional connection method (auto-detected if not provided)
   */
  constructor(
    private serviceType: ServiceType,
    connectionMethod?: ConnectionMethod
  ) {
    this.serverUrl = networkConfig.getServiceUrl(serviceType);
    this.connectionMethod = connectionMethod || this.detectConnectionMethod();
    this.outputChannel = vscode.window.createOutputChannel(`Adamize MCP Client: ${serviceType}`);

    // Always show output channel
    this.outputChannel.show();

    this.logDebug(`Created client for ${serviceType} using ${this.connectionMethod} method`);
    this.logDebug(`Server URL/Container: ${this.serverUrl}`);
  }

  /**
   * Detect the appropriate connection method based on environment and configuration
   */
  private detectConnectionMethod(): ConnectionMethod {
    const env = networkConfig.getCurrentEnvironment();

    // Check if MCP proxy is enabled
    if (process.env.MCP_PROXY_ENABLED === 'true') {
      return ConnectionMethod.HTTP;
    }

    // In development, prefer Docker exec for MCP containers
    if (env === Environment.Development) {
      // If the service URL looks like a container name (no protocol)
      if (!this.serverUrl.includes('://')) {
        this.containerName = this.serverUrl;
        return ConnectionMethod.DockerExec;
      }
    }

    // Default to HTTP
    return ConnectionMethod.HTTP;
  }

  /**
   * Log a debug message
   * @param message The message to log
   */
  private logDebug(message: string): void {
    this.outputChannel.appendLine(`[DEBUG] ${message}`);
  }

  /**
   * Log an info message
   * @param message The message to log
   */
  private logInfo(message: string): void {
    this.outputChannel.appendLine(`[INFO] ${message}`);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param error Optional error object
   */
  private logError(message: string, error?: Error | unknown): void {
    this.outputChannel.appendLine(`[ERROR] ${message}`);
    if (error) {
      this.outputChannel.appendLine(`Error details: ${error}`);
    }
  }

  /**
   * Connect to the MCP server
   * @returns True if connected successfully
   */
  public async connect(): Promise<boolean> {
    try {
      this.logInfo(`Connecting to MCP service (${this.serviceType}) using ${this.connectionMethod} method`);

      switch (this.connectionMethod) {
        case ConnectionMethod.HTTP:
          return await this.connectHttp();
        case ConnectionMethod.DockerExec:
          return await this.connectDockerExec();
        case ConnectionMethod.LocalProcess:
          return await this.connectLocalProcess();
        default:
          throw new Error(`Unsupported connection method: ${this.connectionMethod}`);
      }
    } catch (error) {
      this.logError(`Error connecting to MCP service: ${error}`);
      return false;
    }
  }

  /**
   * Connect to the MCP server using HTTP
   * @returns True if connected successfully
   */
  private async connectHttp(): Promise<boolean> {
    try {
      // Check if server is available
      const response = await axios.get(`${this.serverUrl}/connection`);

      if (response.status === 200) {
        this.logInfo('Connected to MCP server via HTTP');
        return true;
      } else {
        this.logError(`Failed to connect to MCP server: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logError(`Error connecting to MCP server via HTTP: ${error}`);
      return false;
    }
  }

  /**
   * Connect to the MCP server using Docker exec
   * @returns True if connected successfully
   */
  private async connectDockerExec(): Promise<boolean> {
    try {
      if (!this.containerName) {
        throw new Error('Container name is not set');
      }

      // Get container ID
      const { stdout } = await execPromise(
        `docker ps --filter ancestor=${this.containerName} --format "{{.ID}}"`
      );

      this.containerId = stdout.trim();

      if (!this.containerId) {
        this.logError(`No running container found for image ${this.containerName}`);
        return false;
      }

      this.logInfo(`Connected to MCP container ${this.containerName} (${this.containerId}) via Docker exec`);
      return true;
    } catch (error) {
      this.logError(`Error connecting to MCP container: ${error}`);
      return false;
    }
  }

  /**
   * Connect to the MCP server using a local process
   * @returns True if connected successfully
   */
  private async connectLocalProcess(): Promise<boolean> {
    // Not implemented yet
    this.logError('Local process connection method is not implemented yet');
    return false;
  }

  /**
   * Call a function on a tool
   * @param functionName The name of the function
   * @param parameters The function parameters
   * @returns The function call result
   */
  public async callFunction(
    functionName: string,
    parameters: Record<string, unknown>
  ): Promise<IMCPFunctionCallResult> {
    try {
      this.logInfo(`Calling function ${functionName} with method ${this.connectionMethod}`);

      switch (this.connectionMethod) {
        case ConnectionMethod.HTTP:
          return await this.callFunctionHttp(functionName, parameters);
        case ConnectionMethod.DockerExec:
          return await this.callFunctionDockerExec(functionName, parameters);
        case ConnectionMethod.LocalProcess:
          return await this.callFunctionLocalProcess(functionName, parameters);
        default:
          throw new Error(`Unsupported connection method: ${this.connectionMethod}`);
      }
    } catch (error) {
      this.logError(`Error calling function ${functionName}: ${error}`);

      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Call a function on a tool using HTTP
   * @param functionName The name of the function
   * @param parameters The function parameters
   * @returns The function call result
   */
  private async callFunctionHttp(
    functionName: string,
    parameters: Record<string, unknown>
  ): Promise<IMCPFunctionCallResult> {
    try {
      // Call function
      const response = await axios.post(`${this.serverUrl}/call`, {
        tool: this.containerName || this.serviceType,
        function: functionName,
        parameters,
      });

      const result = response.data;

      this.logInfo(`Function ${functionName} called successfully via HTTP`);

      return result;
    } catch (error) {
      this.logError(`Error calling function ${functionName} via HTTP: ${error}`);
      throw error;
    }
  }

  /**
   * Call a function on a tool using Docker exec
   * @param functionName The name of the function
   * @param parameters The function parameters
   * @returns The function call result
   */
  private async callFunctionDockerExec(
    functionName: string,
    parameters: Record<string, unknown>
  ): Promise<IMCPFunctionCallResult> {
    try {
      if (!this.containerId) {
        throw new Error('Container ID is not set. Did you call connect()?');
      }

      // Create JSON-RPC request
      const request = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: functionName,
        params: parameters
      };

      // Convert request to JSON
      const requestJson = JSON.stringify(request);

      // Call the tool using docker exec
      const cmd = `docker exec -i ${this.containerId} sh -c "echo '${requestJson}' | node dist/index.js"`;
      const { stdout, stderr } = await execPromise(cmd);

      if (stderr) {
        this.logError(`Error from container:`, stderr);
      }

      // Parse response
      const response = JSON.parse(stdout);

      this.logInfo(`Function ${functionName} called successfully via Docker exec`);

      return {
        status: 'success',
        result: response.result
      };
    } catch (error) {
      this.logError(`Error calling function ${functionName} via Docker exec: ${error}`);
      throw error;
    }
  }

  /**
   * Call a function on a tool using a local process
   * @param functionName The name of the function
   * @param parameters The function parameters
   * @returns The function call result
   */
  private async callFunctionLocalProcess(
    _functionName: string,
    _parameters: Record<string, unknown>
  ): Promise<IMCPFunctionCallResult> {
    // Not implemented yet
    this.logError('Local process connection method is not implemented yet');
    return {
      status: 'error',
      error: 'Local process connection method is not implemented yet'
    };
  }
}
