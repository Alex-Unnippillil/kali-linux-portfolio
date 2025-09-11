"use client";

import React from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { List } from "react-window";

export interface WindowedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemKey?: (index: number, item: T) => React.Key;
}

export default function WindowedList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  itemKey,
}: WindowedListProps<T>) {
  if (process.env.NODE_ENV === "test") {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={itemKey ? itemKey(index, item) : index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className} style={{ height: "100%" }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height || 600}
            width={width || 600}
            itemCount={items.length}
            itemSize={itemHeight}
            overscanCount={5}
            itemKey={(index) => (itemKey ? itemKey(index, items[index]) : index)}
          >
            {({ index, style }) => (
              <div style={style}>{renderItem(items[index], index)}</div>
            )}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

