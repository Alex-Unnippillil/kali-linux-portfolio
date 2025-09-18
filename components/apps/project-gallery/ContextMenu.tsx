import React, { useMemo } from 'react';
import ContextMenu, { MenuItem } from '../../common/ContextMenu';

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
  repo: string;
  demo: string;
  snippet: string;
  language: string;
}

interface ProjectGalleryContextMenuProps {
  targetRef: React.RefObject<HTMLElement>;
  project: Project | null;
  hasFilters: boolean;
  hasComparison: boolean;
  isCompared: boolean;
  onOpenRepo: () => void;
  onCopyRepo: () => void;
  onOpenDemo?: () => void;
  onCopyDemo?: () => void;
  onOpenDemoInChrome?: () => void;
  onToggleCompare: () => void;
  onFilterByStack: () => void;
  onAddTagsToFilter: () => void;
  onResetFilters: () => void;
  onClearComparison: () => void;
  onOpen?: (event: MouseEvent) => boolean | void;
}

const ProjectGalleryContextMenu: React.FC<ProjectGalleryContextMenuProps> = ({
  targetRef,
  project,
  hasFilters,
  hasComparison,
  isCompared,
  onOpenRepo,
  onCopyRepo,
  onOpenDemo,
  onCopyDemo,
  onOpenDemoInChrome,
  onToggleCompare,
  onFilterByStack,
  onAddTagsToFilter,
  onResetFilters,
  onClearComparison,
  onOpen,
}) => {
  const items = useMemo<MenuItem[]>(() => {
    const list: MenuItem[] = [];

    if (project) {
      list.push(
        {
          id: 'open-repo',
          label: 'Open repo',
          onSelect: onOpenRepo,
        },
        {
          id: 'copy-repo',
          label: 'Copy repo URL',
          onSelect: onCopyRepo,
        },
      );

      if (project.demo) {
        if (onOpenDemo) {
          list.push({
            id: 'open-demo',
            label: 'Open live demo',
            onSelect: onOpenDemo,
          });
        }
        if (onCopyDemo) {
          list.push({
            id: 'copy-demo',
            label: 'Copy demo URL',
            onSelect: onCopyDemo,
          });
        }
        if (onOpenDemoInChrome) {
          list.push({
            id: 'open-demo-chrome',
            label: 'Open demo in Chrome app',
            onSelect: onOpenDemoInChrome,
          });
        }
      }

      list.push({
        id: 'toggle-compare',
        label: isCompared ? 'Remove from comparison' : 'Add to comparison',
        onSelect: onToggleCompare,
      });

      const canFilterByStack = project.stack.length > 0;
      const canFilterByTags = project.tags.length > 0;
      if (canFilterByStack || canFilterByTags) {
        list.push({ type: 'separator', id: 'filters', label: 'Filter helpers' });
        if (canFilterByStack) {
          list.push({
            id: 'filter-stack',
            label: `Filter by ${project.stack[0]}`,
            onSelect: onFilterByStack,
          });
        }
        if (canFilterByTags) {
          list.push({
            id: 'filter-tags',
            label: 'Add project tags to filters',
            onSelect: onAddTagsToFilter,
          });
        }
      }

      list.push({ type: 'separator', id: 'project-general', label: 'Project tools' });
    }

    list.push(
      {
        id: 'reset-filters',
        label: 'Reset filters',
        onSelect: onResetFilters,
        disabled: !hasFilters,
      },
      {
        id: 'clear-comparison',
        label: 'Clear comparison selection',
        onSelect: onClearComparison,
        disabled: !hasComparison,
      },
    );

    return list;
  }, [
    hasComparison,
    hasFilters,
    isCompared,
    onAddTagsToFilter,
    onClearComparison,
    onCopyDemo,
    onCopyRepo,
    onFilterByStack,
    onOpenDemo,
    onOpenDemoInChrome,
    onOpenRepo,
    onResetFilters,
    onToggleCompare,
    project,
  ]);

  return <ContextMenu targetRef={targetRef} items={items} onOpen={onOpen} />;
};

export default ProjectGalleryContextMenu;
