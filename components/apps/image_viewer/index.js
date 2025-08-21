import React, { useState } from 'react';

export default function ImageViewerApp() {
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(null);
  const [filter, setFilter] = useState('none');

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setImages(mapped);
  };

  const openImage = (img) => {
    setCurrent(img);
    setFilter('none');
  };

  const saveImage = () => {
    if (!current) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = current.url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.filter = filter === 'none' ? 'none' : `${filter}(100%)`;
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = current.file.name;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  return (
    <div className="w-full h-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="mb-4"
      />
      <div className="flex flex-wrap">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img.url}
            alt="thumbnail"
            className="w-24 h-24 object-cover m-2 cursor-pointer"
            onClick={() => openImage(img)}
          />
        ))}
      </div>

      {current && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-ub-cool-grey p-4">
            <img
              src={current.url}
              alt="full"
              className="max-w-screen-md max-h-screen-md mb-4"
              style={{ filter: filter === 'none' ? 'none' : `${filter}(100%)` }}
            />
            <div className="flex justify-between">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-black px-2 py-1"
              >
                <option value="none">None</option>
                <option value="grayscale">Grayscale</option>
                <option value="sepia">Sepia</option>
              </select>
              <div className="flex">
                <button
                  onClick={saveImage}
                  className="bg-green-600 px-2 py-1 mr-2"
                >
                  Save
                </button>
                <button
                  onClick={() => setCurrent(null)}
                  className="bg-red-600 px-2 py-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const displayImageViewer = () => <ImageViewerApp />;
