'use server';

import { cookies, headers } from 'next/headers';

import {
  handleContactSubmission,
  type ContactSubmissionPayload,
  type ContactSubmissionResult,
} from '@/services/contactSubmission';

type ContactActionPayload = ContactSubmissionPayload;

export async function submitContactAction(
  payload: ContactActionPayload,
): Promise<ContactSubmissionResult> {
  try {
    const cookieStore = cookies();
    const csrfCookie = cookieStore.get('csrfToken')?.value ?? '';
    const headerStore = headers();
    const forwarded = headerStore.get('x-forwarded-for') ?? '';
    const ip = forwarded.split(',')[0]?.trim() || 'local';

    return await handleContactSubmission(payload, {
      ip,
      csrfCookie,
    });
  } catch (error) {
    console.error('submitContactAction failed', error);
    return { success: false, code: 'server_unavailable', status: 503 };
  }
}

