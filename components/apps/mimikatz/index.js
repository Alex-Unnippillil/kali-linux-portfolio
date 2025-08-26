import React, { useState } from 'react';

const MimikatzApp = () => {
  const [output, setOutput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pendingCmd, setPendingCmd] = useState(null);

  const runCommand = async (cmd) => {
    try {
      const res = await fetch(`/api/mimikatz?command=${cmd}`);
      const text = await res.text();
      setOutput(text);
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  };

  const logDecision = (cmd, decision) => {
    const logs = JSON.parse(localStorage.getItem('mimikatzAudit') || '[]');
    logs.push({ command: cmd, decision, timestamp: new Date().toISOString() });
    localStorage.setItem('mimikatzAudit', JSON.stringify(logs));
    // eslint-disable-next-line no-console
    console.log(`Mimikatz command '${cmd}' ${decision}`);
  };

  const handleDecision = (proceed) => {
    if (!pendingCmd) return;
    const decision = proceed ? 'accepted' : 'rejected';
    logDecision(pendingCmd, decision);
    setShowModal(false);
    if (proceed) {
      runCommand(pendingCmd);
    }
    setPendingCmd(null);
  };

  const requestRun = (cmd) => {
    setPendingCmd(cmd);
    setShowModal(true);
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <h1 className="text-lg mb-4">Mimikatz</h1>
      <div className="mb-4 space-x-2">
        <button
          className="px-3 py-1 bg-blue-600 rounded"
          onClick={() => requestRun('sekurlsa')}
        >
          sekurlsa
        </button>
        <button
          className="px-3 py-1 bg-green-600 rounded"
          onClick={() => requestRun('lsadump')}
        >
          lsadump
        </button>
      </div>
      <pre className="whitespace-pre-wrap">{output}</pre>
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-ub-cool-grey p-4 rounded max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4">
              Warning: Mimikatz is a powerful security auditing tool.{" "}
              Running <code>{pendingCmd}</code> may extract sensitive credentials.{" "}
              Proceed only if you have explicit authorization.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1 bg-red-600 rounded"
                onClick={() => handleDecision(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-green-600 rounded"
                onClick={() => handleDecision(true)}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder, openApp) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};

