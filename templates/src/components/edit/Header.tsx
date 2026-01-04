import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { navigate } from 'astro:transitions/client';
import ArrowUturnLeftIcon from '@heroicons/react/24/outline/ArrowUturnLeftIcon';
import ArrowUturnRightIcon from '@heroicons/react/24/outline/ArrowUturnRightIcon';
import ViewfinderCircleIcon from '@heroicons/react/24/outline/ViewfinderCircleIcon';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';
import DeviceTabletIcon from '@heroicons/react/24/outline/DeviceTabletIcon';
import ComputerDesktopIcon from '@heroicons/react/24/outline/ComputerDesktopIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import {
  viewportModeStore,
  setViewportMode,
  viewportKeyStore,
  settingsPanelStore,
  pendingHomePageSlugStore,
  saasModalOpenStore,
} from '@/stores/storykeep';
import { getCtx, ROOT_NODE_NAME } from '@/stores/nodes';
import SaveModal from '@/components/edit/state/SaveModal';

interface StoryKeepHeaderProps {
  slug: string;
  isContext: boolean;
  isSandboxMode?: boolean;
}

const StoryKeepHeader = ({
  slug,
  isContext = false,
  isSandboxMode = false,
}: StoryKeepHeaderProps) => {
  const viewport = useStore(viewportModeStore);
  const pendingHomePageSlug = useStore(pendingHomePageSlugStore);
  const ctx = getCtx();
  const showSaveBypass = useStore(ctx.showSaveBypass);
  const hasTitle = useStore(ctx.hasTitle);
  const hasPanes = useStore(ctx.hasPanes);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const updateUndoRedo = () => {
      setCanUndo(ctx.history.canUndo());
      setCanRedo(ctx.history.canRedo());
    };
    ctx.history.headIndex.listen(updateUndoRedo);
    ctx.history.history.listen(updateUndoRedo);
  }, [ctx.history]);

  useEffect(() => {
    if (viewport !== 'auto') return;

    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1368) {
        viewportKeyStore.setKey('value', 'desktop');
      } else if (width >= 801) {
        viewportKeyStore.setKey('value', 'tablet');
      } else {
        viewportKeyStore.setKey('value', 'mobile');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewport]);

  const handleSave = () => {
    if (isSandboxMode) {
      saasModalOpenStore.set(true);
    } else {
      setShowSaveModal(true);
    }
  };

  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
  };

  const handleUndo = () => {
    settingsPanelStore.set(null);
    ctx.history.undo();
    ctx.notifyNode(ROOT_NODE_NAME);
  };

  const handleRedo = () => {
    settingsPanelStore.set(null);
    ctx.history.redo();
    ctx.notifyNode(ROOT_NODE_NAME);
  };

  const handleVisitPage = () => {
    const hasChanges = canUndo || pendingHomePageSlug;
    if (hasChanges) {
      if (
        confirm(
          'You have unsaved changes. Do you want to visit the page anyway?'
        )
      ) {
        const previewUrl = !isContext ? `/${slug}` : `/context/${slug}`;
        navigate(previewUrl);
      }
    } else {
      const previewUrl = !isContext ? `/${slug}` : `/context/${slug}`;
      navigate(previewUrl);
    }
  };

  const activeIconClassName =
    '-rotate-2 w-8 h-8 text-white rounded bg-myblue p-1';
  const iconClassName =
    'w-8 h-8 text-myblue hover:text-myblue hover:bg-gray-200 rounded-xl hover:rounded bg-white p-1 cursor-pointer transition-all';

  // Viewport options and their corresponding icons
  const viewportOptions = [
    { value: 'auto', Icon: ViewfinderCircleIcon, title: 'Auto Viewport' },
    { value: 'mobile', Icon: DevicePhoneMobileIcon, title: 'Mobile Viewport' },
    { value: 'tablet', Icon: DeviceTabletIcon, title: 'Tablet Viewport' },
    { value: 'desktop', Icon: ComputerDesktopIcon, title: 'Desktop Viewport' },
  ];

  // Show save button if there are undo changes OR pending home page change
  const shouldShowSave = canUndo || pendingHomePageSlug || showSaveBypass;

  if (!hasTitle && !hasPanes) return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-2">
        {/* Viewport Section with stacked label */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-gray-600">Viewport:</span>
          <span className="text-xs text-gray-700">{viewport}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1">
          {viewportOptions.map(({ value, Icon, title }) => (
            <button
              key={value}
              onClick={() =>
                setViewportMode(
                  value as 'auto' | 'mobile' | 'tablet' | 'desktop'
                )
              }
              title={title}
              className={
                viewport === value ? activeIconClassName : iconClassName
              }
            >
              <Icon />
            </button>
          ))}
        </div>

        {/* Visit Page Icon */}
        <div className="relative">
          <button
            onClick={handleVisitPage}
            title="Visit Page"
            className={`${iconClassName} relative`}
          >
            <GlobeAltIcon />
            {shouldShowSave && (
              <ExclamationTriangleIcon className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white text-amber-500" />
            )}
          </button>
        </div>

        {(canUndo || canRedo) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ArrowUturnLeftIcon
              title="Undo"
              style={{
                visibility: canUndo ? 'visible' : 'hidden',
                display: canUndo ? 'block' : 'none',
              }}
              className={iconClassName}
              onClick={handleUndo}
            />
            <ArrowUturnRightIcon
              title="Redo"
              style={{
                visibility: canRedo ? 'visible' : 'hidden',
                display: canRedo ? 'block' : 'none',
              }}
              className={iconClassName}
              onClick={handleRedo}
            />
          </div>
        )}

        {import.meta.env.DEV && (
          <button
            onClick={() => {
              const allNodesMap = ctx.allNodes.get();
              const allNodesArray = Array.from(allNodesMap.values());

              console.group('Dev Mode: Full Nodes Context Inspection');
              console.log('Total Nodes in Store:', allNodesArray.length);
              console.log('Full Nodes Map:', allNodesMap);

              // Specifically audit Creative Panes for large htmlAst payloads
              // Using type guards/property checks to handle the BaseNode vs PaneNode distinction
              const creativePanes = allNodesArray.filter(
                (n) => n.nodeType === 'Pane' && 'htmlAst' in n
              );

              if (creativePanes.length > 0) {
                console.group('Creative Panes Detail (htmlAst Audit)');
                creativePanes.forEach((pane) => {
                  // Guarding slug access since it is not on BaseNode
                  const nodeSlug =
                    'slug' in pane ? (pane as any).slug : 'NO_SLUG';

                  console.log(`Pane ID: ${pane.id} | Slug: ${nodeSlug}`, {
                    editableElements: (pane as any).htmlAst?.editableElements,
                    tree: (pane as any).htmlAst?.tree,
                    css: (pane as any).htmlAst?.css,
                  });
                });
                console.groupEnd();
              }

              console.groupEnd();
            }}
            className="rounded-md bg-myblue px-3.5 py-1.5 font-action font-bold text-white hover:bg-myorange"
          >
            Inspect
          </button>
        )}

        {shouldShowSave && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <button
              onClick={handleSave}
              className="rounded-md bg-myblue px-3.5 py-1.5 font-action font-bold text-white hover:bg-myorange"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <SaveModal
        slug={slug}
        isContext={isContext}
        show={showSaveModal}
        onClose={handleCloseSaveModal}
        isSandboxMode={isSandboxMode}
      />
    </>
  );
};

export default StoryKeepHeader;
