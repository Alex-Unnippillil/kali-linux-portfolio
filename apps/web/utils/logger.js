const loggedMessages = new Set()

const formatKey = (args) => args
  .map(a => {
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

const logger = {
  error: (...args) => {
    const key = formatKey(args)
    if (loggedMessages.has(key)) return
    loggedMessages.add(key)
    console.error(...args)
  }
}

export default logger
