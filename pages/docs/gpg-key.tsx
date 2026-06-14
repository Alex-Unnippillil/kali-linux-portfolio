import React from 'react';
import Meta from '../../components/SEO/Meta';

const GpgKey: React.FC = () => (
  <>
    <Meta />
    <main className="bg-ub-cool-grey text-white min-h-screen p-4 space-y-4">
      <h1 className="text-2xl font-bold">GPG Key Usage and Rotation</h1>
      <section className="space-y-2">
        <p>
          GPG (GNU Privacy Guard) keys allow you to sign and encrypt data. Use your public
          key to share with others so they can encrypt messages to you, and sign releases or
          commits with your private key to prove authenticity.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Rotating Keys</h2>
        <p>
          Rotate keys periodically to limit exposure if a key is compromised. Generate a new
          key pair, update expiration dates, and publish the new public key. Revoke old keys
          and distribute the revocation certificate so others know not to use them.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Further Reading</h2>
        <p>
          Official guidance on key management and rotation is available in the
          {' '}<a
            href="https://gnupg.org/documentation/manuals/gnupg/OpenPGP-Key-Management.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            GnuPG manual
          </a>{' '}and the
          {' '}<a
            href="https://gnupg.org/gph/en/manual.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            GNU Privacy Handbook
          </a>.
        </p>
      </section>
    </main>
  </>
);

export default GpgKey;

