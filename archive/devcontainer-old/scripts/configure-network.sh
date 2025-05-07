#!/bin/bash
set -e

echo "Configuring container network settings..."

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to configure DNS settings
configure_dns() {
  echo "Configuring DNS settings..."

  # Create a local resolv.conf file with Google DNS
  echo "nameserver 8.8.8.8" > ~/resolv.conf
  echo "nameserver 8.8.4.4" >> ~/resolv.conf

  # Configure npm network settings
  if command_exists npm; then
    # Set npm timeout to handle DNS delays
    npm config set timeout 60000
    echo "Configured npm network settings"
  fi

  # Configure git to use Google DNS
  if command_exists git; then
    git config --global dns.nameservers "8.8.8.8,8.8.4.4"
    echo "Configured git to use Google DNS"
  fi

  # Set environment variables for DNS
  export DNS_NAMESERVER_1=8.8.8.8
  export DNS_NAMESERVER_2=8.8.4.4

  # Add to .bashrc for persistence
  if [ -f ~/.bashrc ]; then
    grep -q "DNS_NAMESERVER_1" ~/.bashrc || echo 'export DNS_NAMESERVER_1=8.8.8.8' >> ~/.bashrc
    grep -q "DNS_NAMESERVER_2" ~/.bashrc || echo 'export DNS_NAMESERVER_2=8.8.4.4' >> ~/.bashrc
    echo "Added DNS environment variables to .bashrc"
  fi
}

# Function to configure npm registry
configure_npm_registry() {
  if command_exists npm; then
    echo "Configuring npm registry..."

    # Set npm registry to official registry
    npm config set registry https://registry.npmjs.org/

    # Set npm to use strict SSL
    npm config set strict-ssl true

    # Set npm timeout to 60 seconds
    npm config set timeout 60000

    echo "npm registry configured"
  fi
}

# Function to configure git
configure_git() {
  if command_exists git; then
    echo "Configuring git..."

    # Set git to use HTTPS instead of git protocol
    git config --global url."https://".insteadOf git://

    # Set git to use a longer timeout
    git config --global http.lowSpeedLimit 1000
    git config --global http.lowSpeedTime 60

    echo "git configured"
  fi
}

# Function to configure proxy if needed
configure_proxy() {
  # Check if proxy environment variables are set
  if [ -n "$HTTP_PROXY" ] || [ -n "$http_proxy" ]; then
    echo "Proxy detected, configuring applications to use proxy..."

    # Normalize proxy variables
    export HTTP_PROXY=${HTTP_PROXY:-$http_proxy}
    export HTTPS_PROXY=${HTTPS_PROXY:-$https_proxy}
    export NO_PROXY=${NO_PROXY:-$no_proxy}

    # Configure npm to use proxy
    if command_exists npm; then
      npm config set proxy $HTTP_PROXY
      npm config set https-proxy $HTTPS_PROXY
      echo "Configured npm to use proxy"
    fi

    # Configure git to use proxy
    if command_exists git; then
      git config --global http.proxy $HTTP_PROXY
      git config --global https.proxy $HTTPS_PROXY
      echo "Configured git to use proxy"
    fi

    # Add to .bashrc for persistence
    if [ -f ~/.bashrc ]; then
      grep -q "HTTP_PROXY" ~/.bashrc || echo "export HTTP_PROXY=\"$HTTP_PROXY\"" >> ~/.bashrc
      grep -q "HTTPS_PROXY" ~/.bashrc || echo "export HTTPS_PROXY=\"$HTTPS_PROXY\"" >> ~/.bashrc
      grep -q "NO_PROXY" ~/.bashrc || echo "export NO_PROXY=\"$NO_PROXY\"" >> ~/.bashrc
      echo "Added proxy environment variables to .bashrc"
    fi
  fi
}

# Main script
echo "Starting network configuration..."

# Configure DNS
configure_dns

# Configure npm registry
configure_npm_registry

# Configure git
configure_git

# Configure proxy if needed
configure_proxy

echo "Network configuration completed."
