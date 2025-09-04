import { useEffect, useRef } from 'react';

const Hero: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    const ambient = node.querySelector('.ambient') as HTMLElement | null;
    if (!ambient) return;

    const observer = new IntersectionObserver(([entry]) => {
      ambient.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
    }, { threshold: 0.1 });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative flex flex-col items-center justify-center gap-6 py-24 text-center overflow-hidden"
    >
      <div className="ambient absolute inset-0 -z-10 bg-gradient-to-r from-ubt-blue/30 via-purple-500/30 to-pink-500/30 blur-3xl animate-[float_10s_linear_infinite]" />
      <h1 className="text-4xl font-bold">Offensive Security, Simplified</h1>
      <p className="max-w-2xl text-lg">Explore and launch Kali Linux tools from a familiar desktop interface.</p>
      <div className="mt-4 flex gap-4">
        <a href="/module-workspace" className="rounded bg-ubt-blue px-6 py-3 text-white">Launch Workspace</a>
        <a href="/notes" className="rounded border border-ubt-blue px-6 py-3 text-ubt-blue">Read Notes</a>
      </div>
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};

export default Hero;
