import { useEffect, useState } from "react";

export default function Header() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const onScroll = () => setDark(window.scrollY > 64);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${dark ? "bg-gray-900" : "bg-transparent"}`}
    >
      <div className="mx-auto max-w-screen-xl p-4">Header</div>
    </header>
  );
}
