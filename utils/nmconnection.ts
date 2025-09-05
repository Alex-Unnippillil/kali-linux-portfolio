export interface NMSection {
  [key: string]: string | number | boolean;
}

export interface NMConnection {
  [section: string]: NMSection;
}

/**
 * Converts a NetworkManager-style connection object into keyfile format.
 */
export function toKeyfile(connection: NMConnection): string {
  const sections: string[] = [];
  for (const [sectionName, entries] of Object.entries(connection)) {
    const lines = [`[${sectionName}]`];
    for (const [key, value] of Object.entries(entries)) {
      lines.push(`${key}=${String(value)}`);
    }
    sections.push(lines.join('\n'));
  }
  return sections.join('\n\n');
}
