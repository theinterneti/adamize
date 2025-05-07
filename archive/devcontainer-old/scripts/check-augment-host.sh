#!/bin/bash

echo "Checking if Augment is running on the host machine..."

# Try different possible Augment hosts
HOSTS=("172.31.16.1:8000" "host.docker.internal:8000")

for HOST in "${HOSTS[@]}"; do
  echo "Testing $HOST..."
  
  # Try to ping the host
  echo "Pinging $HOST..."
  HOSTNAME=$(echo $HOST | cut -d':' -f1)
  ping -c 2 $HOSTNAME
  
  # Try to connect to the port
  echo "Checking port connectivity..."
  PORT=$(echo $HOST | cut -d':' -f2)
  if [ -z "$PORT" ]; then
    PORT=80
  fi
  
  echo "Port: $PORT"
  
  # Try to make an HTTP request
  echo "Making HTTP request to http://$HOST..."
  curl -m 5 -v http://$HOST || echo "Failed to connect to $HOST"
  
  echo "-----------------------------------"
done

echo "Checking if Augment is running on the host machine completed."
