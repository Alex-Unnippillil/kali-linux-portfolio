import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TracerouteMap from '@/apps/dns-toolkit/components/TracerouteMap';
import { TRACEROUTE_HOPS } from '@/apps/dns-toolkit/mocks/traceroute';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, className, style }: any) => (
    <div data-testid="leaflet-map" className={className} style={style}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Polyline: () => null,
  CircleMarker: ({ children }: any) => <div data-testid="leaflet-circle">{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="leaflet-tooltip">{children}</div>,
}));

describe('TracerouteMap animation controls', () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  let rafId = 1;
  let rafSpy: jest.SpyInstance<number, [FrameRequestCallback]>;
  let cancelSpy: jest.SpyInstance<void, [number]>;

  const flushFrame = (timestamp: number) => {
    const pending = Array.from(callbacks.entries());
    callbacks.clear();
    pending.forEach(([, cb]) => cb(timestamp));
  };

  const getFrameIndex = () => Number((screen.getByTestId('frame-index').textContent ?? '0').trim());
  const getAnimationState = () => (screen.getByTestId('animation-state').textContent ?? '').trim();
  const getLatencyText = (index: number) =>
    (screen.getByTestId(`hop-latency-${index}`).textContent ?? '').trim();

  beforeEach(() => {
    callbacks.clear();
    rafId = 1;
    rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = rafId++;
      callbacks.set(id, cb);
      return id;
    });
    cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      callbacks.delete(id);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    callbacks.clear();
  });

  test('pausing stops the animation loop and resume continues from the saved frame', async () => {
    render(<TracerouteMap />);

    await waitFor(() => expect(callbacks.size).toBeGreaterThan(0));

    act(() => {
      flushFrame(0);
    });

    await waitFor(() => expect(getFrameIndex()).toBeGreaterThan(0));

    act(() => {
      flushFrame(1600);
    });

    const frameBeforePause = getFrameIndex();
    expect(frameBeforePause).toBeGreaterThan(0);

    const pauseButton = screen.getByRole('button', { name: /pause animation/i });
    fireEvent.click(pauseButton);

    await waitFor(() => expect(getAnimationState()).toBe('paused'));
    await waitFor(() => expect(cancelSpy).toHaveBeenCalled());
    await waitFor(() => expect(callbacks.size).toBe(0));

    act(() => {
      flushFrame(2600);
    });

    expect(getFrameIndex()).toBe(frameBeforePause);

    const resumeButton = screen.getByRole('button', { name: /resume animation/i });
    fireEvent.click(resumeButton);

    await waitFor(() => expect(callbacks.size).toBeGreaterThan(0));

    act(() => {
      flushFrame(4200);
      flushFrame(5800);
    });

    expect(getFrameIndex()).toBeGreaterThan(frameBeforePause);
    expect(rafSpy).toHaveBeenCalled();
  });

  test('renders hop list entries with generator-driven latency updates', async () => {
    render(<TracerouteMap />);

    const hopList = await screen.findByTestId('hop-list');
    const items = within(hopList).getAllByRole('listitem');
    expect(items).toHaveLength(TRACEROUTE_HOPS.length);

    items.forEach((item, index) => {
      const hop = TRACEROUTE_HOPS[index];
      expect(within(item).getByText(hop.label)).toBeInTheDocument();
      expect(within(item).getByText(hop.location)).toBeInTheDocument();
    });

    await waitFor(() => expect(getLatencyText(0)).toMatch(/ms$/));

    act(() => {
      flushFrame(0);
      flushFrame(1800);
    });

    await waitFor(() => expect(getLatencyText(1)).toMatch(/ms$/));
  });
});
