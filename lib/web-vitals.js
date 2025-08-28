import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

export const registerWebVitals = (onPerfEntry) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onLCP(onPerfEntry);
    onFCP(onPerfEntry);
    onTTFB(onPerfEntry);
    onINP(onPerfEntry);
  }
};
