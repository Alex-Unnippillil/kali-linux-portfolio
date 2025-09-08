import Image from "next/image";

interface DesktopEnv {
  name: string;
  image: string;
  isDefault?: boolean;
}

const desktopEnvs: DesktopEnv[] = [
  { name: "Xfce", image: "/desktops/xfce.svg", isDefault: true },
  { name: "GNOME", image: "/desktops/gnome.svg" },
  { name: "KDE", image: "/desktops/kde.svg" },
];

export default function DesktopEnvs() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {desktopEnvs.map((env) => (
        <div
          key={env.name}
          className="relative flex flex-col items-center p-4 border rounded text-center bg-white"
        >
          {env.isDefault && (
            <span className="absolute top-2 right-2 rounded bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-800 sm:text-xs">
              default
            </span>
          )}
          <Image
            src={env.image}
            alt={env.name}
            width={128}
            height={128}
            className="mb-2 h-24 w-24 object-contain"
          />
          <h3 className="text-lg font-semibold">{env.name}</h3>
        </div>
      ))}
    </div>
  );
}
