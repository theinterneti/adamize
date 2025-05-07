# DevContainer Setup

This directory contains the configuration for the VS Code DevContainer used for development. The setup supports three distinct environments:

1. **Development Environment** - For active development and debugging
2. **Testing/Debug Environment** - For testing in isolation with mock services
3. **Production Environment** - For production-ready builds and deployment testing

## Environment Architecture

The environment architecture is designed to provide a consistent development experience while allowing for proper isolation between different environments. It uses Docker Compose profiles to manage the different environments.

### Key Components

- **Docker Compose Profiles**: Each environment is defined as a profile in `docker-compose.profiles.yml`
- **Shared Volumes**: Code and dependencies are shared between environments for efficiency
- **Environment-Specific Services**: Each environment has its own set of services (Neo4j, ChromaDB, etc.)
- **Mock Services**: The testing environment includes mock services for external dependencies

## Getting Started

### Using VS Code Remote Containers

1. Run the initialization script to set up volume directories:
   ```bash
   sudo bash .devcontainer/scripts/init-volumes.sh
   ```

2. Open the project in VS Code
3. Click on the Remote Containers icon in the bottom left
4. Select "Reopen in Container"

This will start the development environment by default.

### Switching Environments

To switch between environments, use the `switch-env.sh` script:

```bash
# Switch to development environment (default)
bash .devcontainer/scripts/switch-env.sh dev

# Switch to testing/debug environment
bash .devcontainer/scripts/switch-env.sh test

# Switch to production environment
bash .devcontainer/scripts/switch-env.sh prod
```

## Environment Details

### Development Environment

- **Profile**: `dev`
- **Purpose**: Active development and debugging
- **Features**:
  - Hot reloading
  - Full debugging support
  - Access to host services (Augment)
  - Direct code editing
- **Services**:
  - ChromaDB: `http://chroma:8000`
  - Neo4j: `bolt://neo4j:7687`
  - Augment: `http://host.docker.internal:8000`
- **Ports**:
  - Web Server: `3000`
  - Node.js Debugging: `9229`

### Testing/Debug Environment

- **Profile**: `test`
- **Purpose**: Isolated testing with mock services
- **Features**:
  - Isolated network
  - Mock services for external dependencies
  - Reproducible test environment
- **Services**:
  - ChromaDB: `http://chroma-test:8000`
  - Neo4j: `bolt://neo4j-test:7687`
  - Augment Mock: `http://augment-mock:8000`
- **Ports**:
  - Web Server: `3001`
  - Node.js Debugging: `9230`
  - Augment Mock: `8001`

### Production Environment

- **Profile**: `prod`
- **Purpose**: Production-ready builds and deployment testing
- **Features**:
  - Optimized builds
  - Production-grade services
  - No development tools
- **Services**:
  - ChromaDB: `http://chroma-prod:8000`
  - Neo4j: `bolt://neo4j-prod:7687`
- **Ports**:
  - Web Server: `3002`

## Configuration Files

- `docker-compose.profiles.yml`: Main Docker Compose file with profiles for all environments
- `Dockerfile`: Development and testing container definition
- `Dockerfile.prod`: Production container definition
- `scripts/post-start.sh`: Setup script for development environment
- `scripts/test-setup.sh`: Setup script for testing environment
- `scripts/prod-setup.sh`: Setup script for production environment
- `scripts/switch-env.sh`: Script to switch between environments

## Troubleshooting

### Network Issues

If you encounter network issues, try the following:

1. Check internet connectivity:
   ```bash
   bash .devcontainer/scripts/check-internet.sh
   ```

2. Debug Augment connectivity:
   ```bash
   bash .devcontainer/scripts/debug-augment.sh
   ```

3. Configure network settings:
   ```bash
   bash .devcontainer/scripts/configure-network.sh
   ```

### Permission Issues

If you encounter permission issues with the VS Code server, you can run the fix script:

```bash
sudo bash .devcontainer/scripts/fix-vscode-permissions.sh
```

### Docker Socket Issues

If you encounter issues with Docker access, you can run the fix script:

```bash
sudo bash .devcontainer/scripts/fix-docker-permissions.sh
```

### Container Issues

If containers are not starting properly:

1. Check Docker logs:
   ```bash
   docker compose -f .devcontainer/docker-compose.profiles.yml logs
   ```

2. Rebuild containers:
   ```bash
   docker compose -f .devcontainer/docker-compose.profiles.yml --profile <env> build --no-cache
   ```

3. Restart containers:
   ```bash
   docker compose -f .devcontainer/docker-compose.profiles.yml --profile <env> down
   docker compose -f .devcontainer/docker-compose.profiles.yml --profile <env> up -d
   ```

## Volume Configuration

The DevContainer uses the following volumes:

- `node-modules`: For Node.js dependencies
- `npm-cache`: For npm cache
- `vscode-server`: For VS Code server data
- `chroma-data`: For ChromaDB data
- `neo4j-data`: For Neo4j data
- `augment-adam-ref`: For reference code from the augment-adam project

## Additional Information

For more information on DevContainer configuration, see the [VS Code DevContainer documentation](https://code.visualstudio.com/docs/remote/containers).
