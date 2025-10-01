import 'trusted-types';

declare global {
  interface Window {
    __appCreateTrustedHTML?: (value: string) => string | TrustedHTML;
    __appSetTrustedHTML?: (element: Element, value: string) => void;
  }
}

export {};
