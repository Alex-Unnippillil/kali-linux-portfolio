import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import usePersistentState from '../../../hooks/usePersistentState';

interface Item {
  id: number;
  text: string;
  done: boolean;
}

const initialItems: Item[] = [
  { id: 1, text: 'Use encrypted protocols like HTTPS or SSH', done: false },
  { id: 2, text: 'Segment networks to limit sniffing scope', done: false },
  { id: 3, text: 'Monitor traffic with intrusion detection systems', done: false },
  { id: 4, text: 'Keep software and firmware updated', done: false },
  { id: 5, text: 'Educate users about phishing and social engineering', done: false },
];

const MitigationChecklist: React.FC = () => {
  const [items, setItems] = usePersistentState<Item[]>(
    'dsniff-mitigation',
    initialItems,
    (v): v is Item[] =>
      Array.isArray(v) &&
      v.every(
        (i) =>
          typeof i === 'object' &&
          typeof i.id === 'number' &&
          typeof i.text === 'string' &&
          typeof i.done === 'boolean',
      ),
  );
  const captureRef = useRef<HTMLDivElement>(null);

  const toggle = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  };

  const download = async () => {
    if (!captureRef.current) return;
    const canvas = await html2canvas(captureRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save('mitigation-checklist.pdf');
  };

  return (
    <div className="mt-4 p-2 bg-ub-dark text-white rounded">
      <div ref={captureRef}>
        <h2 className="text-lg mb-2">Mitigation Checklist</h2>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center">
              <input
                id={`mitigation-${item.id}`}
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(item.id)}
                className="mr-2"
              />
              <label
                htmlFor={`mitigation-${item.id}`}
                className={item.done ? 'line-through' : ''}
              >
                {item.text}
              </label>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={download}
        className="mt-2 px-3 py-1 rounded bg-green-600 text-white"
      >
        Download PDF
      </button>
    </div>
  );
};

export default MitigationChecklist;

