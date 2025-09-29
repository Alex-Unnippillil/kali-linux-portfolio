import { submitDummyFormAction } from '@/app/actions/dummy';

type DummyPayload = {
  name: string;
  email: string;
  message: string;
};

export type DummySubmissionResult = {
  success: boolean;
  via: 'server' | 'client';
};

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
let disableServerAction = isStaticExport;

export const submitDummyForm = async (
  payload: DummyPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<DummySubmissionResult> => {
  if (!disableServerAction) {
    try {
      const result = await submitDummyFormAction(payload);
      if (result?.success) {
        return { success: true, via: 'server' };
      }
      if (result?.code === 'server_unavailable') {
        disableServerAction = true;
      } else if (result && !result.success) {
        return { success: false, via: 'server' };
      }
    } catch {
      disableServerAction = true;
    }
  }

  try {
    const res = await fetchImpl('/api/dummy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { success: false, via: 'client' };
    }
    return { success: true, via: 'client' };
  } catch {
    return { success: false, via: 'client' };
  }
};

