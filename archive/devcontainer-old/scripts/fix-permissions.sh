#!/bin/bash
set -e

echo "Fixing workspace permissions..."

# Fix node_modules permissions
if [ -d "/workspace/node_modules" ]; then
    echo "Fixing node_modules permissions..."
    sudo chown -R node:node /workspace/node_modules
    sudo chmod -R 775 /workspace/node_modules
fi

# Fix npm cache permissions
if [ -d "/home/node/.npm" ]; then
    echo "Fixing npm cache permissions..."
    sudo chown -R node:node /home/node/.npm
    sudo chmod -R 775 /home/node/.npm
fi

# Fix VS Code Server permissions
if [ -d "/home/node/.vscode-server" ]; then
    echo "Fixing VS Code Server permissions..."
    sudo chown -R node:node /home/node/.vscode-server
    sudo chmod -R 775 /home/node/.vscode-server
fi

# Fix workspace permissions for writing
echo "Fixing workspace write permissions..."
sudo find /workspace -type d -exec chmod 775 {} \; 2>/dev/null || echo "Some directories could not be modified"
sudo find /workspace -type f -exec chmod 664 {} \; 2>/dev/null || echo "Some files could not be modified"

echo "Permissions fixed!"
