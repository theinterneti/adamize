#!/bin/bash
set -e

echo "Setting up Production environment..."

# Build the production version
if [ -f "/workspace/package.json" ]; then
    echo "Building production version..."
    cd /workspace
    npm run build
fi

# Copy production files to /app
echo "Copying production files to /app..."
mkdir -p /app
cp -r /workspace/dist /app/
cp /workspace/package.json /app/
cp /workspace/package-lock.json /app/

# Install production dependencies
echo "Installing production dependencies..."
cd /app
npm ci --only=production

echo "Production environment setup completed!"
