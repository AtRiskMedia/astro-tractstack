import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type MouseEventHandler,
} from 'react';
import { useStore } from '@nanostores/react';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import TagIcon from '@heroicons/react/24/outline/TagIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import ArrowUpTrayIcon from '@heroicons/react/24/outline/ArrowUpTrayIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import {
  fullContentMapStore,
  setPendingImageOperation,
  getPendingImageOperation,
  storyFragmentTopicsStore,
} from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { cloneDeep, findUniqueSlug, titleToSlug } from '@/utils/helpers';
import { isStoryFragmentNode } from '@/utils/compositor/typeGuards';
import OgImagePreview from '@/components/compositor/preview/OgImagePreview';
import {
  validateFile,
  resizeAndCropImage,
  getImageDimensions,
  type FileValidationOptions,
} from '@/utils/api/fileHelpers';
import type { FullContentMapItem, Topic } from '@/types/tractstack';
import type { ImageDimensions } from '@/types/formTypes';
import {
  StoryFragmentMode,
  type StoryFragmentNode,
} from '@/types/compositorTypes';

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;

interface StoryFragmentOpenGraphPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentMode) => void;
}

const hasSlug = (
  item: FullContentMapItem
): item is FullContentMapItem & { slug: string } =>
  'slug' in item &&
  typeof item.slug === 'string' &&
  (item.type === 'StoryFragment' || item.type === 'Pane');

