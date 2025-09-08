"use client";

import { useState } from 'react';
import Modal from "../base/Modal";

interface VerifyDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = ["Download", "Checksum", "Signature"];
const ALGORITHMS = ["SHA256", "SHA1", "MD5"];
const EXPECTED_CHECKSUMS: Record<string, string> = {
  SHA256: "abc123",
  SHA1: "def456",
  MD5: "789abc",
};
const EXPECTED_SIGNATURE = "signed";

const VerifyDownloadModal = ({ isOpen, onClose }: VerifyDownloadModalProps) => {
  const [step, setStep] = useState(0);
  const [algorithm, setAlgorithm] = useState("SHA256");
  const [checksum, setChecksum] = useState("");
  const [signature, setSignature] = useState("");
  const [checksumResult, setChecksumResult] = useState<null | boolean>(null);
  const [signatureResult, setSignatureResult] = useState<null | boolean>(null);

  const reset = () => {
    setStep(0);
    setAlgorithm("SHA256");
    setChecksum("");
    setSignature("");
    setChecksumResult(null);
    setSignatureResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const verifyChecksum = () => {
    setChecksumResult(checksum.trim() === EXPECTED_CHECKSUMS[algorithm]);
  };

  const verifySignature = () => {
    setSignatureResult(signature.trim() === EXPECTED_SIGNATURE);
  };

  const selectAlgorithm = (alg: string) => {
    setAlgorithm(alg);
    setChecksum("");
    setChecksumResult(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
        onClick={handleClose}
      >
        <div
          className="bg-white text-black p-6 rounded w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4">Verify Kali Download</h2>
          <ol className="flex justify-between mb-4 text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className={i === step ? "font-bold" : ""}>
                {i + 1}. {s}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <div>
              <p className="mb-4">
                Download the image from the official
                {" "}
                <a
                  href="https://www.kali.org/get-kali/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600"
                >
                  Kali Linux site
                </a>
                . Avoid untrusted mirrors and always use HTTPS.
              </p>
              <div className="flex justify-end">
                <button
                  className="bg-ubt-blue text-white px-4 py-2 rounded"
                  onClick={() => setStep(1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="mb-2">
                Paste the {algorithm} checksum you generated from the download.
              </p>
              <div className="flex gap-2 mb-2">
                {ALGORITHMS.map((alg) => (
                  <button
                    key={alg}
                    onClick={() => selectAlgorithm(alg)}
                    className={`px-2 py-1 rounded border ${
                      alg === algorithm
                        ? "bg-ubt-blue text-white"
                        : "opacity-50"
                    }`}
                  >
                    {alg}
                  </button>
                ))}
              </div>
              <input
                value={checksum}
                onChange={(e) => setChecksum(e.target.value)}
                className="w-full border p-2 mb-2"
                placeholder={`${algorithm} checksum`}
                aria-label={`${algorithm} checksum input`}
              />
              {checksumResult !== null && (
                <p
                  className={`mb-2 ${checksumResult ? "text-green-600" : "text-red-600"}`}
                >
                  {checksumResult ? "Checksum matches." : "Checksum mismatch."}
                </p>
              )}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-2 rounded border"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={verifyChecksum}
                    className="bg-ubt-blue text-white px-4 py-2 rounded"
                  >
                    Verify
                  </button>
                  {checksumResult && (
                    <button
                      onClick={() => setStep(2)}
                      className="bg-ubt-blue text-white px-4 py-2 rounded"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-2">
                Paste the GPG signature and verify it with Kali&apos;s signing key.
              </p>
              <input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full border p-2 mb-2"
                placeholder="Signature"
                aria-label="Signature"
              />
              {signatureResult !== null && (
                <p
                  className={`mb-2 ${
                    signatureResult ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {signatureResult ? "Signature valid." : "Signature invalid."}
                </p>
              )}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded border"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={verifySignature}
                    className="bg-ubt-blue text-white px-4 py-2 rounded"
                  >
                    Verify
                  </button>
                  {signatureResult && (
                    <button
                      onClick={handleClose}
                      className="bg-ubt-blue text-white px-4 py-2 rounded"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm">
                Learn more about{` `}
                <a
                  href="https://www.kali.org/docs/introduction/download-validation/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600"
                >
                  verifying Kali downloads
                </a>{` `}
                to stay secure.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VerifyDownloadModal;

