#!/bin/bash
set -e

# ShopTrack Frontend Deployment Script
# Deploys to Hetzner server

SERVER="transistorized-cmd"
REMOTE_PATH="/var/www/shoptrack.app/platform"
LOCAL_DIST="./dist"

echo "=== ShopTrack Frontend Deployment ==="
echo ""

# Step 1: Ensure correct Node version
echo "[1/3] Checking Node version..."
if command -v nvm &> /dev/null; then
    source ~/.nvm/nvm.sh
    nvm use 22
elif [[ $(node -v) != v22* ]]; then
    echo "Warning: Node v22 required. Current: $(node -v)"
    echo "Run 'nvm use 22' first or install Node 22"
    exit 1
fi

# Step 2: Build
echo ""
echo "[2/3] Building..."
npm run build

# Step 3: Deploy with rsync
echo ""
echo "[3/3] Deploying to server..."
rsync -avz --delete "$LOCAL_DIST/" "$SERVER:$REMOTE_PATH/"

echo ""
echo "=== Deployment Complete ==="
echo "Frontend deployed to: https://platform.shoptrack.app"
