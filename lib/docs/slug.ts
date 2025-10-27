export function slugifyDocSegment(segment: string): string {
  const withoutExtension = segment.replace(/\.[^.]+$/, '');
  return withoutExtension
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function joinDocSlugSegments(segments: string[]): string {
  return segments.filter(Boolean).join('/');
}

export function normalizeDocSlug(input: string | string[] | undefined): string | undefined {
  if (typeof input === 'undefined') return undefined;
  const segments = Array.isArray(input) ? input : [input];
  const normalized = segments.map((segment, index) => {
    if (index === segments.length - 1) {
      const cleaned = segment.replace(/\.mdx?$/i, '').replace(/\.txt$/i, '');
      return slugifyDocSegment(cleaned);
    }
    return slugifyDocSegment(segment);
  });
  const slug = joinDocSlugSegments(normalized);
  return slug || undefined;
}
