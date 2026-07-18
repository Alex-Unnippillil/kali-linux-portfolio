import {
  FILESYSTEM_METADATA_INDEX,
  FileMetadata,
  MetadataIndex,
  PUBLIC_TAG,
  SensitivityTag,
  getSensitivityLevel,
  normalizePath,
} from '../../../modules/filesystem/metadata';
import {
  DlpStoredAction,
  getStoredDecision,
  setStoredDecision,
} from '../../../utils/settings/dlp';

export type MoveAction = 'move' | 'copy' | 'cancel';

export interface DlpPromptContext {
  sources: FileMetadata[];
  destination: FileMetadata;
  downgradedTags: SensitivityTag[];
  offlineMode: boolean;
  demoMode: boolean;
  recommendedAction: MoveAction;
}

export interface DlpPromptDecision {
  action: MoveAction;
  remember?: boolean;
}

export type PromptHandler = (
  context: DlpPromptContext
) => Promise<DlpPromptDecision | void | null> | DlpPromptDecision | void | null;

export interface DlpMoveOptions {
  sources: string[];
  destination: string;
  prompt?: PromptHandler;
  metadata?: MetadataIndex;
  offlineMode?: boolean;
  demoMode?: boolean;
  onMove?: (sources: string[], destination: string) => Promise<void> | void;
  onCopy?: (sources: string[], destination: string) => Promise<void> | void;
}

export interface DlpMoveResult {
  action: MoveAction;
  promptShown: boolean;
  usedStoredDecision: boolean;
  storedDecision?: DlpStoredAction;
  downgradedTags: SensitivityTag[];
}

interface DlpAuditEntry {
  timestamp: number;
  sources: string[];
  destination: string;
  action: MoveAction;
  promptShown: boolean;
  usedStoredDecision: boolean;
  storedDecision?: DlpStoredAction;
  downgradedTags: SensitivityTag[];
  offlineMode: boolean;
  demoMode: boolean;
}

const detectOffline = (): boolean =>
  typeof navigator !== 'undefined' ? navigator.onLine === false : false;

const detectDemoMode = (): boolean =>
  typeof process !== 'undefined' &&
  typeof process.env !== 'undefined' &&
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const getHighestSensitivity = (tags: SensitivityTag[]): number => {
  if (!tags.length) return getSensitivityLevel(PUBLIC_TAG);
  return Math.max(...tags.map((tag) => getSensitivityLevel(tag)));
};

const fallbackMetadata = (path: string, type: 'file' | 'directory'): FileMetadata => {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);
  const name = normalized === '/' ? '/' : parts[parts.length - 1] ?? normalized;
  const inheritedTags = [PUBLIC_TAG];
  const effectiveTags = [PUBLIC_TAG];
  return {
    name,
    path: normalized,
    type,
    tags: type === 'directory' ? [PUBLIC_TAG] : [],
    inheritedTags,
    effectiveTags,
  };
};

const logDecision = (entry: DlpAuditEntry): void => {
  if (typeof console === 'undefined' || typeof console.info !== 'function') return;
  console.info('[dlp]', entry);
};

export interface SensitivityEvaluation {
  prompt: boolean;
  downgradedTags: SensitivityTag[];
  highestSourceLevel: number;
  destinationLevel: number;
}

export const shouldPromptForMove = (
  sources: FileMetadata[],
  destination: FileMetadata
): SensitivityEvaluation => {
  const destinationLevel = getHighestSensitivity(destination.effectiveTags);
  const downgraded = new Set<SensitivityTag>();
  let highestSourceLevel = destinationLevel;

  sources.forEach((source) => {
    const sourceLevel = getHighestSensitivity(source.effectiveTags);
    highestSourceLevel = Math.max(highestSourceLevel, sourceLevel);
    source.effectiveTags.forEach((tag) => {
      if (getSensitivityLevel(tag) > destinationLevel) {
        downgraded.add(tag);
      }
    });
  });

  return {
    prompt: downgraded.size > 0,
    downgradedTags: Array.from(downgraded),
    highestSourceLevel,
    destinationLevel,
  };
};

const isValidAction = (action: MoveAction | undefined): action is MoveAction =>
  action === 'move' || action === 'copy' || action === 'cancel';

export const dlpAwareMove = async (
  options: DlpMoveOptions
): Promise<DlpMoveResult> => {
  const metadataIndex = options.metadata ?? FILESYSTEM_METADATA_INDEX;
  const normalizedSources = options.sources.map(normalizePath);
  const destinationPath = normalizePath(options.destination);

  const sourceMetadata = normalizedSources.map((path) => {
    const resolved = metadataIndex.get(path);
    if (resolved) return resolved;
    return fallbackMetadata(path, 'file');
  });

  const destinationMetadata =
    metadataIndex.get(destinationPath) ?? fallbackMetadata(destinationPath, 'directory');

  const offlineMode = options.offlineMode ?? detectOffline();
  const demoMode = options.demoMode ?? detectDemoMode();

  const evaluation = shouldPromptForMove(sourceMetadata, destinationMetadata);
  const shouldPrompt = evaluation.prompt;
  const storedDecisionEntry = shouldPrompt
    ? getStoredDecision(normalizedSources, destinationPath)
    : null;

  let action: MoveAction = 'move';
  let promptShown = false;
  let storedDecision: DlpStoredAction | undefined;

  if (shouldPrompt) {
    if (storedDecisionEntry) {
      action = storedDecisionEntry.action;
      storedDecision = storedDecisionEntry.action;
    } else {
      promptShown = true;
      const recommendedAction: MoveAction = 'copy';
      const promptContext: DlpPromptContext = {
        sources: sourceMetadata,
        destination: destinationMetadata,
        downgradedTags: evaluation.downgradedTags,
        offlineMode,
        demoMode,
        recommendedAction,
      };
      const promptHandler = options.prompt;
      let decision: DlpPromptDecision | void | null = null;
      if (promptHandler) {
        decision = await Promise.resolve(promptHandler(promptContext));
      }
      if (!decision || !isValidAction(decision.action)) {
        action = 'copy';
      } else {
        action = decision.action;
        if (decision.remember && (action === 'move' || action === 'copy')) {
          const stored = setStoredDecision(
            normalizedSources,
            destinationPath,
            action
          );
          storedDecision = stored?.action;
        }
      }
    }
  } else {
    action = 'move';
  }

  if (action === 'move') {
    await options.onMove?.(normalizedSources, destinationPath);
  } else if (action === 'copy') {
    await options.onCopy?.(normalizedSources, destinationPath);
  }

  const auditEntry: DlpAuditEntry = {
    timestamp: Date.now(),
    sources: normalizedSources,
    destination: destinationPath,
    action,
    promptShown,
    usedStoredDecision: Boolean(storedDecisionEntry),
    storedDecision: storedDecision ?? storedDecisionEntry?.action,
    downgradedTags: evaluation.downgradedTags,
    offlineMode,
    demoMode,
  };

  logDecision(auditEntry);

  return {
    action,
    promptShown,
    usedStoredDecision: Boolean(storedDecisionEntry),
    storedDecision: auditEntry.storedDecision,
    downgradedTags: evaluation.downgradedTags,
  };
};
