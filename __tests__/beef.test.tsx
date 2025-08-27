import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
jest.mock('react-cytoscapejs', () => () => null);
jest.mock('../components/apps/beef/HookGraph', () => () => null);
beforeAll(() => {
  (global as any).URL.createObjectURL = () => '';
});
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';
import Beef from '../components/apps/beef';

describe('BeEF app', () => {
  beforeEach(() => {
    // hide help overlay
    window.localStorage.setItem('beefHelpDismissed', 'true');
    (global as any).fetch = jest.fn();
    (global as any).TextDecoder = TextDecoder;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates hook list when new hooks arrive', async () => {
    jest.useFakeTimers();
    const hookResponses = [
      { hooked_browsers: [{ id: '1' }] },
      { hooked_browsers: [{ id: '1' }, { id: '2' }] },
    ];
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.endsWith('/api/hooks')) {
        const data = hookResponses.shift();
        return Promise.resolve({ json: () => Promise.resolve(data) });
      }
      if (url.endsWith('/api/modules')) {
        return Promise.resolve({ json: () => Promise.resolve({ modules: [] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<Beef />);
    // initial hooks fetch
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.queryByText('2')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('streams module output to UI', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('chunk1'));
        controller.enqueue(encoder.encode('chunk2'));
        controller.close();
      },
    });

    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (url.endsWith('/api/hooks')) {
        return Promise.resolve({ json: () => Promise.resolve({ hooked_browsers: [{ id: '1' }] }) });
      }
      if (url.endsWith('/api/modules') && (!opts || opts.method === 'GET')) {
        return Promise.resolve({ json: () => Promise.resolve({ modules: [{ id: 'mod1', name: 'Module 1' }] }) });
      }
      if (url.includes('/api/modules/mod1/1')) {
        return Promise.resolve({ body: stream });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    render(<Beef />);
    // select hook
    fireEvent.click(await screen.findByText('1'));
    // choose module
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'mod1' } });
    fireEvent.click(screen.getByText('Run Module'));

    expect(await screen.findByText('chunk1chunk2')).toBeInTheDocument();
  });
});
