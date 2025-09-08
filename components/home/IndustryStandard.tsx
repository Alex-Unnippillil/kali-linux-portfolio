import React from "react";

export default function IndustryStandard() {
  return (
    <section className="flex flex-col gap-6 md:flex-row md:gap-4">
      <div className="flex-1 space-y-4">
        <h2 className="text-2xl font-bold">Industry standard security</h2>
        <p>
          Kali Linux is trusted by security professionals worldwide as the
          de&nbsp;facto platform for penetration testing and digital forensics.
        </p>
        <p className="text-gray-600">
          Whether you&apos;re securing enterprise networks or learning the craft,
          Kali provides the tools and community to get the job done.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="h-48 w-full max-w-sm rounded bg-gray-200" aria-hidden />
      </div>
    </section>
  );
}

