import React from 'react';

export default function XApp() {
  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey">
      <iframe
        src="https://platform.twitter.com/widgets/timeline.html?screen_name=AUnnippillil&ref_src=twsrc%5Etfw&chrome=noheader%20noborders"
        title="X Timeline"
        className="w-full h-full"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      />
    </div>
  );
}

export const displayX = () => <XApp />;

