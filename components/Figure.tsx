import React from "react";

interface LicenseInfo {
  name: string;
  url?: string;
}

interface FigureProps {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  license?: LicenseInfo;
  learnMoreUrl?: string;
  className?: string;
}

/**
 * Renders an image with optional caption, credit line and license metadata.
 * Use for screenshots or photos that require attribution.
 */
const Figure: React.FC<FigureProps> = ({
  src,
  alt,
  caption,
  credit,
  license,
  learnMoreUrl,
  className = "",
}) => {
  return (
    <figure className={className}>
      <img src={src} alt={alt} />
      {(caption || credit || license || learnMoreUrl) && (
        <figcaption className="mt-2 text-sm text-center">
          {caption && <span>{caption}</span>}
          {(credit || license) && (
            <span className="block text-gray-500">
              {credit}
              {credit && license ? " / " : ""}
              {license && (
                license.url ? (
                  <a
                    href={license.url}
                    rel="license noopener noreferrer"
                    target="_blank"
                  >
                    {license.name}
                  </a>
                ) : (
                  license.name
                )
              )}
            </span>
          )}
          {learnMoreUrl && (
            <span className="block">
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </a>
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
};

export default Figure;

