import { useState, useEffect } from 'react';
import { getCtx } from '@/stores/nodes';
import SingleParam from '@/components/fields/SingleParam';
import { widgetMeta } from '@/constants';
import type { FlatNode } from '@/types/compositorTypes';

interface BunnyWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

const BUNNY_EMBED_BASE_URL = 'https://iframe.mediadelivery.net/embed/';

function BunnyWidget({ node, onUpdate }: BunnyWidgetProps) {
  const [videoId, setVideoId] = useState(
    String(node.codeHookParams?.[0] || '')
  );
  const [title, setTitle] = useState(String(node.codeHookParams?.[1] || ''));
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const widgetInfo = widgetMeta.bunny;

  useEffect(() => {
    const newVideoId = String(node.codeHookParams?.[0] || '');
    setVideoId(newVideoId);
    setTitle(String(node.codeHookParams?.[1] || ''));
    validateVideoId(newVideoId);
  }, [node]);

  const checkForDuplicates = (id: string): boolean => {
    if (!id) return false;
    try {
      const ctx = getCtx();
      const existingVideos = ctx.getAllBunnyVideoInfo();
      const count = existingVideos.filter(
        (video) => video.videoId === id
      ).length;
      return count > 1;
    } catch (e) {
      console.error('Error checking for duplicates:', e);
      return false;
    }
  };

  const isValidVideoIdFormat = (id: string): boolean => {
    if (!id) return true; // An empty string is not an error itself.
    const videoIdRegex = /^\d+\/[a-f0-9\-]{36}$/;
    return videoIdRegex.test(id);
  };

  const validateVideoId = (id: string) => {
    if (!id) {
      setValidationError(null);
      setIsDuplicate(false);
      return;
    }

    if (!isValidVideoIdFormat(id)) {
      setValidationError(
        "Invalid format. Use 'LibraryID/VideoGUID' from Bunny."
      );
      setIsDuplicate(false);
      return;
    }

    const duplicate = checkForDuplicates(id);
    setIsDuplicate(duplicate);
    setValidationError(
      duplicate ? 'This video is already used elsewhere on this page.' : null
    );
  };

  const handleVideoIdChange = (value: string) => {
    setVideoId(value);
    validateVideoId(value);
    onUpdate([value, title]);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    onUpdate([videoId, value]);
  };

  const showPreview = videoId && !validationError && !isDuplicate;
  const embedUrlForPreview = showPreview
    ? `${BUNNY_EMBED_BASE_URL}${videoId}`
    : '';

  return (
    <div className="space-y-4">
      <SingleParam
        label="Video ID"
        value={videoId}
        onChange={handleVideoIdChange}
        placeholder="e.g., 12345/abcde-12345-fghij-67890"
      />
      {validationError && videoId && (
        <div className="mt-1 text-xs text-red-500">{validationError}</div>
      )}
      {isDuplicate && (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800">
          Warning: This video is already used elsewhere on this page.
        </div>
      )}

      <SingleParam
        label={widgetInfo.parameters[1].label}
        value={title}
        onChange={handleTitleChange}
      />

      {showPreview && (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-500">
            Preview
          </label>
          <div className="aspect-video w-full">
            <iframe
              src={embedUrlForPreview}
              className="h-full w-full rounded border"
              title={`Preview: ${title}`}
              allow="autoplay; fullscreen"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default BunnyWidget;
