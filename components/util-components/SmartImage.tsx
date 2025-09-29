import { useCallback, useMemo, useState } from "react";
import Image, { ImageProps } from "next/image";
import clsx from "clsx";

type SmartImageProps = Omit<ImageProps, "placeholder" | "onLoadingComplete" | "blurDataURL"> & {
  alt: ImageProps["alt"];
  blurDataURL?: string;
  loadingClassName?: string;
  loadedClassName?: string;
  onLoadingComplete?: ImageProps["onLoadingComplete"];
};

const DEFAULT_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMScgaGVpZ2h0PScxJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IHdpZHRoPScxJyBoZWlnaHQ9JzEnIGZpbGw9JyNFQkVCRUInIC8+PC9zdmc+";

const SmartImage = ({
  alt,
  blurDataURL,
  className,
  loadingClassName = "opacity-60",
  loadedClassName = "opacity-100",
  onLoadingComplete,
  ...props
}: SmartImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoadingComplete = useCallback<NonNullable<ImageProps["onLoadingComplete"]>>(
    (result) => {
      setIsLoaded(true);
      onLoadingComplete?.(result);
    },
    [onLoadingComplete]
  );

  const transitionClassName = useMemo(
    () => clsx("transition-opacity duration-500 ease-out", className, isLoaded ? loadedClassName : loadingClassName),
    [className, isLoaded, loadedClassName, loadingClassName]
  );

  return (
    <Image
      {...props}
      alt={alt}
      className={transitionClassName}
      placeholder="blur"
      blurDataURL={blurDataURL ?? DEFAULT_BLUR_DATA_URL}
      onLoadingComplete={handleLoadingComplete}
    />
  );
};

export default SmartImage;
