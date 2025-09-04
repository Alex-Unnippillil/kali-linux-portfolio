export interface DesktopEntry {
  name: string;
  exec: string;
  icon: string;
  categories: string[];
}

export interface DesktopLikeJSON {
  Name: string;
  Exec: string;
  Icon?: string;
  Categories?: string[] | string;
}

/**
 * Parse a .desktop-like JSON object into a normalized DesktopEntry.
 * Accepts both array or semicolon-separated string for Categories.
 */
export function parseDesktopEntry(data: DesktopLikeJSON): DesktopEntry {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid desktop entry');
  }

  const name = String(data.Name ?? '').trim();
  const exec = String(data.Exec ?? '').trim();
  const icon = String(data.Icon ?? '').trim();
  let categories: string[] = [];

  if (Array.isArray(data.Categories)) {
    categories = data.Categories.map((c) => String(c).trim()).filter(Boolean);
  } else if (typeof data.Categories === 'string') {
    categories = data.Categories.split(';').map((c) => c.trim()).filter(Boolean);
  }

  if (!name || !exec) {
    throw new Error('Desktop entry must include Name and Exec');
  }

  return { name, exec, icon, categories };
}
