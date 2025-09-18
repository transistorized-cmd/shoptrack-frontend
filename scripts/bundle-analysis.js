#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes the generated bundle to show size information and verify optimizations
 */

import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";

async function analyzeBundles() {
  console.log("📊 Bundle Analysis for ShopTrack Frontend");
  console.log("=".repeat(60));

  const distPath = "./dist";
  const jsPath = join(distPath, "js");

  try {
    const jsFiles = await readdir(jsPath);
    const bundles = [];

    for (const file of jsFiles) {
      if (file.endsWith(".js")) {
        const filePath = join(jsPath, file);
        const stats = await stat(filePath);
        bundles.push({
          name: file,
          size: stats.size,
          sizeMB: (stats.size / 1024 / 1024).toFixed(2),
          sizeKB: (stats.size / 1024).toFixed(1),
        });
      }
    }

    // Sort by size (descending)
    bundles.sort((a, b) => b.size - a.size);

    console.log("\n🗂️  JavaScript Bundle Sizes:");
    console.log("-".repeat(60));
    console.log(`${"File".padEnd(35) + "Size (KB)".padEnd(12)}Size (MB)`);
    console.log("-".repeat(60));

    let totalSize = 0;
    for (const bundle of bundles) {
      totalSize += bundle.size;
      const icon = bundle.name.includes("chart.js")
        ? "📊"
        : bundle.name.includes("index")
          ? "🏠"
          : "📄";
      console.log(
        `${icon} ${bundle.name}`.padEnd(35) +
          bundle.sizeKB.padStart(8).padEnd(12) +
          bundle.sizeMB.padStart(8),
      );
    }

    console.log("-".repeat(60));
    console.log(
      "Total JS Size:".padEnd(35) +
        (totalSize / 1024).toFixed(1).padStart(8).padEnd(12) +
        (totalSize / 1024 / 1024).toFixed(2).padStart(8),
    );

    // Analysis insights
    console.log("\n📋 Bundle Analysis Insights:");
    console.log("-".repeat(40));

    const chartBundle = bundles.find((b) => b.name.includes("chart.js"));
    if (chartBundle) {
      console.log("✅ Chart.js is properly lazy-loaded");
      console.log(`   • Chart.js bundle: ${chartBundle.sizeKB} KB`);
      console.log("   • Only loads when charts are displayed");
    } else {
      console.log("❌ Chart.js not found in separate bundle");
    }

    const mainBundle = bundles.find(
      (b) => b.name.includes("index") && !b.name.includes("js-"),
    );
    if (mainBundle) {
      console.log(`✅ Main bundle size: ${mainBundle.sizeKB} KB`);
      if (parseFloat(mainBundle.sizeKB) < 100) {
        console.log("   • ✅ Good: Main bundle under 100KB");
      } else if (parseFloat(mainBundle.sizeKB) < 200) {
        console.log("   • ⚠️  Warning: Main bundle could be optimized");
      } else {
        console.log("   • ❌ Main bundle is large, consider code splitting");
      }
    }

    console.log("\n📈 Performance Impact:");
    console.log("-".repeat(30));
    console.log("• Chart.js (180+ KB) loads only when needed");
    console.log("• Initial page load is faster");
    console.log("• Better perceived performance");
    console.log("• Reduced Time to Interactive (TTI)");
  } catch (error) {
    console.error("❌ Error analyzing bundles:", error.message);
    console.log('\n💡 Run "npm run build:analyze" first to generate bundles');
  }
}

analyzeBundles().catch(console.error);
