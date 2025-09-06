import { act } from 'react';
import { notify } from '../utils/notify';

describe('notify', () => {
  it('renders toast with provided data', async () => {
    const originalError = console.error;
    console.error = jest.fn();
    await act(async () => {
      notify({ title: 'Hello', body: 'World', icon: 'test-icon.svg' });
      await new Promise(r => setTimeout(r, 0));
    });
    const toast = document.querySelector('[role="status"]') as HTMLElement;
    expect(toast).toHaveTextContent('Hello');
    expect(toast).toHaveTextContent('World');
    const img = toast.querySelector('img');
    expect(img).toHaveAttribute('src', 'test-icon.svg');
    console.error = originalError;
  });
});
