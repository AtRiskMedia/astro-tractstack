import {
  toolDragStore,
  updateToolDragPosition,
  updateActiveDropZone,
  endToolDrag,
} from '@/stores/toolDrag';
import { getCtx } from '@/stores/nodes';
import { getTemplateNode } from '@/utils/compositor/nodesHelper';
import type { ToolAddMode } from '@/types/compositorTypes';

export const initToolDragListeners = () => {
  const handleMouseMove = (e: MouseEvent) => {
    const state = toolDragStore.get();
    if (!state.isDragging) return;

    e.preventDefault();
    updateToolDragPosition(e.clientX, e.clientY);

    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const targetOverlay = elements.find((el) =>
      el.hasAttribute('data-node-overlay')
    );

    if (!targetOverlay) {
      updateActiveDropZone(null);
      return;
    }

    const nodeId = targetOverlay.getAttribute('data-node-overlay');
    if (!nodeId) return;

    if (state.dragType === 'reorder' && state.payload === nodeId) {
      updateActiveDropZone(null);
      return;
    }

    const rect = targetOverlay.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const location = e.clientY < midPoint ? 'before' : 'after';

    updateActiveDropZone({ nodeId, location });
  };

  const handleMouseUp = (_: MouseEvent) => {
    const state = toolDragStore.get();
    if (!state.isDragging) return;

    if (state.activeDropZone) {
      const ctx = getCtx();
      const { nodeId, location } = state.activeDropZone;

      if (state.dragType === 'reorder' && state.payload) {
        ctx.moveNodeTo(state.payload, nodeId, location);
      } else if (state.dragType === 'insert' && state.payload) {
        const template = getTemplateNode(state.payload as ToolAddMode);
        if (template) {
          ctx.addTemplateNode(nodeId, template, nodeId, location);
        }
      }
    }

    endToolDrag();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
};
