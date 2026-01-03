import { useState, useEffect, useMemo } from 'react';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import SwatchIcon from '@heroicons/react/24/outline/SwatchIcon';
import ArrowUpTrayIcon from '@heroicons/react/24/outline/ArrowUpTrayIcon';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { getCtx } from '@/stores/nodes';
import { hasArtpacksStore } from '@/stores/storykeep';
import ImageUpload, { type ImageParams } from '@/components/fields/ImageUpload';
import type { BasePanelProps, PaneNode } from '@/types/compositorTypes';

interface CreativeImagePanelProps extends BasePanelProps {
  mode: 'img' | 'bg';
}

const CreativeImagePanel = ({
  node,
  childId,
  mode,
}: CreativeImagePanelProps) => {
  if (!node) return null;
  const ctx = getCtx();
  const paneNode = node as unknown as PaneNode;
  const assetMeta = paneNode?.htmlAst?.editableElements?.[childId || ''];
  const $artpacks = hasArtpacksStore.get();

  const [activeTab, setActiveTab] = useState<'upload' | 'artpack'>('upload');
  const [altDescription, setAltDescription] = useState('');
  const [isExternal, setIsExternal] = useState(false);

  const [isArtpackModalOpen, setIsArtpackModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('t8k');
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (assetMeta) {
      setAltDescription(assetMeta.alt || '');
      const src = assetMeta.src || '';
      setIsExternal(
        src.startsWith('http') && !src.includes(window.location.origin)
      );

      if (src.includes('/artpacks/')) {
        setActiveTab('artpack');
      }
    }
  }, [assetMeta]);

  useEffect(() => {
    if (selectedCollection && $artpacks && $artpacks[selectedCollection]) {
      setIsLoading(true);
      const images = $artpacks[selectedCollection];
      setAvailableImages(images);
      setTimeout(() => setIsLoading(false), 0);
    } else {
      setAvailableImages([]);
      setIsLoading(false);
    }
  }, [selectedCollection, $artpacks]);

  const collectionList = useMemo(() => {
    const filteredCollections =
      query === ''
        ? Object.keys($artpacks || {})
        : Object.keys($artpacks || {}).filter((collection) =>
            collection.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredCollections,
      itemToValue: (item) => item,
      itemToString: (item) => item,
    });
  }, [$artpacks, query]);

  if (!paneNode || !assetMeta) return null;

  const handleUpdate = (params: Partial<ImageParams>) => {
    const newSrc = params.src || '';
    const isNowExternal =
      newSrc.startsWith('http') && !newSrc.includes(window.location.origin);
    setIsExternal(isNowExternal);

    const el = document.querySelector(
      `[data-ast-id="${childId}"]`
    ) as HTMLElement;
    if (el) {
      if (mode === 'img') {
        const img = el as HTMLImageElement;
        img.src = newSrc;
        if (params.srcSet) img.srcset = params.srcSet;
      } else if (mode === 'bg') {
        el.style.backgroundImage = `url('${newSrc}')`;
      }
    }

    (ctx as any).updateCreativeAsset(paneNode.id, childId, {
      src: params.src,
      srcSet: params.srcSet,
      fileId: params.fileId,
      base64Data: params.base64Data,
      alt: params.altDescription || altDescription,
      isCssBackground: mode === 'bg',
      tagName: mode === 'img' ? 'img' : assetMeta.tagName,
    });
  };

  const handleRemove = () => {
    setIsExternal(false);

    const el = document.querySelector(
      `[data-ast-id="${childId}"]`
    ) as HTMLElement;
    if (el) {
      if (mode === 'img') {
        (el as HTMLImageElement).src = '';
        (el as HTMLImageElement).srcset = '';
      } else if (mode === 'bg') {
        el.style.backgroundImage = 'none';
      }
    }

    (ctx as any).updateCreativeAsset(paneNode.id, childId, {
      src: '',
      fileId: undefined,
      base64Data: undefined,
      srcSet: undefined,
    });
  };

  const handleAltBlur = (val: string) => {
    if (val !== assetMeta.alt) {
      const el = document.querySelector(
        `[data-ast-id="${childId}"]`
      ) as HTMLImageElement;
      if (el && mode === 'img') {
        el.alt = val;
      }

      (ctx as any).updateCreativeAsset(paneNode.id, childId, {
        alt: val,
      });
    }
  };

  const buildImageSrcSet = (collection: string, image: string): string => {
    return [
      `/artpacks/${collection}/${image}_1920px.webp 1920w`,
      `/artpacks/${collection}/${image}_1080px.webp 1080w`,
      `/artpacks/${collection}/${image}_600px.webp 600w`,
    ].join(', ');
  };

  const handleSelectArtpackImage = (collection: string, image: string) => {
    const src = `/artpacks/${collection}/${image}_1920px.webp`;
    const srcSet = buildImageSrcSet(collection, image);
    const alt = `Artpack image from ${collection} collection`;

    handleUpdate({
      src,
      srcSet,
      fileId: undefined,
      altDescription: alt,
    });
    setAltDescription(alt);
    setIsArtpackModalOpen(false);
  };

  const handleCollectionSelect = (details: { value: string[] }) => {
    const newCollection = details.value[0] || '';
    if (newCollection) {
      setIsLoading(true);
      setSelectedCollection(newCollection);
    }
  };

  const comboboxItemStyles = `
    .collection-item[data-highlighted] {
      background-color: #0891b2;
      color: white;
    }
    .collection-item[data-highlighted] .collection-indicator {
      color: white;
    }
    .collection-item[data-state="checked"] .collection-indicator {
      display: flex;
    }
    .collection-item .collection-indicator {
      display: none;
    }
    .collection-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-6">
      <style>{comboboxItemStyles}</style>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-mydarkgrey">
          {mode === 'bg' ? 'Background Image' : 'Image Asset'}
        </h3>
        <p className="text-xs text-gray-500">
          {mode === 'bg'
            ? 'Updates the CSS background rule for this element.'
            : 'Updates the source attribute of this image tag.'}
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
            activeTab === 'upload'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
          Upload / File
        </button>
        <button
          onClick={() => setActiveTab('artpack')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
            activeTab === 'artpack'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <SwatchIcon className="h-4 w-4" />
          Artpack
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'upload' ? (
          <ImageUpload
            currentFileId={assetMeta.fileId}
            nodeId={paneNode.id}
            onUpdate={(params) => handleUpdate(params)}
            onRemove={handleRemove}
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-gray-200 p-4 text-center">
              <p className="mb-3 text-sm text-gray-600">
                Choose a high-quality, optimized image from the library.
              </p>
              <button
                onClick={() => setIsArtpackModalOpen(true)}
                className="inline-flex items-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
              >
                <SwatchIcon className="mr-2 h-4 w-4" />
                Browse Artpacks
              </button>
            </div>
            {assetMeta.src && assetMeta.src.includes('/artpacks/') && (
              <div className="text-xs text-gray-500">
                Current: {assetMeta.src.split('/').pop()}
              </div>
            )}
          </div>
        )}

        {isExternal && (
          <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-xs text-yellow-800">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
            <p>
              You are using an external image URL. This asset will not be
              optimized for performance or responsive sizing.
            </p>
          </div>
        )}

        {mode === 'img' && (
          <div>
            <label className="mb-1 block text-sm font-bold text-mydarkgrey">
              Alt Description
            </label>
            <input
              type="text"
              value={altDescription}
              onChange={(e) => setAltDescription(e.target.value)}
              onBlur={(e) => handleAltBlur(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full rounded-md border-gray-300 py-2 pl-3 text-sm shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
              placeholder="Describe the image..."
            />
          </div>
        )}
      </div>

      <Dialog.Root
        open={isArtpackModalOpen}
        onOpenChange={(details) => setIsArtpackModalOpen(details.open)}
        modal={true}
      >
        <Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          <Dialog.Positioner
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 10010 }}
          >
            <Dialog.Content
              className="w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
              style={{ maxHeight: '80vh' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="text-lg font-bold">
                  Select Artpack Image
                </Dialog.Title>
                <Dialog.CloseTrigger className="rounded-full p-1 hover:bg-gray-100">
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </Dialog.CloseTrigger>
              </div>

              {Object.keys($artpacks || {}).length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No artpack collections available.
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-mydarkgrey">
                      Select Collection
                    </label>
                    <Combobox.Root
                      collection={collectionList}
                      value={selectedCollection ? [selectedCollection] : []}
                      onValueChange={handleCollectionSelect}
                      onInputValueChange={(details) =>
                        setQuery(details.inputValue)
                      }
                      loopFocus={true}
                      openOnKeyPress={true}
                      composite={true}
                    >
                      <div className="relative">
                        <Combobox.Control className="relative w-full cursor-default overflow-hidden rounded-lg border border-gray-300 bg-white text-left shadow-sm focus-within:border-myblue focus-within:ring-1 focus-within:ring-myblue">
                          <Combobox.Input
                            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-mydarkgrey focus:ring-0"
                            placeholder="Select a collection..."
                            autoComplete="off"
                          />
                          <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon
                              className="h-5 w-5 text-mydarkgrey"
                              aria-hidden="true"
                            />
                          </Combobox.Trigger>
                        </Combobox.Control>
                        <Combobox.Content className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none md:text-sm">
                          {collectionList.items.map((item) => (
                            <Combobox.Item
                              key={item}
                              item={item}
                              className="collection-item relative cursor-default select-none py-2 pl-10 pr-4 text-mydarkgrey"
                            >
                              <span className="block truncate">{item}</span>
                              <span className="collection-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                                <CheckIcon
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              </span>
                            </Combobox.Item>
                          ))}
                        </Combobox.Content>
                      </div>
                    </Combobox.Root>
                  </div>

                  {!isLoading &&
                  selectedCollection &&
                  availableImages.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-2 gap-4 p-2 md:grid-cols-3 xl:grid-cols-4">
                        {availableImages.map((image) => (
                          <div
                            key={image}
                            className="group relative cursor-pointer overflow-hidden rounded border border-gray-200 transition-all hover:border-cyan-600 hover:shadow-md"
                            onClick={() =>
                              handleSelectArtpackImage(
                                selectedCollection,
                                image
                              )
                            }
                          >
                            <img
                              src={`/artpacks/${selectedCollection}/${image}_600px.webp`}
                              alt={image}
                              className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="w-full truncate p-2 text-center text-xs text-white">
                                {image}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : isLoading ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
                      <p className="mt-2 text-sm text-gray-500">
                        Loading collection...
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
};

export default CreativeImagePanel;
