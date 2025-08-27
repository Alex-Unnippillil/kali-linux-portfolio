import { processContactForm, generateVCard } from '../components/apps/contact';

describe('contact form', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('invalid email blocked', async () => {
    const clipboard = { writeText: jest.fn() } as any;
    const result = await processContactForm(
      { name: 'A', email: 'invalid', message: 'Hi', honeypot: '' },
      {
        clipboard,
        open: jest.fn(),
        createObjectURL: jest.fn(),
        document,
        sessionStorage: window.sessionStorage,
        now: () => 0,
      }
    );
    expect(result.success).toBe(false);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('success copies full message', async () => {
    const clipboard = { writeText: jest.fn().mockResolvedValue(undefined) } as any;
    const open = jest.fn();
    const anchor = document.createElement('a');
    const click = jest.spyOn(anchor, 'click');
    const createElement = jest.spyOn(document, 'createElement').mockReturnValue(anchor);
    await processContactForm(
      { name: 'Alex', email: 'alex@example.com', message: 'Hello', honeypot: '' },
      {
        clipboard,
        open,
        createObjectURL: jest.fn().mockReturnValue('blob:'),
        document,
        sessionStorage: window.sessionStorage,
        now: () => 60_001,
      }
    );
    expect(clipboard.writeText).toHaveBeenCalledWith(
      'Name: Alex\nEmail: alex@example.com\nMessage: Hello'
    );
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^mailto:/));
    expect(click).toHaveBeenCalled();
    createElement.mockRestore();
  });

  it('vCard downloads', () => {
    const v = generateVCard('Alex', 'alex@example.com');
    expect(v).toContain('BEGIN:VCARD');
    expect(v).toContain('EMAIL:alex@example.com');
  });
});
