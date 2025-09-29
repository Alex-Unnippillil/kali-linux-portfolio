export const applyFilters = (text: string, packets: string[]) => {
  let result = packets;
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [cmd, ...rest] = line.split(/\s+/);
      if (cmd === 'drop') {
        const pattern = rest.join(' ');
        result = result.filter((p) => !p.includes(pattern));
      } else if (cmd === 'replace') {
        const [pattern, replacement] = rest;
        if (pattern && replacement !== undefined) {
          result = result.map((p) => p.split(pattern).join(replacement));
        }
      }
    });
  return result;
};

export default applyFilters;