const StoryFragmentOpenGraphPanel = ({
  nodeId,
  setMode,
}: StoryFragmentOpenGraphPanelProps) => {
  const $contentMap = useStore(fullContentMapStore);
  const $storyFragmentTopics = useStore(storyFragmentTopicsStore);
  const storedData = $storyFragmentTopics[nodeId];

  // Local state for draft changes
  const [draftTitle, setDraftTitle] = useState('');
  const [draftTopics, setDraftTopics] = useState<Topic[]>([]);
  const [draftDetails, setDraftDetails] = useState('');
  const [draftImagePath, setDraftImagePath] = useState<string | null>(null);
  const [draftImageData, setDraftImageData] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [warning, setWarning] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [existingTopics, setExistingTopics] = useState<Topic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track initial state for change detection
  const initialState = useRef<{
    title: string;
    details: string;
    topics: Topic[];
    socialImagePath: string | null;
    textColor: string;
    bgColor: string;
  } | null>(null);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const thisNode = allNodes.get(nodeId);

  if (!thisNode || !isStoryFragmentNode(thisNode)) {
    return null;
  }
  const storyfragmentNode = thisNode as StoryFragmentNode;

  const initialized = useRef(false);

  // Initialize draft state and colors
  // Initialize draft state and colors
  useEffect(() => {
    const ogParams = ctx.getOgImageParams(nodeId);

    // Only set initial values if not already set
    if (!initialized.current) {
      setDraftTitle(storyfragmentNode.title);
      setCharCount(storyfragmentNode.title.length);
      setDraftImagePath(storyfragmentNode.socialImagePath || null);

      initialState.current = {
        title: storyfragmentNode.title,
        details: '',
        topics: [],
        socialImagePath: storyfragmentNode.socialImagePath ?? null,
        textColor: ogParams.textColor,
        bgColor: ogParams.bgColor,
      };
    }

    const pendingOp = getPendingImageOperation(nodeId);
    if (pendingOp) {
      if (pendingOp.type === 'upload' && pendingOp.data) {
        setDraftImageData(pendingOp.data);
        setDraftImagePath(pendingOp.path || null);
      } else if (pendingOp.type === 'remove') {
        setDraftImagePath(null);
        setDraftImageData(null);
      }
    }
  }, [nodeId]);

  // Handle color changes from OgImagePreview
  const handleColorChange = (newTextColor: string, newBgColor: string) => {
    if (!initialState.current) return;

    if (
      (newTextColor !== initialState.current.textColor ||
        newBgColor !== initialState.current.bgColor) &&
      draftImagePath?.includes('--')
    ) {
      setPendingImageOperation(nodeId, {
        type: 'remove',
        path: draftImagePath,
      });
      setDraftImagePath(null);
      setDraftImageData(null);
    }
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= 70) {
      setDraftTitle(newTitle);
      setCharCount(newTitle.length);
      setIsValid(newTitle.length >= 35 && newTitle.length <= 60);
      setWarning(newTitle.length > 60 && newTitle.length <= 70);

      if (
        draftImagePath?.includes('--') &&
        newTitle !== initialState.current?.title
      ) {
        setPendingImageOperation(nodeId, {
          type: 'remove',
          path: draftImagePath,
        });
        setDraftImagePath(null);
        setDraftImageData(null);
      }
    }
  };

  useEffect(() => {
    if (initialized.current || dataFetched) return;

    setLoading(true);
    try {
      // Get all topics from the special "all-topics" entry in content map
      const topicsContent = $contentMap.find(
        (item) => item.type === 'Topic' && item.id === 'all-topics'
      );

      // Convert topic strings to Topic objects with mock IDs
      const allTopicsArray = topicsContent?.topics || [];
      const topicsWithIds: Topic[] = allTopicsArray.map(
        (topicTitle, index) => ({
          id: index + 1,
          title: topicTitle,
        })
      );

      setExistingTopics(topicsWithIds);

      // Prioritize the description from the definitive fullContentMap
      const sfContent = $contentMap.find(
        (item) => item.type === 'StoryFragment' && item.id === nodeId
      );
      const initialDescription = sfContent?.description || '';
      setDraftDetails(initialDescription);

      let initialTopics: Topic[] = [];

      // Check stored draft data for topics
      if (storedData) {
        initialTopics = Array.isArray(storedData.topics)
          ? storedData.topics.map((t) => ({
              id: typeof t.id === 'string' ? parseInt(t.id, 10) : (t.id ?? -1),
              title: t.title,
            }))
          : [];
        setDraftTopics(initialTopics);
      } else if (sfContent && sfContent.topics && sfContent.topics.length > 0) {
        // Fall back to content map data for initial topics if no draft exists
        initialTopics = sfContent.topics.map((topicTitle) => {
          const existingTopic = topicsWithIds.find(
            (t) => t.title.toLowerCase() === topicTitle.toLowerCase()
          );
          return existingTopic || { id: -1, title: topicTitle };
        });
        setDraftTopics(initialTopics);
      } else {
        setDraftTopics([]);
      }

      if (initialState.current) {
        initialState.current.details = initialDescription;
        initialState.current.topics = cloneDeep(initialTopics);
      }

      setDataFetched(true);
      initialized.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [nodeId, storedData, $contentMap, dataFetched]);

  // Detect changes
  useEffect(() => {
    if (!loading && dataFetched && initialState.current) {
      const initial = initialState.current;
      const pendingOp = getPendingImageOperation(nodeId);

      const topicsChanged =
        draftTopics.length !== initial.topics.length ||
        draftTopics.some(
          (t, i) =>
            t.title.toLowerCase() !== initial.topics[i]?.title.toLowerCase() ||
            t.id !== initial.topics[i]?.id
        );

      const imageChanged =
        pendingOp !== null || draftImagePath !== initial.socialImagePath;

      const hasChangesDetected =
        draftTitle !== initial.title ||
        draftDetails !== initial.details ||
        topicsChanged ||
        imageChanged;

      setHasChanges(hasChangesDetected);
    }
  }, [
    draftTopics,
    draftDetails,
    draftTitle,
    draftImagePath,
    nodeId,
    loading,
    dataFetched,
  ]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setPendingImageOperation(nodeId, {
      type: 'remove',
      path: draftImagePath || undefined,
    });
    setDraftImagePath(null);
    setDraftImageData(null);
    setImageError(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImageError(null);

    try {
      // Basic validation first (format, size)
      const validationOptions: FileValidationOptions = {
        maxSizeKB: 2048,
        allowedFormats: ['jpg', 'jpeg', 'png'],
        allowAnyImageWithWarning: true,
      };

      const validation = await validateFile(file, validationOptions);
      if (!validation.isValid) {
        setImageError(validation.error || 'Invalid file');
        setIsProcessing(false);
        return;
      }

      // Check dimensions
      const dimensions = await getImageDimensions(file);
      const needsResize =
        dimensions.width !== TARGET_WIDTH ||
        dimensions.height !== TARGET_HEIGHT;

      if (needsResize) {
        // Auto-resize
        const targetDimensions: ImageDimensions = {
          width: TARGET_WIDTH,
          height: TARGET_HEIGHT,
        };

        const processResult = await resizeAndCropImage(
          file,
          targetDimensions,
          0.9
        );

        const fileExtension =
          file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `${nodeId}-${Date.now()}.${fileExtension}`;

        setPendingImageOperation(nodeId, {
          type: 'upload',
          data: processResult.processedFile,
          path: `/images/og/${filename}`,
          filename,
        });

        setDraftImageData(processResult.processedFile);
        setDraftImagePath(`/images/og/${filename}`);

        // Show resize feedback
        if (processResult.warnings.length > 0) {
          setImageError(
            `✓ Image automatically resized from ${processResult.originalDimensions.width}x${processResult.originalDimensions.height} to ${processResult.finalDimensions.width}x${processResult.finalDimensions.height} pixels. ${processResult.warnings.join(' ')}`
          );
        } else {
          setImageError(
            `✓ Image automatically resized from ${processResult.originalDimensions.width}x${processResult.originalDimensions.height} to ${processResult.finalDimensions.width}x${processResult.finalDimensions.height} pixels.`
          );
        }
      } else {
        // Perfect dimensions - use as-is
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;

        const fileExtension =
          file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `${nodeId}-${Date.now()}.${fileExtension}`;

        setPendingImageOperation(nodeId, {
          type: 'upload',
          data: base64,
          path: `/images/og/${filename}`,
          filename,
        });

        setDraftImageData(base64);
        setDraftImagePath(`/images/og/${filename}`);

        setImageError(
          `✓ Perfect dimensions! Image uploaded at ${dimensions.width}x${dimensions.height} pixels.`
        );
      }
    } catch (err) {
      setImageError('Failed to process image');
      console.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const addTopic = (titleToAdd: string, sourceTopic?: Topic) => {
    if (!titleToAdd) return;

    const titleLower = titleToAdd.toLowerCase().trim();

    if (draftTopics.some((topic) => topic.title.toLowerCase() === titleLower))
      return;

    const existingTopicsArray = Array.isArray(existingTopics)
      ? existingTopics
      : [];
    const matchingTopic =
      sourceTopic ||
      existingTopicsArray.find(
        (topic) => topic.title.toLowerCase() === titleLower
      );

    if (matchingTopic) {
      setDraftTopics([
        ...draftTopics,
        { id: matchingTopic.id, title: matchingTopic.title },
      ]);
    } else {
      setDraftTopics([...draftTopics, { id: -1, title: titleToAdd.trim() }]);
      setExistingTopics([
        ...existingTopicsArray,
        { id: -1, title: titleToAdd.trim() },
      ]);
    }
  };

  const handleAddTopic: MouseEventHandler<HTMLButtonElement> = () => {
    const titleToAdd = newTopicTitle.trim();
    addTopic(titleToAdd);
    setNewTopicTitle('');
  };

  const handleRemoveTopic = (topicToRemove: Topic) => {
    setDraftTopics((prevTopics) =>
      prevTopics.filter(
        (topic) =>
          topic.title.toLowerCase() !== topicToRemove.title.toLowerCase()
      )
    );
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraftDetails(e.target.value);
  };

  const handleApplyChanges = () => {
    let currentNode = storyfragmentNode; // Track the current node state

    // Update title if changed
    if (draftTitle !== storyfragmentNode.title) {
      const existingSlugs = $contentMap
        .filter(hasSlug)
        .map((item) => item.slug);
      const newSlug =
        storyfragmentNode.slug === ''
          ? findUniqueSlug(titleToSlug(draftTitle), existingSlugs)
          : null;

      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        title: draftTitle,
        ...(newSlug ? { slug: newSlug } : {}),
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);

      // Update our reference to the current node
      currentNode = updatedNode;
    }

    // Save topics and description to store
    const topicsArray = Array.isArray(draftTopics) ? draftTopics : [];
    const storeTopics = topicsArray.map((topic) => ({
      id:
        topic.id !== undefined && topic.id !== -1
          ? String(topic.id)
          : undefined,
      title: topic.title,
    }));

    storyFragmentTopicsStore.setKey(nodeId, {
      topics: storeTopics,
      description: draftDetails,
    });

    // FORCE node update to trigger undo history for ANY changes
    // Use the CURRENT node state, not the original storyfragmentNode
    if (hasChanges) {
      const updatedNode = cloneDeep({
        ...currentNode,
        changed: new Date(),
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
    }

    setMode(StoryFragmentMode.DEFAULT);
  };

  return (
    <div className="group mb-4 w-full rounded-b-md bg-white px-1.5 py-6">
      <div className="px-3.5">
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-bold">Page SEO</h3>
          <button
            onClick={() => setMode(StoryFragmentMode.DEFAULT)}
            className="text-cyan-600 hover:text-black"
          >
            ← Close Panel
          </button>
        </div>

        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleApplyChanges}
              className="rounded-md bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              Apply Changes
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="mb-1 block text-sm font-bold text-gray-700">
              Page Title
            </h3>
            <div className="relative">
              <input
                type="text"
                value={draftTitle}
                onChange={handleTitleChange}
                className={`w-full rounded-md border px-2 py-1 pr-16 ${
                  charCount < 5
                    ? 'border-red-500 bg-red-50'
                    : isValid
                      ? 'border-green-500 bg-green-50'
                      : warning
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-300'
                }`}
                placeholder="Enter story fragment title (50-60 characters recommended)"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                {charCount < 5 ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                ) : isValid ? (
                  <CheckIcon className="h-5 w-5 text-green-500" />
                ) : warning ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                ) : null}
                <span
                  className={`text-sm ${
                    charCount < 5
                      ? 'text-red-500'
                      : isValid
                        ? 'text-green-500'
                        : warning
                          ? 'text-yellow-500'
                          : 'text-gray-500'
                  }`}
                >
                  {charCount}/70
                </span>
              </div>
            </div>
            <div className="mt-2 space-y-2 text-sm text-gray-600">
              <p>
                Write a clear, descriptive title that accurately represents your
                page content.
              </p>
              <ul className="ml-4 space-y-1">
                <li>
                  <CheckIcon className="mr-1 inline h-4 w-4" /> Include relevant
                  keywords
                </li>
                <li>
                  <CheckIcon className="mr-1 inline h-4 w-4" /> Avoid
                  unnecessary words like "welcome to" or "the"
                </li>
                <li>
                  <CheckIcon className="mr-1 inline h-4 w-4" /> Unique titles
                  across your website
                </li>
              </ul>
              <div className="py-2">
                {charCount < 5 && (
                  <span className="text-red-500">
                    Title must be at least 5 characters
                  </span>
                )}
                {charCount >= 5 && charCount < 35 && (
                  <span className="text-gray-500">
                    Add {35 - charCount} more characters for optimal length
                  </span>
                )}
                {warning && (
                  <span className="text-yellow-500">Title is getting long</span>
                )}
                {isValid && (
                  <span className="text-green-500">Perfect title length!</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-bold text-gray-700"
            >
              Page Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-cyan-600 focus:ring-cyan-600"
              placeholder="Add a description for this page..."
              value={draftDetails}
              onChange={handleDescriptionChange}
            />
            <p className="mt-1 text-sm text-gray-500">
              This description helps with SEO and may appear in search results.
            </p>
          </div>

          <div>
            <h3 className="mb-2 block text-sm font-bold text-gray-700">
              Social Share Image
            </h3>

            {draftImageData || draftImagePath ? (
              <div className="flex items-start space-x-4">
                <div
                  className="relative w-64 overflow-hidden rounded-md bg-gray-100"
                  style={{ aspectRatio: 1.91 / 1 }}
                >
                  <img
                    src={draftImageData || `${draftImagePath}?v=${Date.now()}`}
                    alt="Open Graph preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    disabled={isProcessing}
                    title="Remove image"
                    className="absolute right-2 top-2 rounded-full bg-white p-1 shadow-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-800" />
                  </button>
                </div>

                <div className="flex-grow">
                  <button
                    onClick={handleUploadClick}
                    disabled={isProcessing}
                    title="Replace image"
                    className="flex items-center text-sm text-cyan-600 hover:text-orange-600 disabled:opacity-50"
                  >
                    <ArrowUpTrayIcon className="mr-1 h-4 w-4" />
                    {isProcessing ? 'Processing...' : 'Replace Image'}
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png"
                    className="hidden"
                  />

                  <p className="mt-2 break-all text-xs text-gray-800">
                    {draftImageData
                      ? 'New image (pending save)'
                      : draftImagePath}
                  </p>
                  {imageError && (
                    <p
                      className={`mt-2 text-sm ${imageError.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {imageError}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <OgImagePreview
                  nodeId={nodeId}
                  title={draftTitle}
                  socialImagePath={draftImagePath}
                  onColorChange={handleColorChange}
                />
                <div className="mt-4 flex space-x-4">
                  <div
                    className="relative w-64 overflow-hidden rounded-md bg-gray-100"
                    style={{ aspectRatio: 1.91 / 1 }}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-dashed border-gray-400">
                      <span className="text-sm text-gray-600">
                        No image selected
                      </span>
                    </div>
                  </div>

                  <div className="flex-grow">
                    <button
                      onClick={handleUploadClick}
                      disabled={isProcessing}
                      title="Upload image"
                      className="flex items-center text-sm text-cyan-600 hover:text-orange-600 disabled:opacity-50"
                    >
                      <ArrowUpTrayIcon className="mr-1 h-4 w-4" />
                      {isProcessing ? 'Processing...' : 'Upload Image'}
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png"
                      className="hidden"
                    />

                    {imageError && (
                      <p
                        className={`mt-2 text-sm ${imageError.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {imageError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-2 space-y-2 text-sm text-gray-600">
                  <p>
                    This image will be used when your page is shared on social
                    media.
                  </p>
                  <p>Requirements:</p>
                  <ul className="ml-5 list-disc space-y-1">
                    <li>
                      <strong>Best results:</strong> Upload images at exactly{' '}
                      {TARGET_WIDTH}x{TARGET_HEIGHT} pixels
                    </li>
                    <li>
                      Other sizes will be automatically resized (may crop to
                      fit)
                    </li>
                    <li>Only JPG or PNG formats are accepted</li>
                    <li>Keep important content centered</li>
                    <li>Use clear, high-contrast imagery</li>
                    <li>Avoid small text</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {draftDetails.trim().length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Topics
              </label>

              <div className="mb-3 flex space-x-1">
                <input
                  type="text"
                  className="w-full flex-grow rounded-l-md border border-gray-300 p-2 shadow-sm focus:border-cyan-600 focus:ring-cyan-600"
                  placeholder="Add a new tag..."
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTopic(newTopicTitle.trim());
                      setNewTopicTitle('');
                    }
                  }}
                />
                <button
                  onClick={handleAddTopic}
                  disabled={!newTopicTitle.trim()}
                  className="rounded-r-md bg-cyan-600 px-3 py-2 text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {draftTopics.map((topic) => (
                  <div
                    key={`topic-${topic.title}`}
                    className="flex items-center rounded-full bg-gray-100 px-3 py-1"
                  >
                    <TagIcon className="mr-1 h-4 w-4 text-gray-500" />
                    <span className="text-sm">{topic.title}</span>
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {draftTopics.length === 0 && (
                  <p className="text-sm italic text-gray-500">
                    No topics added yet. Topics help organize and categorize
                    your content.
                  </p>
                )}
              </div>
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-bold text-gray-700">
                  Available Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {existingTopics
                    .filter(
                      (existingTopic) =>
                        !draftTopics.some(
                          (topic) =>
                            topic.title.toLowerCase() ===
                            existingTopic.title.toLowerCase()
                        )
                    )
                    .map((availableTopic) => (
                      <button
                        key={`available-${availableTopic.title}`}
                        onClick={() =>
                          addTopic(availableTopic.title, availableTopic)
                        }
                        className="flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 transition-colors hover:bg-gray-100"
                      >
                        <TagIcon className="mr-1 h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {availableTopic.title}
                        </span>
                      </button>
                    ))}
                  {existingTopics.filter(
                    (existingTopic) =>
                      !draftTopics.some(
                        (topic) =>
                          topic.title.toLowerCase() ===
                          existingTopic.title.toLowerCase()
                      )
                  ).length === 0 && (
                    <p className="text-xs italic text-gray-500">
                      No additional topics available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleApplyChanges}
              className="rounded-md bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              Apply Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryFragmentOpenGraphPanel;
