import {
  useState,
  useEffect,
  type SetStateAction,
  type Dispatch,
  type MouseEvent,
} from 'react';
import { useStore } from '@nanostores/react';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import ArchiveBoxArrowDownIcon from '@heroicons/react/24/outline/ArchiveBoxArrowDownIcon';
import ArrowPathRoundedSquareIcon from '@heroicons/react/24/outline/ArrowPathRoundedSquareIcon';
import ArrowDownTrayIcon from '@heroicons/react/24/outline/ArrowDownTrayIcon';
import SparklesIcon from '@heroicons/react/24/solid/SparklesIcon';
import {
  isContextPaneNode,
  hasBeliefPayload,
} from '@/utils/compositor/typeGuards';
import { settingsPanelStore, fullContentMapStore } from '@/stores/storykeep';
import { selectionStore } from '@/stores/selection';
import { getCtx } from '@/stores/nodes';
import { copyPaneToClipboard } from '@/utils/compositor/designLibraryHelper';
import { SaveToLibraryModal } from '@/components/edit/state/SaveToLibraryModal';
import { RestylePaneModal } from '@/components/edit/pane/RestylePaneModal';
import { AiRestylePaneModal } from '@/components/edit/pane/AiRestylePaneModal';
import PaneTitlePanel from './PanePanel_title';
import PaneMagicPathPanel from './PanePanel_path';
import PaneImpressionPanel from './PanePanel_impression';
import { PaneConfigMode, type PaneNode } from '@/types/compositorTypes';

interface ConfigPanePanelProps {
  nodeId: string;
  isHtmlAstPane: boolean;
  isSandboxMode?: boolean;
}

