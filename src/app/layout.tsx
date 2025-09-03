'use client'

import React, { useEffect } from 'react'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { getCLS, getINP } from 'web-vitals'
import { autoInstrumentations } from '@opentelemetry/auto-instrumentations-web'
import { usePathname } from 'next/navigation'
import 'zone.js'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  useEffect(() => {
    const provider = new WebTracerProvider()
    provider.addSpanProcessor(
      new SimpleSpanProcessor(
        new OTLPTraceExporter({
          url:
            process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_URL ||
            'http://localhost:4318/v1/traces',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    provider.register({ contextManager: new ZoneContextManager() })

    registerInstrumentations({
      instrumentations: [autoInstrumentations()],
    })

    const tracer = provider.getTracer('web')

    ;(window as any).__startStreamTrace = () => {
      const span = tracer.startSpan('stream')
      const t0 = performance.now()
      return {
        firstToken() {
          const t1 = performance.now()
          span.addEvent('first-token', { 'elapsed_ms': t1 - t0 })
        },
        render() {
          const t2 = performance.now()
          span.addEvent('render', { 'elapsed_ms': t2 - t0 })
          span.end()
        },
      }
    }

    const routeSpan = tracer.startSpan('route-change', {
      attributes: { url: path },
    })

    getCLS((metric) => {
      routeSpan.setAttribute('webvital.cls', metric.value)
    })
    getINP((metric) => {
      routeSpan.setAttribute('webvital.inp', metric.value)
    })

    return () => {
      routeSpan.end()
    }
  }, [path])

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
