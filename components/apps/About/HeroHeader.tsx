import React from 'react';
import Image from 'next/image';

type MotionLib = typeof import('framer-motion');

type HeroHeaderProps = {
  name: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  chips: { label: string; icon: React.ReactNode }[];
};

const loadMotion = async () => {
  const mod = await import('framer-motion');
  return mod;
};

const HeroHeader: React.FC<HeroHeaderProps> = ({ name, title, subtitle, imageSrc, imageAlt, chips }) => {
  const [motionLib, setMotionLib] = React.useState<MotionLib | null>(null);

  React.useEffect(() => {
    let mounted = true;
    loadMotion().then((module) => {
      if (mounted) {
        setMotionLib(module);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!motionLib) {
    return <HeroHeaderContent name={name} title={title} subtitle={subtitle} imageSrc={imageSrc} imageAlt={imageAlt} chips={chips} />;
  }

  return <HeroHeaderWithMotion motionLib={motionLib} name={name} title={title} subtitle={subtitle} imageSrc={imageSrc} imageAlt={imageAlt} chips={chips} />;
};

const HeroHeaderWithMotion: React.FC<HeroHeaderProps & { motionLib: MotionLib }> = ({ motionLib, ...props }) => {
  const { LazyMotion, domAnimation, m, useScroll, useTransform } = motionLib;
  const heroRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start end', 'end start'],
  });
  const translateY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const fade = useTransform(scrollYProgress, [0, 0.6], [1, 0.4]);

  return (
    <LazyMotion features={() => Promise.resolve(domAnimation)}>
      <m.header
        ref={heroRef as React.RefObject<HTMLElement>}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative flex flex-col items-center gap-6 text-center"
      >
        <m.div style={{ y: translateY, opacity: fade }} className="flex flex-col items-center gap-5">
          <HeroHeaderInner {...props} />
        </m.div>
      </m.header>
    </LazyMotion>
  );
};

const HeroHeaderContent = React.forwardRef<HTMLElement, HeroHeaderProps>((props, ref) => {
  return (
    <header ref={ref} className="relative flex flex-col items-center gap-6 text-center">
      <HeroHeaderInner {...props} />
    </header>
  );
});

HeroHeaderContent.displayName = 'HeroHeaderContent';

const HeroHeaderInner: React.FC<HeroHeaderProps> = ({ name, title, subtitle, imageSrc, imageAlt, chips }) => {
  return (
    <>
      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-kali-border/60 shadow-lg shadow-black/40 sm:h-28 sm:w-28">
        <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 768px) 128px, 160px" className="object-cover" priority />
      </div>
      <div className="space-y-1">
        <h1 className="kali-heading-lg text-2xl sm:text-3xl">{name}</h1>
        <p className="kali-body text-base sm:text-lg text-ubt-blue">{title}</p>
        <p className="kali-body-muted text-sm sm:text-base">{subtitle}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {chips.map((chip) => (
          <span key={chip.label} className="kali-chip">
            <span aria-hidden="true" className="text-lg leading-none">
              {chip.icon}
            </span>
            {chip.label}
          </span>
        ))}
      </div>
    </>
  );
};

export { HeroHeaderContent };
export type { HeroHeaderProps };
export default HeroHeader;
