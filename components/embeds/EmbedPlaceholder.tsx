import React from 'react';

interface EmbedPlaceholderProps {
  service: string;
  description: string;
  onAllow: () => void;
  allowLabel?: string;
  className?: string;
  preview?: React.ReactNode;
}

const baseClass =
  'flex h-full w-full flex-col items-center justify-center gap-3 border border-dashed border-white/20 bg-black/30 p-6 text-center';

const EmbedPlaceholder: React.FC<EmbedPlaceholderProps> = ({
  service,
  description,
  onAllow,
  allowLabel,
  className,
  preview,
}) => (
  <div className={[baseClass, className].filter(Boolean).join(' ')}>
    {preview}
    <div className="space-y-1">
      <p className="font-semibold">{service} embed blocked</p>
      <p className="text-sm text-ubt-cool-grey">{description}</p>
    </div>
    <button
      type="button"
      onClick={onAllow}
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
    >
      {allowLabel ?? `Load ${service}`}
    </button>
  </div>
);

export default EmbedPlaceholder;
