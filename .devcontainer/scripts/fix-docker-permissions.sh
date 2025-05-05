#!/bin/bash
set -e

echo "Fixing Docker socket permissions..."

# Check Docker socket
echo "Checking Docker socket..."
ls -la /var/run/docker.sock

# Fix permissions if needed
echo "Setting permissions on Docker socket..."
sudo chmod 666 /var/run/docker.sock || echo "Could not change permissions (not root)"

# Try to run Docker command
echo "Trying to run Docker command..."
docker ps && echo "Docker command succeeded!" || echo "Docker command failed"

# Check Docker socket group
echo "Checking Docker socket group..."
stat -c '%g' /var/run/docker.sock

# Check current user groups
echo "Checking current user groups..."
id

# Try running with sudo if available
echo "Trying with sudo if available..."
sudo docker ps 2>/dev/null || echo "Sudo not available or Docker still not working"

echo "Docker access test completed"
