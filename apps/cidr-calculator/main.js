/* eslint-env browser */
// Utility functions for IP parsing and formatting

function parseIPv4(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0n;
  for (const part of parts) {
    if (part === '' || /\D/.test(part)) return null;
    const val = Number(part);
    if (val < 0 || val > 255) return null;
    num = (num << 8n) + BigInt(val);
  }
  return num;
}

function parseIPv6(ip) {
  // Handle shorthand ::
  if (ip.indexOf('::') !== ip.lastIndexOf('::')) return null;
  let [head, tail] = ip.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  if (tail && tail.includes('::')) return null; // extra ::
  const missing = 8 - (headParts.length + tailParts.length);
  if (missing < 0) return null;
  const parts = [
    ...headParts.map((h) => h || '0'),
    ...Array(missing).fill('0'),
    ...tailParts.map((t) => t || '0'),
  ];
  if (parts.length !== 8) return null;
  let num = 0n;
  for (const part of parts) {
    if (/[^0-9a-fA-F]/.test(part)) return null;
    const val = parseInt(part, 16);
    if (val < 0 || val > 0xffff) return null;
    num = (num << 16n) + BigInt(val);
  }
  return num;
}

function bigintToIPv4(num) {
  const parts = [];
  for (let i = 3; i >= 0; i--) {
    const part = Number((num >> BigInt(i * 8)) & 0xffn);
    parts.push(part.toString());
  }
  return parts.join('.');
}

function bigintToIPv6(num) {
  const parts = new Array(8);
  for (let i = 7; i >= 0; i--) {
    parts[i] = ((num >> BigInt(i * 16)) & 0xffffn).toString(16);
  }
  // Compress longest sequence of zeros
  let bestStart = -1;
  let bestLen = 0;
  let start = -1;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '0') {
      if (start === -1) start = i;
      const len = i - start + 1;
      if (len > bestLen) {
        bestStart = start;
        bestLen = len;
      }
    } else {
      start = -1;
    }
  }
  if (bestLen > 1) {
    parts.splice(bestStart, bestLen, '');
    if (bestStart === 0) parts.unshift('');
    if (bestStart + bestLen === 8) parts.push('');
  }
  return parts.join(':').replace(/:{3,}/, '::');
}

function parseCIDR(cidr) {
  const [ip, prefixStr] = cidr.split('/');
  if (!ip || prefixStr === undefined) return null;
  const prefix = Number(prefixStr);
  let version, maxBits, num;
  if (ip.includes(':')) {
    version = 6;
    maxBits = 128;
    num = parseIPv6(ip);
    if (num === null || prefix < 0 || prefix > 128) return null;
  } else if (ip.includes('.')) {
    version = 4;
    maxBits = 32;
    num = parseIPv4(ip);
    if (num === null || prefix < 0 || prefix > 32) return null;
  } else {
    return null;
  }
  const hostBits = BigInt(maxBits - prefix);
  const mask = hostBits === 0n ? ~0n : (~0n << hostBits) & ((1n << BigInt(maxBits)) - 1n);
  const network = num & mask;
  const broadcast = network + ((1n << hostBits) - 1n);
  return { version, prefix, start: network, end: broadcast, maxBits };
}

function formatRange(info) {
  const toStr = info.version === 4 ? bigintToIPv4 : bigintToIPv6;
  return `${toStr(info.start)} - ${toStr(info.end)}`;
}

function formatCIDR(start, prefix, version) {
  const toStr = version === 4 ? bigintToIPv4 : bigintToIPv6;
  return `${toStr(start)}/${prefix}`;
}

function createCopyBtn(text) {
  const btn = document.createElement('button');
  btn.textContent = 'Copy';
  btn.className = 'copy-btn';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Copy failed', err);
    }
  });
  return btn;
}

// Info section
const infoBtn = document.getElementById('info-btn');
const infoInput = document.getElementById('cidr-input');
const infoResult = document.getElementById('info-result');

