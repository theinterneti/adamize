#!/bin/bash
set -e

echo "Initializing volume directories..."

# Create VS Code Server volume directory with correct permissions
mkdir -p ${HOME}/.vscode-server-adamize
chmod 777 ${HOME}/.vscode-server-adamize

echo "Volume directories initialized!"
