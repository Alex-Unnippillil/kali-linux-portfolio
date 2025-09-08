import React from "react";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
}

export default function CodeBlock({
  children,
  className = "",
  ...props
}: CodeBlockProps) {
  return (
    <pre className={className} {...props}>
      <code>{children}</code>
    </pre>
  );
}
