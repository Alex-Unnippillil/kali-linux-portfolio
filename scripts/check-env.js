const fs = require('fs');
const path = require('path');

// Determine which env file to read
const envFile = ['.env', '.env.local'].find((f) => fs.existsSync(path.join(process.cwd(), f)));

if (!envFile) {
  console.error('No .env file found');
  process.exit(1);
}

const content = fs.readFileSync(envFile, 'utf8');
const lines = content.split(/\r?\n/);
const missing = [];

for (const line of lines) {
  const match = line.match(/^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)?$/);
  if (!match) continue;
  const key = match[1];
  let value = (match[2] || '').trim();
  // Remove surrounding quotes if any
  value = value.replace(/^['"]|['"]$/g, '');
  if (!value) {
    value = process.env[key];
  }
  if (!value) {
    missing.push(key);
  }
}

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('All required NEXT_PUBLIC variables are set.');
