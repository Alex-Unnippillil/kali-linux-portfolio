import React, { useState } from 'react';

const ACCEPTED_MIME_TYPES = new Set(['text/plain', 'text/x-log', 'application/json']);
const ACCEPTED_EXTENSIONS = ['.txt', '.log', '.json'];

const isAcceptedExtension = (name) => {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const stringToBytes = (str) => {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
};

const readBlobAsText = (blob) => {
  if (typeof blob.text === 'function') {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
};

const isSupportedTextFile = (file) => {
  if (!file) return false;
  if (file.type) {
    if (file.type.startsWith('text/')) return true;
    if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
    return false;
  }
  return isAcceptedExtension(file.name);
};

const looksBinary = (input) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!bytes.length) return false;
  let suspicious = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    const value = bytes[i];
    if (value === 0) return true;
    if (value < 7 || (value > 13 && value < 32)) {
      suspicious += 1;
    }
  }
  return suspicious / bytes.length > 0.3;
};

const parseDump = (text) => {
  const lines = text.split(/\r?\n/);
  const creds = [];
  let current = {};
  const userRegex = /user(?:name)?\s*[:=]\s*(\S+)/i;
  const passRegex = /pass(?:word)?\s*[:=]\s*(\S+)/i;

  lines.forEach((line) => {
    const u = line.match(userRegex);
    const p = line.match(passRegex);
    if (u) current.user = u[1];
    if (p) current.password = p[1];
    if (current.user && current.password) {
      creds.push(current);
      current = {};
    }
  });
  return creds;
};

const MimikatzOffline = () => {
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;

    setError('');
    setCredentials([]);

    if (!isSupportedTextFile(file)) {
      setError('Unsupported file type. Please upload a text-based dump (.txt, .log, .json).');
      return;
    }

    try {
      const sampleSize = Math.min(file.size || 0, 1024);
      if (sampleSize) {
        const sampleBlob = file.slice(0, sampleSize);
        let sampleBytes;
        if (typeof sampleBlob.arrayBuffer === 'function') {
          sampleBytes = new Uint8Array(await sampleBlob.arrayBuffer());
        } else {
          const preview = await readBlobAsText(sampleBlob);
          sampleBytes = stringToBytes(preview);
        }
        if (sampleBytes && looksBinary(sampleBytes)) {
          setError('The selected file appears to be binary. Please provide a text dump.');
          return;
        }
      }

      const text = await readBlobAsText(file);
      const parsed = parseDump(text);
      setCredentials(parsed);
      setError(parsed.length ? '' : 'No credentials found in the selected file.');
    } catch (err) {
      setError('Failed to read file');
      setCredentials([]);
    }
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer?.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-ub-cool-grey text-white">
      <h1 className="text-xl mb-4">Mimikatz Offline</h1>
      <div
        data-testid="mimikatz-dropzone"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-4 flex flex-col items-center justify-center rounded border-2 border-dashed bg-ub-dark p-6 text-center transition-colors ${
          isDragging ? 'border-ub-pink' : 'border-ub-grey'
        }`}
      >
        <label htmlFor="mimikatz-offline-input" className="cursor-pointer text-sm text-gray-200">
          Drag and drop a Mimikatz dump here, or <span className="text-ubt-gedit-orange underline">browse</span>
        </label>
        <p className="mt-2 text-xs text-gray-400">Accepted formats: .txt, .log, .json</p>
        <input
          id="mimikatz-offline-input"
          data-testid="mimikatz-file-input"
          type="file"
          accept=".txt,.log,.json,text/plain,application/json"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
      <ul className="space-y-2 overflow-auto">
        {credentials.map((c, idx) => (
          <li key={idx} className="bg-ub-dark p-2 rounded">
            <div>User: {c.user}</div>
            <div>Password: {c.password}</div>
          </li>
        ))}
      </ul>
      {!credentials.length && !error && (
        <div className="text-sm text-gray-300">No credentials parsed</div>
      )}
    </div>
  );
};

export default MimikatzOffline;

export const displayMimikatzOffline = (addFolder, openApp) => {
  return <MimikatzOffline addFolder={addFolder} openApp={openApp} />;
};

