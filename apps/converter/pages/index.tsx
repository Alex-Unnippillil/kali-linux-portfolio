"use client";

import Head from "next/head";
import { useCallback } from "react";
import { useRouter } from "next/router";

import Converter from "..";
import MobileBackButton from "../../../components/apps/MobileBackButton";

export default function ConverterPage() {
  const title = "Converter | Kali Linux Portfolio";
  const description =
    "Convert currency, length, and weight units with a fast multi-domain converter.";
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const { referrer } = document;
      if (referrer && referrer.startsWith(window.location.origin)) {
        router.back();
        return;
      }
    }
    router.push("/apps");
  }, [router]);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>
      <main className="relative min-h-screen bg-[var(--kali-bg)] text-[color:var(--kali-text)] py-10 px-4">
        <MobileBackButton
          appId="converter"
          onBack={handleBack}
          className="fixed left-4 top-4 z-50"
        />
        <div className="mx-auto w-full max-w-4xl">
          <Converter />
        </div>
      </main>
    </>
  );
}
