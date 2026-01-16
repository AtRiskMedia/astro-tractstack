import { map } from 'nanostores';

export type DragType = 'insert' | 'reorder';

export interface ToolDragState {
  isDragging: boolean;
  dragType: DragType | null;
  payload: string | null;
  pointer: { x: number; y: number };
  activeDropZone: {
    nodeId: string;
    location: 'before' | 'after';
  } | null;
}

export const toolDragStore = map<ToolDragState>({
  isDragging: false,
  dragType: null,
  payload: null,
  pointer: { x: 0, y: 0 },
  activeDropZone: null,
});

export const startToolDrag = (
  type: DragType,
  payload: string,
  startX: number,
  startY: number
) => {
  toolDragStore.set({
    isDragging: true,
    dragType: type,
    payload,
    pointer: { x: startX, y: startY },
    activeDropZone: null,
  });
};

export const updateToolDragPosition = (x: number, y: number) => {
  toolDragStore.setKey('pointer', { x, y });
};

export const updateActiveDropZone = (
  zone: { nodeId: string; location: 'before' | 'after' } | null
) => {
  toolDragStore.setKey('activeDropZone', zone);
};

export const endToolDrag = () => {
  toolDragStore.set({
    isDragging: false,
    dragType: null,
    payload: null,
    pointer: { x: 0, y: 0 },
    activeDropZone: null,
  });
};
