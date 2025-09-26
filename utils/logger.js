const loggedMessages = new Set()
const apiMetrics = new Map()
const MAX_LATENCY_SAMPLES = 200

const formatKey = (args) => args
  .map(a => {
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

const getNow = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
    const [seconds, nanoseconds] = process.hrtime()
    return seconds * 1000 + nanoseconds / 1e6
  }
  return Date.now()
}

const ensureMetrics = (apiName) => {
  if (!apiMetrics.has(apiName)) {
    apiMetrics.set(apiName, {
      durations: [],
      rateLimitHits: 0,
      p95: 0,
      p99: 0
    })
  }
  return apiMetrics.get(apiName)
}

const percentile = (values, ratio) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
  return Number(sorted[index].toFixed(2))
}

const recordLatency = (apiName, durationMs) => {
  const metrics = ensureMetrics(apiName)
  metrics.durations.push(durationMs)
  if (metrics.durations.length > MAX_LATENCY_SAMPLES) {
    metrics.durations.shift()
  }
  metrics.p95 = percentile(metrics.durations, 0.95)
  metrics.p99 = percentile(metrics.durations, 0.99)
  return {
    p95: metrics.p95,
    p99: metrics.p99,
    sampleSize: metrics.durations.length,
    rateLimitHits: metrics.rateLimitHits
  }
}

const recordRateLimitHit = (apiName) => {
  const metrics = ensureMetrics(apiName)
  metrics.rateLimitHits += 1
  return {
    p95: metrics.p95,
    p99: metrics.p99,
    sampleSize: metrics.durations.length,
    rateLimitHits: metrics.rateLimitHits
  }
}

const getApiMetrics = (apiName) => {
  if (apiName) {
    const metrics = apiMetrics.get(apiName)
    if (!metrics) {
      return { p95: 0, p99: 0, sampleSize: 0, rateLimitHits: 0 }
    }
    return {
      p95: metrics.p95,
      p99: metrics.p99,
      sampleSize: metrics.durations.length,
      rateLimitHits: metrics.rateLimitHits
    }
  }

  const snapshot = {}
  for (const [name, metrics] of apiMetrics.entries()) {
    snapshot[name] = {
      p95: metrics.p95,
      p99: metrics.p99,
      sampleSize: metrics.durations.length,
      rateLimitHits: metrics.rateLimitHits
    }
  }
  return snapshot
}

const logAtLevel = (level, args) => {
  const method = typeof console[level] === 'function' ? console[level] : console.log
  method.apply(console, args)
}

const logger = {
  info: (...args) => logAtLevel('info', args),
  warn: (...args) => logAtLevel('warn', args),
  debug: (...args) => logAtLevel('debug', args),
  error: (...args) => {
    const key = formatKey(args)
    if (loggedMessages.has(key)) return
    loggedMessages.add(key)
    logAtLevel('error', args)
  },
  createApiLogger: (apiName) => {
    const baseMeta = { api: apiName }
    const logWithLevel = (level) => (message, meta = {}) => {
      logger[level](message, { ...baseMeta, ...meta })
    }

    const startTimer = (meta = {}) => {
      const start = getNow()
      let finished = false
      return (additionalMeta = {}) => {
        if (finished) return
        finished = true
        const duration = getNow() - start
        const metrics = recordLatency(apiName, duration)
        logger.info(`${apiName} request completed`, {
          ...baseMeta,
          ...meta,
          ...additionalMeta,
          latencyMs: Number(duration.toFixed ? duration.toFixed(2) : duration),
          p95: metrics.p95,
          p99: metrics.p99,
          sampleSize: metrics.sampleSize
        })
        return metrics
      }
    }

    const trackLatency = (durationMs, meta = {}) => {
      const metrics = recordLatency(apiName, durationMs)
      logger.info(`${apiName} latency recorded`, {
        ...baseMeta,
        ...meta,
        latencyMs: Number(durationMs.toFixed ? durationMs.toFixed(2) : durationMs),
        p95: metrics.p95,
        p99: metrics.p99,
        sampleSize: metrics.sampleSize
      })
      return metrics
    }

    const rateLimit = (message = 'Rate limit hit', meta = {}) => {
      const metrics = recordRateLimitHit(apiName)
      logger.warn(message, {
        ...baseMeta,
        ...meta,
        rateLimitHits: metrics.rateLimitHits
      })
      return metrics
    }

    return {
      info: logWithLevel('info'),
      warn: logWithLevel('warn'),
      error: logWithLevel('error'),
      debug: logWithLevel('debug'),
      startTimer,
      trackLatency,
      rateLimit,
      getMetrics: () => getApiMetrics(apiName)
    }
  },
  getApiMetrics,
  resetApiMetrics: () => apiMetrics.clear()
}

export default logger
