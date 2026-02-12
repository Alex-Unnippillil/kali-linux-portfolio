import Router from 'next/router';

export function openDateTime() {
  Router.push('/apps/settings/date-time');
}

export default function DateTimeSettingsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Date & Time Settings</h1>
      <p>Configure your system time and date.</p>
    </div>
  );
}

