#!/bin/bash

# Performance Test Runner for ShopTrack Frontend
# Run comprehensive performance tests with proper environment setup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
MODE="all"
ENVIRONMENT="development"
VERBOSE=false
TIMEOUT=30000

# Help function
show_help() {
    echo "Performance Test Runner"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -m, --mode MODE          Test mode: all, components, stores, api (default: all)"
    echo "  -e, --env ENVIRONMENT    Environment: development, ci, production (default: development)"
    echo "  -v, --verbose            Enable verbose output"
    echo "  -t, --timeout TIMEOUT    Test timeout in milliseconds (default: 30000)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                       # Run all performance tests in development mode"
    echo "  $0 -m components         # Run only component performance tests"
    echo "  $0 -e ci -v              # Run in CI mode with verbose output"
    echo "  $0 -m api -t 60000       # Run API tests with 60s timeout"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate mode
case $MODE in
    all|components|stores|api)
        ;;
    *)
        echo -e "${RED}Invalid mode: $MODE${NC}"
        echo "Valid modes: all, components, stores, api"
        exit 1
        ;;
esac

# Validate environment
case $ENVIRONMENT in
    development|ci|production)
        ;;
    *)
        echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
        echo "Valid environments: development, ci, production"
        exit 1
        ;;
esac

echo -e "${BLUE}🚀 ShopTrack Performance Test Runner${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Mode: ${YELLOW}$MODE${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Timeout: ${YELLOW}${TIMEOUT}ms${NC}"
echo -e "Verbose: ${YELLOW}$VERBOSE${NC}"
echo ""

# Set environment variables
export NODE_ENV="$ENVIRONMENT"
if [ "$ENVIRONMENT" = "development" ]; then
    export VITEST_DEV="true"
elif [ "$ENVIRONMENT" = "ci" ]; then
    export CI="true"
fi

# Test paths based on mode
case $MODE in
    all)
        TEST_PATHS="tests/performance/"
        ;;
    components)
        TEST_PATHS="tests/performance/components/"
        ;;
    stores)
        TEST_PATHS="tests/performance/stores/"
        ;;
    api)
        TEST_PATHS="tests/performance/api/"
        ;;
esac

# Build test command
if [ "$VERBOSE" = true ]; then
    REPORTER="--reporter=verbose"
else
    REPORTER=""
fi

TEST_CMD="npm run nvm:test:run $TEST_PATHS -- --testTimeout=$TIMEOUT $REPORTER"

echo -e "${BLUE}Running command:${NC} $TEST_CMD"
echo ""

# Run tests
start_time=$(date +%s)

if eval $TEST_CMD; then
    end_time=$(date +%s)
    duration=$((end_time - start_time))

    echo ""
    echo -e "${GREEN}✅ Performance tests completed successfully!${NC}"
    echo -e "${GREEN}Duration: ${duration}s${NC}"

    # Show performance recommendations based on results
    echo ""
    echo -e "${BLUE}📊 Performance Recommendations:${NC}"
    echo "• Monitor memory warnings in test output"
    echo "• Check console for performance regression alerts"
    echo "• Review baseline metrics in tests/performance/baselines.json"
    echo "• Consider optimizing tests that consistently fail thresholds"

    if [ "$ENVIRONMENT" = "production" ]; then
        echo "• Production mode: Any failures indicate critical performance issues"
    fi

else
    end_time=$(date +%s)
    duration=$((end_time - start_time))

    echo ""
    echo -e "${RED}❌ Performance tests failed!${NC}"
    echo -e "${RED}Duration: ${duration}s${NC}"

    # Show debugging tips
    echo ""
    echo -e "${YELLOW}🔍 Debugging Tips:${NC}"
    echo "• Run with -v flag for verbose output"
    echo "• Check individual test categories with -m flag"
    echo "• Review memory warnings - some are expected in test environment"
    echo "• Increase timeout with -t flag for slower systems"
    echo "• Try development mode (-e development) for faster iteration"

    exit 1
fi

# Performance summary
echo ""
echo -e "${BLUE}📈 Performance Test Summary:${NC}"
echo "• Component rendering: Large list performance, memory leak detection"
echo "• Store mutations: Bulk operations, reactivity, cache performance"
echo "• API optimization: Request batching, caching, concurrent handling"
echo ""
echo -e "${GREEN}Performance monitoring complete!${NC}"