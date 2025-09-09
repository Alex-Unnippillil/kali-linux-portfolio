import Head from "next/head";
import dynamic from "next/dynamic";

// Breakout level editor page. Loads the actual editor lazily on the
// client so the Next.js server doesn't attempt to render it.

const BreakoutEditor = dynamic(() => import("../../../games/breakout/editor"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BreakoutEditorPage() {
  return (
    <>
      <Head>
        <title>Breakout Level Editor</title>
        <meta
          name="description"
          content="Create custom Breakout levels and share your designs."
        />
        <meta property="og:title" content="Breakout Level Editor" />
        <meta
          property="og:description"
          content="Create custom Breakout levels and share your designs."
        />
        <meta
          property="og:image"
          content="https://unnippillil.com/images/wallpapers/wall-2.webp"
        />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Breakout Level Editor" />
        <meta
          property="twitter:description"
          content="Create custom Breakout levels and share your designs."
        />
        <meta
          property="twitter:image"
          content="https://unnippillil.com/images/wallpapers/wall-2.webp"
        />
      </Head>
      <BreakoutEditor />
    </>
  );
}

