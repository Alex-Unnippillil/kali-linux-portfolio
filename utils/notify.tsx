import React from 'react';
import { createRoot } from 'react-dom/client';
import Toast from '../components/ui/Toast';

interface NotifyOptions {
  title: string;
  body: string;
  icon?: string;
}

export function notify({ title, body, icon }: NotifyOptions): void {
  if (typeof document === 'undefined') return;

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const handleClose = () => {
    root.unmount();
    container.remove();
  };

  root.render(
    <Toast title={title} body={body} icon={icon} onClose={handleClose} />
  );
}
