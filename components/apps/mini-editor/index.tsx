import dynamic from 'next/dynamic';
import type { FC } from 'react';
import type { EditorProps } from '@monaco-editor/react';

const Monaco = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full animate-pulse bg-black/40"
      aria-hidden="true"
    />
  ),
});

const baseOptions: EditorProps['options'] = {
  tabSize: 2,
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
};

type MiniEditorProps = Omit<EditorProps, 'options'> & {
  options?: EditorProps['options'];
};

const MiniEditor: FC<MiniEditorProps> = ({ options, ...props }) => {
  const mergedOptions: EditorProps['options'] = {
    ...baseOptions,
    ...options,
    minimap: {
      ...baseOptions?.minimap,
      ...(options?.minimap ?? {}),
    },
  };

  return <Monaco {...props} options={mergedOptions} />;
};

export type { MiniEditorProps };
export default MiniEditor;
