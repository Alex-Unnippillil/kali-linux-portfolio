import { promises as fs } from 'fs';
import path from 'path';

const directories = [
  'public/themes/Yaru/apps',
  'public/themes/Yaru/status',
  'public/themes/Yaru/system',
];

const OVERRIDES = new Map([
  ['bash', 'Terminal'],
  ['beef', 'BeEF'],
  ['beef-online', 'BeEF Online'],
  ['beef-offline', 'BeEF Offline'],
  ['beef-idle', 'BeEF Idle'],
  ['bluetooth', 'Bluetooth'],
  ['gnome', 'GNOME'],
  ['gnome-control-center', 'GNOME Control Center'],
  ['http', 'HTTP'],
  ['https', 'HTTPS'],
  ['ftp', 'FTP'],
  ['ssh', 'SSH'],
  ['qr', 'QR'],
  ['msf', 'MSF'],
  ['msf-post', 'Metasploit Post'],
  ['todoist', 'Todoist'],
  ['vscode', 'Visual Studio Code'],
  ['x', 'X'],
  ['user-home', 'Home'],
  ['user-trash-symbolic', 'Trash'],
  ['user-trash-full-symbolic', 'Full Trash'],
]);

function toTitle(slug) {
  const base = slug.replace(/\.svg$/i, '');
  if (OVERRIDES.has(base)) {
    return OVERRIDES.get(base);
  }
  const parts = base
    .split(/[\-_]+/)
    .filter(Boolean)
    .map((part) => {
      if (OVERRIDES.has(part)) {
        return OVERRIDES.get(part);
      }
      if (/^\d+$/.test(part)) {
        return part;
      }
      if (part.length <= 3) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    });
  const result = parts.join(' ').trim();
  return result || base;
}

async function ensureTitle(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  if (content.includes('<title')) {
    return false;
  }
  const fileName = path.basename(filePath);
  const baseName = fileName.replace(/\.svg$/i, '');
  const title = toTitle(fileName);
  const titleId = `icon-${baseName.replace(/[^a-zA-Z0-9_-]/g, '-')}-title`;
  const svgMatch = content.match(/<svg[^>]*>/);
  if (!svgMatch) {
    return false;
  }
  const originalTag = svgMatch[0];
  let updatedTag = originalTag;
  const needsRole = !/role\s*=/.test(updatedTag);
  const needsAria = !/aria-labelledby\s*=/.test(updatedTag);
  if (needsRole || needsAria) {
    if (updatedTag === '<svg>') {
      const attrs = [needsRole ? 'role="img"' : '', needsAria ? `aria-labelledby="${titleId}"` : '']
        .filter(Boolean)
        .join(' ');
      updatedTag = attrs ? `<svg ${attrs}>` : updatedTag;
    } else if (updatedTag.startsWith('<svg ')) {
      const prefix = '<svg ';
      const suffix = updatedTag.slice(prefix.length);
      const attrs = [needsRole ? 'role="img"' : '', needsAria ? `aria-labelledby="${titleId}"` : '']
        .filter(Boolean)
        .join(' ');
      updatedTag = attrs ? `${prefix}${attrs} ${suffix}` : updatedTag;
    } else {
      const attrs = [needsRole ? 'role="img"' : '', needsAria ? `aria-labelledby="${titleId}"` : '']
        .filter(Boolean)
        .join(' ');
      updatedTag = attrs ? updatedTag.replace('<svg', `<svg ${attrs}`) : updatedTag;
    }
  }
  const insertion = `\n  <title id="${titleId}">${title}</title>\n`;
  const updatedContent =
    content.replace(originalTag, updatedTag) // replace the tag first
      .replace(updatedTag, `${updatedTag}${insertion}`); // insert title immediately after tag
  await fs.writeFile(filePath, updatedContent, 'utf8');
  return true;
}

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let changed = false;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nestedChanged = await processDirectory(path.join(dir, entry.name));
      changed = changed || nestedChanged;
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
      const filePath = path.join(dir, entry.name);
      const updated = await ensureTitle(filePath);
      changed = changed || updated;
    }
  }
  return changed;
}

(async () => {
  let anyChanged = false;
  for (const dir of directories) {
    const exists = await fs
      .access(dir)
      .then(() => true)
      .catch(() => false);
    if (!exists) continue;
    const changed = await processDirectory(dir);
    anyChanged = anyChanged || changed;
  }
  if (!anyChanged) {
    console.log('No SVG files required updates.');
  } else {
    console.log('SVG titles added where missing.');
  }
})();
