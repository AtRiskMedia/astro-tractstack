import { atom, map } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { handleSettingsPanelMobile } from '@/utils/layout';
import type { FullContentMapItem, Theme } from '@/types/tractstack';
import type { SettingsPanelSignal, ViewportKey } from '@/types/compositorTypes';
import type {
  ElementStylesMemory,
  ParentStylesMemory,
  ButtonStylesMemory,
  PendingImageOperation,
  PendingImageOperationsStore,
  StoryFragmentTopicsData,
} from '@/types/nodeProps';

export const fullContentMapStore = atom<FullContentMapItem[]>([]);
export const urlParamsStore = atom<Record<string, string | boolean>>({});
export const canonicalURLStore = atom<string>('');
export const brandColourStore = atom<string>(
  '10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3'
);
export const preferredThemeStore = atom<Theme>('light');

export const hasAssemblyAIStore = atom<boolean>(false);
export const codehookMapStore = atom<string[]>([]);

// Tool mode types
export type ToolModeVal =
  | 'styles'
  | 'text'
  | 'insert'
  | 'eraser'
  | 'move'
  | 'debug';

// Tool add mode types
export type ToolAddMode =
  | 'p'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'img'
  | 'signup'
  | 'yt'
  | 'bunny'
  | 'belief'
  | 'identify'
  | 'toggle';

// Header positioning state
export type HeaderPositionState = 'normal' | 'sticky';

// Viewport and display state
export const viewportModeStore = atom<ViewportKey>('auto');
export const viewportKeyStore = map<{
  value: 'mobile' | 'tablet' | 'desktop';
}>({
  value: 'mobile',
});

export const showHelpStore = atom<boolean>(true);
export const activeHelpKeyStore = atom<string | null>(null);
export const isEditingStore = atom<boolean>(false);

export const showAnalyticsStore = atom<boolean>(false);

// Header positioning
export const headerPositionStore = atom<HeaderPositionState>('normal');

// Settings panel state
export const settingsPanelOpenStore = atom<boolean>(false);
export const addPanelOpenStore = atom<boolean>(false);

// Mobile-specific behavior
export const mobileHeaderFadedStore = atom<boolean>(false);

// Undo/redo state
export const canUndoStore = atom<boolean>(false);
export const canRedoStore = atom<boolean>(false);

// Actions
export const toggleSettingsPanel = () => {
  const isOpen = !settingsPanelOpenStore.get();
  settingsPanelOpenStore.set(isOpen);

  // Handle mobile behavior
  handleSettingsPanelMobile(isOpen);
};
export const toggleAddPanel = () => {
  const isOpen = !addPanelOpenStore.get();
  addPanelOpenStore.set(isOpen);

  // If opening add panel, close settings panel
  if (isOpen && settingsPanelOpenStore.get()) {
    settingsPanelOpenStore.set(false);
    handleSettingsPanelMobile(false);
  }
};

export const showAnalytics = atom<boolean>(false);
export const showGuids = atom<boolean>(false);

const getViewportFromWidth = (
  width: number
): 'mobile' | 'tablet' | 'desktop' => {
  if (width >= 1368) return 'desktop';
  if (width >= 801) return 'tablet';
  return 'mobile';
};

export const setViewportMode = (mode: ViewportKey) => {
  viewportModeStore.set(mode);
  // Sync viewportKeyStore
  if (mode === 'auto') {
    const actualViewport = getViewportFromWidth(window.innerWidth);
    viewportKeyStore.setKey('value', actualViewport);
  } else {
    viewportKeyStore.setKey('value', mode);
  }
};

export const toggleShowHelp = () => {
  showHelpStore.set(!showHelpStore.get());
};

export const toggleShowAnalytics = () => {
  showAnalyticsStore.set(!showAnalyticsStore.get());
};

export const setHeaderPosition = (position: HeaderPositionState) => {
  headerPositionStore.set(position);
};

export const setMobileHeaderFaded = (faded: boolean) => {
  mobileHeaderFadedStore.set(faded);
};

export const setCanUndo = (canUndo: boolean) => {
  canUndoStore.set(canUndo);
};

export const setCanRedo = (canRedo: boolean) => {
  canRedoStore.set(canRedo);
};

// Reset to default state
export const resetStoryKeepState = () => {
  viewportModeStore.set('auto');
  showHelpStore.set(true);
  showAnalyticsStore.set(false);
  headerPositionStore.set('normal');
  settingsPanelOpenStore.set(false);
  mobileHeaderFadedStore.set(false);
  canUndoStore.set(false);
  canRedoStore.set(false);
};

export const settingsPanelStore = atom<SettingsPanelSignal | null>(null);

export const styleElementInfoStore = map<{
  markdownParentId: string | null;
  tagName: string | null;
  overrideNodeId: string | null;
  className: string | null;
}>({
  markdownParentId: null,
  tagName: null,
  overrideNodeId: null,
  className: null,
});

// Style Memory System (persistent across sessions)
export const elementStylesMemoryStore = persistentAtom<ElementStylesMemory>(
  'element-styles-memory:',
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export const parentStylesMemoryStore = persistentAtom<ParentStylesMemory>(
  'parent-styles-memory:',
  {
    parentClasses: [],
    bgColour: null,
  },
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export const buttonStylesMemoryStore = persistentAtom<ButtonStylesMemory>(
  'button-styles-memory:',
  {
    buttonClasses: {},
    buttonHoverClasses: {},
  },
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// Image Operations Management
export const pendingImageOperationsStore = map<PendingImageOperationsStore>({});

export const setPendingImageOperation = (
  storyFragmentId: string,
  operation: PendingImageOperation | null
) => {
  const current = pendingImageOperationsStore.get();
  pendingImageOperationsStore.set({
    ...current,
    [storyFragmentId]: operation,
  });
};

export const getPendingImageOperation = (
  storyFragmentId: string
): PendingImageOperation | null => {
  return pendingImageOperationsStore.get()[storyFragmentId] || null;
};

export const clearPendingImageOperation = (storyFragmentId: string) => {
  const current = pendingImageOperationsStore.get();
  const updated = { ...current };
  delete updated[storyFragmentId];
  pendingImageOperationsStore.set(updated);
};

export const clearAllPendingImageOperations = () => {
  pendingImageOperationsStore.set({});
};

// Topics Management
export const storyFragmentTopicsStore = map<{
  [storyFragmentId: string]: StoryFragmentTopicsData;
}>({});

// Admin & UI State Flags
export const isAdminStore = atom<boolean>(false);
export const activeHelpTemplateStore = atom<string | null>(null);
export const viewportSetStore = atom<boolean>(false);
