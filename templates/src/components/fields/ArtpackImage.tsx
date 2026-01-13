import { useState, useEffect, useMemo } from 'react';
import { ulid } from 'ulid';
import { Combobox } from '@ark-ui/react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import SwatchIcon from '@heroicons/react/24/outline/SwatchIcon';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import { getCtx } from '@/stores/nodes';
import { hasArtpacksStore, settingsPanelStore } from '@/stores/storykeep';
import { cloneDeep } from '@/utils/helpers';
import type { ArtpackImageNode, PaneNode } from '@/types/compositorTypes';

export interface ArtpackImageProps {
  paneId: string;
  onUpdate: () => void;
}

const ArtpackImage = ({ paneId, onUpdate }: ArtpackImageProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(paneId) as PaneNode;
  const $artpacks = hasArtpacksStore.get();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('t8k');
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [query, setQuery] = useState('');
  const [artpackNode, setArtpackNode] = useState<ArtpackImageNode | null>(null);
  const [objectFit, setObjectFit] = useState<'cover' | 'contain' | 'fill'>(
    'cover'
  );
  const [hiddenViewports, setHiddenViewports] = useState({
    mobile: false,
    tablet: false,
    desktop: false,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (paneNode) {
      const childNodes = ctx.getChildNodeIDs(paneNode.id);
      const artNode = childNodes
        .map((id) => allNodes.get(id))
        .find(
          (node) =>
            node?.nodeType === 'BgPane' &&
            'type' in node &&
            node.type === 'artpack-image'
        ) as ArtpackImageNode | undefined;

      if (artNode) {
        setArtpackNode(artNode);
        setObjectFit(artNode.objectFit || 'cover');
        setHiddenViewports({
          mobile: !!artNode.hiddenViewportMobile,
          tablet: !!artNode.hiddenViewportTablet,
          desktop: !!artNode.hiddenViewportDesktop,
        });
        if ('collection' in artNode && 'image' in artNode) {
          setSelectedCollection(artNode.collection || '');
          setSelectedImage(artNode.image || '');
          if (artNode.collection && artNode.image) {
            setPreviewUrl(
              `/artpacks/${artNode.collection}/${artNode.image}_1080px.webp`
            );
          }
        }
      } else {
        setArtpackNode(null);
        setObjectFit('cover');
        setHiddenViewports({ mobile: false, tablet: false, desktop: false });
        setPreviewUrl(null);
      }
    }
  }, [paneNode, allNodes]);

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

  const collection = useMemo(() => {
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

  const buildImageSrcSet = (collection: string, image: string): string => {
    return [
      `/artpacks/${collection}/${image}_1920px.webp 1920w`,
      `/artpacks/${collection}/${image}_1080px.webp 1080w`,
      `/artpacks/${collection}/${image}_600px.webp 600w`,
    ].join(', ');
  };

  const deleteExistingBgNodes = () => {
    const childNodes = ctx.getChildNodeIDs(paneNode.id);
    const bgNodes = childNodes
      .map((id) => allNodes.get(id))
      .filter((node) => node?.nodeType === 'BgPane');

    bgNodes.forEach((node) => {
      if (node) ctx.deleteNode(node.id);
    });
  };

  const handleSelectArtpackImage = (collection: string, image: string) => {
    const src = `/artpacks/${collection}/${image}_1920px.webp`;
    const srcSet = buildImageSrcSet(collection, image);

    setSelectedCollection(collection);
    setSelectedImage(image);
    setPreviewUrl(`/artpacks/${collection}/${image}_1080px.webp`);

    deleteExistingBgNodes();

    const artNodeId = ulid();
    const updatedArtNode: ArtpackImageNode = {
      id: artNodeId,
      nodeType: 'BgPane',
      parentId: paneId,
      type: 'artpack-image',
      collection,
      image,
      src,
      srcSet,
      alt: `Artpack image from ${collection} collection`,
      objectFit,
      position: artpackNode?.position || 'background',
      size: artpackNode?.size || 'equal',
    };
    ctx.addNode(updatedArtNode);
    const updatedPaneNode = cloneDeep(paneNode);
    ctx.modifyNodes([updatedPaneNode]);
    setArtpackNode(updatedArtNode);
    setIsModalOpen(false);
    const currentSignal = settingsPanelStore.get();
    if (currentSignal) {
      settingsPanelStore.set({
        ...currentSignal,
        editLock: Date.now(),
      });
    }
    onUpdate();
    ctx.notifyNode('root');
  };

  const handleRemoveImage = () => {
    if (!artpackNode) return;
    ctx.deleteNode(artpackNode.id);
    const updatedPaneNode = cloneDeep(paneNode);
    ctx.modifyNodes([updatedPaneNode]);
    setArtpackNode(null);
    setSelectedCollection('');
    setSelectedImage('');
    setPreviewUrl(null);
    onUpdate();
  };

  const handleObjectFitChange = (
    newObjectFit: 'cover' | 'contain' | 'fill'
  ) => {
    setObjectFit(newObjectFit);
    if (artpackNode) {
      const updatedArtNode = cloneDeep(artpackNode);
      updatedArtNode.objectFit = newObjectFit;
      const updatedPaneNode = cloneDeep(paneNode);
      ctx.modifyNodes([updatedArtNode, updatedPaneNode]);
    }
  };

  const handleViewportVisibilityChange = (
    viewport: 'mobile' | 'tablet' | 'desktop',
    hidden: boolean
  ) => {
    setHiddenViewports((prev) => ({ ...prev, [viewport]: hidden }));
    if (artpackNode) {
      const updatedArtNode = cloneDeep(artpackNode);
      if (viewport === 'mobile') updatedArtNode.hiddenViewportMobile = hidden;
      if (viewport === 'tablet') updatedArtNode.hiddenViewportTablet = hidden;
      if (viewport === 'desktop') updatedArtNode.hiddenViewportDesktop = hidden;
      const updatedPaneNode = cloneDeep(paneNode);
      ctx.modifyNodes([updatedArtNode, updatedPaneNode]);
    }
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

  const dialogStyles = `
    .dialog-backdrop {
      background-color: rgba(0, 0, 0, 0.3);
    }
    .dialog-content {
      max-width: 48rem;
      background-color: white;
      border-radius: 0.375rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 1.5rem;
    }
  `;

  return (
    <div className="w-full space-y-6">
      <style>{comboboxItemStyles}</style>
      <style>{dialogStyles}</style>
      <div className="flex w-full flex-col space-y-4">
        {previewUrl && (
          <div
            className="relative overflow-hidden rounded-md border border-gray-300 bg-gray-100"
            style={{ width: '100%', height: '160px' }}
          >
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundSize: objectFit,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            ></div>
            <button
              onClick={handleRemoveImage}
              className="absolute right-2 top-2 rounded-full bg-white p-1 shadow-md hover:bg-mylightgrey"
            >
              <XMarkIcon className="h-4 w-4 text-mydarkgrey" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center text-sm text-myblue hover:text-cyan-600"
          >
            <SwatchIcon className="mr-1 h-4 w-4" />
            {previewUrl ? 'Change Artpack Image' : 'Use Artpack Image'}
          </button>
        </div>
      </div>

      {artpackNode && (
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
        </>
      )}

      <Dialog.Root
        open={isModalOpen}
        onOpenChange={(details) => setIsModalOpen(details.open)}
        modal={true}
      >
        <Portal>
          <Dialog.Backdrop className="dialog-backdrop fixed inset-0" />
          <Dialog.Positioner
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 10010 }}
          >
            <Dialog.Content
              className="dialog-content overflow-y-auto"
              style={{ maxHeight: '80vh' }}
            >
              <Dialog.Title className="mb-4 text-lg font-bold">
                Select Artpack Image
              </Dialog.Title>
              {Object.keys($artpacks || {}).length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-mydarkgrey">
                    No artpack collections available.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-mydarkgrey">
                      Select Collection
                    </label>
                    <Combobox.Root
                      collection={collection}
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
                        <div className="relative w-full cursor-default overflow-hidden rounded-lg border border-gray-300 bg-white text-left shadow-sm focus-within:border-myblue focus-within:ring-1 focus-within:ring-myblue">
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
                        </div>
                        <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none md:text-sm">
                          {collection.items.length === 0 ? (
                            <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                              No collections found.
                            </div>
                          ) : (
                            collection.items.map((item) => (
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
                            ))
                          )}
                        </Combobox.Content>
                      </div>
                    </Combobox.Root>
                  </div>

                  {!isLoading &&
                  selectedCollection &&
                  availableImages.length > 0 ? (
                    <div>
                      <label className="mb-2 block text-sm font-bold text-mydarkgrey">
                        Select Image from {selectedCollection}
                      </label>
                      <div className="grid grid-cols-2 gap-4 p-2 md:grid-cols-3">
                        {availableImages.map((image) => (
                          <div
                            key={image}
                            className={`relative cursor-pointer overflow-hidden rounded border transition-colors hover:border-cyan-600 ${
                              selectedImage === image
                                ? 'ring-2 ring-cyan-600'
                                : 'border-gray-200'
                            }`}
                            onClick={() =>
                              handleSelectArtpackImage(
                                selectedCollection,
                                image
                              )
                            }
                          >
                            <img
                              src={`/artpacks/${selectedCollection}/${image}_600px.webp`}
                              alt={`${image} from ${selectedCollection}`}
                              className="aspect-video w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-opacity hover:bg-opacity-20">
                              <span className="max-w-full truncate rounded bg-white bg-opacity-80 px-2 py-1 text-xs text-mydarkgrey">
                                {image}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : isLoading ? (
                    <div className="py-4 text-center">
                      <p className="text-mydarkgrey">Loading images...</p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex justify-end space-x-3">
                    <Dialog.CloseTrigger className="rounded bg-mylightgrey px-4 py-2 text-mydarkgrey hover:bg-gray-300">
                      Cancel
                    </Dialog.CloseTrigger>
                  </div>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
};

export default ArtpackImage;
