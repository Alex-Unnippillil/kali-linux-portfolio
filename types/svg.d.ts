declare module '*.svg' {
  import * as React from 'react';

  export const ReactComponent: React.FC<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;

  const Component: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }>;
  export default Component;
}

declare module '*.svg?url' {
  const url: string;
  export default url;
}
