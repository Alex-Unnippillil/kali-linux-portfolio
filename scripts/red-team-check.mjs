#!/usr/bin/env node
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/red-team-check.mjs <file>");
  process.exit(1);
}

const content = fs.readFileSync(file, "utf8");

if (!content.includes("safe-mode")) {
  console.error("File is missing safe-mode tag");
  process.exit(1);
}

if (!/educational purposes only/i.test(content)) {
  console.error("File is missing educational disclaimer");
  process.exit(1);
}

const banned = ["rm -rf", "dd if=", "malware", "exploit", "payload"];
for (const keyword of banned) {
  if (content.toLowerCase().includes(keyword)) {
    console.error(`Disallowed keyword detected: ${keyword}`);
    process.exit(1);
  }
}

console.log("Red-team check passed");
