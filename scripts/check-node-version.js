#!/usr/bin/env node
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 18 || (major === 18 && minor < 18)) {
  console.error(`Node.js v18.18 or higher is required. Current version: v${process.versions.node}`);
  process.exit(1);
}
