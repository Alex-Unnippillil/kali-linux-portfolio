import Image from 'next/image';

export default function Wallpaper() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Image
        src="/wallpapers/kali.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
    </div>
  );
}
