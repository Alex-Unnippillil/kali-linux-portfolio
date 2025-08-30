import { Suspense } from 'react';
import { FlagValues } from 'flags/react';
import { beta } from '../app-flags';

async function FlagValuesLoader() {
  const values = { beta: await beta() };
  return <FlagValues values={values} />;
}

export default function FlagValuesEmitter() {
  return (
    <Suspense fallback={null}>
      {/* Suspense will handle the async flag loading */}
      <FlagValuesLoader />
    </Suspense>
  );
}

