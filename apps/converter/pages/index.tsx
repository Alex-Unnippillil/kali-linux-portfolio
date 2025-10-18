import Head from "next/head";

import Converter from "..";

export default function ConverterPage() {
  const title = "Converter | Kali Linux Portfolio";
  const description =
    "Convert units, bases, and hashes with an offline-ready modular converter.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>
      <main className="min-h-screen bg-[var(--kali-bg)] text-[color:var(--kali-text)] py-10 px-4">
        <div className="mx-auto w-full max-w-4xl">
          <Converter />
        </div>
      </main>
    </>
  );
}
