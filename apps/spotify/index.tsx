import { SpotifyEmbed } from '../../components/apps/spotify';

const SpotifyPage = () => {
  return (
    <div className="h-screen w-screen bg-[var(--color-bg)] text-[color:var(--color-text)]">
      <SpotifyEmbed />
    </div>
  );
};

export default SpotifyPage;
