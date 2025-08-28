'use client';

import React, { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pipSupported, setPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    setPipSupported(
      typeof document !== 'undefined' &&
        !!document.pictureInPictureEnabled &&
        !!video &&
        typeof video.requestPictureInPicture === 'function'
    );

    const handleLeave = () => setIsPip(false);
    video?.addEventListener('leavepictureinpicture', handleLeave);
    return () => video?.removeEventListener('leavepictureinpicture', handleLeave);
  }, []);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (!document.pictureInPictureElement) {
        await video.requestPictureInPicture();
        setIsPip(true);
      } else {
        await document.exitPictureInPicture();
        setIsPip(false);
      }
    } catch {
      setIsPip(false);
    }
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <video ref={videoRef} src={src} poster={poster} controls className="w-full h-auto" />
      {pipSupported && (
        <button
          type="button"
          onClick={togglePiP}
          className="absolute bottom-2 right-2 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
        >
          {isPip ? 'Exit PiP' : 'PiP'}
        </button>
      )}
    </div>
  );
};

export default VideoPlayer;

