import { SpotifyEmbedFrame } from "../../components/apps/spotify";

const SpotifyPage = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[color:var(--color-text)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-12 lg:px-12">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-[color:var(--kali-border)] bg-black">
          <SpotifyEmbedFrame className="absolute inset-0 h-full w-full" />
        </div>
      </div>
    </div>
  );
};

export default SpotifyPage;
