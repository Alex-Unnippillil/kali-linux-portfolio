import React from 'react';
import ReactDOMServer from 'react-dom/server';
import GhidraPage from '../apps/ghidra';
import WiresharkPage from '../apps/wireshark';

jest.mock('next/image', () => {
  const MockedImage = (props: any) => <img {...props} alt={props.alt ?? ''} />;
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

describe('SSR compatibility for WASM-heavy pages', () => {
  const originalWebAssembly = global.WebAssembly;

  beforeEach(() => {
    // @ts-ignore - allow overriding the global constructor for test isolation
    global.WebAssembly = undefined;
  });

  afterEach(() => {
    // @ts-ignore - restore whichever implementation the environment provided
    global.WebAssembly = originalWebAssembly;
  });

  it('renders the standalone Ghidra page without crashing', () => {
    expect(() => ReactDOMServer.renderToString(<GhidraPage />)).not.toThrow();
  });

  it('renders the standalone Wireshark page without crashing', () => {
    expect(() => ReactDOMServer.renderToString(<WiresharkPage />)).not.toThrow();
  });
});
