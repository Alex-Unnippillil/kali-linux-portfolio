import { enqueueTelemetry } from './telemetry'

const loggedMessages = new Set()

const formatKey = (args) =>
  args
    .map((a) => {
      if (a instanceof Error) {
        return a.stack || a.message
      }
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a)
        } catch {
          return String(a)
        }
      }
      return String(a)
    })
    .join(' ')

const normalizeArg = (arg) => {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: typeof arg.stack === 'string' ? arg.stack.split('\n').slice(0, 5) : [],
    }
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.parse(JSON.stringify(arg))
    } catch {
      return { summary: String(arg) }
    }
  }
  return arg
}

const logger = {
  error: (...args) => {
    const key = formatKey(args)
    if (loggedMessages.has(key)) return
    loggedMessages.add(key)
    console.error(...args)
    if (typeof window !== 'undefined') {
      enqueueTelemetry('errors', {
        message: args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' '),
        arguments: args.map(normalizeArg),
      })
    }
  },
}

export default logger
