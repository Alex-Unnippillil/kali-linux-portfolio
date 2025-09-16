import type { MDXComponents } from 'mdx/types';

const defaultComponents: MDXComponents = {
  table: (props) => (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse" {...props} />
    </div>
  ),
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...components,
  };
}
