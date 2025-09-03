import React from 'react';
import copyToClipboard from '../../../utils/clipboard';

interface ResultCardProps {
  title: string;
  output: string;
}

const ResultCard: React.FC<ResultCardProps> = ({ title, output }) => {
  const copy = () => copyToClipboard(output);
  return (
    <div className="bg-gray-800 p-3 rounded mb-2">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold">{title}</h4>
        <button onClick={copy} className="px-2 py-1 bg-gray-700 rounded" aria-label="Copy result">
          Copy
        </button>
      </div>
      <pre className="whitespace-pre-wrap">{output}</pre>
    </div>
  );
};

export default ResultCard;
