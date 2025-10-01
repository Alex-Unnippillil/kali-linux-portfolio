import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CallGraph from '../components/apps/ghidra/CallGraph';

const parseMatrix = (value: string | null): number[] => {
  const match = value?.match(/matrix\(([^)]+)\)/);
  const parts = match ? match[1].trim().split(/\s+/).map(Number) : [];
  expect(parts.length).toBe(6);
  return parts;
};

describe('CallGraph pan and zoom controls', () => {
  const originalMatchMedia = window.matchMedia;

  beforeAll(() => {
    window.matchMedia = (query: string) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      } as unknown as MediaQueryList;
    };
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    jest
      .spyOn(SVGElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        top: 0,
        left: 0,
        right: 200,
        bottom: 200,
        toJSON: () => {},
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('wheel input updates zoom while respecting bounds', () => {
    const { getByTestId } = render(
      <CallGraph func={{ name: 'main', calls: ['helper'] }} callers={['entry']} onSelect={jest.fn()} />,
    );

    const controller = getByTestId('call-graph-controller');
    const content = getByTestId('call-graph-content');

    fireEvent.wheel(controller, { deltaY: -100 });
    const initialMatrix = content.getAttribute('transform');
    const initialParts = parseMatrix(initialMatrix);
    const initialScale = initialParts[0];
    expect(initialScale).toBeGreaterThan(1);

    for (let i = 0; i < 20; i += 1) {
      fireEvent.wheel(controller, { deltaY: -1000 });
    }
    const maxMatrix = content.getAttribute('transform');
    const maxParts = parseMatrix(maxMatrix);
    const maxScale = maxParts[0];
    expect(maxScale).toBeLessThanOrEqual(3);

    for (let i = 0; i < 40; i += 1) {
      fireEvent.wheel(controller, { deltaY: 1000 });
    }
    const minMatrix = content.getAttribute('transform');
    const minParts = parseMatrix(minMatrix);
    const minScale = minParts[0];
    expect(minScale).toBeGreaterThanOrEqual(0.5);
  });

  test('keyboard arrows pan the viewport', async () => {
    const { getByTestId } = render(
      <CallGraph func={{ name: 'main', calls: ['helper'] }} callers={['entry']} onSelect={jest.fn()} />,
    );

    const controller = getByTestId('call-graph-controller');
    const content = getByTestId('call-graph-content');

    controller.focus();
    fireEvent.keyDown(controller, { key: 'ArrowRight' });

    await waitFor(() => {
      const matrix = content.getAttribute('transform');
      const parts = parseMatrix(matrix);
      const translateX = parts[4];
      expect(translateX).toBeGreaterThan(0);
    });
  });
});
