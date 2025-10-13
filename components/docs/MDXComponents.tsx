import Image from 'next/image';
import React, {
  ComponentPropsWithoutRef,
  ForwardedRef,
  PropsWithChildren,
  createContext,
  forwardRef,
  useContext,
} from 'react';

type StaticImageLike = {
  src: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
};

export type MDXImageMetadata = {
  width: number;
  height: number;
  blurDataURL?: string;
  priority?: boolean;
};

type MetadataMap = Record<string, MDXImageMetadata>;

const MDXImageMetadataContext = createContext<MetadataMap>({});

export type MDXImageMetadataProviderProps = PropsWithChildren<{
  images?: MetadataMap;
}>;

export const MDXImageMetadataProvider = ({ images, children }: MDXImageMetadataProviderProps) => (
  <MDXImageMetadataContext.Provider value={images ?? {}}>{children}</MDXImageMetadataContext.Provider>
);

type DocImageProps = ComponentPropsWithoutRef<'img'> & {
  src: string | StaticImageLike;
};

const DEFAULT_SIZES = '(min-width: 1024px) 768px, 100vw';

const isStaticImage = (value: unknown): value is StaticImageLike =>
  typeof value === 'object' && value !== null && 'src' in value && typeof (value as StaticImageLike).src === 'string';

const DocImage = forwardRef(function DocImage(
  props: DocImageProps,
  ref: ForwardedRef<HTMLImageElement>
) {
  const {
    src,
    alt = '',
    width: widthProp,
    height: heightProp,
    loading: loadingProp,
    sizes: sizesProp,
    ...rest
  } = props;
  const metadataMap = useContext(MDXImageMetadataContext);

  const staticSrc = isStaticImage(src) ? src : undefined;
  const normalizedSrc = staticSrc?.src ?? (typeof src === 'string' ? src : undefined);
  const metadataKey = normalizedSrc ?? staticSrc?.src;
  const metadata = metadataKey ? metadataMap[metadataKey] : undefined;

  const resolvedWidth = widthProp ?? metadata?.width ?? staticSrc?.width;
  const resolvedHeight = heightProp ?? metadata?.height ?? staticSrc?.height;
  const blurDataURL = metadata?.blurDataURL ?? staticSrc?.blurDataURL;
  const priority = metadata?.priority ?? loadingProp === 'eager';
  const sizes = sizesProp ?? DEFAULT_SIZES;

  if (!resolvedWidth || !resolvedHeight || !normalizedSrc) {
    return (
      <img
        ref={ref}
        src={normalizedSrc ?? ''}
        alt={alt}
        loading={loadingProp ?? 'lazy'}
        {...rest}
      />
    );
  }

  return (
    <Image
      ref={ref}
      src={staticSrc ?? normalizedSrc}
      alt={alt}
      width={resolvedWidth}
      height={resolvedHeight}
      placeholder={blurDataURL ? 'blur' : 'empty'}
      blurDataURL={blurDataURL}
      priority={priority}
      sizes={sizes}
      loading={priority ? undefined : loadingProp ?? 'lazy'}
      {...rest}
    />
  );
});

const MDXComponents = {
  img: DocImage,
};

export default MDXComponents;
