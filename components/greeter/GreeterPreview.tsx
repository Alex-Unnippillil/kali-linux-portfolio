import { useSettings } from '../../hooks/useSettings';

export default function GreeterPreview() {
  const { avatar } = useSettings();
  return (
    <div className="flex items-center justify-center p-4">
      {avatar && (
        <img
          src={avatar}
          alt="user avatar"
          className="w-24 h-24 rounded-full border"
        />
      )}
    </div>
  );
}
