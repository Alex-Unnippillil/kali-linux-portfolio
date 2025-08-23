import React, { useState } from 'react';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

function formatPEM(str: string): string {
  return str.replace(/(.{64})/g, '$1\n');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

const CSRGenerator: React.FC = () => {
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('');
  const [algorithm, setAlgorithm] = useState<'RSA' | 'ECDSA'>('RSA');
  const [modulusLength, setModulusLength] = useState(2048);
  const [namedCurve, setNamedCurve] = useState<'P-256' | 'P-384' | 'P-521'>('P-256');
  const [csr, setCsr] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [publicKeyPem, setPublicKeyPem] = useState('');
  const [error, setError] = useState('');

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pkcs10 = new pkijs.CertificationRequest();
      pkcs10.version = 0;
      if (country)
        pkcs10.subject.typesAndValues.push(
          new pkijs.AttributeTypeAndValue({
            type: '2.5.4.6',
            value: new asn1js.PrintableString({ value: country }),
          })
        );
      if (organization)
        pkcs10.subject.typesAndValues.push(
          new pkijs.AttributeTypeAndValue({
            type: '2.5.4.10',
            value: new asn1js.Utf8String({ value: organization }),
          })
        );
      if (commonName)
        pkcs10.subject.typesAndValues.push(
          new pkijs.AttributeTypeAndValue({
            type: '2.5.4.3',
            value: new asn1js.Utf8String({ value: commonName }),
          })
        );

      let cryptoAlg: any;
      if (algorithm === 'RSA') {
        cryptoAlg = {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        };
      } else {
        cryptoAlg = {
          name: 'ECDSA',
          namedCurve,
        };
      }

      const keyPair = await crypto.subtle.generateKey(cryptoAlg, true, ['sign', 'verify']);
      await pkcs10.subjectPublicKeyInfo.importKey(keyPair.publicKey);
      await pkcs10.sign(keyPair.privateKey, 'SHA-256');

      const csrBuffer = pkcs10.toSchema(true).toBER(false);
      const csrPem = `-----BEGIN CERTIFICATE REQUEST-----\n${formatPEM(arrayBufferToBase64(csrBuffer))}\n-----END CERTIFICATE REQUEST-----`;
      const privBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privPem = `-----BEGIN PRIVATE KEY-----\n${formatPEM(arrayBufferToBase64(privBuffer))}\n-----END PRIVATE KEY-----`;
      const pubBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const pubPem = `-----BEGIN PUBLIC KEY-----\n${formatPEM(arrayBufferToBase64(pubBuffer))}\n-----END PUBLIC KEY-----`;

      setCsr(csrPem);
      setPrivateKeyPem(privPem);
      setPublicKeyPem(pubPem);
      setError('');
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
        setError((err as { message: string }).message);
      } else {
        setError(String(err));
      }
    }
  };

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 overflow-auto">
      <form onSubmit={generate} className="space-y-2">
        <input
          className="w-full p-1 text-black"
          placeholder="Common Name"
          value={commonName}
          onChange={(e) => setCommonName(e.target.value)}
        />
        <input
          className="w-full p-1 text-black"
          placeholder="Organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
        />
        <input
          className="w-full p-1 text-black"
          placeholder="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <div className="flex space-x-2">
          <select
            className="p-1 text-black"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as 'RSA' | 'ECDSA')}
          >
            <option value="RSA">RSA</option>
            <option value="ECDSA">ECDSA</option>
          </select>
          {algorithm === 'RSA' ? (
            <input
              type="number"
              className="p-1 text-black"
              value={modulusLength}
              onChange={(e) => setModulusLength(parseInt(e.target.value, 10))}
            />
          ) : (
            <select
              className="p-1 text-black"
              value={namedCurve}
              onChange={(e) => setNamedCurve(e.target.value as 'P-256' | 'P-384' | 'P-521')}
            >
              <option value="P-256">P-256</option>
              <option value="P-384">P-384</option>
              <option value="P-521">P-521</option>
            </select>
          )}
        </div>
        <button type="submit" className="px-4 py-1 bg-blue-600 rounded">
          Generate
        </button>
      </form>
      {error && <div className="mt-2 text-red-500">{error}</div>}
      {csr && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <div className="font-bold">CSR</div>
            <pre className="bg-gray-800 p-2 overflow-auto whitespace-pre-wrap">{csr}</pre>
            <button
              onClick={() => download(csr, 'csr.pem')}
              className="mt-1 px-2 py-1 bg-green-600 rounded"
            >
              Download CSR
            </button>
          </div>
          <div>
            <div className="font-bold">Private Key</div>
            <pre className="bg-gray-800 p-2 overflow-auto whitespace-pre-wrap">{privateKeyPem}</pre>
            <button
              onClick={() => download(privateKeyPem, 'private_key.pem')}
              className="mt-1 px-2 py-1 bg-green-600 rounded"
            >
              Download Private Key
            </button>
          </div>
          <div>
            <div className="font-bold">Public Key</div>
            <pre className="bg-gray-800 p-2 overflow-auto whitespace-pre-wrap">{publicKeyPem}</pre>
            <button
              onClick={() => download(publicKeyPem, 'public_key.pem')}
              className="mt-1 px-2 py-1 bg-green-600 rounded"
            >
              Download Public Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSRGenerator;

