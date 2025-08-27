import React, { useMemo } from 'react';
import Meta from '../components/SEO/Meta';

const rawOutput = `Authentication Id : 0 ; 123 (00000000:0000007B)
Session           : Interactive from 1
User Name         : alice
Domain            : CONTOSO
Logon Server      : CONTOSO
Logon Time        : 5/14/2024 1:23:45 PM
SID               : S-1-5-21-123456789-123456789-123456789-1001

        msv :
         [00000003] Primary
         * Username : alice
         * Domain   : CONTOSO
         * NTLM     : <redacted>
         * SHA1     : <redacted>
        tspkg :
         * Username : alice
         * Domain   : CONTOSO
         * Password : (null)

Authentication Id : 0 ; 999 (00000000:000003E7)
Session           : Service from 0
User Name         : SYSTEM
Domain            : NT AUTHORITY
Logon Server      : (null)
Logon Time        : 5/14/2024 1:23:45 PM
SID               : S-1-5-18

        msv :
         [00000003] Primary
         * Username : SYSTEM
         * Domain   : NT AUTHORITY
         * NTLM     : <redacted>
         * SHA1     : <redacted>
        tspkg :
         * Username : SYSTEM
         * Domain   : NT AUTHORITY
         * Password : (null)
`;

interface SessionInfo {
  authId: string;
  session: string;
  user: string;
  domain: string;
  logonTime: string;
  sid: string;
}

const parseSessions = (text: string): SessionInfo[] => {
  const blocks = text.trim().split(/\n(?=Authentication Id)/);
  return blocks.map((block) => {
    const get = (regex: RegExp) => {
      const match = block.match(regex);
      return match ? match[1].trim() : '';
    };
    return {
      authId: get(/Authentication Id\s*:\s*(.*)/),
      session: get(/Session\s*:\s*(.*)/),
      user: get(/User Name\s*:\s*(.*)/),
      domain: get(/Domain\s*:\s*(.*)/),
      logonTime: get(/Logon Time\s*:\s*(.*)/),
      sid: get(/SID\s*:\s*(.*)/),
    };
  });
};

const SekurlsaLogonpasswords = () => {
  const sessions = useMemo(() => parseSessions(rawOutput), []);
  return (
    <>
      <Meta />
      <div style={{ backgroundColor: '#fcd34d', padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
        Sanitized credential data for educational use only.
      </div>
      <main className="grid gap-4 p-4 md:grid-cols-2">
        {sessions.map((s, idx) => (
          <div key={idx} className="p-4 bg-ub-dark text-white rounded border border-ub-dark-grey">
            <h2 className="text-lg mb-2">Authentication Id: {s.authId}</h2>
            <p><strong>Session:</strong> {s.session}</p>
            <p><strong>User:</strong> {s.user}</p>
            <p><strong>Domain:</strong> {s.domain}</p>
            <p><strong>Logon Time:</strong> {s.logonTime}</p>
            <p><strong>SID:</strong> {s.sid}</p>
          </div>
        ))}
      </main>
    </>
  );
};

export default SekurlsaLogonpasswords;
