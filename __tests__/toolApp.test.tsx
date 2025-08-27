import { render, screen, waitFor } from '@testing-library/react';
import ToolApp from '../components/apps/tool-app';

describe('ToolApp', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders docs panel when safe_embed is false', async () => {
    global.fetch = jest.fn((url: RequestInfo) => {
      if (typeof url === 'string' && url.endsWith('.yaml')) {
        return Promise.resolve({ text: () => Promise.resolve(`title: Test\nhomepage: https://example.com\ndocs: https://example.com/docs\nlicense: MIT\nsafe_embed: false`) }) as any;
      }
      return Promise.resolve({ text: () => Promise.resolve('## Overview\nDocs content') }) as any;
    });

    render(<ToolApp id="test" />);

    await waitFor(() => expect(screen.getByText('Docs content')).toBeInTheDocument());
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
  });

  test('renders sandboxed iframe when safe_embed is true', async () => {
    global.fetch = jest.fn((url: RequestInfo) =>
      Promise.resolve({ text: () => Promise.resolve(`title: Frame\nhomepage: https://frame.example\ndocs: https://frame.example/docs\nlicense: MIT\nsafe_embed: true`) }) as any
    );

    render(<ToolApp id="frame" />);

    await waitFor(() => expect(screen.getByTitle('Frame')).toBeInTheDocument());
    const iframe = screen.getByTitle('Frame');
    expect(iframe).toHaveAttribute('sandbox');
    expect(iframe).toHaveAttribute('src', 'https://frame.example');
  });
});
