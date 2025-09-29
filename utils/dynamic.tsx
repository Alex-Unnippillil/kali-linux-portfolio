import type { DynamicOptions, Loader } from 'next/dynamic';
import nextDynamic from 'next/dynamic';
import Skeleton from '@/components/base/Skeleton';

type LoaderOrOptions<P> = DynamicOptions<P> | Loader<P>;

export default function dynamic<P = {}>(
  dynamicOptions: LoaderOrOptions<P>,
  options?: DynamicOptions<P>,
) {
  if (typeof dynamicOptions === 'function') {
    return nextDynamic(dynamicOptions as Loader<P>, {
      ...(options ?? {}),
      ssr: false,
      loading: options?.loading ?? (() => <Skeleton />),
    });
  }

  const { loading, ...rest } = dynamicOptions;
  const { loading: loadingOverride, ...optionRest } = options ?? {};

  return nextDynamic({
    ...rest,
    ...optionRest,
    ssr: false,
    loading: loadingOverride ?? loading ?? (() => <Skeleton />),
  });
}
