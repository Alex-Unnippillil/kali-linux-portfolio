'use server';

type DummyPayload = {
  name: string;
  email: string;
  message: string;
};

type DummyResult = {
  success: boolean;
  code?: 'server_unavailable';
};

export async function submitDummyFormAction(
  payload: DummyPayload,
): Promise<DummyResult> {
  try {
    if (!payload.name || !payload.email || !payload.message) {
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.error('submitDummyFormAction failed', error);
    return { success: false, code: 'server_unavailable' };
  }
}

