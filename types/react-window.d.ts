declare module 'react-window' {
  import * as React from 'react';
  export interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
  }
  export interface FixedSizeListProps {
    height: number;
    width: number;
    itemCount: number;
    itemSize: number;
    overscanCount?: number;
    itemKey?: (index: number) => React.Key;
    children: (props: ListChildComponentProps) => React.ReactElement;
  }
  export class FixedSizeList extends React.Component<FixedSizeListProps> {}
}
