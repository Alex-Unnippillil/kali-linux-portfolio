import Link from 'next/link';
import type { DeepLinkError } from '../../utils/deeplink';

type DeepLinkRescueProps = {
  appTitle: string;
  error: DeepLinkError;
};

const resolveMessage = (error: DeepLinkError) => {
  switch (error.code) {
    case 'unsupported-version':
      return `${error.message}. Supported version is v${error.supported}.`;
    case 'mismatch':
    case 'not-found':
      return error.message;
    case 'invalid':
    default:
      return error.message;
  }
};

const DeepLinkRescue = ({ appTitle, error }: DeepLinkRescueProps) => {
  const message = resolveMessage(error);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-ub-cool-grey p-6 text-center text-white">
      <h1 className="mb-2 text-2xl font-semibold">Unable to open {appTitle}</h1>
      <p className="mb-4 max-w-lg text-sm text-ubt-grey">{message}</p>
      {error.suggestion && (
        <Link
          href={`/apps/${error.suggestion}`}
          className="rounded bg-ub-orange px-4 py-2 font-medium text-black transition hover:bg-ub-orange-light"
        >
          Open {error.suggestion}
        </Link>
      )}
    </div>
  );
};

export default DeepLinkRescue;
