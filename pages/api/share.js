const SUPPORTED_METHODS = ['GET', 'POST'];

function normalizeValue(value) {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = normalizeValue(entry);
      if (normalized) {
        return normalized;
      }
    }
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const asString = normalizeValue(value);
    if (asString) {
      return asString;
    }
  }
  return '';
}

export default function handler(req, res) {
  if (!SUPPORTED_METHODS.includes(req.method)) {
    res.setHeader('Allow', SUPPORTED_METHODS.join(', '));
    res.status(405).end();
    return;
  }

  const { body = {}, query = {} } = req;
  const content = firstNonEmpty(
    body.text,
    query.text,
    body.url,
    query.url,
    body.title,
    query.title,
  );

  const params = new URLSearchParams();
  if (content) {
    params.set('text', content);
  }

  const redirectTarget = `/apps/sticky_notes/${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  res.redirect(307, redirectTarget);
}
