#!/bin/bash
set -e

echo "Debugging Augment connectivity issues..."

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to test Augment connectivity
test_augment_connectivity() {
  echo "Testing Augment connectivity..."
  
  # Get the Augment host from environment variable or use default
  AUGMENT_HOST=${AUGMENT_HOST:-"http://host.docker.internal:8000"}
  
  echo "Using Augment host: $AUGMENT_HOST"
  
  # Test with curl
  echo "Testing with curl..."
  if command_exists curl; then
    echo "curl -v $AUGMENT_HOST"
    curl -v $AUGMENT_HOST
    echo ""
  else
    echo "curl not found, skipping test"
  fi
  
  # Test with wget
  echo "Testing with wget..."
  if command_exists wget; then
    echo "wget -O- $AUGMENT_HOST"
    wget -O- $AUGMENT_HOST
    echo ""
  else
    echo "wget not found, skipping test"
  fi
  
  # Test with Node.js
  echo "Testing with Node.js..."
  if command_exists node; then
    echo "node -e \"const http = require('http'); const options = { host: new URL('$AUGMENT_HOST').hostname, port: new URL('$AUGMENT_HOST').port || 80, path: new URL('$AUGMENT_HOST').pathname, method: 'GET' }; const req = http.request(options, (res) => { console.log('STATUS:', res.statusCode); console.log('HEADERS:', JSON.stringify(res.headers)); res.on('data', (chunk) => { console.log('BODY:', chunk.toString()); }); }); req.on('error', (e) => { console.error('ERROR:', e.message); }); req.end();\""
    node -e "const http = require('http'); const options = { host: new URL('$AUGMENT_HOST').hostname, port: new URL('$AUGMENT_HOST').port || 80, path: new URL('$AUGMENT_HOST').pathname, method: 'GET' }; const req = http.request(options, (res) => { console.log('STATUS:', res.statusCode); console.log('HEADERS:', JSON.stringify(res.headers)); res.on('data', (chunk) => { console.log('BODY:', chunk.toString()); }); }); req.on('error', (e) => { console.error('ERROR:', e.message); }); req.end();"
    echo ""
  else
    echo "Node.js not found, skipping test"
  fi
}

# Function to check DNS resolution
check_dns_resolution() {
  echo "Checking DNS resolution..."
  
  # Get the Augment host from environment variable or use default
  AUGMENT_HOST=${AUGMENT_HOST:-"http://host.docker.internal:8000"}
  
  # Extract hostname
  HOSTNAME=$(echo $AUGMENT_HOST | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*$||')
  
  echo "Resolving hostname: $HOSTNAME"
  
  # Check with getent
  if command_exists getent; then
    echo "getent hosts $HOSTNAME"
    getent hosts $HOSTNAME
    echo ""
  else
    echo "getent not found, skipping test"
  fi
  
  # Check with dig
  if command_exists dig; then
    echo "dig $HOSTNAME"
    dig $HOSTNAME
    echo ""
  else
    echo "dig not found, skipping test"
  fi
  
  # Check with nslookup
  if command_exists nslookup; then
    echo "nslookup $HOSTNAME"
    nslookup $HOSTNAME
    echo ""
  else
    echo "nslookup not found, skipping test"
  fi
}

# Function to check network configuration
check_network_config() {
  echo "Checking network configuration..."
  
  # Check IP addresses
  echo "IP addresses:"
  ip addr show | grep -E "inet " | awk '{print $2}' | sed 's/\/[0-9]*//'
  echo ""
  
  # Check routing table
  echo "Routing table:"
  ip route
  echo ""
  
  # Check DNS configuration
  echo "DNS configuration:"
  cat /etc/resolv.conf
  echo ""
  
  # Check hosts file
  echo "Hosts file:"
  cat /etc/hosts
  echo ""
  
  # Check environment variables
  echo "Environment variables:"
  env | grep -E "HOST|PROXY|DEBUG|NODE_ENV"
  echo ""
}

# Function to check if Augment is running on the host
check_augment_running() {
  echo "Checking if Augment is running on the host..."
  
  # Get the Augment host from environment variable or use default
  AUGMENT_HOST=${AUGMENT_HOST:-"http://host.docker.internal:8000"}
  
  # Extract port
  PORT=$(echo $AUGMENT_HOST | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|^[^:]*:||')
  PORT=${PORT:-8000}
  
  # Check if port is open
  if command_exists nc; then
    echo "Checking if port $PORT is open on host.docker.internal..."
    nc -zv host.docker.internal $PORT
    echo ""
  else
    echo "nc not found, skipping test"
  fi
}

# Main script
echo "Starting Augment connectivity debugging..."

# Check network configuration
check_network_config

# Check DNS resolution
check_dns_resolution

# Check if Augment is running
check_augment_running

# Test Augment connectivity
test_augment_connectivity

echo "Augment connectivity debugging completed."
