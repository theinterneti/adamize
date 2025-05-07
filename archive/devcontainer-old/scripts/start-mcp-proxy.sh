#!/bin/bash
set -e

echo "Starting MCP Proxy Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js."
    exit 1
fi

# Start the MCP proxy server in the background
nohup node /workspace/scripts/mcp_proxy.js > /tmp/mcp-proxy.log 2>&1 &

# Save the PID
echo $! > /tmp/mcp-proxy.pid

echo "MCP Proxy Server started with PID $(cat /tmp/mcp-proxy.pid)"
echo "Logs available at /tmp/mcp-proxy.log"