infoBtn.addEventListener('click', () => {
  const cidr = infoInput.value.trim();
  const info = parseCIDR(cidr);
  if (!info) {
    infoResult.innerHTML = '<p class="error">Invalid CIDR</p>';
    return;
  }
  const hostBits = BigInt(info.maxBits - info.prefix);
  const totalHosts = 1n << hostBits;
  const toStr = info.version === 4 ? bigintToIPv4 : bigintToIPv6;
  const table = document.createElement('table');
  const rows = [
    ['CIDR', cidr],
    ['Network', toStr(info.start)],
    ['Range', formatRange(info)],
    ['Total Hosts', totalHosts.toString()]
  ];
  table.innerHTML = rows
    .map(
      ([label, value]) =>
        `<tr><th>${label}</th><td>${value}</td><td></td></tr>`
    )
    .join('');
  Array.from(table.rows).forEach((row) => {
    const value = row.cells[1].textContent;
    row.cells[2].appendChild(createCopyBtn(value));
  });
  infoResult.innerHTML = '';
  infoResult.appendChild(table);
});

// Split section
const splitBtn = document.getElementById('split-btn');
const splitCidr = document.getElementById('split-cidr');
const splitPrefix = document.getElementById('split-prefix');
const splitResult = document.getElementById('split-result');

splitBtn.addEventListener('click', () => {
  const base = parseCIDR(splitCidr.value.trim());
  const newPrefix = Number(splitPrefix.value);
  if (!base || Number.isNaN(newPrefix) || newPrefix < base.prefix || newPrefix > base.maxBits) {
    splitResult.innerHTML = '<p class="error">Invalid CIDR or prefix</p>';
    return;
  }
  const count = 1n << BigInt(newPrefix - base.prefix);
  const size = 1n << BigInt(base.maxBits - newPrefix);
  const toStr = base.version === 4 ? bigintToIPv4 : bigintToIPv6;
  const table = document.createElement('table');
  const rows = [];
  for (let i = 0n; i < count; i++) {
    const start = base.start + i * size;
    const cidr = `${toStr(start)}/${newPrefix}`;
    rows.push(`<tr><td>${cidr}</td><td></td></tr>`);
  }
  table.innerHTML = `<tr><th>Subnet</th><th></th></tr>` + rows.join('');
  Array.from(table.rows).slice(1).forEach((row) => {
    const value = row.cells[0].textContent;
    row.cells[1].appendChild(createCopyBtn(value));
  });
  splitResult.innerHTML = '';
  splitResult.appendChild(table);
});

// Merge section
const mergeBtn = document.getElementById('merge-btn');
const mergeCidrs = document.getElementById('merge-cidrs');
const mergeResult = document.getElementById('merge-result');

mergeBtn.addEventListener('click', () => {
  const cidrs = mergeCidrs.value
    .split(/\s+/)
    .map((c) => c.trim())
    .filter(Boolean);
  const parsed = cidrs.map((c) => parseCIDR(c)).filter(Boolean);
  if (parsed.length === 0) {
    mergeResult.innerHTML = '<p class="error">No valid CIDRs provided</p>';
    return;
  }
  const version = parsed[0].version;
  if (parsed.some((p) => p.version !== version)) {
    mergeResult.innerHTML = '<p class="error">Mixed IP versions</p>';
    return;
  }
  const maxBits = parsed[0].maxBits;
  let list = parsed.map((p) => ({ start: p.start, prefix: p.prefix, end: p.end }));
  list.sort((a, b) => (a.start < b.start ? -1 : 1));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < list.length - 1;) {
      const a = list[i];
      const b = list[i + 1];
      if (
        a.prefix === b.prefix &&
        a.end + 1n === b.start &&
        a.start % (1n << BigInt(maxBits - (a.prefix - 1))) === 0n
      ) {
        const merged = {
          start: a.start,
          prefix: a.prefix - 1,
          end: a.start + (1n << BigInt(maxBits - (a.prefix - 1))) - 1n,
        };
        list.splice(i, 2, merged);
        changed = true;
      } else {
        i++;
      }
    }
  }
  const toStr = version === 4 ? bigintToIPv4 : bigintToIPv6;
  const table = document.createElement('table');
  const rows = list.map((p) => {
    const cidr = `${toStr(p.start)}/${p.prefix}`;
    return `<tr><td>${cidr}</td><td></td></tr>`;
  });
  table.innerHTML = `<tr><th>Merged CIDR</th><th></th></tr>` + rows.join('');
  Array.from(table.rows).slice(1).forEach((row) => {
    const value = row.cells[0].textContent;
    row.cells[1].appendChild(createCopyBtn(value));
  });
  mergeResult.innerHTML = '';
  mergeResult.appendChild(table);
});
