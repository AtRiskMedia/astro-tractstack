import { useState, useRef, useEffect, useMemo, type ChangeEvent } from 'react';
import { ulid } from 'ulid';
import { useDropdownDirection } from '@/utils/helpers';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ArrowUpTrayIcon from '@heroicons/react/24/outline/ArrowUpTrayIcon';
import FolderIcon from '@heroicons/react/24/outline/FolderIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import type { ImageFileNode, FlatNode } from '@/types/compositorTypes';

const missingAlt = `This image requires a description!!`;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageParams {
  fileId: string;
  src: string;
  srcSet?: string;
  altDescription: string;
  base64Data?: string;
}

interface ImageUploadProps {
  currentFileId: string | undefined;
  nodeId: string;
  onUpdate: (params: ImageParams) => void;
  onRemove: () => void;
}

export const ImageUpload = ({
  currentFileId,
  nodeId,
  onUpdate,
  onRemove,
}: ImageUploadProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const [files, setFiles] = useState<ImageFileNode[]>([]);
  const [currentImage, setCurrentImage] = useState<string>('/static.jpg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<ImageFileNode | null>(null);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const { openAbove, maxHeight } = useDropdownDirection(comboboxRef);
  const tenantId =
    window.TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  // Find the current image node
  const currentImageNode = nodeId
    ? (allNodes.get(nodeId) as FlatNode | undefined)
    : (Array.from(allNodes.values()).find(
        (node) => 'fileId' in node && node.fileId === currentFileId
      ) as FlatNode | undefined);

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
        console.error('Failed to load files:', error);
        setFiles([]);
      }
    };
    loadFiles();
  }, []);

  // Update currentImage when currentFileId changes or files load
  useEffect(() => {
    if (currentImageNode?.base64Data) {
      // Show pending upload
      setCurrentImage(currentImageNode.base64Data);
    } else if (currentFileId && files.length > 0) {
      const currentFile = files.find((f) => f.id === currentFileId);
      if (currentFile) {
        setCurrentImage(currentFile.src);
        setSelectedFile(currentFile);
      }
    } else {
      setCurrentImage('/static.jpg');
      setSelectedFile(null);
    }
  }, [currentFileId, files, currentImageNode?.base64Data]);

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    const filteredFiles =
      query === ''
        ? files
        : files.filter((file) =>
            file.filename.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredFiles,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.filename || '',
    });
  }, [files, query]);

  const handleFileSelect = (selectedId: string) => {
    const selected = files.find((f) => f.id === selectedId);
    if (selected) {
      setSelectedFile(selected);
      setCurrentImage(selected.src);

      // For existing files, use normal src (not base64Data)
      onUpdate({
        fileId: selected.id,
        src: selected.src,
        srcSet: selected.srcSet,
        altDescription: selected.altDescription || missingAlt,
      });

      // Update the node for existing files
      if (currentImageNode) {
        const updatedNode = cloneDeep(currentImageNode);
        updatedNode.fileId = selected.id;
        updatedNode.src = selected.src;
        if (selected.srcSet) updatedNode.srcSet = selected.srcSet;
        updatedNode.alt = selected.altDescription || missingAlt;
        delete updatedNode.base64Data; // Remove base64Data for existing files
        updatedNode.isChanged = true;
        ctx.modifyNodes([updatedNode]);
      }
    }
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

      const defaultAlt = `Image - ${filename.split('.').slice(0, -1).join('.')}`;

      // Update local state to show the image immediately
      setCurrentImage(base64);
      setSelectedFile(null);
      onUpdate({
        fileId: ulid(),
        src: base64, // Use base64 as src for immediate display
        altDescription: defaultAlt,
      });

      // Update the node with base64Data
      if (currentImageNode) {
        const updatedNode = cloneDeep(currentImageNode);
        (updatedNode.fileId = ulid()), (updatedNode.src = base64); // Set src to base64 for immediate display
        updatedNode.base64Data = base64;
        updatedNode.alt = defaultAlt;
        updatedNode.isChanged = true;
        ctx.modifyNodes([updatedNode]);
      }
    } catch (err) {
      setImageError('Failed to process image');
      console.error('[ImageUpload] Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
    onRemove();
    if (currentImageNode) {
      const updatedNode = cloneDeep(currentImageNode);
      delete updatedNode.fileId;
      delete updatedNode.base64Data;
      updatedNode.src = '/static.jpg';
      updatedNode.alt =
        "This is a placeholder for an image that hasn't yet been uploaded";
      updatedNode.isChanged = true;
      ctx.modifyNodes([updatedNode]);
    }
    setCurrentImage('/static.jpg');
    setSelectedFile(null);
  };

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

  // Use currentImage state for display
  const hasImage = currentImage !== '/static.jpg';

  return (
    <div className="w-full space-y-6">
      <div className="flex w-full flex-col space-y-4">
        {hasImage ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={currentImage}
                alt={currentImageNode?.alt || 'Selected image'}
                className="h-48 w-full rounded-md border object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {selectedFile && (
              <div className="text-sm text-gray-600">
                Current: {selectedFile.altDescription || selectedFile.filename}
              </div>
            )}

            {currentImageNode?.base64Data && (
              <div className="text-sm text-orange-600">
                Pending upload - will be saved when you save the page
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border-2 border-dashed border-gray-300 p-8 text-center">
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No image selected</p>
          </div>
        )}

        <div className="flex space-x-4">
          <div className="flex-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full rounded-md bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="mr-2 inline h-4 w-4" />
              {isProcessing
                ? 'Processing...'
                : hasImage
                  ? 'Replace Image'
                  : 'Upload New'}
            </button>
            <button
              onClick={() => setIsSelectingFile(true)}
              className="text-myblue flex items-center text-sm hover:text-cyan-600"
            >
              <FolderIcon className="mr-1 h-4 w-4" />
              Select Existing
            </button>
          </div>
        </div>

        {imageError && <div className="text-sm text-red-600">{imageError}</div>}

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
      </div>

      {isSelectingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-mydarkgrey mb-4 text-lg font-bold">
              Select an Image
            </h3>

            <Combobox.Root
              collection={collection}
              onValueChange={(details) => {
                if (details.value.length > 0) {
                  handleFileSelect(details.value[0]);
                  setIsSelectingFile(false);
                }
              }}
              onInputValueChange={(details) => setQuery(details.inputValue)}
            >
              <div ref={comboboxRef} className="relative">
                <Combobox.Control className="relative">
                  <Combobox.Input
                    className="border-mydarkgrey text-myblack w-full rounded-md py-2 pl-3 pr-10"
                    placeholder="Search files..."
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="text-mydarkgrey h-5 w-5" />
                  </Combobox.Trigger>
                </Combobox.Control>

                <Combobox.Positioner>
                  <Combobox.Content
                    className={`absolute z-10 mt-1 w-full overflow-auto rounded-md border bg-white shadow-lg ${
                      openAbove ? 'bottom-full mb-1' : 'top-full mt-1'
                    }`}
                    style={{ maxHeight: `${maxHeight}px` }}
                  >
                    {collection.items.length === 0 ? (
                      <div className="text-mydarkgrey relative cursor-default select-none px-4 py-2">
                        Nothing found.
                      </div>
                    ) : (
                      collection.items.map((file) => (
                        <Combobox.Item
                          key={file.id}
                          item={file}
                          className="file-item text-myblack relative cursor-default select-none py-2 pl-10 pr-4"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={file.src}
                              alt={file.altDescription || file.filename}
                              className="h-10 w-10 rounded border object-cover"
                            />
                            <span className="block truncate">
                              {file.altDescription || file.filename}
                            </span>
                          </div>
                          <span className="file-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                            <CheckIcon className="h-5 w-5" />
                          </span>
                        </Combobox.Item>
                      ))
                    )}
                  </Combobox.Content>
                </Combobox.Positioner>
              </div>
            </Combobox.Root>

            <button
              className="bg-mylightgrey text-myblack mt-4 rounded-md px-4 py-2 text-sm hover:bg-cyan-600 hover:text-white"
              onClick={() => setIsSelectingFile(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{comboboxItemStyles}</style>
    </div>
  );
};

export default ImageUpload;
