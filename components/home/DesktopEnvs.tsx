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
      {desktopEnvs.map((env) => {
        const isDefault = env.name === "Xfce";
        return (
          <div
            key={env.name}
            className={`flex flex-col items-center p-4 border rounded text-center bg-white ${
              isDefault ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <Image
              src={env.image}
              alt={env.name}
              width={128}
              height={128}
              className="mx-auto mb-2 h-24 w-24 object-contain"
            />
            <h3 className="text-lg font-semibold">
              {env.name}
              {isDefault && <span className="ml-1 text-sm text-blue-600">(Default)</span>}
            </h3>
          </div>
        );
      })}
    </div>
  );
}
