#!/bin/bash
set -e

# ShopTrack Frontend Deployment Script
# Deploys to platform.shoptrack.app

# Change to project root (parent of scripts directory)
cd "$(dirname "$0")/.."

echo "=== ShopTrack Frontend Deployment ==="

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Switch to Node 22
echo "Switching to Node 22..."
nvm use 22

# Verify Node version
NODE_VERSION=$(node -v)
if [[ ! $NODE_VERSION == v22* ]]; then
    echo "Error: Node 22 required, but found $NODE_VERSION"
    exit 1
fi
echo "Using Node $NODE_VERSION"

# Build
echo "Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Build successful!"

# Deploy
echo "Deploying to platform.shoptrack.app..."
rsync -avz --delete dist/ transistorized-cmd:/var/www/shoptrack.app/platform/

if [ $? -ne 0 ]; then
    echo "Deployment failed!"
    exit 1
fi

echo "=== Deployment complete! ==="
echo "Site: https://platform.shoptrack.app"
