import React, {
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';

export type KaliCategory = {
  id: string;
  label: string;
};

export const KALI_CATEGORIES: KaliCategory[] = [
  { id: 'information-gathering', label: 'Information Gathering' },
  { id: 'vulnerability-analysis', label: 'Vulnerability Analysis' },
  { id: 'web-application-analysis', label: 'Web Application Analysis' },
  { id: 'database-assessment', label: 'Database Assessment' },
  { id: 'password-attacks', label: 'Password Attacks' },
  { id: 'wireless-attacks', label: 'Wireless Attacks' },
  { id: 'reverse-engineering', label: 'Reverse Engineering' },
  { id: 'exploitation-tools', label: 'Exploitation Tools' },
  { id: 'sniffing-spoofing', label: 'Sniffing & Spoofing' },
  { id: 'post-exploitation', label: 'Post Exploitation' },
  { id: 'forensics', label: 'Forensics' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'social-engineering', label: 'Social Engineering' },
  { id: 'hardware-hacking', label: 'Hardware Hacking' },
  { id: 'extra', label: 'Extra' },
  { id: 'top10', label: 'Top 10 Security Tools' },
];

const DEFAULT_CATEGORY_ICON = '/themes/Yaru/status/preferences-system-symbolic.svg';

const CATEGORY_ICON_LOOKUP: Record<string, string> = {
  'information-gathering': '/themes/kali/categories/information-gathering.svg',
  'vulnerability-analysis': '/themes/kali/categories/vulnerability-analysis.svg',
  'web-application-analysis': '/themes/kali/categories/web-application-analysis.svg',
  'database-assessment': '/themes/kali/categories/database-assessment.svg',
  'password-attacks': '/themes/kali/categories/password-attacks.svg',
  'wireless-attacks': '/themes/kali/categories/wireless-attacks.svg',
  'reverse-engineering': '/themes/kali/categories/reverse-engineering.svg',
  'exploitation-tools': '/themes/kali/categories/exploitation-tools.svg',
  'sniffing-spoofing': '/themes/kali/categories/sniffing-spoofing.svg',
  'sniffing-and-spoofing': '/themes/kali/categories/sniffing-spoofing.svg',
  'post-exploitation': '/themes/kali/categories/post-exploitation.svg',
  'maintaining-access': '/themes/kali/categories/post-exploitation.svg',
  forensics: '/themes/kali/categories/forensics.svg',
  reporting: '/themes/kali/categories/reporting.svg',
  'reporting-tools': '/themes/kali/categories/reporting.svg',
  'social-engineering': '/themes/kali/categories/social-engineering.svg',
  'social-engineering-tools': '/themes/kali/categories/social-engineering.svg',
  'hardware-hacking': '/themes/kali/categories/hardware-hacking.svg',
  extra: '/themes/kali/categories/extra.svg',
  miscellaneous: '/themes/kali/categories/extra.svg',
  top10: '/themes/kali/categories/top10.svg',
  'top-10-tools': '/themes/kali/categories/top10.svg',
  'stress-testing': '/themes/kali/categories/exploitation-tools.svg',
};

type MenuNode = {
  id: string;
  label: string;
  icon?: string;
  children?: MenuNode[];
  categoryId?: string;
};

const CATEGORY_APPLICATIONS: Record<string, MenuNode[]> = {
  'information-gathering': [
    { id: 'nmap-nse', label: 'Nmap NSE', categoryId: 'information-gathering' },
    { id: 'reconng', label: 'Recon-ng', categoryId: 'information-gathering' },
    { id: 'wireshark', label: 'Wireshark', categoryId: 'information-gathering' },
  ],
  'vulnerability-analysis': [
    { id: 'nessus', label: 'Nessus', categoryId: 'vulnerability-analysis' },
    { id: 'openvas', label: 'OpenVAS', categoryId: 'vulnerability-analysis' },
    { id: 'nikto', label: 'Nikto', categoryId: 'vulnerability-analysis' },
  ],
  'web-application-analysis': [
    { id: 'http', label: 'HTTP Builder', categoryId: 'web-application-analysis' },
    { id: 'beef', label: 'BeEF Console', categoryId: 'web-application-analysis' },
    { id: 'security-tools', label: 'Security Toolkit', categoryId: 'web-application-analysis' },
  ],
  'database-assessment': [
    { id: 'evidence-vault', label: 'Evidence Vault', categoryId: 'database-assessment' },
    { id: 'project-gallery', label: 'Project Gallery', categoryId: 'database-assessment' },
  ],
  'password-attacks': [
    { id: 'hashcat', label: 'Hashcat Lab', categoryId: 'password-attacks' },
    { id: 'hydra', label: 'Hydra Trainer', categoryId: 'password-attacks' },
    { id: 'john', label: 'John the Ripper', categoryId: 'password-attacks' },
  ],
  'wireless-attacks': [
    { id: 'reaver', label: 'Reaver Assistant', categoryId: 'wireless-attacks' },
    { id: 'kismet', label: 'Kismet Scanner', categoryId: 'wireless-attacks' },
  ],
  'reverse-engineering': [
    { id: 'ghidra', label: 'Ghidra Lab', categoryId: 'reverse-engineering' },
    { id: 'radare2', label: 'Radare2 Lab', categoryId: 'reverse-engineering' },
  ],
  'exploitation-tools': [
    { id: 'metasploit', label: 'Metasploit Studio', categoryId: 'exploitation-tools' },
    { id: 'msf-post', label: 'Metasploit Post', categoryId: 'exploitation-tools' },
    { id: 'beef', label: 'BeEF Console', categoryId: 'exploitation-tools' },
  ],
  'sniffing-spoofing': [
    { id: 'ettercap', label: 'Ettercap Relay', categoryId: 'sniffing-spoofing' },
    { id: 'dsniff', label: 'dsniff Tools', categoryId: 'sniffing-spoofing' },
    { id: 'wireshark', label: 'Wireshark', categoryId: 'sniffing-spoofing' },
  ],
  'post-exploitation': [
    { id: 'volatility', label: 'Volatility Lab', categoryId: 'post-exploitation' },
    { id: 'mimikatz', label: 'Mimikatz Trainer', categoryId: 'post-exploitation' },
    { id: 'mimikatz/offline', label: 'Mimikatz Offline', categoryId: 'post-exploitation' },
  ],
  forensics: [
    { id: 'autopsy', label: 'Autopsy Review', categoryId: 'forensics' },
    { id: 'project-gallery', label: 'Project Gallery', categoryId: 'forensics' },
  ],
  reporting: [
    { id: 'project-gallery', label: 'Project Gallery', categoryId: 'reporting' },
    { id: 'plugin-manager', label: 'Plugin Manager', categoryId: 'reporting' },
    { id: 'contact', label: 'Contact Center', categoryId: 'reporting' },
  ],
  'social-engineering': [
    { id: 'contact', label: 'Contact Lab', categoryId: 'social-engineering' },
    { id: 'quote', label: 'Quote Generator', categoryId: 'social-engineering' },
  ],
  'hardware-hacking': [
    { id: 'ble-sensor', label: 'BLE Sensor', categoryId: 'hardware-hacking' },
    { id: 'serial-terminal', label: 'Serial Terminal', categoryId: 'hardware-hacking' },
    { id: 'input-lab', label: 'Input Lab', categoryId: 'hardware-hacking' },
  ],
  extra: [
    { id: 'sticky_notes', label: 'Sticky Notes', categoryId: 'extra' },
    { id: 'trash', label: 'Trash', categoryId: 'extra' },
    { id: 'project-gallery', label: 'Project Gallery', categoryId: 'extra' },
  ],
  top10: [
    { id: 'nmap-nse', label: 'Nmap NSE', categoryId: 'top10' },
    { id: 'metasploit', label: 'Metasploit Studio', categoryId: 'top10' },
    { id: 'wireshark', label: 'Wireshark', categoryId: 'top10' },
  ],
};

type ApplicationsMenuProps = {
  /** Currently selected category identifier. */
  activeCategory?: string;
  /** Callback fired when a category or nested app is chosen. */
  onSelect?: (id: string) => void;
  /** Optional callback fired when the menu closes. */
  onClose?: () => void;
  /**
   * Reference to an element that launched the menu. Focus will return to this
   * button when the menu closes to satisfy APG expectations.
   */
  launcherRef?: React.RefObject<HTMLElement>;
  /** Label used for the launcher button. */
  launcherLabel?: string;
};

type ActivePath = number[];

const pathToKey = (path: ActivePath) => path.join('-');

type FndMenuItemProps = {
  item: MenuNode;
  index: number;
  siblings: readonly MenuNode[];
  level: number;
  parentPath: ActivePath;
  activePath: ActivePath;
  openPath: ActivePath;
  setActivePath: (path: ActivePath) => void;
  setOpenPath: (path: ActivePath) => void;
  onRequestClose: (restoreFocusToLauncher: boolean) => void;
  onSelect: (item: MenuNode) => void;
  itemRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  typeahead: ReturnType<typeof useTypeahead>;
  selectedCategory: string;
};

const isPrintableKey = (event: KeyboardEvent) => {
  if (event.key.length !== 1) return false;
  const code = event.key.charCodeAt(0);
  return code >= 32 && code <= 126;
};

const useTypeahead = () => {
  const bufferRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    bufferRef.current = '';
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const push = useCallback(
    (char: string, items: readonly MenuNode[], currentIndex: number) => {
      bufferRef.current += char;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        bufferRef.current = '';
        timerRef.current = null;
      }, 500);

      const search = bufferRef.current.toLowerCase();
      const startIndex = Math.max(currentIndex, 0);
      const ordered = [
        ...items.slice(startIndex + 1),
        ...items.slice(0, startIndex + 1),
      ];
      const matchIndex = ordered.findIndex((node) =>
        node.label.toLowerCase().startsWith(search),
      );
      if (matchIndex === -1) {
        return null;
      }

      const resolvedIndex = (startIndex + 1 + matchIndex) % items.length;
      return resolvedIndex;
    },
    [],
  );

  return useMemo(
    () => ({
      push,
      reset,
    }),
    [push, reset],
  );
};

