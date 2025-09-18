import React, { useEffect, useRef, useState } from 'react';
import RedactionReview from './screen-recorder/RedactionReview';
import {
  RedactionMask,
  detectRedactionsFromBlob,
  buildRedactionMetadata,
  downloadRedactionMetadata,
} from '../../utils/redaction';

const DEFAULT_FILENAME = 'recording.webm';

function ScreenRecorder() {
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [masks, setMasks] = useState<RedactionMask[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const reset = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setRecordedBlob(null);
    setMasks([]);
    setReviewing(false);
    setAnalysisError(null);
  };

  const startRecording = async () => {
    reset();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setVideoUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        if (blob.size > 0) {
          setIsAnalyzing(true);
          setAnalysisError(null);
          try {
            const detected = await detectRedactionsFromBlob(blob);
            setMasks(detected);
          } catch (error) {
            setAnalysisError('Automatic redaction detection failed.');
          } finally {
            setIsAnalyzing(false);
          }
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const finalizeSave = async () => {
    if (!recordedBlob) return;
    const metadata = buildRedactionMetadata(masks);
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: DEFAULT_FILENAME,
          types: [
            {
              description: 'WebM video',
              accept: { 'video/webm': ['.webm'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(recordedBlob);
        await writable.close();
        const filename = handle?.name || DEFAULT_FILENAME;
        downloadRedactionMetadata(filename, metadata);
      } catch {
        // ignore save picker failures
      }
    } else {
      const url = videoUrl ?? URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = DEFAULT_FILENAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (!videoUrl) {
        URL.revokeObjectURL(url);
      }
      downloadRedactionMetadata(DEFAULT_FILENAME, metadata);
    }
    setReviewing(false);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-ub-cool-grey p-4 text-white">
      {!recording && (
        <button
          type="button"
          onClick={startRecording}
          className="rounded bg-ub-dracula px-4 py-2 hover:bg-ub-dracula-dark"
        >
          Start Recording
        </button>
      )}
      {recording && (
        <button
          type="button"
          onClick={stopRecording}
          className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
        >
          Stop Recording
        </button>
      )}
      {analysisError && (
        <p className="text-xs text-red-300" role="alert">
          {analysisError}
        </p>
      )}
      {videoUrl && !recording && (
        <div className="flex w-full max-w-3xl flex-col items-center space-y-3">
          <video src={videoUrl} controls className="w-full rounded" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReviewing(true)}
              className="rounded bg-ub-dracula px-4 py-2 text-sm hover:bg-ub-dracula-dark"
            >
              Review Redaction &amp; Save
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded bg-ub-cool-grey px-4 py-2 text-sm hover:bg-ub-cool-grey/80"
            >
              Discard
            </button>
          </div>
        </div>
      )}
      {reviewing && videoUrl && recordedBlob && (
        <RedactionReview
          previewUrl={videoUrl}
          masks={masks}
          onChange={setMasks}
          onClose={() => setReviewing(false)}
          onSave={finalizeSave}
          isAnalyzing={isAnalyzing}
        />
      )}
    </div>
  );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
  return <ScreenRecorder />;
};
