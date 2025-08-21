import React, { useState } from 'react';
import JSZip from 'jszip';

const FileCompressor = () => {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInput = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleCompress = async () => {
    if (files.length === 0) return;
    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.name, file);
    });
    setIsCompressing(true);
    setProgress(0);
    const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      setProgress(metadata.percent);
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'files.zip';
    a.click();
    URL.revokeObjectURL(url);
    setIsCompressing(false);
    setProgress(0);
    setFiles([]);
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex flex-col items-center justify-center flex-grow border-2 border-dashed border-gray-600 rounded"
      >
        {files.length === 0 ? (
          <p>Drag and drop files here or click to select</p>
        ) : (
          <ul className="mb-2 w-full px-2 overflow-auto">
            {files.map((file) => (
              <li key={file.name} className="truncate">
                {file.name}
              </li>
            ))}
          </ul>
        )}
        <input
          id="file-input"
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <label
          htmlFor="file-input"
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded cursor-pointer"
        >
          Select Files
        </label>
      </div>
      {isCompressing && (
        <div className="w-full bg-gray-700 rounded h-4 mt-4">
          <div
            className="bg-green-500 h-4 rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      <button
        onClick={handleCompress}
        disabled={files.length === 0 || isCompressing}
        className="mt-4 py-2 px-4 bg-green-600 hover:bg-green-500 rounded disabled:opacity-50"
      >
        Compress and Download
      </button>
    </div>
  );
};

export default FileCompressor;

export const displayFileCompressor = (addFolder, openApp) => {
  return <FileCompressor addFolder={addFolder} openApp={openApp} />;
};

