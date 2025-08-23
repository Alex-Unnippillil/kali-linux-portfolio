import React, { useState } from 'react';

interface CipherInfo {
  aead: boolean;
  pfs: boolean;
  issues: string[];
}

const cipherTable: Record<string, CipherInfo> = {
  TLS_AES_128_GCM_SHA256: { aead: true, pfs: true, issues: [] },
  TLS_AES_256_GCM_SHA384: { aead: true, pfs: true, issues: [] },
  TLS_CHACHA20_POLY1305_SHA256: { aead: true, pfs: true, issues: [] },
  TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256: { aead: true, pfs: true, issues: [] },
  TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384: { aead: true, pfs: true, issues: [] },
  TLS_RSA_WITH_AES_128_CBC_SHA: {
    aead: false,
    pfs: false,
    issues: ['CBC mode vulnerable to BEAST/POODLE'],
  },
  TLS_RSA_WITH_3DES_EDE_CBC_SHA: {
    aead: false,
    pfs: false,
    issues: ['3DES is weak', 'CBC mode vulnerabilities'],
  },
};

const extensionTable: Record<string, string[]> = {
  heartbeat: ['Heartbeat extension vulnerable to Heartbleed'],
  renegotiation_info: ['Insecure renegotiation can allow MITM attacks'],
  session_ticket: ['Session tickets may weaken forward secrecy'],
};

const TLSExplainer: React.FC = () => {
  const [cipher, setCipher] = useState('');
  const [extensions, setExtensions] = useState('');
  const [cipherInfo, setCipherInfo] = useState<CipherInfo | null>(null);
  const [extensionInfo, setExtensionInfo] = useState<{ name: string; issues: string[] }[]>([]);

  const analyze = () => {
    const info = cipherTable[cipher.trim().toUpperCase()] || null;
    setCipherInfo(info);

    const extList = extensions
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const extResults = extList.map((name) => ({ name, issues: extensionTable[name] || [] }));
    setExtensionInfo(extResults);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <input
        type="text"
        value={cipher}
        onChange={(e) => setCipher(e.target.value)}
        placeholder="Cipher suite (e.g., TLS_AES_128_GCM_SHA256)"
        className="p-2 text-black"
      />
      <textarea
        value={extensions}
        onChange={(e) => setExtensions(e.target.value)}
        placeholder="Comma-separated extensions (e.g., server_name, session_ticket)"
        className="p-2 text-black"
      />
      <button type="button" onClick={analyze} className="px-4 py-1 bg-blue-600 rounded w-32">
        Analyze
      </button>
      {cipherInfo && (
        <div className="overflow-auto">
          <h2 className="font-bold mb-2">Cipher</h2>
          <table className="text-sm mb-4">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Property</th>
                <th className="px-2 py-1">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-1">AEAD</td>
                <td className={`px-2 py-1 ${cipherInfo.aead ? 'text-green-500' : 'text-red-500'}`}>{
                  cipherInfo.aead ? 'Yes' : 'No'
                }</td>
              </tr>
              <tr>
                <td className="px-2 py-1">PFS</td>
                <td className={`px-2 py-1 ${cipherInfo.pfs ? 'text-green-500' : 'text-red-500'}`}>{
                  cipherInfo.pfs ? 'Yes' : 'No'
                }</td>
              </tr>
            </tbody>
          </table>
          {cipherInfo.issues.length > 0 && (
            <div>
              <h3 className="font-bold">Issues</h3>
              <ul className="list-disc list-inside text-sm">
                {cipherInfo.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {extensionInfo.length > 0 && (
        <div className="overflow-auto">
          <h2 className="font-bold mb-2">Extensions</h2>
          <table className="text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Extension</th>
                <th className="px-2 py-1 text-left">Issues</th>
              </tr>
            </thead>
            <tbody>
              {extensionInfo.map((ext) => (
                <tr key={ext.name} className="odd:bg-gray-800">
                  <td className="px-2 py-1 break-all">{ext.name}</td>
                  <td className="px-2 py-1">
                    {ext.issues.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {ext.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      'None'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TLSExplainer;

export const displayTlsExplainer = (addFolder, openApp) => (
  <TLSExplainer addFolder={addFolder} openApp={openApp} />
);
