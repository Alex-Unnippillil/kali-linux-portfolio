const loggedMessages = new Set()

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const redactString = (input, packages) =>
  packages.reduce(
    (acc, pkg) => acc.replace(new RegExp(escapeRegExp(pkg), 'gi'), '[redacted]'),
    input,
  )

const sanitizeValue = (value, packages, seen = new WeakSet()) => {
  if (!packages.length) return value
  if (typeof value === 'string') {
    return redactString(value, packages)
  }
  if (value instanceof Error) {
    const result = {
      name: value.name,
      message: redactString(value.message || '', packages),
    }
    if (value.stack) {
      result.stack = redactString(value.stack, packages)
    }
    return result
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) return value
    seen.add(value)
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, packages, seen))
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, sanitizeValue(val, packages, seen)]),
    )
  }
  return value
}

const sanitizeArgs = (args, packages) =>
  args.map((arg) => sanitizeValue(arg, packages))

const formatKey = (args) =>
  args
    .map((a) => {
      if (a instanceof Error) {
        return a.stack || a.message
      }
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a)
        } catch {
          return String(a)
        }
      }
      return String(a)
    })
    .join(' ')

const logInternal = (packages, args) => {
  const list = Array.isArray(packages) ? packages : []
  const sanitized = list.length ? sanitizeArgs(args, list) : args
  const key = formatKey(sanitized)
  if (loggedMessages.has(key)) return sanitized
  loggedMessages.add(key)
  console.error(...sanitized)
  return sanitized
}

const redactValue = (value, packages = []) => sanitizeValue(value, packages)

const logger = {
  error: (...args) => {
    logInternal([], args)
  },
  errorWithRedaction: (packages, ...args) => logInternal(packages, args),
  redactValue,
}

export { redactValue }

export default logger
