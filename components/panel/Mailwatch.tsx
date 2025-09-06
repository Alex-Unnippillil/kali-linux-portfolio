"use client";

interface MailwatchProps {
  label: string;
  unread: number;
  lastChecked: Date;
}

export default function Mailwatch({ label, unread, lastChecked }: MailwatchProps) {
  const openMailbox = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.title = `${label} Mailbox`;
      w.document.body.innerHTML = `<h1>${label}</h1><p>This is a placeholder mailbox.</p>`;
    }
  };

  return (
    <button
      type="button"
      onClick={openMailbox}
      title={`Last checked: ${lastChecked.toLocaleString()}`}
      className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded"
    >
      <span>{label}</span>
      <span className="font-bold">{unread}</span>
    </button>
  );
}

