import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import VirtualList from '../VirtualList';

type FixtureItem = {
  id: number;
  title: string;
  description: string;
};

const createItems = (count: number): FixtureItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
    title: `Module ${index + 1}`,
    description: `Generated record ${index + 1} of ${count}. This content ensures variable sizing for virtualization demos.`,
  }));

const largeDataset = createItems(12000);

const containerStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  borderRadius: 12,
  color: '#e2e8f0',
  boxShadow: '0 30px 60px rgba(15, 23, 42, 0.45)',
};

const meta = {
  title: 'Common/VirtualList',
  component: VirtualList,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof VirtualList<any>>;

export default meta;

type Story = StoryObj<typeof meta>;

const renderItem = (item: FixtureItem) => (
  <li
    key={item.id}
    style={{
      padding: '12px 16px',
      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
      background: 'transparent',
    }}
  >
    <div style={{ fontWeight: 600 }}>{item.title}</div>
    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#cbd5f5' }}>{item.description}</p>
  </li>
);

export const TenThousandRows: Story = {
  name: '12000 item dataset',
  render: () => (
    <div style={{ height: 480 }}>
      <VirtualList<FixtureItem>
        data={largeDataset}
        itemHeight={56}
        itemKey="id"
        component="ul"
        containerStyle={containerStyle}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
        stickyHeader={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'rgba(30, 41, 59, 0.92)',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <span>Virtual modules</span>
            <span>{largeDataset.length.toLocaleString()} entries</span>
          </div>
        }
      >
        {(item) => renderItem(item)}
      </VirtualList>
    </div>
  ),
};

export const WithStickyHeader: Story = {
  name: 'Sticky header and item',
  render: () => (
    <div style={{ height: 480 }}>
      <VirtualList<FixtureItem>
        data={largeDataset}
        itemHeight={56}
        itemKey="id"
        component="ul"
        containerStyle={containerStyle}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
        stickyHeader={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'rgba(30, 41, 59, 0.95)',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <span>Sticky demo</span>
            <span>Keyboard: PageUp/PageDown</span>
          </div>
        }
        stickyIndices={[0]}
        renderStickyItem={(item) => (
          <li
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.35)',
              background: 'rgba(45, 212, 191, 0.15)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div style={{ fontWeight: 700 }}>Pinned: {item.title}</div>
            <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#a5b4fc' }}>{item.description}</p>
          </li>
        )}
      >
        {(item) => renderItem(item)}
      </VirtualList>
    </div>
  ),
};

