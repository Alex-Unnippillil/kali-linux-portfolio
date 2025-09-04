export interface DesktopEntry {
  id: string;
  title: string;
  icon: string;
  categories: string[];
}

/**
 * Parse a minimal `.desktop`-like JSON object.
 * Accepts either a `categories` array or a semicolon delimited
 * `Categories` string similar to the freedesktop specification.
 */
export function parseDesktopEntry(data: any): DesktopEntry {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid desktop entry');
  }

  const id = String(data.id ?? data.ID ?? '');
  const title = String(data.title ?? data.Name ?? '');
  const icon = String(data.icon ?? data.Icon ?? '');

  let categories: string[] = [];
  if (Array.isArray((data as any).categories)) {
    categories = (data as any).categories.map(String);
  } else if (typeof (data as any).Categories === 'string') {
    categories = (data as any).Categories.split(';').filter(Boolean);
  }

  return { id, title, icon, categories };
}
