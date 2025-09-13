import React from 'react';
import BlogList from '../components/BlogList';

const BlogPage = () => (
  <main className="min-h-screen p-4 bg-gray-900 text-white">
    <h1 className="mb-4 text-2xl">Blog</h1>
    <BlogList />
  </main>
);

export default BlogPage;
