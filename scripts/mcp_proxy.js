/**
 * MCP Proxy Server
 *
 * This script creates a simple HTTP server that proxies requests to MCP containers
 * using JSON-RPC over stdin/stdout.
 */

const http = require('http');
const { exec } = require('child_process');
const util = require('util');

// Promisify exec
const execPromise = util.promisify(exec);

// Configuration
const PORT = process.env.MCP_PROXY_PORT || 8000;
const DEFAULT_CONTAINER = process.env.MCP_DEFAULT_CONTAINER || 'mcp/neo4j-memory';
const HOST_DOCKER_INTERNAL = process.env.HOST_DOCKER_INTERNAL || 'host.docker.internal';

// Container cache
const containerCache = {};

/**
 * Get container ID by image name
 * @param {string} imageName - Docker image name
 * @returns {Promise<string>} - Container ID
 */
async function getContainerId(imageName) {
  // Check cache first
  if (containerCache[imageName]) {
    return containerCache[imageName];
  }

  try {
    const { stdout } = await execPromise(`docker ps --filter ancestor=${imageName} --format "{{.ID}}"`);
    const containerId = stdout.trim();

    if (!containerId) {
      throw new Error(`No running container found for image ${imageName}`);
    }

    // Cache the result
    containerCache[imageName] = containerId;
    return containerId;
  } catch (error) {
    console.error(`Error getting container ID for ${imageName}:`, error);
    throw error;
  }
}

/**
 * Call MCP tool using JSON-RPC over stdin/stdout
 * @param {string} containerId - Docker container ID
 * @param {string} method - JSON-RPC method
 * @param {object} params - JSON-RPC parameters
 * @returns {Promise<object>} - JSON-RPC response
 */
async function callMcpTool(containerId, method, params) {
  try {
    // Create JSON-RPC request
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    // Convert request to JSON
    const requestJson = JSON.stringify(request);

    // Call the tool using docker exec
    const cmd = `docker exec -i ${containerId} sh -c "echo '${requestJson}' | node dist/index.js"`;
    const { stdout, stderr } = await execPromise(cmd);

    if (stderr) {
      console.error(`Error from container:`, stderr);
    }

    // Parse response
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Error calling MCP tool:`, error);
    throw error;
  }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Only handle POST requests to /call
  if (req.method === 'POST' && req.url === '/call') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // Parse request body
        const { tool, function: functionName, parameters } = JSON.parse(body);

        // Get container ID
        const containerId = await getContainerId(tool || DEFAULT_CONTAINER);

        // Call MCP tool
        const response = await callMcpTool(containerId, functionName, parameters);

        // Send response
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('Error processing request:', error);

        // Send error response
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({
          status: 'error',
          error: error.message
        }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/connection') {
    // Handle connection check
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    // Handle unknown routes
    res.statusCode = 404;
    res.end('Not Found');
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`MCP Proxy Server running at http://localhost:${PORT}`);
  console.log(`Default container: ${DEFAULT_CONTAINER}`);
});
