import { Suspense } from 'react';
import { encryptFlagValues, FlagValues } from 'flags/react';
import { beta } from '../flags';

async function FlagValuesLoader() {
  const values = { beta: await beta() };
  return <FlagValues values={await encryptFlagValues(values)} />;
}

export default function FlagValuesEmitter() {
  return (
    <Suspense fallback={null}>
      {/* Suspense will handle the async flag loading */}
      <FlagValuesLoader />
    </Suspense>
  );
}

