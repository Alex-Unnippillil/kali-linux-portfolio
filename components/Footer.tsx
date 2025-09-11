"use client";
import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-ub-grey text-ubt-grey text-center text-[14px] p-4">
      <p>
        Kali Linux is a trademark of OffSec Services Limited. This site is a personal portfolio and not affiliated with or endorsed by Kali Linux or OffSec.{' '}
        <a
          href="https://www.offsec.com/kali-linux/trademark-policy/"
          className="underline text-ubt-blue"
          target="_blank"
          rel="noopener noreferrer"
        >
          Trademark policy
        </a>
        .
      </p>
    </footer>
  );
}
