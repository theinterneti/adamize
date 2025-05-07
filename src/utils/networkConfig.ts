/**
 * Network Configuration Utility
 *
 * This module provides utilities for managing network connections across different environments.
 */

import * as vscode from 'vscode';
import * as os from 'os';

// Environment types
export enum Environment {
  Development = 'development',
  Testing = 'testing',
  Production = 'production'
}

// Service types
export enum ServiceType {
  Augment = 'augment',
  ChromaDB = 'chromadb',
  MCPMemory = 'mcp-memory',
  MCPNeo4jMemory = 'mcp-neo4j-memory'
}

/**
 * Get the current environment
 * @returns The current environment
 */
export function getCurrentEnvironment(): Environment {
  // Check environment variable first
  const envVar = process.env.ADAMIZE_ENV;
  const nodeEnv = process.env.NODE_ENV;
  const nodeEnvDev = process.env.NODE_ENV_DEV;

  // Log environment variables if debug is enabled
  if (process.env.DEBUG) {
    console.log('Environment variables:');
    console.log(`ADAMIZE_ENV: ${envVar}`);
    console.log(`NODE_ENV: ${nodeEnv}`);
    console.log(`NODE_ENV_DEV: ${nodeEnvDev}`);
  }

  // Check for development environment
  if (envVar === 'development' || nodeEnv === 'development' || nodeEnvDev === 'true') {
    return Environment.Development;
  }

  // Check for testing environment
  if (envVar === 'testing' || nodeEnv === 'testing') {
    return Environment.Testing;
  }

  // Check for production environment
  if (envVar === 'production' || nodeEnv === 'production') {
    return Environment.Production;
  }

  // Check VS Code settings
  const config = vscode.workspace.getConfiguration('adamize');
  const configEnv = config.get<string>('environment');
  if (configEnv) {
    if (configEnv === 'development') return Environment.Development;
    if (configEnv === 'testing') return Environment.Testing;
    if (configEnv === 'production') return Environment.Production;
  }

  // Default to development
  return Environment.Development;
}

/**
 * Get the URL for a service
 * @param serviceType The type of service
 * @returns The URL for the service
 */
export function getServiceUrl(serviceType: ServiceType): string {
  const env = getCurrentEnvironment();
  const config = vscode.workspace.getConfiguration('adamize');

  // Debug logging
  const debug = process.env.DEBUG || process.env.AUGMENT_DEBUG;
  if (debug) {
    console.log(`Getting service URL for ${serviceType} in ${env} environment`);
  }

  // Check for service-specific override in settings
  const serviceConfig = config.get<Record<string, string>>('services');
  if (serviceConfig && serviceConfig[serviceType]) {
    const url = serviceConfig[serviceType];
    if (debug) console.log(`Using service URL from settings: ${url}`);
    return url;
  }

  // Check for environment variables
  let envUrl: string | undefined;
  switch (serviceType) {
    case ServiceType.Augment:
      envUrl = process.env.AUGMENT_HOST;
      if (envUrl) {
        if (debug) console.log(`Using Augment URL from environment: ${envUrl}`);
        return envUrl;
      }
      break;
    case ServiceType.ChromaDB:
      envUrl = process.env.CHROMA_HOST;
      if (envUrl) {
        if (debug) console.log(`Using ChromaDB URL from environment: ${envUrl}`);
        return envUrl;
      }
      break;
    case ServiceType.MCPMemory:
      // For MCP containers, we return the container name, not a URL
      envUrl = process.env.MCP_MEMORY_CONTAINER;
      if (envUrl) {
        if (debug) console.log(`Using MCP Memory container from environment: ${envUrl}`);
        return envUrl;
      }
      break;
    case ServiceType.MCPNeo4jMemory:
      envUrl = process.env.MCP_NEO4J_MEMORY_CONTAINER;
      if (envUrl) {
        if (debug) console.log(`Using MCP Neo4j Memory container from environment: ${envUrl}`);
        return envUrl;
      }
      break;
  }

  // Default URLs based on environment
  let url: string;
  switch (env) {
    case Environment.Development:
      url = getDevServiceUrl(serviceType);
      break;
    case Environment.Testing:
      url = getTestServiceUrl(serviceType);
      break;
    case Environment.Production:
      url = getProdServiceUrl(serviceType);
      break;
    default:
      url = getDevServiceUrl(serviceType);
  }

  if (debug) console.log(`Using default URL for ${env} environment: ${url}`);
  return url;
}

/**
 * Get the URL for a service in development environment
 * @param serviceType The type of service
 * @returns The URL for the service
 */
function getDevServiceUrl(serviceType: ServiceType): string {
  // Get host.docker.internal from environment variable or use default
  const hostDockerInternal = process.env.HOST_DOCKER_INTERNAL || 'host.docker.internal';

  switch (serviceType) {
    case ServiceType.Augment:
      return `http://${hostDockerInternal}:8000`;
    case ServiceType.ChromaDB:
      return 'http://chroma:8000';
    case ServiceType.MCPMemory:
      return 'mcp/memory';
    case ServiceType.MCPNeo4jMemory:
      return 'mcp/neo4j-memory';
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

/**
 * Get the URL for a service in testing environment
 * @param serviceType The type of service
 * @returns The URL for the service
 */
function getTestServiceUrl(serviceType: ServiceType): string {
  switch (serviceType) {
    case ServiceType.Augment:
      return 'http://augment-test:8000';
    case ServiceType.ChromaDB:
      return 'http://chroma-test:8000';
    case ServiceType.MCPMemory:
      return 'mcp/memory-test';
    case ServiceType.MCPNeo4jMemory:
      return 'mcp/neo4j-memory-test';
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

/**
 * Get the URL for a service in production environment
 * @param serviceType The type of service
 * @returns The URL for the service
 */
function getProdServiceUrl(serviceType: ServiceType): string {
  switch (serviceType) {
    case ServiceType.Augment:
      return 'https://api.augment.dev';
    case ServiceType.ChromaDB:
      return 'http://chroma:8000';
    case ServiceType.MCPMemory:
      return 'mcp/memory-prod';
    case ServiceType.MCPNeo4jMemory:
      return 'mcp/neo4j-memory-prod';
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

/**
 * Check if a service is available
 * @param serviceType The type of service
 * @returns True if the service is available
 */
export async function isServiceAvailable(serviceType: ServiceType): Promise<boolean> {
  try {
    const url = getServiceUrl(serviceType);

    // For MCP containers, check if the container is running
    if (serviceType === ServiceType.MCPMemory || serviceType === ServiceType.MCPNeo4jMemory) {
      // This would need to be implemented with Docker API or exec
      return true; // Placeholder
    }

    // For HTTP services, try to connect
    // This would need to be implemented with fetch or axios
    return true; // Placeholder
  } catch (error) {
    return false;
  }
}

/**
 * Get the MCP container ID for a service
 * @param containerName The name of the container
 * @returns The container ID
 */
export async function getMcpContainerId(containerName: string): Promise<string> {
  // This would need to be implemented with Docker API or exec
  return ''; // Placeholder
}

export default {
  getCurrentEnvironment,
  getServiceUrl,
  isServiceAvailable,
  getMcpContainerId,
  Environment,
  ServiceType
};
