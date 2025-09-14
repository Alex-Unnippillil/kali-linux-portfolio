import { render, screen } from '@testing-library/react';
import DeviceSequence from '../components/DeviceSequence';

// Simplify next/image for the test environment
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

describe('DeviceSequence', () => {
  it('renders static frame when prefers-reduced-motion', () => {
    // mock matchMedia to prefer reduced motion
    // @ts-ignore
    window.matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    });

    render(<DeviceSequence frames={['/a.png', '/b.png']} alt="demo" />);
    const img = screen.getByAltText('demo') as HTMLImageElement;
    expect(img.getAttribute('src')).toContain('/a.png');
  });
});

