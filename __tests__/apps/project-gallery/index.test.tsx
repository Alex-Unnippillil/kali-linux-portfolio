import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';

import ProjectGalleryPage from '../../../apps/project-gallery/pages/index';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const useRouterMock = useRouter as unknown as jest.Mock;

describe('ProjectGalleryPage', () => {
  const originalFetch = global.fetch;

  const projects = [
    {
      id: 1,
      title: 'Terminal Dashboard',
      description: 'Real-time metrics in a Linux-inspired layout.',
      stack: ['Next.js', 'Tailwind'],
      tags: ['monitoring', 'dashboard'],
      year: 2023,
      type: 'web',
      thumbnail: '/thumbnails/dashboard.png',
      demo: 'https://example.com/dashboard',
    },
    {
      id: 2,
      title: 'Packet Analyzer',
      description: 'Educational packet capture simulator.',
      stack: ['TypeScript', 'WebAssembly'],
      tags: ['simulation', 'network'],
      year: 2022,
      type: 'tool',
      thumbnail: '/thumbnails/analyzer.png',
      demo: 'https://example.com/analyzer',
    },
    {
      id: 3,
      title: 'Visualizer',
      description: '3D scene viewer for data story telling.',
      stack: ['Three.js'],
      tags: ['visualization'],
      year: 2021,
      type: 'experiment',
      thumbnail: '/thumbnails/visualizer.png',
      repo: 'https://github.com/example/visualizer',
    },
  ];

  beforeEach(() => {
    useRouterMock.mockReturnValue({
      pathname: '/apps/project-gallery',
      query: {},
      isReady: true,
      replace: jest.fn(),
      push: jest.fn(),
    });

    global.fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve(projects) }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).fetch;
    }
  });

  it('shows a comparison tray when two projects are selected', async () => {
    render(<ProjectGalleryPage />);

    const firstCompare = await screen.findByTestId('compare-1');
    const secondCompare = await screen.findByTestId('compare-2');
    fireEvent.click(firstCompare);
    fireEvent.click(secondCompare);

    const tray = await screen.findByRole('region', { name: /comparison tray/i });
    expect(tray).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /compare projects/i })).toBeEnabled();
    });
  });

  it('describes how to add filters when no projects match', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    });

    render(<ProjectGalleryPage />);

    await waitFor(() => {
      expect(screen.getByText(/No projects match your filters\./i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Use the filter chips above to add or remove stacks, tags, or years/i),
    ).toBeInTheDocument();
  });
});
