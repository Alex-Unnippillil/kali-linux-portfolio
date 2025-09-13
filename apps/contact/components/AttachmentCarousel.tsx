import React, { useEffect, useState } from 'react';

interface AttachmentCarouselProps {
  attachments: File[];
  onRemove: (index: number) => void;
}

const AttachmentCarousel: React.FC<AttachmentCarouselProps> = ({
  attachments,
  onRemove,
}) => {
  const [index, setIndex] = useState(0);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const newUrls = attachments.map((file) => URL.createObjectURL(file));
    setUrls(newUrls);
    return () => {
      newUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [attachments]);

  useEffect(() => {
    if (index >= attachments.length) {
      setIndex(attachments.length - 1);
    }
  }, [attachments, index]);

  if (!attachments.length) return null;

  const file = attachments[index];
  const url = urls[index];
  const isImage = file.type.startsWith('image/');

  const prev = () => setIndex((index - 1 + attachments.length) % attachments.length);
  const next = () => setIndex((index + 1) % attachments.length);

  return (
    <div className="mt-6">
      <div className="relative">
        {isImage ? (
          <img loading="lazy" src={url} alt={file.name} className="max-h-48 object-contain" />
        ) : (
          <div className="p-3 bg-gray-800 rounded">{file.name}</div>
        )}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded"
        >
          Remove
        </button>
      </div>
      {attachments.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={prev}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            Prev
          </button>
          <span className="text-sm">
            {index + 1} / {attachments.length}
          </span>
          <button
            type="button"
            onClick={next}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AttachmentCarousel;
