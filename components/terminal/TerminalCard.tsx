import React from 'react';

interface TerminalCardProps {
  title: string;
  content: string;
}

const TerminalCard: React.FC<TerminalCardProps> = ({ title, content }) => {
  return (
    <div className="terminal">
      <div className="titlebar">
        <span className="winbtn" />
        <span className="winbtn" />
        <span className="winbtn" />
        <span className="title">{title}</span>
      </div>
      <div className="screen">
        <pre>{content}</pre>
      </div>
    </div>
  );
};

export default TerminalCard;
