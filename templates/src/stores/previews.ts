import { map } from 'nanostores';

export const renderedPreviews = map<Record<string, string>>({});

export const updatePreview = (paneId: string, html: string) => {
  renderedPreviews.setKey(paneId, html);
};
