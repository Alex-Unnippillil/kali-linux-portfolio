import Image from "next/image";
import Link from "next/link";

const wallpapers = [
  { src: "/images/wallpapers/wall-1.webp", alt: "Wallpaper 1" },
  { src: "/images/wallpapers/wall-2.webp", alt: "Wallpaper 2" },
];

export default function WallpaperTeaser() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {wallpapers.map((wall) => (
        <Link key={wall.src} href="/wallpapers" className="block">
          <Image
            src={wall.src}
            alt={wall.alt}
            width={300}
            height={200}
            className="h-full w-full rounded object-cover"
          />
        </Link>
      ))}
    </div>
  );
}