const ConfigPanePanel = ({
  nodeId,
  isHtmlAstPane,
  isSandboxMode,
}: ConfigPanePanelProps) => {
  const ctx = getCtx();
  const isTemplate = useStore(ctx.isTemplate);
  const bgColorStyles = ctx.getNodeCSSPropertiesStyles(nodeId);
  const activePaneMode = useStore(ctx.activePaneMode);
  const isActiveMode =
    activePaneMode.panel === 'settings' && activePaneMode.paneId === nodeId;
  const $contentMap = useStore(fullContentMapStore);
  const { isRestyleModalOpen, isAiRestyleModalOpen } = useStore(selectionStore);

  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;

  const codeHookPayload = ctx.getNodeCodeHookPayload(nodeId);
  const isCodeHook = !!codeHookPayload;

  const impressionNodes = ctx.getImpressionNodesForPanes([nodeId]);
  const isContextPane = isContextPaneNode(paneNode);
  const buttonClass =
    'px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors whitespace-nowrap mb-1';

  const [mode, setMode] = useState<PaneConfigMode>(
    isActiveMode && activePaneMode.mode
      ? (activePaneMode.mode as PaneConfigMode)
      : PaneConfigMode.DEFAULT
  );

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [wasCopied, setWasCopied] = useState(false);

  useEffect(() => {
    if (isActiveMode && activePaneMode.mode) {
      setMode(activePaneMode.mode as PaneConfigMode);
    } else {
      setMode(PaneConfigMode.DEFAULT);
    }
  }, [isActiveMode, activePaneMode.mode]);

  const setSaveMode: Dispatch<SetStateAction<PaneConfigMode>> = (newMode) => {
    const resolvedMode =
      typeof newMode === 'function' ? newMode(mode) : newMode;
    setMode(resolvedMode);
    ctx.setPanelMode(nodeId, 'settings', resolvedMode);
  };

  const handleCodeHookConfig = () => {
    ctx.toolModeValStore.set({ value: 'text' });
    settingsPanelStore.set({
      action: 'setup-codehook',
      nodeId: nodeId,
      expanded: true,
    });
  };

  const handleEditStyles = () => {
    ctx.closeAllPanels();
    ctx.toolModeValStore.set({ value: 'text' });
    if (paneNode.isDecorative) {
      const childNodeIds = ctx.getChildNodeIDs(nodeId);
      const bgPaneId = childNodeIds.find((id) => {
        const node = ctx.allNodes.get().get(id);
        return node && node.nodeType === 'BgPane';
      });

      if (bgPaneId) {
        settingsPanelStore.set({
          action: 'style-break',
          nodeId: bgPaneId,
          expanded: true,
        });
      }
    } else {
      settingsPanelStore.set({
        action: 'style-parent',
        nodeId: nodeId,
        expanded: true,
      });
    }
  };

  // Design Library Handlers
  const handleRestyleClick = (e: MouseEvent) => {
    e.stopPropagation();
    selectionStore.setKey('paneToRestyleId', nodeId);
    selectionStore.setKey('isRestyleModalOpen', true);
  };

  const handleAiRestyleClick = (e: MouseEvent) => {
    e.stopPropagation();
    selectionStore.setKey('paneToRestyleId', nodeId);
    selectionStore.setKey('isAiRestyleModalOpen', true);
  };

  const handleSaveClick = (e: MouseEvent) => {
    e.stopPropagation();
    setIsSaveModalOpen(true);
  };

  const handleCopyToClipboard = async (e: MouseEvent) => {
    e.stopPropagation();
    const success = await copyPaneToClipboard(nodeId);
    if (success) {
      setWasCopied(true);
      setTimeout(() => setWasCopied(false), 2000);
    }
  };

  if (mode === PaneConfigMode.TITLE) {
    return <PaneTitlePanel nodeId={nodeId} setMode={setSaveMode} />;
  } else if (mode === PaneConfigMode.PATH) {
    return <PaneMagicPathPanel nodeId={nodeId} setMode={setSaveMode} />;
  } else if (mode === PaneConfigMode.IMPRESSION) {
    return <PaneImpressionPanel nodeId={nodeId} setMode={setSaveMode} />;
  }

  return (
    <div
      className="border-t border-dotted border-mylightgrey bg-myoffwhite"
      style={bgColorStyles}
    >
      <div className="group w-full rounded-t-md px-1.5 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex flex-wrap gap-2 transition-opacity`}>
            {paneNode.isDecorative ? (
              <>
                <button className={buttonClass}>
                  <CheckIcon className="inline h-4 w-4" />
                  {` `}
                  <strong>Decorative Pane</strong>
                </button>
                <button onClick={handleEditStyles} className={buttonClass}>
                  <PaintBrushIcon className="inline h-4 w-4" />
                  {` `}
                  <span>Edit Visual Break</span>
                </button>
              </>
            ) : (
              <>
                {!isTemplate && (
                  <>
                    {$contentMap.some(
                      (item) => item.type === 'Pane' && item.id === nodeId
                    ) && (
                      <button
                        onClick={() => setSaveMode(PaneConfigMode.TITLE)}
                        className={buttonClass}
                      >
                        ID
                      </button>
                    )}
                    {!isHtmlAstPane && (
                      <button
                        onClick={() => setSaveMode(PaneConfigMode.IMPRESSION)}
                        className={buttonClass}
                      >
                        {impressionNodes.length ? (
                          <>
                            <CheckIcon className="inline h-4 w-4" />
                            {` `}
                            <span className="font-bold">Has Impression</span>
                          </>
                        ) : (
                          <>
                            <XMarkIcon className="inline h-4 w-4" />
                            {` `}
                            <span>No Impression</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
                {isCodeHook && (
                  <button
                    onClick={handleCodeHookConfig}
                    className={buttonClass}
                  >
                    Configure Code Hook
                  </button>
                )}
                {!isCodeHook && !isHtmlAstPane && (
                  <button onClick={handleEditStyles} className={buttonClass}>
                    <PaintBrushIcon className="inline h-4 w-4" />
                    {` `}
                    <span>Style this Pane</span>
                  </button>
                )}
              </>
            )}
            {!isContextPane && !isTemplate && !isHtmlAstPane && (
              <button
                onClick={() => setSaveMode(PaneConfigMode.PATH)}
                className={buttonClass}
              >
                {hasBeliefPayload(paneNode) ? (
                  <>
                    <CheckIcon className="inline h-4 w-4" />
                    {` `}
                    <span className="font-bold">Has Magic Path</span>
                  </>
                ) : (
                  <>
                    <XMarkIcon className="inline h-4 w-4" />
                    {` `}
                    <span>No Magic Path</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Design Library Tools (Right Aligned) */}
          <div className="ml-auto flex items-center gap-2 border-l border-gray-300 px-2">
            {!isHtmlAstPane && !isSandboxMode && (
              <button
                title="Save Pane to Design Library"
                onClick={handleSaveClick}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 p-1 shadow-sm hover:bg-cyan-700"
              >
                <ArchiveBoxArrowDownIcon className="h-4 w-4 text-white" />
              </button>
            )}

            <button
              title={isHtmlAstPane ? 'Re-Style' : 'Re-Color'}
              onClick={handleAiRestyleClick}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 p-1 shadow-sm hover:bg-purple-700"
            >
              <SparklesIcon className="h-3.5 w-3.5 text-white" />
            </button>

            {!isHtmlAstPane && (
              <button
                title="Restyle Pane from Design Library"
                onClick={handleRestyleClick}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 p-1 shadow-sm hover:bg-blue-700"
              >
                <ArrowPathRoundedSquareIcon className="h-4 w-4 text-white" />
              </button>
            )}
            {import.meta.env.DEV && !isHtmlAstPane && (
              <button
                title="Copy Pane Design to Clipboard"
                onClick={handleCopyToClipboard}
                className={`flex h-7 w-7 items-center justify-center rounded-full p-1 shadow-sm transition-colors ${
                  wasCopied ? 'bg-green-500' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {wasCopied ? (
                  <CheckIcon className="h-4 w-4 text-white" />
                ) : (
                  <ArrowDownTrayIcon className="h-4 w-4 text-white" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isSaveModalOpen && (
        <SaveToLibraryModal
          paneId={nodeId}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}
      {isRestyleModalOpen && <RestylePaneModal />}
      {isAiRestyleModalOpen && (
        <AiRestylePaneModal isSandboxMode={isSandboxMode} />
      )}
    </div>
  );
};

export default ConfigPanePanel;
