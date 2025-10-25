import { render, fireEvent } from '@testing-library/react';
import TextToAscii from '../components/apps/text_to_ascii';

test('converts text to ASCII codes', () => {
  const { container } = render(<TextToAscii />);
  const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: 'ABC' } });
  const pre = container.querySelector('pre');
  expect(pre?.textContent).toBe('65 66 67');
});
