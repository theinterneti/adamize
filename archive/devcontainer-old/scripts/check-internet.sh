#!/bin/bash
set -e

echo "Checking internet connectivity..."

# Function to check internet connectivity
check_internet() {
  # Try to ping Google's DNS server
  if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
    echo "✅ Internet connectivity is working (ping to 8.8.8.8 successful)"
    return 0
  fi

  # Try to ping Google's domain
  if ping -c 1 google.com >/dev/null 2>&1; then
    echo "✅ Internet connectivity is working (ping to google.com successful)"
    return 0
  fi

  # Try to curl Google
  if curl -s --connect-timeout 5 https://www.google.com >/dev/null; then
    echo "✅ Internet connectivity is working (curl to google.com successful)"
    return 0
  fi

  # If all checks fail, return failure
  echo "❌ Internet connectivity check failed"
  return 1
}

# Function to fix DNS issues
fix_dns() {
  echo "Attempting to fix DNS configuration..."

  # Check if /etc/resolv.conf is writable
  if [ -w /etc/resolv.conf ]; then
    # Create a backup of the current resolv.conf
    sudo cp /etc/resolv.conf /etc/resolv.conf.bak

    # Add Google DNS servers
    echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
    echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf

    echo "DNS configuration updated to use Google DNS servers"
  else
    echo "/etc/resolv.conf is read-only, using alternative method"

    # Create a local resolv.conf file
    echo "nameserver 8.8.8.8" > ~/resolv.conf
    echo "nameserver 8.8.4.4" >> ~/resolv.conf

    # Configure npm to use Google DNS
    npm config set dns-nameservers 8.8.8.8,8.8.4.4

    # Configure git to use Google DNS
    git config --global dns.nameservers "8.8.8.8,8.8.4.4"

    echo "Configured applications to use Google DNS servers"
  fi

  # Set environment variables for DNS
  export DNS_NAMESERVER_1=8.8.8.8
  export DNS_NAMESERVER_2=8.8.4.4

  # Add to .bashrc for persistence
  echo 'export DNS_NAMESERVER_1=8.8.8.8' >> ~/.bashrc
  echo 'export DNS_NAMESERVER_2=8.8.4.4' >> ~/.bashrc
}

# Function to display network information
show_network_info() {
  echo "Network Information:"
  echo "--------------------"

  echo "IP Addresses:"
  ip addr show | grep -E "inet " | awk '{print $2}' | sed 's/\/[0-9]*//'

  echo "Default Gateway:"
  ip route | grep default

  echo "DNS Configuration:"
  cat /etc/resolv.conf

  echo "Host File:"
  cat /etc/hosts
}

# Main script
if ! check_internet; then
  echo "Internet connectivity issues detected. Attempting to fix..."

  # Show network information
  show_network_info

  # Fix DNS
  fix_dns

  # Check again
  if check_internet; then
    echo "✅ Internet connectivity fixed successfully!"
  else
    echo "❌ Internet connectivity issues persist. Manual intervention may be required."

    # Show updated network information
    show_network_info
  fi
else
  echo "Internet connectivity is working properly."
fi

# Test npm registry access
echo "Testing npm registry access..."
if npm ping >/dev/null 2>&1; then
  echo "✅ npm registry is accessible"
else
  echo "❌ npm registry is not accessible. Checking npm configuration..."
  npm config list

  # Try to set npm registry explicitly
  echo "Setting npm registry explicitly..."
  npm config set registry https://registry.npmjs.org/

  # Check again
  if npm ping >/dev/null 2>&1; then
    echo "✅ npm registry is now accessible"
  else
    echo "❌ npm registry is still not accessible"
  fi
fi

echo "Internet connectivity check completed."
