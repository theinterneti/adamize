#!/bin/bash
set -e

echo "Running post-start setup..."

# Fix Docker socket permissions
if [ -S /var/run/docker.sock ]; then
    echo "Setting Docker socket permissions..."
    sudo chmod 666 /var/run/docker.sock || echo "Failed to set Docker socket permissions"

    # Verify Docker access
    echo "Verifying Docker access..."
    docker ps &>/dev/null && echo "Docker access is working!" || echo "Docker access is still not working"
fi

# Fix VS Code Server permissions
if [ -f "/workspace/.devcontainer/scripts/fix-vscode-permissions.sh" ]; then
    echo "Running VS Code Server permissions fix..."
    bash /workspace/.devcontainer/scripts/fix-vscode-permissions.sh
fi

# Fix workspace permissions
if [ -f "/workspace/.devcontainer/scripts/fix-permissions.sh" ]; then
    echo "Running workspace permissions fix..."
    bash /workspace/.devcontainer/scripts/fix-permissions.sh
fi

# Fix network configuration
if [ -f "/workspace/.devcontainer/scripts/fix-network.sh" ]; then
    echo "Running network configuration fix..."
    bash /workspace/.devcontainer/scripts/fix-network.sh
fi

# Install VS Code Extension Development dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Create necessary directories if they don't exist
mkdir -p src/test/suite
mkdir -p .vscode

# Create .vscode/launch.json if it doesn't exist
if [ ! -f ".vscode/launch.json" ]; then
    echo "Creating launch.json..."
    cat > .vscode/launch.json << 'LAUNCH_EOL'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
LAUNCH_EOL
fi

# Create .vscode/tasks.json if it doesn't exist
if [ ! -f ".vscode/tasks.json" ]; then
    echo "Creating tasks.json..."
    cat > .vscode/tasks.json << 'TASKS_EOL'
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true,
      "presentation": {
        "reveal": "never"
      },
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
TASKS_EOL
fi

# Configure network settings
if [ -f "/workspace/.devcontainer/scripts/configure-network.sh" ]; then
    echo "Configuring network settings..."
    bash /workspace/.devcontainer/scripts/configure-network.sh
fi

# Check internet connectivity
if [ -f "/workspace/.devcontainer/scripts/check-internet.sh" ]; then
    echo "Checking internet connectivity..."
    bash /workspace/.devcontainer/scripts/check-internet.sh
fi

# Debug Augment connectivity
if [ -f "/workspace/.devcontainer/scripts/debug-augment.sh" ]; then
    echo "Debugging Augment connectivity..."
    bash /workspace/.devcontainer/scripts/debug-augment.sh
fi

# Start MCP Proxy Server
if [ -f "/workspace/.devcontainer/scripts/start-mcp-proxy.sh" ]; then
    echo "Starting MCP Proxy Server..."
    bash /workspace/.devcontainer/scripts/start-mcp-proxy.sh
fi

echo "Post-start setup completed!"
