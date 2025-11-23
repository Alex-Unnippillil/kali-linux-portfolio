import { processContactForm } from '../components/apps/contact';
import {
  clearContactQueue,
  countQueuedContactSubmissions,
  flushContactQueue,
  queueContactSubmission,
} from '@/services/contactQueue';

describe('contact offline queue', () => {
  beforeEach(async () => {
    await clearContactQueue();
  });

  it('queues and flushes contact submissions when connectivity returns', async () => {
    const offlineFetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await processContactForm(
      {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello from offline test',
        honeypot: '',
        csrfToken: 'csrf-token',
        recaptchaToken: 'recaptcha-token',
      },
      offlineFetch,
    );

    expect(result.code).toBe('network_error');
    expect(result.queuedSubmission).toBeDefined();

    await queueContactSubmission(result.queuedSubmission!);
    expect(await countQueuedContactSubmissions()).toBe(1);

    const onlineFetch = jest.fn().mockResolvedValue({ ok: true });
    await flushContactQueue(onlineFetch);

    expect(onlineFetch).toHaveBeenCalledTimes(1);
    expect(await countQueuedContactSubmissions()).toBe(0);
  });

  it('keeps submissions queued when the retry fails', async () => {
    const offlineFetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await processContactForm(
      {
        name: 'Casey',
        email: 'casey@example.com',
        message: 'Retry me later',
        honeypot: '',
        csrfToken: 'csrf-token',
        recaptchaToken: 'recaptcha-token',
      },
      offlineFetch,
    );

    expect(result.code).toBe('network_error');

    await queueContactSubmission(result.queuedSubmission!);
    expect(await countQueuedContactSubmissions()).toBe(1);

    const failingFetch = jest.fn().mockResolvedValue({ ok: false });
    await flushContactQueue(failingFetch);

    expect(failingFetch).toHaveBeenCalledTimes(1);
    expect(await countQueuedContactSubmissions()).toBe(1);
  });
});
