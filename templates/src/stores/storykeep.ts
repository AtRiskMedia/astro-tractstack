import { atom } from 'nanostores';
import { handleSettingsPanelMobile } from '@/utils/layout';

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

// Viewport types
export type ViewportMode = 'auto' | 'mobile' | 'tablet' | 'desktop';

// Header positioning state
export type HeaderPositionState = 'normal' | 'sticky';

// Core tool state
export const toolModeStore = atom<ToolModeVal>('text');
export const toolAddModeStore = atom<ToolAddMode>('p');

// Viewport and display state
export const viewportModeStore = atom<ViewportMode>('auto');
export const showHelpStore = atom<boolean>(true);
export const showAnalyticsStore = atom<boolean>(false);
export const keyboardAccessibleStore = atom<boolean>(false);

// Header positioning
export const headerPositionStore = atom<HeaderPositionState>('normal');

// Settings panel state
export const settingsPanelOpenStore = atom<boolean>(false);

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

// Close settings panel when switching to insert mode
export const setToolMode = (mode: ToolModeVal) => {
  toolModeStore.set(mode);

  // If switching to insert mode and settings panel is open, close it
  if (mode === 'insert' && settingsPanelOpenStore.get()) {
    settingsPanelOpenStore.set(false);
    handleSettingsPanelMobile(false);
  }
};

export const setToolAddMode = (mode: ToolAddMode) => {
  toolAddModeStore.set(mode);
};

export const setViewportMode = (mode: ViewportMode) => {
  viewportModeStore.set(mode);
};

export const toggleShowHelp = () => {
  showHelpStore.set(!showHelpStore.get());
};

export const toggleShowAnalytics = () => {
  showAnalyticsStore.set(!showAnalyticsStore.get());
};

export const toggleKeyboardAccessible = () => {
  keyboardAccessibleStore.set(!keyboardAccessibleStore.get());
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
  toolModeStore.set('text');
  toolAddModeStore.set('p');
  viewportModeStore.set('auto');
  showHelpStore.set(true);
  showAnalyticsStore.set(false);
  keyboardAccessibleStore.set(false);
  headerPositionStore.set('normal');
  settingsPanelOpenStore.set(false);
  mobileHeaderFadedStore.set(false);
  canUndoStore.set(false);
  canRedoStore.set(false);
};
