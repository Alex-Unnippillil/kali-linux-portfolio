import React, { useEffect, useRef, useState } from 'react';

const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const LazyImage = ({ src, srcSet, sizes, alt = '', className = '', ...props }) => {
  const imgRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = imgRef.current;
    if (!node) return;
    let observer;
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.disconnect();
            }
          });
        },
        { rootMargin: '200px' }
      );
      observer.observe(node);
    } else {
      // Fallback for browsers without IntersectionObserver support
      setIsVisible(true);
    }
    return () => observer && observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : PLACEHOLDER}
      srcSet={isVisible ? srcSet : undefined}
      sizes={isVisible ? sizes : undefined}
      alt={alt}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};

export default LazyImage;
