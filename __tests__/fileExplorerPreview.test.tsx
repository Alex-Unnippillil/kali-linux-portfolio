import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

import Preview, { detectFileKind, PreviewLoadInfo } from '../apps/file-explorer/components/Preview';

describe('detectFileKind', () => {
  it('detects json from mime and extension', () => {
    const jsonFile = new File([JSON.stringify({ hello: 'world' })], 'data.json', {
      type: 'application/json',
    });
    expect(detectFileKind(jsonFile)).toBe('json');

    const geoFile = new File(['{}'], 'map.geojson');
    expect(detectFileKind(geoFile)).toBe('json');
  });

  it('detects images and text types', () => {
    const image = new File([new Uint8Array([0, 1, 2])], 'photo.png', {
      type: 'image/png',
    });
    expect(detectFileKind(image)).toBe('image');

    const text = new File(['hello'], 'README.md', { type: 'text/markdown' });
    expect(detectFileKind(text)).toBe('text');

    const unknown = new File([new Uint8Array([1, 2, 3])], 'archive.bin', { type: 'application/octet-stream' });
    expect(detectFileKind(unknown)).toBe('binary');
  });
});

describe('Preview component', () => {
  const createObjectURL = URL.createObjectURL || (() => 'blob://test');
  const revokeObjectURL = URL.revokeObjectURL || (() => {});

  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: jest.fn(createObjectURL),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: jest.fn(revokeObjectURL),
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });
  });

  it('renders text preview for text files', async () => {
    const file = new File(['The quick brown fox'], 'story.txt', { type: 'text/plain' });
    render(<Preview file={file} />);

    const textNode = await screen.findByTestId('preview-text');
    expect(textNode.textContent).toContain('The quick brown fox');
  });

  it('renders formatted JSON preview', async () => {
    const file = new File([JSON.stringify({ foo: 'bar', nested: { value: 1 } })], 'data.json');
    render(<Preview file={file} />);

    const jsonNode = await screen.findByTestId('preview-json');
    expect(jsonNode.textContent).toContain('"foo": "bar"');
    expect(jsonNode.textContent).toContain('"nested"');
  });

  it('renders image preview and revokes object URL on unmount', async () => {
    const file = new File([new Uint8Array([0, 1, 2])], 'photo.png', { type: 'image/png' });
    const { unmount } = render(<Preview file={file} />);

    const image = await screen.findByTestId('preview-image');
    expect(image).toHaveAttribute('src');

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('reports fast load times for files under 2MB', async () => {
    const size = 1.5 * 1024 * 1024;
    const content = 'a'.repeat(size);
    const file = new File([content], 'large.txt', { type: 'text/plain' });
    const loadSpy = jest.fn((info: PreviewLoadInfo) => info);

    const nowSpy = jest.spyOn(performance, 'now');
    let calls = 0;
    nowSpy.mockImplementation(() => {
      calls += 1;
      if (calls === 1) return 0;
      return 100;
    });

    render(<Preview file={file} onLoad={loadSpy} />);

    await waitFor(() => expect(loadSpy).toHaveBeenCalled());

    const info = loadSpy.mock.calls[0][0];
    expect(info.duration).toBeLessThan(150);
    expect(info.withinTarget).toBe(true);
    expect(info.size).toBe(file.size);

    nowSpy.mockRestore();
  });
});
