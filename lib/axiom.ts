const AXIOM_TOKEN = process.env.NEXT_PUBLIC_AXIOM_TOKEN;
const AXIOM_DATASET = process.env.NEXT_PUBLIC_AXIOM_DATASET;

export const initAxiom = (): void => {
  // initialization happens via environment variables
};

export const logEvent = async (
  event: Record<string, unknown>
): Promise<void> => {
  if (!AXIOM_TOKEN || !AXIOM_DATASET) return;
  try {
    await fetch(`https://api.axiom.co/v1/datasets/${AXIOM_DATASET}/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AXIOM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([event]),
    });
  } catch {
    // ignore logging errors
  }
};

