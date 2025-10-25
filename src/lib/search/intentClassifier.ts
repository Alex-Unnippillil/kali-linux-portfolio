// Lightweight search intent classifier to keep p90 latency <20ms
// Patterns are precompiled at module load so the function remains synchronous
// and edge-friendly.
import trackServerEvent from '@/lib/analytics-server';

export type SearchIntent = 'definition' | 'compare' | 'example' | 'risk';

// Precompiled regexes for different intents
const comparePattern = /\b(compare|vs|versus|difference between|differ)\b/i;
const examplePattern = /\b(example|examples|sample|demo)\b/i;
const riskPattern = /\b(risk|danger|threat|hazard|impact)\b/i;

/**
 * Classify a search query into an intent and log it for analytics.
 * The function is synchronous and uses simple heuristics to ensure
 * sub-millisecond execution when deployed to the edge.
 */
export default function classifySearchIntent(query: string): SearchIntent {
  const normalized = query.toLowerCase();
  let intent: SearchIntent;

  if (comparePattern.test(normalized)) {
    intent = 'compare';
  } else if (examplePattern.test(normalized)) {
    intent = 'example';
  } else if (riskPattern.test(normalized)) {
    intent = 'risk';
  } else {
    intent = 'definition';
  }

  // Log query and detected intent for analytics. Fire-and-forget to avoid latency.
  trackServerEvent('search_intent', { query, intent }).catch(() => {});

  return intent;
}
