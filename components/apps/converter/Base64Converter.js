import React, { useState } from 'react';

const Base64Converter = () => {
  const [text, setText] = useState('');
  const [base64, setBase64] = useState('');

  const encode = (value) => {
    if (typeof window === 'undefined') return '';
    try {
      return window.btoa(value);
    } catch {
      return '';
    }
  };

  const decode = (value) => {
    if (typeof window === 'undefined') return '';
    try {
      return window.atob(value);
    } catch {
      return '';
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    setBase64(encode(val));
  };

  const handleBase64Change = (e) => {
    const val = e.target.value;
    setBase64(val);
    setText(decode(val));
  };

  return (
    <div className="bg-gray-700 text-white p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Base64 Converter</h2>
      <label className="flex flex-col">
        Text
        <textarea
          className="text-black p-1 rounded"
          value={text}
          onChange={handleTextChange}
          rows={3}
        />
      </label>
      <label className="flex flex-col">
        Base64
        <textarea
          className="text-black p-1 rounded"
          value={base64}
          onChange={handleBase64Change}
          rows={3}
        />
      </label>
    </div>
  );
};

export default Base64Converter;

