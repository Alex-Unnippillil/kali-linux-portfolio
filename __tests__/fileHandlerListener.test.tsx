import { render, screen, act } from '@testing-library/react';
import FileHandlerListener from '../components/file/FileHandlerListener';

describe('FileHandlerListener', () => {
  test('displays content from opened file', async () => {
    const mockSetConsumer = jest.fn();
    (window as any).launchQueue = { setConsumer: mockSetConsumer };

    render(<FileHandlerListener />);

    const consumer = mockSetConsumer.mock.calls[0][0];
    const file = { text: async () => 'hello world', name: 'test.txt', type: 'text/plain' } as any;

    await act(async () => {
      await consumer({
        files: [
          {
            getFile: async () => file,
          },
        ],
      });
    });

    expect(await screen.findByTestId('file-content')).toHaveTextContent('hello world');
  });
});
