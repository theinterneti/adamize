#!/bin/bash

echo "Testing Augment connectivity..."

# Get the Augment host from environment variable or use default
AUGMENT_HOST=${AUGMENT_HOST:-"http://host.docker.internal:8000"}

echo "Using Augment host: $AUGMENT_HOST"

# Extract hostname
HOSTNAME=$(echo $AUGMENT_HOST | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*$||')

echo "Hostname: $HOSTNAME"

# Try to ping the host
echo "Pinging $HOSTNAME..."
ping -c 4 $HOSTNAME

# Try to connect to the port
echo "Checking port connectivity..."
PORT=$(echo $AUGMENT_HOST | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|^[^:]*:||')
if [ -z "$PORT" ]; then
  PORT=80
  if [[ $AUGMENT_HOST == https://* ]]; then
    PORT=443
  fi
fi

echo "Port: $PORT"

# Try to make an HTTP request
echo "Making HTTP request to $AUGMENT_HOST..."
curl -v $AUGMENT_HOST
