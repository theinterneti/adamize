#!/bin/bash
set -e

echo "Fixing VS Code Server permissions..."

# Create VS Code Server directories with correct permissions
sudo mkdir -p /home/node/.vscode-server/data/Machine
sudo mkdir -p /home/node/.vscode-server/bin
sudo mkdir -p /home/node/.vscode-server/extensions

# Set ownership to node user
sudo chown -R node:node /home/node/.vscode-server

# Verify permissions
ls -la /home/node/.vscode-server

echo "VS Code Server permissions fixed!"
