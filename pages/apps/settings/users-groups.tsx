import { useRef, ChangeEvent } from 'react';
import { useSettings } from '../../../hooks/useSettings';

export default function UsersGroups() {
  const { avatar, setAvatar } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      alert('Please select a PNG image');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setAvatar(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4">
      <label className="block mb-2">
        <span className="mb-1 block">User avatar (96×96 PNG preferred)</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/png"
          onChange={handleFileChange}
          aria-label="Upload avatar"
        />
      </label>
      {avatar && (
        <img
          src={avatar}
          alt="avatar preview"
          className="w-24 h-24 rounded-full border"
        />
      )}
    </div>
  );
}
