const fs = require('fs');
const path = require('path');

/**
 * Parse CHANGELOG.md into an array of release objects.
 * Each release includes version, date, and tags (section headings).
 */
function parseReleases() {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const content = fs.readFileSync(changelogPath, 'utf8');
  const releaseRegex = /^##\s+\[(.+?)\]\s+-\s+(\d{4}-\d{2}-\d{2})/gm;
  const matches = [...content.matchAll(releaseRegex)];
  return matches.map((match, index) => {
    const version = match[1];
    const date = match[2];
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : content.length;
    const body = content.slice(start, end);
    const tagMatches = [...body.matchAll(/^###\s+([^\n]+)/gm)];
    const tags = tagMatches.map((m) => m[1].trim());
    return { version, date, tags };
  });
}

module.exports = { parseReleases };
