# Performance Monitoring

This project leverages Vercel's Web Analytics and Speed Insights to track usage and monitor page performance.

## Analytics

`pages/_app.jsx` includes the `<Analytics />` component from `@vercel/analytics/react` to capture anonymous usage metrics. Events for `/admin` and `/private` routes and any email metadata are filtered before sending.

## Speed Insights

The `<SpeedInsights />` component from `@vercel/speed-insights/next` is dynamically loaded in production to measure Core Web Vitals.

## Configuration

Analytics and Speed Insights are enabled in `vercel.json`:

```json
{
  "analytics": { "source": "auto" },
  "speedInsights": { "source": "auto" }
}
```

Ensure these features are also enabled in your Vercel project settings to collect data for deployments.
