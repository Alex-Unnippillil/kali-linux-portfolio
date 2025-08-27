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
    window.localStorage.setItem('beefHelpDismissed', 'true');
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/beef/hooks')) {
        return Promise.resolve({ json: () => Promise.resolve({ hooked_browsers: [{ id: '1' }] }) });
      }
      if (url.includes('/beef/modules')) {
        return Promise.resolve({ json: () => Promise.resolve({ modules: [{ id: 'mod1', name: 'Module 1', output: 'chunk1chunk2' }] }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    (global as any).TextDecoder = TextDecoder;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders hooks from fixture', async () => {
    render(<Beef />);
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('streams module output to UI', async () => {
    render(<Beef />);
    fireEvent.click(await screen.findByText('1'));
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'mod1' } });
    fireEvent.click(screen.getByText('Run Module'));
    expect(await screen.findByText('chunk1chunk2')).toBeInTheDocument();
  });
});
