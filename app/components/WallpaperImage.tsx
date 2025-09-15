import Image, { type StaticImageData } from "next/image";

export type WallpaperImageProps = {
  src: StaticImageData | string;
  alt?: string;
  priority?: boolean;
};

const WallpaperImage = ({ src, alt = "Wallpaper", priority = false }: WallpaperImageProps) => (
  <div className="relative h-screen w-full">
    <Image
      alt={alt}
      className="object-cover"
      fill
      priority={priority}
      sizes="100vw"
      src={src}
    />
  </div>
);

export default WallpaperImage;
