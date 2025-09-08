import React, { ReactNode } from "react";

interface PolicyPageProps {
  title: string;
  author: string;
  updated: string;
  children: ReactNode;
}

const PolicyPage: React.FC<PolicyPageProps> = ({
  title,
  author,
  updated,
  children,
}) => (
  <div className="p-8 max-w-5xl mx-auto">
    <h1 className="text-2xl font-bold mb-1">{title}</h1>
    <p className="text-sm text-gray-500 mb-6">
      Last updated: {updated} · Author: {author}
    </p>
    {children}
  </div>
);

export default PolicyPage;
