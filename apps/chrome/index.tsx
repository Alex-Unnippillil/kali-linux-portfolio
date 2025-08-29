'use client';

import React from 'react';
import Chrome from '../../components/apps/Chrome';

const ChromePage: React.FC = () => {
  const url = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const u = params.get('url') || undefined;
    return u ? decodeURIComponent(u) : undefined;
  }, []);
  return <Chrome initialUrl={url} />;
};

export default ChromePage;
