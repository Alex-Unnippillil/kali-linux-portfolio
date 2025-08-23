import React, { useState } from 'react';
import sshpk from 'sshpk';

const SshFingerprint: React.FC = () => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<
    | {
        md5: string;
        sha256: string;
        type: string;
        size: number;
      }
    | null
  >(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setKeyInput(value);
    if (!value.trim()) {
      setDetails(null);
      setError(null);
      return;
    }
    try {
      const key = sshpk.parseKey(value, 'ssh');
      setDetails({
        md5: key.fingerprint('md5').toString(),
        sha256: key.fingerprint('sha256').toString(),
        type: key.type,
        size: key.size,
      });
      setError(null);
    } catch (err: any) {
      setDetails(null);
      setError(err.message);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <textarea
        className="flex-grow text-black p-2"
        placeholder="Paste SSH public key here..."
        value={keyInput}
        onChange={handleChange}
      />
      {error && <div className="text-red-500 text-sm break-all">{error}</div>}
      {details && (
        <div className="text-sm space-y-1 break-all">
          <div>MD5: {details.md5}</div>
          <div>SHA-256: {details.sha256}</div>
          <div>Type: {details.type}</div>
          <div>Size: {details.size} bits</div>
        </div>
      )}
    </div>
  );
};

export default SshFingerprint;

