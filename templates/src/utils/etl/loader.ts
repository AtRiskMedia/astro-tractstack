import type { PaneNode } from '@/types/compositorTypes';
import type {
  OptionsPayload,
  BackendSavePayload,
  BackendPreviewPayload,
} from './index';

export function formatForSave(
  paneNode: PaneNode,
  optionsPayload: OptionsPayload
): BackendSavePayload {
  return {
    id: paneNode.id,
    title: paneNode.title,
    slug: paneNode.slug,
    isDecorative: paneNode.isDecorative,
    optionsPayload: optionsPayload,
    created: paneNode.created
      ? new Date(paneNode.created).toISOString()
      : undefined,
    changed: new Date().toISOString(),
  };
}

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
