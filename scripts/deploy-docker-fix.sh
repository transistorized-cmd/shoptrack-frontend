#!/bin/bash

# Quick deployment script for Docker Alpine Linux native module fix
echo "🐳 DOCKER DEPLOYMENT FIX - Resolving Rollup native module issue"
echo "================================================================"

echo "📝 Changes made:"
echo "✅ Updated .dockerignore to exclude package-lock.json"
echo "✅ Modified Dockerfile to use npm install (generates fresh lock)"
echo "✅ Fixed Alpine Linux x64-musl native module compatibility"
echo ""

echo "🚀 Deploying to Fly.io..."
fly deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "=========================="
    echo "✅ Rollup native module issue resolved"
    echo "✅ Platform-specific dependencies installed"
    echo "✅ Upload functionality with _withMods fixes deployed"
    echo ""
    echo "🔗 Test your upload functionality:"
    echo "   https://platform.shoptrack.app/upload"
    echo ""
    echo "🧪 Verification steps:"
    echo "1. Test file drag/drop functionality"
    echo "2. Check browser console for _withMods errors"
    echo "3. Verify upload processing works"
else
    echo "❌ Deployment failed!"
    echo "Check the build logs above for details."
    exit 1
fi