import { render, screen } from '@testing-library/react';
import AppTile from '../components/apps/AppTile';

jest.mock('next/image', () => {
  const MockedImage = (props: any) => <img {...props} alt={props.alt || ''} />;
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

describe('AppTile', () => {
  it('renders an offline badge for offline-capable grid tiles', () => {
    render(
      <AppTile
        id="calculator"
        title="Calculator"
        icon="/themes/Yaru/apps/calc.png"
        href="/apps/calculator"
        offlineCapable
      />
    );

    expect(screen.getByText(/offline ready/i)).toBeInTheDocument();
  });

  it('omits the offline badge when the app is online-only', () => {
    render(
      <AppTile
        id="spotify"
        title="Spotify"
        icon="/themes/Yaru/apps/spotify.svg"
        href="/apps/spotify"
      />
    );

    expect(screen.queryByText(/offline ready/i)).not.toBeInTheDocument();
  });

  it('shows the offline badge in detail view and renders descriptions', () => {
    render(
      <AppTile
        id="quote"
        title="Quote"
        icon="/themes/Yaru/apps/quote.svg"
        offlineCapable
        variant="detail"
        description="Browse motivational quotes without a network connection."
      >
        <p>Includes share and save options.</p>
      </AppTile>
    );

    expect(screen.getByText(/offline ready/i)).toBeInTheDocument();
    expect(
      screen.getByText(/browse motivational quotes without a network connection/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/includes share and save options/i)).toBeInTheDocument();
  });
});
