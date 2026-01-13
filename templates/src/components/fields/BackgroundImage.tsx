import { useState, useRef, useEffect, useMemo, type ChangeEvent } from 'react';
import { ulid } from 'ulid';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ArrowUpTrayIcon from '@heroicons/react/24/outline/ArrowUpTrayIcon';
import FolderIcon from '@heroicons/react/24/outline/FolderIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import { settingsPanelStore } from '@/stores/storykeep';
import type {
  ImageFileNode,
  BgImageNode,
  PaneNode,
} from '@/types/compositorTypes';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface BackgroundImageProps {
  paneId: string;
  onUpdate: () => void;
}

const BackgroundImage = ({ paneId, onUpdate }: BackgroundImageProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(paneId) as PaneNode;
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ImageFileNode[]>([]);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [query, setQuery] = useState('');
  const [bgImageNode, setBgImageNode] = useState<BgImageNode | null>(null);
  const [objectFit, setObjectFit] = useState<'cover' | 'contain' | 'fill'>(
    'cover'
  );
  const [hiddenViewports, setHiddenViewports] = useState({
    mobile: false,
    tablet: false,
    desktop: false,
  });
  const [localAltDescription, setLocalAltDescription] = useState<string>('');
  const tenantId =
    window.TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

        // First, get all file IDs
        const idsResponse = await fetch(`${goBackend}/api/v1/nodes/files`, {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        });
        if (!idsResponse.ok) throw new Error('Failed to fetch file IDs');
        const { fileIds } = await idsResponse.json();

        if (fileIds && fileIds.length > 0) {
          // Then get the actual file objects
          const filesResponse = await fetch(`${goBackend}/api/v1/nodes/files`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantId,
            },
            body: JSON.stringify({ fileIds }),
          });
          if (!filesResponse.ok) throw new Error('Failed to fetch files');
          const { files } = await filesResponse.json();
          setFiles(files || []);
        } else {
          setFiles([]);
        }
      } catch (error) {
        console.error('[BackgroundImage] Error loading files:', error);
        setFiles([]);
      }
    };
    loadFiles();
  }, []);

  useEffect(() => {
    if (paneNode) {
      const childNodes = ctx.getChildNodeIDs(paneNode.id);
      const bgNode = childNodes
        .map((id) => allNodes.get(id))
        .find(
          (node) =>
            node?.nodeType === 'BgPane' &&
            'type' in node &&
            node.type === 'background-image'
        ) as BgImageNode | undefined;

      if (bgNode) {
        setBgImageNode(bgNode);
        setObjectFit(bgNode.objectFit || 'cover');
        setHiddenViewports({
          mobile: !!bgNode.hiddenViewportMobile,
          tablet: !!bgNode.hiddenViewportTablet,
          desktop: !!bgNode.hiddenViewportDesktop,
        });
        setLocalAltDescription(bgNode.alt || '');
      } else {
        setBgImageNode(null);
        setObjectFit('cover');
        setHiddenViewports({ mobile: false, tablet: false, desktop: false });
        setLocalAltDescription('');
      }
    }
  }, [paneNode, allNodes]);

  const deleteExistingBgNodes = () => {
    const childNodes = ctx.getChildNodeIDs(paneNode.id);
    const bgNodes = childNodes
      .map((id) => allNodes.get(id))
      .filter((node) => node?.nodeType === 'BgPane');

    bgNodes.forEach((node) => {
      if (node) ctx.deleteNode(node.id);
    });
  };

  const handleFileSelect = (details: { value: string[] }) => {
    const fileId = details.value[0];
    if (!fileId) return;

    const file = files.find((f) => f.id === fileId);
    if (!file) {
      console.log('[BackgroundImage] File not found:', fileId);
      return;
    }

    setIsSelectingFile(false);
    deleteExistingBgNodes();

    const bgNodeId = ulid();
    const defaultAlt = file.filename
      ? `Decorative Image - ${file.filename.split('.').slice(0, -1).join('.')}`
      : 'Decorative Image';

    // For existing files, use normal src (not base64Data)
    const updatedBgNode: BgImageNode = {
      id: bgNodeId,
      nodeType: 'BgPane',
      parentId: paneId,
      type: 'background-image',
      fileId: file.id,
      src: file.src,
      srcSet: file.srcSet,
      alt: file.altDescription || defaultAlt,
      objectFit,
      position: bgImageNode?.position || 'background',
      size: bgImageNode?.size || 'equal',
    };
    ctx.addNode(updatedBgNode);
    const updatedPaneNode = cloneDeep(paneNode);
    ctx.modifyNodes([updatedPaneNode]);
    setBgImageNode(updatedBgNode);
    setLocalAltDescription(updatedBgNode.alt || '');
    const currentSignal = settingsPanelStore.get();
    if (currentSignal) {
      settingsPanelStore.set({
        ...currentSignal,
        editLock: Date.now(),
      });
    }
    onUpdate();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImageError(null);

    try {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageError('Please upload only JPG, PNG, or WebP files');
        return;
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${ulid()}.${fileExtension}`;

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      deleteExistingBgNodes();

      const bgNodeId = ulid();
      const defaultAlt = `Decorative Image - ${filename.split('.').slice(0, -1).join('.')}`;
      const updatedBgNode: BgImageNode = {
        id: bgNodeId,
        nodeType: 'BgPane',
        parentId: paneId,
        type: 'background-image',
        fileId: ulid(),
        src: '',
        base64Data: base64,
        alt: defaultAlt,
        objectFit,
        position: bgImageNode?.position || 'background',
        size: bgImageNode?.size || 'equal',
      };
      ctx.addNode(updatedBgNode);
      const updatedPaneNode = cloneDeep(paneNode);
      ctx.modifyNodes([updatedPaneNode]);
      setBgImageNode(updatedBgNode);
      setLocalAltDescription(defaultAlt);
      onUpdate();
    } catch (err) {
      setImageError('Failed to process image');
      console.error('[BackgroundImage] Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    if (!bgImageNode) return;
    ctx.deleteNode(bgImageNode.id);
    const updatedPaneNode = cloneDeep(paneNode);
    ctx.modifyNodes([updatedPaneNode]);
    setBgImageNode(null);
    setLocalAltDescription('');
    onUpdate();
  };

  const handleAltDescriptionBlur = () => {
    if (bgImageNode && localAltDescription !== bgImageNode.alt) {
      const updatedBgNode = cloneDeep(bgImageNode);
      updatedBgNode.alt = localAltDescription;
      const updatedPaneNode = cloneDeep(paneNode);
      ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    }
  };

  const handleObjectFitChange = (
    newObjectFit: 'cover' | 'contain' | 'fill'
  ) => {
    setObjectFit(newObjectFit);
    if (bgImageNode) {
      const updatedBgNode = cloneDeep(bgImageNode);
      updatedBgNode.objectFit = newObjectFit;
      const updatedPaneNode = cloneDeep(paneNode);
      ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    }
  };

  const handleViewportVisibilityChange = (
    viewport: 'mobile' | 'tablet' | 'desktop',
    hidden: boolean
  ) => {
    setHiddenViewports((prev) => ({ ...prev, [viewport]: hidden }));
    if (bgImageNode) {
      const updatedBgNode = cloneDeep(bgImageNode);
      if (viewport === 'mobile') updatedBgNode.hiddenViewportMobile = hidden;
      if (viewport === 'tablet') updatedBgNode.hiddenViewportTablet = hidden;
      if (viewport === 'desktop') updatedBgNode.hiddenViewportDesktop = hidden;
      const updatedPaneNode = cloneDeep(paneNode);
      ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    }
  };

  const collection = useMemo(() => {
    const filteredFiles =
      query === ''
        ? files
        : files.filter(
            (file) =>
              file.filename.toLowerCase().includes(query.toLowerCase()) ||
              (file.altDescription &&
                file.altDescription.toLowerCase().includes(query.toLowerCase()))
          );

    return createListCollection({
      items: filteredFiles,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.altDescription || item.filename,
    });
  }, [files, query]);

  const comboboxItemStyles = `
    .file-item[data-highlighted] {
      background-color: #0891b2;
      color: white;
    }
    .file-item[data-highlighted] .file-indicator {
      color: white;
    }
    .file-item[data-state="checked"] .file-indicator {
      display: flex;
    }
    .file-item .file-indicator {
      display: none;
    }
    .file-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="w-full space-y-6">
      <div className="flex w-full flex-col space-y-4">
        {bgImageNode && (bgImageNode.src || bgImageNode.base64Data) ? (
          <div
            className="relative overflow-hidden rounded-md border border-gray-300 bg-gray-100"
            style={{ width: '100%', height: '160px' }}
          >
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url(${bgImageNode.base64Data || bgImageNode.src})`,
                backgroundSize: objectFit,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            ></div>
            <button
              onClick={handleRemoveImage}
              disabled={isProcessing}
              className="absolute right-2 top-2 rounded-full bg-white p-1 shadow-md hover:bg-mylightgrey disabled:opacity-50"
            >
              <XMarkIcon className="h-4 w-4 text-mydarkgrey" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={`flex items-center text-sm text-myblue hover:text-cyan-600`}
            >
              <ArrowUpTrayIcon className="mr-1 h-4 w-4" />
              {isProcessing
                ? 'Processing...'
                : bgImageNode?.src || bgImageNode?.base64Data
                  ? 'Replace Image'
                  : 'Upload Background Image'}
            </button>

            <button
              onClick={() => setIsSelectingFile(true)}
              className="flex items-center text-sm text-myblue hover:text-cyan-600"
            >
              <FolderIcon className="mr-1 h-4 w-4" />
              Select Image
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
          {imageError && (
            <p className="mt-2 text-sm text-red-600">{imageError}</p>
          )}
        </div>
      </div>

      {bgImageNode && (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Object Fit
            </label>
            <div className="flex space-x-4">
              {['cover', 'contain', 'fill'].map((fit) => (
                <label key={fit} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="objectFit"
                    value={fit}
                    checked={objectFit === fit}
                    onChange={() =>
                      handleObjectFitChange(fit as 'cover' | 'contain' | 'fill')
                    }
                    className="h-4 w-4 border-gray-300 text-myblue focus:ring-myblue"
                  />
                  <span className="ml-2 text-sm capitalize text-gray-700">
                    {fit}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Hide on Viewport
            </label>
            <div className="flex flex-wrap gap-4">
              {['mobile', 'tablet', 'desktop'].map((viewport) => (
                <label key={viewport} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      hiddenViewports[viewport as keyof typeof hiddenViewports]
                    }
                    onChange={(e) =>
                      handleViewportVisibilityChange(
                        viewport as 'mobile' | 'tablet' | 'desktop',
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-myblue focus:ring-myblue"
                  />
                  <span className="ml-2 text-sm capitalize text-gray-700">
                    {viewport}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="altDescription"
              className="block text-sm font-bold text-gray-700"
            >
              Alt Description
            </label>
            <input
              type="text"
              id="altDescription"
              value={localAltDescription}
              onChange={(e) => setLocalAltDescription(e.target.value)}
              onBlur={handleAltDescriptionBlur}
              className="block w-full rounded-md border border-mylightgrey px-3 py-2 text-sm focus:border-myblue focus:outline-none focus:ring-1 focus:ring-myblue"
              placeholder="Describe this image for accessibility"
            />
          </div>
        </>
      )}

      {isSelectingFile && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Select Image</h3>
            <button
              onClick={() => setIsSelectingFile(false)}
              className="text-mydarkgrey hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <style dangerouslySetInnerHTML={{ __html: comboboxItemStyles }} />

          <Combobox.Root
            collection={collection}
            onValueChange={handleFileSelect}
            onInputValueChange={(details) => setQuery(details.inputValue)}
          >
            <Combobox.Control className="relative">
              <Combobox.Input
                placeholder="Search files..."
                className="block w-full rounded-md border border-mylightgrey px-3 py-2 pr-10 text-sm focus:border-myblue focus:outline-none focus:ring-1 focus:ring-myblue"
              />
              <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" />
              </Combobox.Trigger>
            </Combobox.Control>

            <Combobox.Positioner>
              <Combobox.Content className="max-h-60 w-full overflow-auto rounded-md border border-mylightgrey bg-white shadow-lg">
                {collection.items.map((file) => (
                  <Combobox.Item
                    key={file.id}
                    item={file}
                    className="file-item relative cursor-pointer select-none px-3 py-2 text-sm hover:bg-mylightgrey"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center">
                        <div className="mr-3 h-8 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                          <img
                            src={file.src}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">
                            {file.altDescription || file.filename}
                          </div>
                          {file.altDescription && (
                            <div className="text-xs text-mydarkgrey">
                              {file.filename}
                            </div>
                          )}
                        </div>
                      </div>
                      <CheckIcon className="file-indicator h-4 w-4 flex-shrink-0 text-myblue" />
                    </div>
                  </Combobox.Item>
                ))}
              </Combobox.Content>
            </Combobox.Positioner>
          </Combobox.Root>
        </div>
      )}
    </div>
  );
};

export default BackgroundImage;
