import React, { useState } from 'react';

interface Guide {
  title: string;
  link: string;
}

interface Option {
  value: string;
  label: string;
  next?: string;
  guide?: Guide;
}

interface Node {
  question: string;
  options: Option[];
}

const FLOW: Record<string, Node> = {
  start: {
    question: 'What area do you want to explore?',
    options: [
      { value: 'recon', label: 'Reconnaissance', next: 'recon' },
      { value: 'exploit', label: 'Exploitation', next: 'exploit' },
      { value: 'post', label: 'Post-Exploitation', next: 'post' },
    ],
  },
  recon: {
    question: 'Which recon guide do you need?',
    options: [
      {
        value: 'nmap',
        label: 'Nmap NSE Walkthrough',
        guide: {
          title: 'Nmap NSE Walkthrough',
          link: 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/nmap-nse-walkthrough.md',
        },
      },
      {
        value: 'reconng',
        label: 'Recon-ng Basics',
        guide: {
          title: 'Recon-ng Guide',
          link: 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/reconng.md',
        },
      },
    ],
  },
  exploit: {
    question: 'Which exploitation guide do you need?',
    options: [
      {
        value: 'metasploit',
        label: 'Metasploit Framework',
        guide: {
          title: 'Metasploit Guide',
          link: 'https://docs.rapid7.com/metasploit/',
        },
      },
      {
        value: 'beef',
        label: 'BeEF Workflow',
        guide: {
          title: 'BeEF Project',
          link: 'https://beefproject.com/',
        },
      },
    ],
  },
  post: {
    question: 'Which post-exploitation guide do you need?',
    options: [
      {
        value: 'mimikatz',
        label: 'Mimikatz Credentials',
        guide: {
          title: 'Mimikatz Guide',
          link: 'https://github.com/gentilkiwi/mimikatz/wiki',
        },
      },
      {
        value: 'postmeta',
        label: 'Metasploit Post-Exploitation',
        guide: {
          title: 'Metasploit Post Exploitation',
          link: 'https://docs.rapid7.com/metasploit/about-post-exploitation/',
        },
      },
    ],
  },
};

const GuideFlow: React.FC = () => {
  const [current, setCurrent] = useState('start');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>(['start']);
  const [result, setResult] = useState<Guide | null>(null);

  const node = FLOW[current];

  const goNext = () => {
    const value = answers[current];
    if (!value) return;
    const option = node.options.find((o) => o.value === value);
    if (!option) return;
    if (option.next) {
      setCurrent(option.next);
      setHistory((h) => [...h, option.next!]);
    } else if (option.guide) {
      setResult(option.guide);
      setCurrent('result');
      setHistory((h) => [...h, 'result']);
    }
  };

  const goBack = () => {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const newHist = h.slice(0, -1);
      const prev = newHist[newHist.length - 1];
      setCurrent(prev);
      if (prev !== 'result') setResult(null);
      return newHist;
    });
  };

  if (current === 'result' && result) {
    return (
      <div className="p-4 rounded bg-ub-grey text-white">
        <h2 className="text-lg font-bold mb-2">Recommended Guide</h2>
        <a
          href={result.link}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-ub-orange"
        >
          {result.title}
        </a>
        <div className="mt-4">
          <button
            onClick={goBack}
            className="px-2 py-1 bg-ub-cool-grey text-white text-xs"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded bg-ub-grey text-white">
      <p className="mb-2">{node.question}</p>
      <div className="mb-4">
        {node.options.map((opt) => (
          <label key={opt.value} className="block mb-1">
            <input
              type="radio"
              name={current}
              className="mr-1"
              value={opt.value}
              checked={answers[current] === opt.value}
              onChange={() =>
                setAnswers((a) => ({ ...a, [current]: opt.value }))
              }
            />
            {opt.label}
          </label>
        ))}
      </div>
      <div>
        <button
          onClick={goBack}
          disabled={history.length <= 1}
          className="px-2 py-1 bg-ub-cool-grey text-white text-xs mr-2 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={goNext}
          disabled={!answers[current]}
          className="px-2 py-1 bg-ub-green text-black text-xs disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default GuideFlow;

