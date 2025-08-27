import React, { useEffect, useState } from 'react';
import yaml from 'js-yaml';
import ExternalFrame from './ExternalFrame';
import DocsPanel from './DocsPanel';

export default function ToolApp({ id }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetch(`/configs/${id}.yaml`)
      .then((res) => res.text())
      .then((text) => {
        setConfig(yaml.load(text));
      });
  }, [id]);

  if (!config) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );
  }

  if (config.safe_embed) {
    return <ExternalFrame src={config.homepage} title={config.title} />;
  }

  return <DocsPanel id={id} />;
}
