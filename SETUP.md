# 🚀 Quick Setup Guide - ShopTrack Frontend

A step-by-step guide for new developers joining the ShopTrack frontend project.

## ⚡ Quick Start (5 minutes)

### 1. Prerequisites
```bash
# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# Restart terminal or run: source ~/.bashrc
```

### 2. Clone and Setup
```bash
# Clone repository (adjust path as needed)
cd shoptrack-frontend

# Install and use correct Node version (v22)
nvm use    # Reads from .nvmrc file

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Verify Setup
- **Dev server**: http://localhost:5173
- **Backend API**: Should proxy to http://localhost:5000
- **Tests**: Run `npm run test:run` to verify

## 🔧 Understanding Node Version Management

This project **automatically enforces Node.js v22** for all commands.

### What Happens:
- ✅ **Correct version (v22)**: Commands run normally
- ❌ **Wrong version**: Clear error message with solutions

### If You See Version Errors:
```bash
# Option 1: Manual switch (recommended)
nvm use

# Option 2: Auto-switching commands
npm run nvm:dev          # Starts dev server with v22
npm run nvm:test:run     # Runs tests with v22  
npm run nvm:build        # Builds project with v22
```

## 🧪 Running Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (development)
npm run test

# Run with coverage report
npm run test:coverage

# Interactive test UI
npm run test:ui
```

**Note**: All test commands check Node version automatically.

## 💻 Development Commands

### Daily Development:
```bash
npm run dev              # Start dev server
npm run test             # Run tests in watch mode
npm run lint             # Fix linting issues
npm run type-check       # Verify TypeScript
```

### Build & Quality:
```bash
npm run build            # Production build
npm run preview          # Preview production build
npm run format           # Format code with Prettier
```

### If Node Version Issues:
```bash
npm run nvm:dev          # Auto-switch and start dev
npm run nvm:test:run     # Auto-switch and test
npm run nvm:build        # Auto-switch and build
```

## 📁 Project Structure Overview

```
shoptrack-frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   └── __tests__/   # Component tests
│   ├── views/           # Page-level components  
│   ├── stores/          # Pinia state management
│   ├── services/        # API layer
│   ├── composables/     # Vue 3 composables
│   └── types/           # TypeScript definitions
├── tests/
│   ├── setup.ts         # Test configuration
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── scripts/             # Node version automation
├── .nvmrc              # Node v22 requirement
└── vitest.config.ts    # Test configuration
```

## 🎯 Your First Task

Try making a simple change to verify your setup:

1. **Edit a component**:
   ```bash
   # Edit src/components/ThemeToggle.vue
   # Change some text or add a comment
   ```

2. **Run the test**:
   ```bash
   npm run test:run
   ```

3. **Check in browser**:
   ```bash
   npm run dev
   # Visit http://localhost:5173
   ```

## 🚨 Common Issues & Solutions

### Issue: "Wrong Node version" error
**Solution**: Run `nvm use` or use auto-switching commands like `npm run nvm:dev`

### Issue: Tests failing
**Solution**: 
```bash
# Check Node version first
node --version  # Should show v22.x.x

# If wrong version:
nvm use
npm run test:run
```

### Issue: `nvm: command not found`
**Solution**: Install nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# Restart terminal
nvm --version  # Should show nvm version
```

### Issue: Port 5173 in use
**Solution**: 
```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

## 🎓 Learning Resources

### Vue 3 + TypeScript:
- [Vue 3 Docs](https://vuejs.org/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [TypeScript with Vue](https://vuejs.org/guide/typescript/overview.html)

### Testing:
- [Vitest](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Library Vue](https://testing-library.com/docs/vue-testing-library/intro/)

### Project-Specific:
- `README.md` - Complete project documentation
- `CLAUDE.md` - Claude-specific development notes

## 📞 Getting Help

1. **Check the error message** - Our automation provides clear guidance
2. **Try auto-switching commands** - `npm run nvm:*` commands solve most issues
3. **Read the documentation** - `README.md` has detailed information
4. **Ask the team** - We're here to help!

## ✅ Setup Checklist

- [ ] nvm installed and working (`nvm --version`)
- [ ] Node v22 active (`node --version` shows v22.x.x)
- [ ] Dependencies installed (`npm install` completed)
- [ ] Dev server working (`npm run dev` → http://localhost:5173)
- [ ] Tests passing (`npm run test:run` shows all green)
- [ ] Made a test change and saw it in browser

**Welcome to the ShopTrack Frontend team! 🎉**