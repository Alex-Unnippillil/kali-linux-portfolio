import Head from "next/head";

import Converter from "..";

export default function ConverterPage() {
  const title = "Converter | Kali Linux Portfolio";
  const description =
    "Convert currency, length, and weight units with a fast multi-domain converter.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>
      <main className="min-h-screen bg-ub-dark text-white py-10 px-4">
        <div className="mx-auto w-full max-w-4xl">
          <Converter />
        </div>
      </main>
    </>
  );
}
