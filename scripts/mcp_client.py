#!/usr/bin/env python3
"""
MCP Client

A simple client for interacting with MCP servers.
"""

import json
import subprocess
import sys
import os
import argparse
from typing import Dict, Any, List, Optional

class MCPClient:
    """Client for interacting with MCP servers."""

    def __init__(self, container_id: str):
        """Initialize the MCP client.

        Args:
            container_id: The ID or name of the MCP container
        """
        self.container_id = container_id
        self.request_id = 0
        self.initialize()

    def initialize(self):
        """Initialize the connection to the MCP server."""
        # Send handshake request
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": "handshake",
            "params": {
                "version": "2024-11-05",
                "capabilities": {
                    "transports": ["stdio"]
                }
            }
        }
        self.request_id += 1

        response = self._send_request(request)
        print("Handshake response:", json.dumps(response, indent=2))

        # Send server info request
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": "server_info_request",
            "params": {}
        }
        self.request_id += 1

        response = self._send_request(request)
        print("Server info response:", json.dumps(response, indent=2))

    def _send_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Send a request to the MCP server.

        Args:
            request: The request to send

        Returns:
            The response from the server
        """
        # Convert request to JSON
        request_json = json.dumps(request)

        # Call the tool using docker exec
        cmd = [
            "docker", "exec", "-i", self.container_id,
            "sh", "-c", f"echo '{request_json}' | node dist/index.js"
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )

            # Parse the response
            response_lines = result.stdout.strip().split("\n")
            for line in response_lines:
                if line.startswith("{"):
                    try:
                        response = json.loads(line)
                        return response
                    except json.JSONDecodeError:
                        continue

            raise Exception(f"Failed to parse response: {result.stdout}")
        except subprocess.CalledProcessError as e:
            print(f"Error sending request: {e}")
            print(f"Stdout: {e.stdout}")
            print(f"Stderr: {e.stderr}")
            raise

    def call_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on the MCP server.

        Args:
            tool_name: The name of the tool to call
            params: The parameters to pass to the tool

        Returns:
            The result of the tool call
        """
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": "tool_call_request",
            "params": {
                "tool": tool_name,
                "parameters": params
            }
        }
        self.request_id += 1

        response = self._send_request(request)

        if "error" in response:
            raise Exception(f"Error calling tool {tool_name}: {response['error']}")

        return response["result"]

def get_memory_container_id() -> str:
    """Get the ID of the memory container.

    Returns:
        The ID of the memory container
    """
    cmd = ["docker", "ps", "--filter", "ancestor=mcp/memory", "--format", "{{.ID}}"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    container_id = result.stdout.strip()

    if not container_id:
        raise Exception("Memory container not found")

    return container_id

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="MCP Client")
    parser.add_argument("--tool", help="Tool to call")
    parser.add_argument("--params", help="Parameters to pass to the tool (JSON)")
    args = parser.parse_args()

    try:
        # Get the memory container ID
        container_id = get_memory_container_id()
        print(f"Found memory container: {container_id}")

        # Create an MCP client
        client = MCPClient(container_id)

        # Call a tool if specified
        if args.tool:
            params = {}
            if args.params:
                params = json.loads(args.params)

            result = client.call_tool(args.tool, params)
            print(f"Tool result: {json.dumps(result, indent=2)}")

        return 0

    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
