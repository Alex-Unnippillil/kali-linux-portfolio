import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import KeyspaceHeatmap, {
  DEFAULT_CHARSETS,
} from '../../../../components/apps/hashcat/KeyspaceHeatmap';

type MockContext = CanvasRenderingContext2D & {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
};

const createMockContext = (): MockContext => {
  let fillStyle = '';
  let strokeStyle = '';
  let lineWidth = 1;
  let font = '';
  return {
    canvas: document.createElement('canvas'),
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    rect: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    setTransform: jest.fn(),
    scale: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn().mockReturnValue({ width: 0 }),
    translate: jest.fn(),
    transform: jest.fn(),
    getTransform: jest.fn(),
    resetTransform: jest.fn(),
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      fillStyle = value;
    },
    get strokeStyle() {
      return strokeStyle;
    },
    set strokeStyle(value: string) {
      strokeStyle = value;
    },
    get lineWidth() {
      return lineWidth;
    },
    set lineWidth(value: number) {
      lineWidth = value;
    },
    get font() {
      return font;
    },
    set font(value: string) {
      font = value;
    },
    drawImage: jest.fn(),
    createPattern: jest.fn(),
    createLinearGradient: jest.fn(),
    createRadialGradient: jest.fn(),
    clip: jest.fn(),
    quadraticCurveTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    arc: jest.fn(),
    arcTo: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    strokeText: jest.fn(),
    isPointInPath: jest.fn(),
    isPointInStroke: jest.fn(),
    rotate: jest.fn(),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    direction: 'ltr',
    filter: 'none',
  } as unknown as MockContext;
};

let getContextSpy: jest.SpyInstance;

describe('KeyspaceHeatmap', () => {
  beforeEach(() => {
    getContextSpy = jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockContext());
  });

  afterEach(() => {
    getContextSpy.mockRestore();
  });

  it('updates mask input and notifies parent handler', () => {
    const handleMaskChange = jest.fn();
    const { getByLabelText } = render(
      <KeyspaceHeatmap mask="?d" onMaskChange={handleMaskChange} />
    );
    const input = getByLabelText('Mask') as HTMLInputElement;
    expect(input.value).toBe('?d');
    fireEvent.change(input, { target: { value: '?d?l' } });
    expect(handleMaskChange).toHaveBeenCalledWith('?d?l');
  });

  it('propagates charset size adjustments', () => {
    const handleCharsetsChange = jest.fn();
    const { getByLabelText } = render(
      <KeyspaceHeatmap
        mask="?d"
        charsets={DEFAULT_CHARSETS}
        onCharsetsChange={handleCharsetsChange}
      />
    );
    const digitsInput = getByLabelText('Digits (?d) size') as HTMLInputElement;
    fireEvent.change(digitsInput, { target: { value: '15' } });
    expect(handleCharsetsChange).toHaveBeenCalled();
    const latest = handleCharsetsChange.mock.calls.pop()?.[0] as {
      id: string;
      size: number;
    }[];
    expect(latest).toBeDefined();
    expect(latest?.find((set) => set.id === '?d')?.size).toBe(15);
  });

  it('renders efficiently for large datasets', () => {
    const largeCharsets = Array.from({ length: 200 }, (_, index) => ({
      id: `?c${index}`,
      label: `Set ${index}`,
      size: index + 1,
    }));
    const longMask = Array.from({ length: 120 }, () => '?a').join('');
    const { container } = render(
      <KeyspaceHeatmap mask={longMask} charsets={largeCharsets} />
    );
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(1);
    expect(getContextSpy).toHaveBeenCalledWith('2d');
    const width = canvases[0].style.width;
    expect(width.endsWith('px')).toBe(true);
    expect(parseFloat(width)).toBeGreaterThan(0);
  });
});
