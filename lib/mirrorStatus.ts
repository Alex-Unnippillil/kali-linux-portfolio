export interface MirrorStatus {
  status: string;
  last_sync: string;
  traffic: Record<string, number>;
}

/**
 * Fetch mirror status from the Kali mirror status API.
 * Results are edge-cached for 10 minutes.
 */
export async function getMirrorStatus(
  fetchImpl: typeof fetch = fetch,
): Promise<MirrorStatus | null> {
  try {
    const res = await fetchImpl(
      'https://mirror-status.kali.org/api/status',
      {
        // Next.js will cache this fetch for 10 minutes at the edge.
        next: { revalidate: 600 },
      } as any,
    );
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return {
      status: data.status ?? 'unknown',
      last_sync: data.last_sync ?? data.lastSync ?? '',
      traffic: data.traffic ?? data.stats ?? {},
    };
  } catch {
    return null;
  }
}
