FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:18

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    git \
    gnupg \
    jq \
    procps \
    wget \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g \
    yo \
    generator-code \
    @vscode/vsce \
    typescript \
    eslint \
    prettier

# Set up a non-root user with sudo access
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create the user
RUN if [ "$USER_GID" != "1000" ] || [ "$USER_UID" != "1000" ]; then \
    groupmod --gid $USER_GID $USERNAME \
    && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
    && chown -R $USER_UID:$USER_GID /home/$USERNAME; \
    fi

# Add sudo support
RUN apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Set the default user
USER $USERNAME

# Set up npm configuration
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-timeout 60000

# Create workspace directory with proper permissions
USER root
RUN mkdir -p /workspace \
    && chown -R $USERNAME:$USERNAME /workspace \
    && chmod -R 755 /workspace
USER $USERNAME

WORKDIR /workspace

# Set environment variables
ENV NODE_ENV=development
