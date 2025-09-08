import React from "react";

export default function TrustBanner() {
  return (
    <div className="mb-4 rounded border border-blue-400 bg-blue-50 p-4 text-blue-800">
      <p>
        Ensure you are on an{" "}
        <a
          href="https://www.kali.org/docs/introduction/download-official-kali-linux-images/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          official Kali site
        </a>{" "}
        and verify downloads with our{" "}
        <a
          href="https://www.kali.org/docs/introduction/download-validation/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          checksum instructions
        </a>.
      </p>
    </div>
  );
}
