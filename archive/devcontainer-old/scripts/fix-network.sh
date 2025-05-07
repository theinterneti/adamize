#!/bin/bash
set -e

echo "Fixing network configuration for Augment connectivity..."

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Update hosts file to ensure host.docker.internal is properly configured
update_hosts_file() {
  echo "Updating hosts file..."
  
  # Get the default gateway IP
  DEFAULT_GATEWAY=$(ip route | grep default | awk '{print $3}')
  
  echo "Default gateway: $DEFAULT_GATEWAY"
  
  # Check if host.docker.internal is already in the hosts file
  if grep -q "host.docker.internal" /etc/hosts; then
    echo "host.docker.internal already exists in hosts file, updating..."
    # Use a temporary file since we can't directly modify /etc/hosts without sudo
    grep -v "host.docker.internal" /etc/hosts > /tmp/hosts.new
    echo "$DEFAULT_GATEWAY host.docker.internal" >> /tmp/hosts.new
    echo "Updated hosts file content:"
    cat /tmp/hosts.new
    echo "To apply these changes, run: sudo cp /tmp/hosts.new /etc/hosts"
  else
    echo "Adding host.docker.internal to hosts file..."
    echo "$DEFAULT_GATEWAY host.docker.internal" > /tmp/hosts.new
    echo "To apply these changes, run: sudo sh -c 'cat /tmp/hosts.new >> /etc/hosts'"
  fi
}

# Test connectivity to Augment
test_augment_connectivity() {
  echo "Testing connectivity to Augment..."
  
  # Get the Augment host from environment variable or use default
  AUGMENT_HOST=${AUGMENT_HOST:-"http://host.docker.internal:8000"}
  
  echo "Using Augment host: $AUGMENT_HOST"
  
  # Extract hostname
  HOSTNAME=$(echo $AUGMENT_HOST | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*$||')
  
  echo "Hostname: $HOSTNAME"
  
  # Try to ping the host
  echo "Pinging $HOSTNAME..."
  ping -c 4 $HOSTNAME || echo "Ping failed, but this might be due to firewall settings"
  
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
  
  if command_exists nc; then
    echo "Using netcat to check port connectivity..."
    nc -zv $HOSTNAME $PORT -w 5 || echo "Port connectivity check failed"
  else
    echo "netcat not found, using timeout and curl for port check..."
    timeout 5 bash -c "cat < /dev/null > /dev/tcp/$HOSTNAME/$PORT" || echo "Port connectivity check failed"
  fi
  
  # Try to make an HTTP request
  echo "Making HTTP request to $AUGMENT_HOST..."
  if command_exists curl; then
    curl -v $AUGMENT_HOST || echo "HTTP request failed"
  else
    echo "curl not found, using wget..."
    wget -O- $AUGMENT_HOST || echo "HTTP request failed"
  fi
}

# Configure DNS settings
configure_dns() {
  echo "Configuring DNS settings..."
  
  # Create a local resolv.conf file with Google DNS
  echo "nameserver 8.8.8.8" > ~/resolv.conf
  echo "nameserver 8.8.4.4" >> ~/resolv.conf
  echo "nameserver 1.1.1.1" >> ~/resolv.conf
  
  echo "Created local resolv.conf file:"
  cat ~/resolv.conf
  
  echo "To apply these DNS settings, run: sudo cp ~/resolv.conf /etc/resolv.conf"
  
  # Configure npm network settings
  if command_exists npm; then
    echo "Configuring npm network settings..."
    npm config set registry https://registry.npmjs.org/
    npm config set timeout 60000
    echo "npm registry set to https://registry.npmjs.org/ with increased timeout"
  fi
}

# Main script
echo "Starting network configuration fix..."

# Update hosts file
update_hosts_file

# Configure DNS settings
configure_dns

# Test connectivity to Augment
test_augment_connectivity

echo "Network configuration fix completed."
echo "If you still have issues, you may need to restart the container or rebuild it."
echo "You can also try running the following commands with sudo:"
echo "  sudo cp /tmp/hosts.new /etc/hosts"
echo "  sudo cp ~/resolv.conf /etc/resolv.conf"
