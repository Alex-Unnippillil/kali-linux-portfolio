import { useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useMotionValue, useReducedMotion } from 'framer-motion';
import PropTypes from 'prop-types';

export interface DeviceSequenceProps {
  /**
   * Array of image frame URLs. In MDX, supply via front matter:
   *
   * ```mdx
   * ---
   * frames:
   *   - /images/frame1.png
   *   - /images/frame2.png
   * ---
   *
   * <DeviceSequence frames={frontMatter.frames} alt="demo" />
   * ```
   */
  frames: string[];
  /** Alt text applied to each frame */
  alt: string;
  /** Optional className applied to wrapper */
  className?: string;
}

/**
 * Renders a scroll-driven image sequence using the native ScrollTimeline API
 * when available, with a Framer Motion fallback. Users with
 * `prefers-reduced-motion` receive the first frame only.
 */
const DeviceSequence: React.FC<DeviceSequenceProps> = ({ frames, alt, className }) => {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const frameIndex = useTransform(scrollYProgress, [0, 1], [0, frames.length - 1]);
  const currentFrame = useMotionValue(frames[0]);

  useEffect(() => {
    return frameIndex.on('change', (v) => {
      const idx = Math.round(v);
      currentFrame.set(frames[idx] || frames[0]);
    });
  }, [frameIndex, frames, currentFrame]);

  const supportsScrollTimeline =
    typeof window !== 'undefined' &&
    typeof window.CSS !== 'undefined' &&
    typeof window.CSS.supports === 'function' &&
    window.CSS.supports('animation-timeline: scroll()');

  if (prefersReduced || frames.length === 0) {
    return (
      <Image src={frames[0]} alt={alt} width={800} height={600} className={className} />
    );
  }

  if (supportsScrollTimeline) {
    return (
      <div
        className={className ? `relative ${className}` : 'relative'}
        style={{ viewTimelineName: '--device-seq', viewTimelineAxis: 'block' }}
      >
        {frames.map((src, i) => (
          <Image
            key={i}
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            className="absolute inset-0 object-contain opacity-0"
            style={{
              animationName: 'ds-reveal',
              animationTimingFunction: `steps(${frames.length})`,
              animationDuration: '1s',
              animationFillMode: 'both',
              animationTimeline: '--device-seq',
              animationDelay: `-${i / frames.length}s`,
            }}
          />
        ))}
        <style jsx>{`
          @keyframes ds-reveal {
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <motion.img src={currentFrame.get()} alt={alt} className="w-full h-auto" />
    </div>
  );
};

DeviceSequence.propTypes = {
  frames: PropTypes.arrayOf(PropTypes.string).isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default DeviceSequence;

