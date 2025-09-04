import { useRef } from 'react';

export interface TagMeta {
  name: string;
  color: string;
}

interface Props {
  tags: TagMeta[];
  onChange: (tags: TagMeta[]) => void;
}

export default function TagManager({ tags, onChange }: Props) {
  const dragIndex = useRef<number | null>(null);

  const handleDragStart = (index: number) => () => {
    dragIndex.current = index;
  };

  const handleDrop = (index: number) => () => {
    const from = dragIndex.current;
    if (from === null) return;
    const updated = [...tags];
    const [moved] = updated.splice(from, 1);
    updated.splice(index, 0, moved);
    dragIndex.current = null;
    onChange(updated);
  };

  const updateColor = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = tags.map((t, i) => (i === index ? { ...t, color: e.target.value } : t));
    onChange(updated);
  };

  return (
    <ul className="flex flex-col gap-2">
      {tags.map((tag, index) => (
        <li
          key={tag.name}
          draggable
          onDragStart={handleDragStart(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop(index)}
          className="flex items-center gap-2"
        >
          <span
            className="px-2 py-1 rounded text-sm text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </span>
          <input
            type="color"
            aria-label={`Color for ${tag.name}`}
            value={tag.color}
            onChange={updateColor(index)}
          />
        </li>
      ))}
    </ul>
  );
}
