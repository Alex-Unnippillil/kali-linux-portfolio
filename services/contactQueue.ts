import {
  clearActions,
  countActions,
  deleteAction,
  enqueueAction,
  getActions,
  isQueueSupported,
} from './actionQueue';
import { contactSchema } from '../utils/contactSchema';

export const CONTACT_QUEUE_TAG = 'contact-submission';
export const CONTACT_SYNC_TAG = 'contact-sync';

const sanitize = (str: string): string =>
  str.replace(/[&<>"']/g, (c) =>
    (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      } as const
    )[c]!,
  );

export interface ContactSubmissionInput {
  name: string;
  email: string;
  message: string;
  honeypot: string;
  csrfToken: string;
  recaptchaToken: string;
}

export interface ContactSubmissionRequest {
  csrfToken: string;
  requestBody: {
    name: string;
    email: string;
    message: string;
    honeypot: string;
    recaptchaToken: string;
  };
}

export const prepareContactSubmission = (
  data: ContactSubmissionInput,
): ContactSubmissionRequest => {
  const parsed = contactSchema.parse(data);
  return {
    csrfToken: parsed.csrfToken,
    requestBody: {
      name: sanitize(parsed.name),
      email: parsed.email,
      message: sanitize(parsed.message),
      honeypot: parsed.honeypot,
      recaptchaToken: parsed.recaptchaToken,
    },
  };
};

export const queueContactSubmission = async (
  submission: ContactSubmissionRequest,
): Promise<number | null> => enqueueAction(CONTACT_QUEUE_TAG, submission);

export const countQueuedContactSubmissions = async (): Promise<number> =>
  countActions(CONTACT_QUEUE_TAG);

export const clearContactQueue = async (): Promise<void> =>
  clearActions(CONTACT_QUEUE_TAG);

export const flushContactQueue = async (
  fetchImpl: typeof fetch = fetch,
): Promise<void> => {
  const actions = await getActions<ContactSubmissionRequest>(CONTACT_QUEUE_TAG);
  if (!actions.length) return;

  await Promise.all(
    actions.map(async (action) => {
      try {
        const response = await fetchImpl('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': action.payload.csrfToken,
          },
          body: JSON.stringify(action.payload.requestBody),
        });
        if (response.ok) {
          await deleteAction(action.id);
        }
      } catch {
        // Keep for retry
      }
    }),
  );
};

export const registerContactBackgroundSync = async (): Promise<boolean> => {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    typeof (window as any).SyncManager === 'undefined'
  ) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(CONTACT_SYNC_TAG);
    return true;
  } catch (error) {
    console.warn('Background sync registration failed', error);
    return false;
  }
};

export const notifyQueueUpdated = (): void => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const controller = navigator.serviceWorker.controller;
  controller?.postMessage({ type: 'contact-queue-updated' });
};

export const queueUnavailableMessage =
  'Offline retry is unavailable on this browser. Messages will need to be sent manually once you are online again.';

export { isQueueSupported };
