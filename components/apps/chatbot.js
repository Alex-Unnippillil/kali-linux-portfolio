import React, { useState } from 'react';

const qaPairs = [
  {
    question: /(who|your name|what).*you/i,
    answer: "I'm Alex Unnippillil, a cybersecurity specialist and technology enthusiast.",
  },
  {
    question: /(background|education)/i,
    answer:
      'I studied Nuclear Engineering for four years before switching to Networking and IT Security.',
  },
  {
    question: /(skills|technologies|stack)/i,
    answer:
      'My toolkit includes JavaScript, React, Next.js and various cybersecurity tools.',
  },
  {
    question: /(contact|reach)/i,
    answer: 'You can reach me at alex.unnippillil@hotmail.com.',
  },
];

function Chatbot() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! Ask me anything about my work and background.' },
  ]);

  const findAnswer = (question) => {
    const pair = qaPairs.find((p) => p.question.test(question));
    return pair ? pair.answer : "Sorry, I don't have an answer for that.";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMessage = { from: 'user', text: trimmed };
    const botMessage = { from: 'bot', text: findAnswer(trimmed.toLowerCase()) };
    setMessages((msgs) => [...msgs, userMessage, botMessage]);
    setInput('');
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-sm text-white">
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.from === 'bot'
                ? 'text-ubt-grey'
                : 'text-white text-right'
            }
          >
            {m.text}
          </div>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-2 border-t border-gray-700 flex"
      >
        <input
          className="flex-1 bg-transparent outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          autoFocus
        />
        <button
          type="submit"
          className="ml-2 px-2 py-1 bg-ub-gedit-light text-black rounded"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default Chatbot;

export const displayChatbot = (addFolder, openApp) => {
  return <Chatbot addFolder={addFolder} openApp={openApp} />;
};

