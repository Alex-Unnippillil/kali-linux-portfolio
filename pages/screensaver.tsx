import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Screensaver() {
  const router = useRouter();
  useEffect(() => {
    const exit = () => router.back();
    window.addEventListener("mousemove", exit, { once: true });
    window.addEventListener("keydown", exit, { once: true });
    return () => {
      window.removeEventListener("mousemove", exit);
      window.removeEventListener("keydown", exit);
    };
  }, [router]);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
      Screensaver
    </div>
  );
}
