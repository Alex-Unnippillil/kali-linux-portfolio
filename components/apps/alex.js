import React from 'react';
import Image from 'next/image';

function AboutAlex() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <Image
        src="/images/logos/fevicon.svg"
        alt="Alex Unnippillil"
        width={128}
        height={128}
      />
      <p className="mt-4 text-center">
        Hi, I&apos;m Alex Unnippillil, a cybersecurity specialist.
      </p>
    </div>
  );
}

export default AboutAlex;
export const displayAboutAlex = () => <AboutAlex />;
