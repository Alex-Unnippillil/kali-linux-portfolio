import React, { useMemo } from 'react';
import Image from 'next/image';
import Modal from '@/components/base/Modal';
import posts from '@/data/kali-blog.json';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReleaseNotesModal({ isOpen, onClose }: ReleaseNotesModalProps) {
  const latest = useMemo(() => {
    return posts
      .filter(p => p.title.includes('Release'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, []);

  if (!latest) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="window-shadow bg-ub-cool-grey rounded-md w-96 border border-black">
        <div className="flex items-center bg-ub-window-title text-white h-11 rounded-t-md">
          <div className="flex-1 text-center font-bold">Release Notes</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="m-1 bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 active:bg-opacity-80 rounded-full flex justify-center items-center h-6 w-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 transition-colors"
          >
            <Image
              src="/themes/Yaru/window/window-close-symbolic.svg"
              alt="Close"
              width={16}
              height={16}
              className="h-4 w-4"
            />
          </button>
        </div>
        <div className="p-4 text-sm">
          <p className="mb-4">{latest.title}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Dismiss
            </button>
            <a
              href={latest.link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Read More
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
