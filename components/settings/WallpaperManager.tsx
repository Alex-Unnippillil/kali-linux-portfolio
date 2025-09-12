import { useEffect, useState } from "react";
import { useSettings } from "../../hooks/useSettings";

type ManifestEntry = {
  name: string;
  categories: string[];
};

type Manifest = {
  categories: string[];
  wallpapers: ManifestEntry[];
};

const STORAGE_KEY = "wallpaper-category";

export default function WallpaperManager() {
  const { wallpaper, setWallpaper } = useSettings();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    const loadManifest = async () => {
      try {
        const res = await fetch("/wallpapers/manifest.json", { cache: "force-cache" });
        const data: Manifest = await res.json();
        setManifest(data);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && data.categories.includes(saved)) {
          setCategory(saved);
        } else if (data.categories.length > 0) {
          setCategory(data.categories[0]);
        }
      } catch (err) {
        console.error("Failed to load wallpaper manifest", err);
      }
    };
    loadManifest();
  }, []);

  useEffect(() => {
    if (category) {
      localStorage.setItem(STORAGE_KEY, category);
    }
  }, [category]);

  if (!manifest) return null;

  const filtered = manifest.wallpapers.filter(
    (w) => !category || w.categories.includes(category)
  );

  return (
    <>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey">Category:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          {manifest.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center border-t border-gray-900">
        {filtered.map(({ name }) => (
          <div
            key={name}
            role="button"
            aria-label={`Select ${name.replace("wall-", "wallpaper ")}`}
            aria-pressed={name === wallpaper}
            tabIndex={0}
            onClick={() => setWallpaper(name)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setWallpaper(name);
              }
            }}
            className={(name === wallpaper ? " border-yellow-700 " : " border-transparent ") +
              " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"}
            style={{
              backgroundImage: `url(/wallpapers/${name}.webp)`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center center",
            }}
          ></div>
        ))}
      </div>
    </>
  );
}
