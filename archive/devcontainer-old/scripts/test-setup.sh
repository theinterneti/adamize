#!/bin/bash
set -e

echo "Setting up Testing/Debug environment..."

# Create mocks directory if it doesn't exist
if [ ! -d "/workspace/mocks" ]; then
    echo "Creating mocks directory..."
    mkdir -p /workspace/mocks
fi

# Create Augment mock if it doesn't exist
if [ ! -f "/workspace/mocks/augment-mock.js" ]; then
    echo "Creating Augment mock..."
    cat > /workspace/mocks/augment-mock.js << 'EOL'
const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  
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
  
  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Handle different endpoints
  if (req.method === 'GET' && url.pathname === '/') {
    // Root endpoint
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'ok', message: 'Augment Mock Server' }));
  } else if (req.method === 'POST' && url.pathname === '/api/memory') {
    // Memory API endpoint
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Received memory request:', data);
        
        // Mock response
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
          status: 'success',
          result: {
            entities: [
              {
                id: '1',
                name: 'Mock Entity',
                type: 'mock',
                observations: ['This is a mock observation']
              }
            ]
          }
        }));
      } catch (error) {
        console.error('Error processing request:', error);
        res.statusCode = 400;
        res.end(JSON.stringify({ status: 'error', error: error.message }));
      }
    });
  } else {
    // Not found
    res.statusCode = 404;
    res.end(JSON.stringify({ status: 'error', error: 'Not Found' }));
  }
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Augment Mock Server running at http://localhost:${PORT}`);
});
EOL
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

# Install dependencies if needed
if [ -f "/workspace/package.json" ]; then
    echo "Installing dependencies..."
    cd /workspace
    npm install
fi

echo "Testing/Debug environment setup completed!"
