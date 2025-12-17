import { useState, useEffect } from 'react';
import { getCtx } from '@/stores/nodes';
import SingleParam from '@/components/fields/SingleParam';
import { widgetMeta } from '@/constants';
import type {
  FlatNode,
  VideoMoment,
  PaneNode,
  StoryFragmentNode,
} from '@/types/compositorTypes';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ActionBuilderSlugSelector from '@/components/form/ActionBuilderSlugSelector';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { canonicalURLStore } from '@/stores/storykeep';

interface BunnyWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

interface Chapter extends VideoMoment {
  id: string;
}

interface PaneListItem {
  id: string;
  title: string;
  slug: string;
  type: 'Pane';
  isContext: boolean;
}

interface SelectorItem {
  id: string;
  title: string;
  slug: string;
  type: 'Pane' | 'StoryFragment';
  panes?: string[];
  isContext?: boolean;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

function BunnyWidget({ node, onUpdate }: BunnyWidgetProps) {
  const [videoId, setVideoId] = useState(
    String(node.codeHookParams?.[0] || '')
  );
  const [title, setTitle] = useState(String(node.codeHookParams?.[1] || ''));
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const widgetInfo = widgetMeta.bunny;
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  const storyFragmentId = ctx.getClosestNodeTypeFromId(
    node.id,
    'StoryFragment'
  );
  const storyFragmentNode = allNodes.get(storyFragmentId) as
    | StoryFragmentNode
    | undefined;
  const paneIds = storyFragmentNode?.paneIds || [];

  const paneList: PaneListItem[] = paneIds
    .map((paneId): PaneListItem | null => {
      const paneNode = allNodes.get(paneId) as PaneNode | undefined;
      if (paneNode && paneNode.nodeType === 'Pane') {
        return {
          id: paneNode.id,
          title: paneNode.title,
          slug: paneNode.slug,
          type: 'Pane',
          isContext: paneNode.isContextPane || false,
        };
      }
      return null;
    })
    .filter((item): item is PaneListItem => item !== null);

  const storyFragmentEntry: SelectorItem | null = storyFragmentNode
    ? {
        id: storyFragmentNode.id,
        title: storyFragmentNode.title,
        slug: storyFragmentNode.slug,
        type: 'StoryFragment',
        panes: storyFragmentNode.paneIds,
      }
    : null;

  const contentMapForSelector: SelectorItem[] = [
    ...(storyFragmentEntry ? [storyFragmentEntry] : []),
    ...paneList,
  ];

  const sortChapters = (chapArr: Chapter[]) =>
    [...chapArr].sort((a, b) => a.startTime - b.startTime);

  useEffect(() => {
    const newVideoId = String(node.codeHookParams?.[0] || '');
    const newTitle = String(node.codeHookParams?.[1] || '');
    const chaptersJson = String(node.codeHookParams?.[2] || '');

    setVideoId(newVideoId);
    setTitle(newTitle);
    validateVideoId(newVideoId);

    if (chaptersJson) {
      try {
        const parsedChapters = JSON.parse(chaptersJson);
        if (Array.isArray(parsedChapters)) {
          const chaptersWithIds = parsedChapters.map(
            (chapter: VideoMoment) => ({ ...chapter, id: generateId() })
          );
          setChapters(sortChapters(chaptersWithIds));
        }
      } catch (e) {
        setChapters([]);
      }
    } else {
      setChapters([]);
    }
  }, [node]);

  const handleUpdate = (
    newVideoId: string,
    newTitle: string,
    newChapters: Chapter[]
  ) => {
    const chaptersToStore = sortChapters(newChapters).map(
      ({ id, ...rest }) => rest
    );
    if (chaptersToStore.length > 0) {
      onUpdate([newVideoId, newTitle, JSON.stringify(chaptersToStore)]);
    } else {
      onUpdate([newVideoId, newTitle]);
    }
  };

  const checkForDuplicates = (id: string): boolean => {
    if (!id) return false;
    try {
      return (
        ctx.getAllBunnyVideoInfo().filter((video) => video.videoId === id)
          .length > 1
      );
    } catch (e) {
      return false;
    }
  };

  const isValidVideoIdFormat = (id: string): boolean => {
    if (!id) return true;
    return /^\d+\/[a-f0-9\-]{36}$/.test(id);
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
    handleUpdate(value, title, chapters);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    handleUpdate(videoId, value, chapters);
  };

  const validateAllChapters = (allChaps: Chapter[]) =>
    allChaps.reduce(
      (acc, chap, idx) => ({ ...acc, ...validateChapter(chap, idx, allChaps) }),
      {}
    );

  const validateChapter = (
    chap: Chapter,
    index: number,
    allChaps: Chapter[]
  ): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!chap.title?.trim()) {
      errors[`title-${index}`] = 'Title is required';
    }
    if (
      typeof chap.startTime !== 'number' ||
      isNaN(chap.startTime) ||
      chap.startTime < 0
    ) {
      errors[`startTime-${index}`] = 'Start time is required';
    }
    if (typeof chap.endTime !== 'number' || isNaN(chap.endTime)) {
      errors[`endTime-${index}`] = 'End time is required';
    } else if (chap.startTime !== undefined && chap.endTime <= chap.startTime) {
      errors[`endTime-${index}`] = 'End time must be > start time';
    }
    const otherChapters = allChaps.filter((_, i) => i !== index);
    for (const other of otherChapters) {
      if (
        Math.max(chap.startTime, other.startTime) <
        Math.min(chap.endTime, other.endTime)
      ) {
        errors[`overlap-${index}`] = 'Chapter times overlap';
        break;
      }
    }
    return errors;
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: generateId(),
      title: 'New Chapter',
      startTime:
        chapters.length > 0 ? chapters[chapters.length - 1].endTime : 0,
      endTime:
        chapters.length > 0 ? chapters[chapters.length - 1].endTime + 60 : 60,
    };
    const updatedChapters = sortChapters([...chapters, newChapter]);
    setFormErrors(validateAllChapters(updatedChapters));
    setChapters(updatedChapters);
    handleUpdate(videoId, title, updatedChapters);
  };

  const updateChapter = (chapterId: string, updates: Partial<Chapter>) => {
    const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
    if (chapterIndex === -1) return;
    const updatedChapters = [...chapters];
    updatedChapters[chapterIndex] = {
      ...updatedChapters[chapterIndex],
      ...updates,
    };
    const sortedChapters = sortChapters(updatedChapters);
    setFormErrors(validateAllChapters(sortedChapters));
    setChapters(sortedChapters);
  };

  const removeChapter = (idToRemove: string) => {
    const updatedChapters = chapters.filter((c) => c.id !== idToRemove);
    setFormErrors(validateAllChapters(updatedChapters));
    setChapters(updatedChapters);
    handleUpdate(videoId, title, updatedChapters);
  };

  const handlePaneSelect = (chapterId: string, slug: string) => {
    const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
    if (chapterIndex === -1) return;
    const updatedChapters = [...chapters];
    const selectedPane = paneList.find((p) => p.slug === slug);
    updatedChapters[chapterIndex].linkedPaneId = selectedPane
      ? selectedPane.id
      : undefined;
    setChapters(updatedChapters);
    handleUpdate(videoId, title, updatedChapters);
  };

  const handleUnlinkPane = (chapterId: string) => {
    const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
    if (chapterIndex === -1) return;
    const updatedChapters = [...chapters];
    delete updatedChapters[chapterIndex].linkedPaneId;
    setChapters(updatedChapters);
    handleUpdate(videoId, title, updatedChapters);
  };

  const getLinkedPaneSlug = (linkedPaneId?: string): string => {
    if (!linkedPaneId) return '';
    const paneNode = allNodes.get(linkedPaneId) as PaneNode | undefined;
    return paneNode?.slug || '';
  };

  const handleCopyAll = () => {
    const canonicalURL = getCanonicalURL();
    if (!canonicalURL) return;
    const linksText = chapters
      .filter((c) => c.linkedPaneId && getLinkedPaneSlug(c.linkedPaneId))
      .map((chapter) => {
        const paneSlug = getLinkedPaneSlug(chapter.linkedPaneId);
        return `${chapter.title}\n${canonicalURL}#${paneSlug}\n${canonicalURL}?t=${chapter.startTime}s`;
      })
      .join('\n\n');
    const fullBlock = `${canonicalURL}\n${canonicalURL}?t=0s\n\n${linksText}`;
    navigator.clipboard.writeText(fullBlock);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getCanonicalURL = () => {
    try {
      return canonicalURLStore.get();
    } catch (e) {
      return '';
    }
  };

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
          Warning: This video is already used elsewhere.
        </div>
      )}
      <SingleParam
        label={widgetInfo.parameters[1].label}
        value={title}
        onChange={handleTitleChange}
      />
      <div className="mt-4 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowChapterModal(true)}
          className="flex w-full items-center justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
        >
          <ChevronDownIcon className="mr-2 h-5 w-5" />
          {chapters.length > 0
            ? `Configure ${chapters.length} Chapter(s)`
            : 'Configure Chapters'}
        </button>
      </div>
      <Dialog.Root
        open={showChapterModal}
        onOpenChange={(details) => setShowChapterModal(details.open)}
        modal={true}
        preventScroll={true}
      >
        <Portal>
          <Dialog.Backdrop
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
            style={{ zIndex: 9005 }}
          />
          <Dialog.Positioner
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 9005 }}
          >
            <Dialog.Content
              className="w-full max-w-4xl overflow-hidden rounded-lg bg-slate-50 shadow-xl"
              style={{ height: '80vh' }}
            >
              <div className="flex h-full flex-col">
                <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3">
                  <Dialog.Title className="text-lg font-bold text-gray-900">
                    Chapter Configuration
                  </Dialog.Title>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="lg:grid-cols-2 grid grid-cols-1 gap-4">
                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-gray-200 p-3">
                        <h3 className="text-base font-bold text-gray-900">
                          Video Chapters
                        </h3>
                        <button
                          type="button"
                          onClick={addChapter}
                          className="flex items-center rounded bg-cyan-600 px-3 py-1 text-sm font-bold text-white hover:bg-cyan-700"
                        >
                          <PlusIcon className="mr-1 h-4 w-4" /> Add
                        </button>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {chapters.length === 0 && (
                          <div className="p-6 text-center text-sm text-gray-500">
                            No chapters added yet.
                          </div>
                        )}
                        {chapters.map((chapter, index) => (
                          <div key={chapter.id} className="p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="text-sm font-bold text-gray-900">
                                Chapter {index + 1}: {chapter.title}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeChapter(chapter.id)}
                                className="rounded p-1 text-red-600 hover:bg-gray-100 hover:text-red-700"
                                title="Remove chapter"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <label className="block text-xs font-bold text-gray-700">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={chapter.title}
                                  onChange={(e) =>
                                    updateChapter(chapter.id, {
                                      title: e.target.value,
                                    })
                                  }
                                  onBlur={() =>
                                    handleUpdate(videoId, title, chapters)
                                  }
                                  className={`sm:text-sm mt-1 block w-full rounded-md border-gray-300 px-2 py-1 shadow-sm ${formErrors[`title-${index}`] ? 'border-red-300' : 'focus:border-cyan-500 focus:ring-cyan-500'}`}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700">
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={chapter.description || ''}
                                  onChange={(e) =>
                                    updateChapter(chapter.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  onBlur={() =>
                                    handleUpdate(videoId, title, chapters)
                                  }
                                  className="sm:text-sm mt-1 block w-full rounded-md border-gray-300 px-2 py-1 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-bold text-gray-700">
                                    Start (s)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={chapter.startTime}
                                    onChange={(e) =>
                                      updateChapter(chapter.id, {
                                        startTime:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    onBlur={() =>
                                      handleUpdate(videoId, title, chapters)
                                    }
                                    className={`sm:text-sm mt-1 block w-full rounded-md border-gray-300 px-2 py-1 shadow-sm ${formErrors[`startTime-${index}`] || formErrors[`overlap-${index}`] ? 'border-red-300' : 'focus:border-cyan-500 focus:ring-cyan-500'}`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-700">
                                    End (s)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={chapter.endTime}
                                    onChange={(e) =>
                                      updateChapter(chapter.id, {
                                        endTime: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    onBlur={() =>
                                      handleUpdate(videoId, title, chapters)
                                    }
                                    className={`sm:text-sm mt-1 block w-full rounded-md border-gray-300 px-2 py-1 shadow-sm ${formErrors[`endTime-${index}`] || formErrors[`overlap-${index}`] ? 'border-red-300' : 'focus:border-cyan-500 focus:ring-cyan-500'}`}
                                  />
                                </div>
                              </div>
                              {(formErrors[`overlap-${index}`] ||
                                formErrors[`endTime-${index}`]) && (
                                <p className="mt-1 text-xs text-red-600">
                                  {formErrors[`overlap-${index}`] ||
                                    formErrors[`endTime-${index}`]}
                                </p>
                              )}
                              <div className="relative">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-bold text-gray-700">
                                    Linked Pane
                                  </label>
                                  {chapter.linkedPaneId && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUnlinkPane(chapter.id)
                                      }
                                      className="flex items-center text-xs text-red-600 hover:underline"
                                    >
                                      <XMarkIcon className="mr-1 h-3 w-3" />{' '}
                                      Unlink
                                    </button>
                                  )}
                                </div>
                                <ActionBuilderSlugSelector
                                  type="pane"
                                  value={getLinkedPaneSlug(
                                    chapter.linkedPaneId
                                  )}
                                  onSelect={(slug: string) =>
                                    handlePaneSelect(chapter.id, slug)
                                  }
                                  label="Linked Pane"
                                  placeholder="Select a pane"
                                  contentMap={contentMapForSelector}
                                  parentSlug={storyFragmentNode?.slug}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-gray-200 p-3">
                        <h3 className="text-base font-bold text-gray-900">
                          Chapter Links
                        </h3>
                        <button
                          onClick={handleCopyAll}
                          className="flex items-center rounded bg-gray-200 px-3 py-1 text-sm font-bold text-gray-700 hover:bg-gray-300"
                        >
                          {isCopied ? (
                            <>
                              <CheckIcon className="mr-1 h-4 w-4 text-green-500" />{' '}
                              Copied
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="mr-1 h-4 w-4" />{' '}
                              Copy All
                            </>
                          )}
                        </button>
                      </div>
                      <div className="overflow-y-auto bg-gray-50 p-4 font-mono text-xs">
                        {getCanonicalURL() ? (
                          <>
                            <p className="mb-2 font-bold">
                              {getCanonicalURL()}
                            </p>
                            <p className="mb-3">{getCanonicalURL()}?t=0s</p>
                            {chapters
                              .filter(
                                (c) =>
                                  c.linkedPaneId &&
                                  getLinkedPaneSlug(c.linkedPaneId)
                              )
                              .map((chapter) => (
                                <div
                                  key={chapter.id}
                                  className="mb-3 border-t pt-3"
                                >
                                  <p className="mb-1 italic">{chapter.title}</p>
                                  <p>{`${getCanonicalURL()}#${getLinkedPaneSlug(chapter.linkedPaneId)}`}</p>
                                  <p>{`${getCanonicalURL()}?t=${chapter.startTime}s`}</p>
                                </div>
                              ))}
                          </>
                        ) : (
                          <p className="text-gray-500">
                            Canonical URL not available.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 justify-end border-t border-gray-200 bg-white px-6 py-3">
                  <Dialog.CloseTrigger asChild>
                    <button className="rounded bg-gray-600 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">
                      Close
                    </button>
                  </Dialog.CloseTrigger>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
}

export default BunnyWidget;
