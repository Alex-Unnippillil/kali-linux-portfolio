import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const configPath = path.resolve('perf-budget.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function getChangedFiles() {
  const base = process.env.GITHUB_BASE_REF || 'main';
  let ref = base;
  try {
    execSync(`git rev-parse --verify origin/${base}`, { stdio: 'ignore' });
    ref = `origin/${base}`;
  } catch {
    try {
      execSync(`git rev-parse --verify ${base}`, { stdio: 'ignore' });
      ref = base;
    } catch {
      ref = 'HEAD~1';
    }
  }
  const diff = execSync(`git diff --name-only ${ref}...HEAD`).toString().trim();
  return diff ? diff.split('\n') : [];
}

function isScriptFile(file) {
  return ['.js', '.mjs', '.ts', '.tsx', '.jsx'].includes(path.extname(file));
}

const blockingRegex = /<script(?![^>]*(?:async|defer))[^>]*>/i;

const changed = getChangedFiles();
const oversized = [];
const blocking = [];

for (const file of changed) {
  if (!fs.existsSync(file) || !isScriptFile(file)) continue;
  const size = fs.statSync(file).size;
  if (size > config.maxScriptBytes) {
    oversized.push({ file, size });
  }
  const content = fs.readFileSync(file, 'utf8');
  if (blockingRegex.test(content)) {
    blocking.push(file);
  }
}

if (oversized.length || blocking.length) {
  let body = '### Performance budget report\n';
  if (oversized.length) {
    body += `\n**Scripts exceeding ${config.maxScriptBytes} bytes**\n`;
    for (const o of oversized) {
      body += `- ${o.file} (${o.size} bytes)\n`;
    }
  }
  if (blocking.length) {
    body += '\n**Render-blocking script tags found**\n';
    for (const b of blocking) {
      body += `- ${b}\n`;
    }
  }
  if (config.psiUrl) {
    body += `\n[Speed Insights evidence](${config.psiUrl})`;
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  if (token && repo && pr) {
    fetch(`https://api.github.com/repos/${repo}/issues/${pr}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body })
    }).catch(err => {
      console.error('Failed to post comment', err);
    });
  } else {
    console.log(body);
  }
  process.exit(1);
} else {
  console.log('No script budget issues found');
}