const FndMenuItem: React.FC<FndMenuItemProps> = ({
  item,
  index,
  siblings,
  level,
  parentPath,
  activePath,
  openPath,
  setActivePath,
  setOpenPath,
  onRequestClose,
  onSelect,
  itemRefs,
  typeahead,
  selectedCategory,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasSubmenu = Boolean(item.children && item.children.length > 0);
  const path = useMemo(() => [...parentPath, index], [parentPath, index]);
  const pathKey = useMemo(() => pathToKey(path), [path]);
  const isFocused = pathToKey(activePath) === pathKey;
  const isSubtreeOpen =
    openPath.length >= path.length &&
    path.every((segment, idx) => openPath[idx] === segment);
  const isOpen = hasSubmenu && isSubtreeOpen;
  const isSelected = level === 0 && item.id === selectedCategory;

  useEffect(() => {
    if (!buttonRef.current) return;
    itemRefs.current.set(pathKey, buttonRef.current);
    return () => {
      itemRefs.current.delete(pathKey);
    };
  }, [itemRefs, pathKey]);

  useEffect(() => {
    if (isFocused && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isFocused]);

  const moveFocus = useCallback(
    (offset: number) => {
      const nextIndex = (index + offset + siblings.length) % siblings.length;
      const nextPath = [...parentPath, nextIndex];
      typeahead.reset();
      setActivePath(nextPath);
      setOpenPath(parentPath);
    },
    [index, siblings.length, parentPath, setActivePath, setOpenPath, typeahead],
  );

  const openSubmenu = useCallback(() => {
    if (!hasSubmenu) {
      return;
    }
    const nextPath = path;
    setOpenPath(nextPath);
    setActivePath([...nextPath, 0]);
  }, [hasSubmenu, path, setActivePath, setOpenPath]);

  const closeSubmenu = useCallback(
    (focusParent: boolean) => {
      if (path.length <= 1) {
        setOpenPath([]);
        if (focusParent) {
          setActivePath(path);
        }
        return;
      }
      setOpenPath(parentPath);
      if (focusParent) {
        setActivePath(parentPath);
      }
    },
    [parentPath, path, setActivePath, setOpenPath],
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (level === 0 && hasSubmenu) {
          openSubmenu();
        } else {
          moveFocus(1);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (level === 0 && hasSubmenu) {
          openSubmenu();
        } else {
          moveFocus(-1);
        }
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        if (hasSubmenu) {
          openSubmenu();
        } else if (level === 0) {
          moveFocus(1);
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        if (level === 0) {
          moveFocus(-1);
        } else {
          closeSubmenu(true);
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        setActivePath([...parentPath, 0]);
        typeahead.reset();
        setOpenPath(parentPath);
        break;
      }
      case 'End': {
        event.preventDefault();
        setActivePath([...parentPath, siblings.length - 1]);
        typeahead.reset();
        setOpenPath(parentPath);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (hasSubmenu) {
          openSubmenu();
        } else {
          onSelect(item);
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        if (level === 0) {
          onRequestClose(true);
        } else {
          closeSubmenu(true);
        }
        break;
      }
      case 'Tab': {
        onRequestClose(true);
        break;
      }
      default: {
        if (isPrintableKey(event)) {
          const nextIndex = typeahead.push(
            event.key.toLowerCase(),
            siblings,
            index,
          );
          if (typeof nextIndex === 'number') {
            setActivePath([...parentPath, nextIndex]);
          }
        }
      }
    }
  };

  const handleClick = () => {
    if (hasSubmenu) {
      if (isOpen) {
        closeSubmenu(false);
      } else {
        openSubmenu();
      }
    } else {
      onSelect(item);
    }
  };

  return (
    <li role="none" className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="menuitem"
        className={`fnd-menu-item flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          isFocused
            ? 'bg-gray-700 text-white'
            : isSelected
            ? 'bg-gray-700/70 text-white'
            : 'text-gray-100 hover:bg-gray-700/60'
        }`}
        aria-haspopup={hasSubmenu ? 'true' : undefined}
        aria-expanded={hasSubmenu ? (isOpen ? 'true' : 'false') : undefined}
        aria-current={isSelected ? 'true' : undefined}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
      >
        {item.icon ? (
          <Image
            src={item.icon}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 flex-shrink-0"
          />
        ) : null}
        <span className="flex-1 truncate">{item.label}</span>
        {hasSubmenu ? (
          <span aria-hidden className="text-xs text-gray-400">
            ▶
          </span>
        ) : null}
      </button>
      {hasSubmenu && isOpen ? (
        <FndMenuLevel
          parentPath={path}
          items={item.children ?? []}
          activePath={activePath}
          openPath={openPath}
          setActivePath={setActivePath}
          setOpenPath={setOpenPath}
          onRequestClose={onRequestClose}
          onSelect={onSelect}
          itemRefs={itemRefs}
          typeahead={typeahead}
          selectedCategory={selectedCategory}
        />
      ) : null}
    </li>
  );
};

type FndMenuLevelProps = {
  parentPath: ActivePath;
  items: readonly MenuNode[];
  activePath: ActivePath;
  openPath: ActivePath;
  setActivePath: (path: ActivePath) => void;
  setOpenPath: (path: ActivePath) => void;
  onRequestClose: (restoreFocusToLauncher: boolean) => void;
  onSelect: (item: MenuNode) => void;
  itemRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  typeahead: ReturnType<typeof useTypeahead>;
  selectedCategory: string;
};

const FndMenuLevel: React.FC<FndMenuLevelProps> = ({
  parentPath,
  items,
  activePath,
  openPath,
  setActivePath,
  setOpenPath,
  onRequestClose,
  onSelect,
  itemRefs,
  typeahead,
  selectedCategory,
}) => {
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!menuRef.current) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        onRequestClose(true);
      }
    };
    const node = menuRef.current;
    node.addEventListener('keydown', handleKeyDown);
    return () => {
      node.removeEventListener('keydown', handleKeyDown);
    };
  }, [onRequestClose]);

  return (
    <ul
      ref={menuRef}
      role="menu"
      aria-label={parentPath.length === 0 ? 'Application categories' : undefined}
      className={`fnd-menu-level ${
        parentPath.length === 0
          ? 'max-h-80 min-w-[16rem] space-y-1 rounded-lg bg-[#121a28] p-2 shadow-lg'
          : 'absolute left-full top-0 ml-1 min-w-[14rem] space-y-1 rounded-lg bg-[#182336] p-2 shadow-xl'
      }`}
    >
      {items.map((item, index) => (
        <FndMenuItem
          key={item.id}
          item={item}
          index={index}
          siblings={items}
          level={parentPath.length}
          parentPath={parentPath}
          activePath={activePath}
          openPath={openPath}
          setActivePath={setActivePath}
          setOpenPath={setOpenPath}
          onRequestClose={onRequestClose}
          onSelect={onSelect}
          itemRefs={itemRefs}
          typeahead={typeahead}
          selectedCategory={selectedCategory}
        />
      ))}
    </ul>
  );
};

