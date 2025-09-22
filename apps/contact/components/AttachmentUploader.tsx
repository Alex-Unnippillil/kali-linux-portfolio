import React, { useRef } from 'react';

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB per file
export const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB total

interface AttachmentUploaderProps {
  attachments: File[];
  setAttachments: (files: File[]) => void;
  onError?: (message: string) => void;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  attachments,
  setAttachments,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    let totalSize = attachments.reduce((sum, f) => sum + f.size, 0);
    const valid: File[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        onError?.(`Attachment '${file.name}' exceeds the ${
          MAX_ATTACHMENT_SIZE / (1024 * 1024)
        }MB limit.`);
        continue;
      }
      if (totalSize + file.size > MAX_TOTAL_ATTACHMENT_SIZE) {
        onError?.('Total attachment size exceeds limit.');
        break;
      }
      valid.push(file);
      totalSize += file.size;
    }

    if (valid.length) {
      setAttachments([...attachments, ...valid]);
    }

    // reset input so same file can be reselected
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="text-sm"
        aria-label="Upload attachments"
      />
    </div>
  );
};

export default AttachmentUploader;
