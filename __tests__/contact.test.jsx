import { processContactForm } from '../components/apps/contact';
describe('contact form', () => {
    it('invalid email blocked', async () => {
        const fetchMock = jest.fn();
        const result = await processContactForm({ name: 'A', email: 'invalid', message: 'Hi', honeypot: '' }, fetchMock);
        expect(result.success).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it('success posts to api', async () => {
        const fetchMock = jest.fn().mockResolvedValue({ ok: true });
        const result = await processContactForm({ name: 'Alex', email: 'alex@example.com', message: 'Hello', honeypot: '' }, fetchMock);
        expect(fetchMock).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
        expect(result.success).toBe(true);
    });
});
