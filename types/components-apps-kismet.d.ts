import type { ComponentType } from 'react';

declare module 'components/apps/kismet.jsx' {
  const Kismet: ComponentType<any>;
  export default Kismet;
}

declare module 'components/apps/kismet/sampleCapture.json' {
  const data: any;
  export default data;
}

declare module 'components/apps/kismet/oui.json' {
  const data: Record<string, string>;
  export default data;
}

declare module 'components/apps/kismet/sampleClients.json' {
  const data: any;
  export default data;
}
