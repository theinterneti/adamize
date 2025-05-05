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
    cat > .vscode/launch.json << 'EOL'
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
EOL
fi

# Create .vscode/tasks.json if it doesn't exist
if [ ! -f ".vscode/tasks.json" ]; then
    echo "Creating tasks.json..."
    cat > .vscode/tasks.json << 'EOL'
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
EOL
fi

echo "Post-start setup completed!"
