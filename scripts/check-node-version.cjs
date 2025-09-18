#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Read .nvmrc file
const nvmrcPath = path.join(__dirname, "..", ".nvmrc");
const requiredVersion = fs.readFileSync(nvmrcPath, "utf8").trim();

// Get current Node version
const currentVersion = process.version.replace("v", "").split(".")[0];

// Check if versions match
if (currentVersion !== requiredVersion) {
  console.error(`\n❌ Wrong Node version!`);
  console.error(`   Required: Node v${requiredVersion}.x (from .nvmrc)`);
  console.error(`   Current:  Node v${currentVersion}.x`);
  console.error(`\n📝 To fix this, run one of these commands:`);
  console.error(`   nvm use              (if you have nvm installed)`);
  console.error(`   nvm use ${requiredVersion}          (explicit version)`);
  console.error(`\n💡 Tip: You can also use these helper scripts:`);
  console.error(`   npm run nvm:dev          (auto-switch and run dev server)`);
  console.error(`   npm run nvm:build        (auto-switch and build)`);
  console.error(`   npm run nvm:test:run     (auto-switch and run tests)\n`);
  process.exit(1);
}

console.log(`✅ Using correct Node version: v${currentVersion}.x`);
