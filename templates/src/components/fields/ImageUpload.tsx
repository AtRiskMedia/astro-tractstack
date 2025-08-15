import { useState, useRef, useEffect, useMemo, type ChangeEvent } from 'react';
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
import { ulid } from 'ulid';
import type { ImageFileNode, FlatNode } from '@/types/compositorTypes';

const missingAlt = `This image requires a description!!`;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageParams {
  fileId: string;
  src: string;
  srcSet?: string;
  altDescription: string;
}

interface ImageUploadProps {
  currentFileId: string | undefined;
  onUpdate: (params: ImageParams) => void;
  onRemove: () => void;
}

export const ImageUpload = ({
  currentFileId,
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

  // Find the current image node
  const currentImageNode = Array.from(allNodes.values()).find(
    (node) => 'fileId' in node && node.fileId === currentFileId
  ) as FlatNode | undefined;

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
        const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

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

      if (currentFileId) {
        const currentFile = files.find(
          (f: ImageFileNode) => f.id === currentFileId
        );
        if (currentFile) {
          setCurrentImage(currentFile.src);
        }
      }
    };
    loadFiles();
  }, [currentFileId]);

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

      onUpdate({
        fileId: 'pending',
        src: '',
        altDescription: defaultAlt,
      });

      // Update the node with base64Data
      if (currentImageNode) {
        const updatedNode = cloneDeep(currentImageNode);
        updatedNode.fileId = 'pending';
        updatedNode.src = '';
        updatedNode.base64Data = base64;
        updatedNode.alt = defaultAlt;
        updatedNode.isChanged = true;
        ctx.modifyNodes([updatedNode]);
        setCurrentImage(base64);
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

  return (
    <div className="w-full space-y-6">
      <div className="flex w-full flex-col space-y-4">
        {currentImageNode &&
        (currentImageNode.src || currentImageNode.base64Data) ? (
          <div
            className="relative overflow-hidden rounded-md border border-gray-300 bg-gray-100"
            style={{ width: '100%', height: '160px' }}
          >
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url(${currentImageNode.base64Data || currentImageNode.src})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            ></div>
            <button
              onClick={handleRemoveImage}
              disabled={isProcessing}
              className="hover:bg-mylightgrey absolute right-2 top-2 rounded-full bg-white p-1 shadow-md disabled:opacity-50"
            >
              <XMarkIcon className="text-mydarkgrey h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={`text-myblue flex items-center text-sm hover:text-cyan-600`}
            >
              <ArrowUpTrayIcon className="mr-1 h-4 w-4" />
              {isProcessing
                ? 'Processing...'
                : currentImageNode?.src || currentImageNode?.base64Data
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
            <h3 className="text-mydarkgrey mb-4 text-lg font-medium">
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
    </div>
  );
};

export default ImageUpload;
