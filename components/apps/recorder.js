import React, { useRef, useState } from 'react';

const RecorderApp = () => {
  const [recording, setRecording] = useState(false);
  const [videoURL, setVideoURL] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const videoRef = useRef(null);

  const startRecording = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = [
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),
        ...micStream.getAudioTracks(),
      ];
      const stream = new MediaStream(tracks);
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        setVideoURL(url);
        if (videoRef.current) {
          videoRef.current.src = url;
        }
      };
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Error starting recording', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <button
          onClick={startRecording}
          disabled={recording}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stopRecording}
          disabled={!recording}
          className="px-4 py-2 bg-red-600 rounded disabled:opacity-50"
        >
          Stop
        </button>
        {recording && <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>}
      </div>
      {videoURL && (
        <div className="flex flex-col space-y-2">
          <video ref={videoRef} controls className="w-full h-64 bg-black" src={videoURL}></video>
          <a href={videoURL} download="recording.webm" className="text-blue-300 underline">
            Download
          </a>
        </div>
      )}
    </div>
  );
};

export default RecorderApp;

export const displayRecorder = () => <RecorderApp />;

