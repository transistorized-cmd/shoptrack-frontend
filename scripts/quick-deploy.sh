#!/bin/bash

# Quick deployment using existing npm scripts with auto Node version switching
echo "🚀 QUICK DEPLOYMENT - Using npm scripts with Node v22 auto-switching"
echo "=================================================================="

# Clear caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.cache node_modules/.vite dist .vite

# Use npm scripts that automatically handle Node version switching
echo "🏗️ Building using nvm:build (auto-switches to Node v22)..."
npm run nvm:build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📦 Checking build artifacts..."

    if [ -f "dist/index.html" ]; then
        echo "✅ index.html created"
    fi

    if ls dist/js/Upload-*.js 1> /dev/null 2>&1; then
        upload_bundle=$(ls dist/js/Upload-*.js | head -1)
        echo "✅ Upload bundle: $(basename "$upload_bundle")"
    fi

    echo ""
    echo "🎉 DEPLOYMENT READY!"
    echo "Deploy the ./dist folder to production"
else
    echo "❌ Build failed!"
    exit 1
fi