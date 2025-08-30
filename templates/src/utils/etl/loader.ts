import type { PaneNode } from '@/types/compositorTypes';
import type {
  OptionsPayload,
  BackendSavePayload,
  BackendPreviewPayload,
} from './index';

export function formatForPreview(
  paneNode: PaneNode,
  optionsPayload: OptionsPayload
): BackendPreviewPayload {
  return {
    id: paneNode.id,
    title: paneNode.title,
    optionsPayload: optionsPayload,
  };
}

export function formatForSave(
  paneNode: PaneNode,
  optionsPayload: OptionsPayload,
  isContext?: boolean
): BackendSavePayload {
  return {
    id: paneNode.id,
    title: paneNode.title,
    slug: paneNode.slug,
    isDecorative: paneNode.isDecorative,
    isContextPane: isContext || paneNode.isContextPane,
    optionsPayload: optionsPayload,
    created: paneNode.created
      ? new Date(paneNode.created).toISOString()
      : undefined,
    changed: new Date().toISOString(),
  };
}
