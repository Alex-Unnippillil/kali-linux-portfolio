import { forwardRef } from 'react';
import { ListSkeleton } from '../../../components/base/Skeleton';
import type { Plugin } from '../types';
import FindingCard from './FindingCard';

interface ListViewProps {
  plugins: Plugin[];
  loading: boolean;
  hasMore: boolean;
  onScroll: React.UIEventHandler<HTMLUListElement>;
}

const ListView = forwardRef<HTMLUListElement, ListViewProps>(
  ({ plugins, loading, hasMore, onScroll }, ref) => {
    if (loading) {
      return (
        <section aria-label="Plugin feed" aria-busy="true">
          <ListSkeleton
            count={6}
            orientation="vertical"
            className="list-none space-y-2 max-h-96 overflow-hidden"
            itemClassName="border-l-4 border-gray-700 bg-gray-800 p-3 rounded"
            lines={3}
          />
          <span className="sr-only">Loading plugin feed</span>
        </section>
      );
    }

    return (
      <section aria-label="Plugin feed" aria-busy="false">
        {plugins.length === 0 ? (
          <div className="text-sm text-gray-400">
            No results match the selected filters.
          </div>
        ) : (
          <ul
            ref={ref}
            onScroll={onScroll}
            className="space-y-2 max-h-96 overflow-auto"
          >
            {plugins.map((plugin) => (
              <li key={plugin.id}>
                <FindingCard plugin={plugin} />
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <div className="mt-2 text-center text-sm text-gray-400">
            Scroll to load more...
          </div>
        )}
      </section>
    );
  }
);

ListView.displayName = 'NessusListView';

export default ListView;
