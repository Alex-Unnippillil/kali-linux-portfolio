import fs from 'node:fs';
import process from 'node:process';

const COMMENT_REGEX = /<!--([\s\S]*?)-->/g;

function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error('GITHUB_EVENT_PATH is not defined. This script must run inside a GitHub Action.');
  }

  const raw = fs.readFileSync(eventPath, 'utf8');
  return JSON.parse(raw);
}

function normalize(text = '') {
  return text.replace(COMMENT_REGEX, '').trim();
}

function extractSection(markdown, headings) {
  if (!markdown) {
    return '';
  }

  const candidates = Array.isArray(headings) ? headings : [headings];
  for (const heading of candidates) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|\n)#{2,}\s*${escaped}\s*\n+([\s\S]*?)(?=\n#{2,}\s*[^\n]*\n|$)`, 'i');
    const match = pattern.exec(markdown);
    if (match) {
      return match[2];
    }
  }
  return '';
}

function collectUncheckedCheckboxes(markdown) {
  if (!markdown) {
    return [];
  }
  const unchecked = [];
  const regex = /- \[ \]([^\n\r]*)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    unchecked.push(match[1].trim());
  }
  return unchecked;
}

function hasCheckedCheckbox(section) {
  if (!section) {
    return false;
  }
  return /- \[[xX]\]/.test(section);
}

function validateIssueMetadata(rawSection) {
  const cleaned = normalize(rawSection);
  if (!cleaned) {
    return 'Fill in the "Issue" section with a linked issue number or "N/A" when appropriate.';
  }

  if (/(n\/a|none|no issue|not applicable)/i.test(cleaned)) {
    return null;
  }

  if (/(close[sd]?|fix(e[sd])?|resolve[sd]?)/i.test(cleaned) && /#\d+/.test(cleaned)) {
    return null;
  }

  if (/#\d+/.test(cleaned)) {
    return null;
  }

  return 'Reference an issue number (for example "Closes #123") or explicitly state "N/A" in the "Issue" section.';
}

function validateSummary(rawSection) {
  const cleaned = normalize(rawSection);
  if (!cleaned) {
    return 'Add a short summary under the "Summary" section.';
  }

  if (/^(tbd|todo|n\/a|none)$/i.test(cleaned)) {
    return 'Replace placeholders like "TBD" with a real summary of the changes.';
  }

  return null;
}

function validateTesting(rawSection) {
  const cleaned = normalize(rawSection);
  if (!cleaned) {
    return 'Document the tests you ran in the "Testing" section or mark them as "N/A".';
  }

  if (/(n\/a|none|not applicable)/i.test(cleaned)) {
    return null;
  }

  if (hasCheckedCheckbox(rawSection)) {
    return null;
  }

  return 'Mark at least one test checkbox or note "N/A" in the "Testing" section.';
}

function main() {
  const payload = readEventPayload();
  const pr = payload.pull_request;

  if (!pr) {
    throw new Error('This script expects a pull_request event payload.');
  }

  const body = pr.body || '';
  const errors = [];

  if (!normalize(body)) {
    errors.push('The pull request description is empty. Please populate the PR template.');
  }

  const uncheckedCheckboxes = collectUncheckedCheckboxes(body);
  if (uncheckedCheckboxes.length > 0) {
    errors.push(
      `Check all required checklist items: ${uncheckedCheckboxes.map((item) => `"${item || 'unnamed item'}"`).join(', ')}.`,
    );
  }

  const summaryError = validateSummary(extractSection(body, ['Summary', 'Overview']));
  if (summaryError) {
    errors.push(summaryError);
  }

  const testingError = validateTesting(extractSection(body, ['Testing', 'Tests']));
  if (testingError) {
    errors.push(testingError);
  }

  const issueError = validateIssueMetadata(extractSection(body, ['Issue', 'Issues', 'Related Issue', 'Related Issues']));
  if (issueError) {
    errors.push(issueError);
  }

  if (errors.length > 0) {
    const message = ['PR template validation failed:'].concat(errors.map((err) => `- ${err}`)).join('\n');
    console.error(message);
    process.exit(1);
  }

  console.log('PR template validation passed.');
}

try {
  main();
} catch (error) {
  console.error('PR template validation encountered an error.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
