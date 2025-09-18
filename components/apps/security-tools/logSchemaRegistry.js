const registry = new Map();

export function registerLogSchema(name, config) {
  if (!config || typeof config !== 'object') {
    throw new Error('log schema config is required');
  }
  const { schema, timestampKey, fields } = config;
  if (!schema || typeof schema.safeParse !== 'function') {
    throw new Error(`schema for "${name}" must be a zod schema`);
  }
  if (!timestampKey || typeof timestampKey !== 'string') {
    throw new Error(`timestampKey for "${name}" must be provided`);
  }
  if (!Array.isArray(fields)) {
    throw new Error(`fields for "${name}" must be an array`);
  }

  registry.set(name, {
    ...config,
    fields: fields.map((field) =>
      typeof field === 'object' && field !== null ? field : { key: String(field), label: String(field) },
    ),
  });

  return registry.get(name);
}

export function getRegisteredLogSchema(name) {
  return registry.get(name) || null;
}

