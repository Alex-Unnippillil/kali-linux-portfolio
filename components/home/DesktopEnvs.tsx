import Image from "next/image";

interface DesktopEnv {
  name: string;
  image: string;
}

const desktopEnvs: DesktopEnv[] = [
  { name: "Xfce", image: "/desktops/xfce.svg" },
  { name: "GNOME", image: "/desktops/gnome.svg" },
  { name: "KDE", image: "/desktops/kde.svg" },
];

export default function DesktopEnvs() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {desktopEnvs.map((env) => (
        <div key={env.name} className="Surface rounded p-4 text-center">
          <Image
            src={env.image}
            alt={env.name}
            width={128}
            height={128}
            className="mx-auto mb-2 h-24 w-24 object-contain"
          />
          <h3 className="text-lg font-semibold">{env.name}</h3>
        </div>
      ))}
    </div>
  );
}
