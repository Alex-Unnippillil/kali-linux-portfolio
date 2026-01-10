import React, { useRef } from 'react';
import { logContactFunnelStep } from '../../../utils/analytics';

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB per file
export const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB total

interface AttachmentUploaderProps {
  attachments: File[];
  setAttachments: (files: File[]) => void;
  onError?: (message: string) => void;
  analyticsSurface?: string;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  attachments,
  setAttachments,
  onError,
  analyticsSurface = 'contact-app',
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
        logContactFunnelStep('attachment_rejected', {
          surface: analyticsSurface,
          reason: 'per_file_limit',
        });
        continue;
      }
      if (totalSize + file.size > MAX_TOTAL_ATTACHMENT_SIZE) {
        onError?.('Total attachment size exceeds limit.');
        logContactFunnelStep('attachment_rejected', {
          surface: analyticsSurface,
          reason: 'total_limit',
        });
        break;
      }
      valid.push(file);
      totalSize += file.size;
    }

    if (valid.length) {
      setAttachments([...attachments, ...valid]);
      logContactFunnelStep('attachment_added', {
        surface: analyticsSurface,
        added: valid.length,
        total: attachments.length + valid.length,
      });
    }

    // reset input so same file can be reselected
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3">
      <label htmlFor="contact-attachments" className="sr-only" id="contact-attachments-label">
        Attach files
      </label>
      <input
        ref={inputRef}
        id="contact-attachments"
        type="file"
        multiple
        onChange={handleChange}
        className="text-sm"
        aria-labelledby="contact-attachments-label"
      />
    </div>
  );
};

export default AttachmentUploader;
