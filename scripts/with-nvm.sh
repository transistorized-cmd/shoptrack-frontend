#!/bin/bash

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check if nvm is available
if ! command -v nvm &> /dev/null; then
  echo "❌ nvm is not installed or not in PATH"
  echo "📝 Please install nvm: https://github.com/nvm-sh/nvm"
  exit 1
fi

# Use the Node version from .nvmrc
echo "🔄 Switching to Node version from .nvmrc..."
nvm use

# Run the command passed as arguments
echo "▶️  Running: $@"
exec "$@"