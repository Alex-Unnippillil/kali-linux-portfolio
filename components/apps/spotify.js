import React, { useEffect, useRef } from 'react';

export default function SpotifyApp() {
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const iframe = iframeRef.current;
    if (!canvas || !iframe) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    let animationId;

    const draw = (analyser, bufferLength, dataArray) => {
      animationId = requestAnimationFrame(() => draw(analyser, bufferLength, dataArray));
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        const x = i * barWidth;
        ctx.fillStyle = '#1DB954';
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
      }
    };

    const setup = async () => {
      try {
        let stream;
        if (iframe.captureStream) {
          stream = iframe.captureStream();
        }
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        draw(analyser, bufferLength, dataArray);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Equalizer setup failed', err);
      }
    };

    setup();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="relative h-full w-full bg-ub-cool-grey">
      <iframe
        ref={iframeRef}
        src="https://open.spotify.com/embed/playlist/37i9dQZF1E37fa3zdWtvQY?utm_source=generator&theme=0"
        title="Daily Mix 2"
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
      <canvas ref={canvasRef} className="spotify-equalizer" />
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

