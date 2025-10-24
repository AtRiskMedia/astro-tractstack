import { map } from 'nanostores';

export type SelectionRange = {
  blockNodeId: string | null;
  lcaNodeId: string | null;
  startNodeId: string | null;
  startCharOffset: number;
  endNodeId: string | null;
  endCharOffset: number;
};

export type SelectionBox = {
  top: number;
  left: number;
};

export interface SelectionStoreState extends SelectionRange {
  isDragging: boolean;
  isActive: boolean;
  selectionBox: SelectionBox | null;
  pendingAction: 'style' | 'link' | null;
}

const DEFAULT_SELECTION_STATE: SelectionStoreState = {
  isDragging: false,
  isActive: false,
  blockNodeId: null,
  lcaNodeId: null,
  startNodeId: null,
  startCharOffset: 0,
  endNodeId: null,
  endCharOffset: 0,
  selectionBox: null,
  pendingAction: null,
};

export const selectionStore = map<SelectionStoreState>(DEFAULT_SELECTION_STATE);

export function resetSelectionStore() {
  selectionStore.set(DEFAULT_SELECTION_STATE);
}
