#!/bin/bash

echo "Checking if Augment is running on different ports..."

# Try different possible Augment ports
PORTS=(8000 3000 3001 8080 4000 5000)
HOST="localhost"

for PORT in "${PORTS[@]}"; do
  echo "Testing $HOST:$PORT..."
  
  # Try to connect to the port
  echo "Checking port connectivity..."
  
  # Try to make an HTTP request
  echo "Making HTTP request to http://$HOST:$PORT..."
  curl -m 2 -v http://$HOST:$PORT || echo "Failed to connect to $HOST:$PORT"
  
  echo "-----------------------------------"
done

echo "Checking if Augment is running on different ports completed."
