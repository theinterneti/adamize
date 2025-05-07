#!/bin/bash
set -e

# Function to display usage
usage() {
  echo "Usage: $0 [dev|test|prod]"
  echo "  dev  - Switch to development environment (default)"
  echo "  test - Switch to testing/debug environment"
  echo "  prod - Switch to production environment"
  exit 1
}

# Get environment from argument
ENV=${1:-dev}

# Validate environment
if [[ "$ENV" != "dev" && "$ENV" != "test" && "$ENV" != "prod" ]]; then
  echo "Error: Invalid environment '$ENV'"
  usage
fi

echo "Switching to $ENV environment..."

# Stop any running containers
echo "Stopping running containers..."
cd /workspace
docker compose -f .devcontainer/docker-compose.profiles.yml down

# Start containers with the selected profile
echo "Starting $ENV environment..."
docker compose -f .devcontainer/docker-compose.profiles.yml --profile $ENV up -d

echo "Environment switched to $ENV"

# Display information about the environment
echo "Environment Information:"
echo "----------------------"
echo "Profile: $ENV"

case $ENV in
  dev)
    echo "Development Environment"
    echo "- Augment: http://host.docker.internal:8000"
    echo "- ChromaDB: http://chroma:8000"
    echo "- Neo4j: bolt://neo4j:7687"
    ;;
  test)
    echo "Testing/Debug Environment"
    echo "- Augment Mock: http://augment-mock:8000"
    echo "- ChromaDB: http://chroma-test:8000"
    echo "- Neo4j: bolt://neo4j-test:7687"
    ;;
  prod)
    echo "Production Environment"
    echo "- ChromaDB: http://chroma-prod:8000"
    echo "- Neo4j: bolt://neo4j-prod:7687"
    ;;
esac

echo "----------------------"
echo "To access services from the host:"
echo "- Development Web Server: http://localhost:3000"
echo "- Testing Web Server: http://localhost:3001"
echo "- Production Web Server: http://localhost:3002"
echo "----------------------"
