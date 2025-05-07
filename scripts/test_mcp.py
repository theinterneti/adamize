#!/usr/bin/env python3
"""
Test MCP Server

This script tests the MCP server by sending a simple request to list the available tools.
"""

import json
import subprocess
import sys

def main():
    """Main function."""
    # Get the container ID
    cmd = ["docker", "ps", "--filter", "ancestor=mcp/memory", "--format", "{{.ID}}"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    container_id = result.stdout.strip()
    
    if not container_id:
        print("Memory container not found")
        return 1
    
    print(f"Found memory container: {container_id}")
    
    # Create a request to list tools
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "listTools"
    }
    
    # Convert request to JSON
    request_json = json.dumps(request)
    
    # Call the tool using docker exec
    cmd = [
        "docker", "exec", "-i", container_id,
        "sh", "-c", f"echo '{request_json}' | node dist/index.js"
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Print the response
        print("Response:")
        print(result.stdout)
        
        return 0
    
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        print(f"Stdout: {e.stdout}")
        print(f"Stderr: {e.stderr}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