const buildMenuTree = (): MenuNode[] =>
  KALI_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    icon: CATEGORY_ICON_LOOKUP[category.id] ?? DEFAULT_CATEGORY_ICON,
    children: CATEGORY_APPLICATIONS[category.id] ?? [],
  }));

const ApplicationsMenu: React.FC<ApplicationsMenuProps> = ({
  activeCategory,
  onSelect,
  onClose,
  launcherRef,
  launcherLabel = 'Applications',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    activeCategory ?? KALI_CATEGORIES[0]?.id ?? '',
  );
  const [activePath, setActivePath] = useState<ActivePath>([0]);
  const [openPath, setOpenPath] = useState<ActivePath>([]);
  const menuWrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const internalLauncherRef = useRef<HTMLButtonElement>(null);
  const typeahead = useTypeahead();

  useEffect(() => {
    if (typeof activeCategory === 'string') {
      setSelectedCategory(activeCategory);
    }
  }, [activeCategory]);

  const menuTree = useMemo(() => buildMenuTree(), []);

  const setLauncherNode = useCallback(
    (node: HTMLButtonElement | null) => {
      internalLauncherRef.current = node;
      if (launcherRef) {
        (launcherRef as MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    [launcherRef],
  );

  const focusLauncher = useCallback(() => {
    const target = launcherRef?.current ?? internalLauncherRef.current;
    target?.focus();
  }, [launcherRef]);

  const closeMenu = useCallback(
    (restoreFocus: boolean) => {
      setIsOpen(false);
      setActivePath([0]);
      setOpenPath([]);
      typeahead.reset();
      if (restoreFocus) {
        requestAnimationFrame(() => {
          focusLauncher();
        });
      }
      onClose?.();
    },
    [focusLauncher, onClose, typeahead],
  );

  const handleSelect = useCallback(
    (item: MenuNode) => {
      const categoryId = item.categoryId ?? item.id;
      setSelectedCategory(categoryId);
      onSelect?.(categoryId);
      closeMenu(true);
    },
    [closeMenu, onSelect],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const menuNode = menuWrapperRef.current;
      if (!menuNode) return;
      const target = event.target as Node;
      if (!menuNode.contains(target)) {
        closeMenu(true);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const firstPath: ActivePath = [0];
    setActivePath(firstPath);
    setOpenPath([]);
    const key = pathToKey(firstPath);
    const node = itemRefs.current.get(key);
    if (node) {
      node.focus();
    }
  }, [isOpen]);

  const selectedLabel = useMemo(() => {
    const match = KALI_CATEGORIES.find((cat) => cat.id === selectedCategory);
    return match?.label ?? selectedCategory;
  }, [selectedCategory]);

  return (
    <div className="relative inline-flex" ref={menuWrapperRef}>
      <button
        ref={setLauncherNode}
        type="button"
        className={`flex items-center gap-2 rounded px-3 py-1 text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          isOpen ? 'bg-gray-800' : 'bg-transparent hover:bg-gray-800/70'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen ? 'true' : 'false'}
        onClick={() => {
          if (isOpen) {
            closeMenu(true);
          } else {
            setIsOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            }
            setTimeout(() => {
              const key = pathToKey([0]);
              const node = itemRefs.current.get(key);
              node?.focus();
            }, 0);
          } else if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            closeMenu(true);
          }
        }}
      >
        <Image
          src="/themes/Yaru/status/decompiler-symbolic.svg"
          alt=""
          width={16}
          height={16}
          className="h-4 w-4"
        />
        <span>{launcherLabel}</span>
      </button>
      {isOpen ? (
        <div
          role="presentation"
          className="absolute left-0 top-full z-50 mt-2"
        >
          <div
            role="menubar"
            aria-label="Kali application categories"
            className="rounded-lg border border-slate-800 bg-[#0b111b] p-2 shadow-2xl"
          >
            <FndMenuLevel
              parentPath={[]}
              items={menuTree}
              activePath={activePath}
              openPath={openPath}
              setActivePath={setActivePath}
              setOpenPath={setOpenPath}
              onRequestClose={closeMenu}
              onSelect={handleSelect}
              itemRefs={itemRefs}
              typeahead={typeahead}
              selectedCategory={selectedCategory}
            />
          </div>
          <p className="mt-2 rounded bg-black/50 px-3 py-2 text-xs text-gray-400">
            Selected category:{' '}
            <span className="font-semibold text-white">{selectedLabel}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ApplicationsMenu;
