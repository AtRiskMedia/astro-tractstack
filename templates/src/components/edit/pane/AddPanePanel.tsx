import { useState } from 'react';
import { useStore } from '@nanostores/react';
import PlusCircleIcon from '@heroicons/react/24/outline/PlusCircleIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import AddPaneNewPanel from './AddPanePanel_new';
import AddPaneBreakPanel from './AddPanePanel_break';
import AddPaneReUsePanel from './AddPanePanel_reuse';
import AddPaneCodeHookPanel from './AddPanePanel_codehook';
import AddPanePanel_paste from './AddPanePanel_paste';
import { NodesContext, ROOT_NODE_NAME, getCtx } from '@/stores/nodes';
import { PaneAddMode } from '@/types/compositorTypes';

interface AddPanePanelProps {
  nodeId: string;
  first?: boolean;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
  isSandboxMode?: boolean;
}

const AddPanePanel = ({
  nodeId,
  first = false,
  ctx,
  isStoryFragment = false,
  isContextPane = false,
  isSandboxMode = false,
}: AddPanePanelProps) => {
  const [reset, setReset] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const lookup = first ? `${nodeId}-0` : nodeId;
  const nodesCtx = ctx || getCtx();

  const activePaneMode = useStore(nodesCtx.activePaneMode);
  const hasPanes = useStore(nodesCtx.hasPanes);
  const isTemplate = useStore(nodesCtx.isTemplate);

  const isActive =
    activePaneMode?.panel === 'add' && activePaneMode?.paneId === lookup;

  const mode =
    isActive && activePaneMode?.mode
      ? (activePaneMode?.mode as PaneAddMode)
      : !hasPanes && first && !reset
        ? PaneAddMode.NEW
        : PaneAddMode.DEFAULT;

  const setMode = (newMode: PaneAddMode, reset?: boolean) => {
    setReset(true);
    nodesCtx.setPanelMode(lookup, 'add', newMode);
    if (newMode === PaneAddMode.DEFAULT) {
      setIsExpanded(false);
    }
    if (reset) nodesCtx.notifyNode(ROOT_NODE_NAME);
    settingsPanelStore.set(null);
  };

  return (
    <div className="add-pane-panel-wrapper border-mydarkgrey border-b-2 border-t-2 border-dotted">
      {isExpanded && (
        <div className="border-mylightgrey border-t border-dotted">
          <div className="group flex w-full flex-wrap items-center gap-2 px-1.5 pb-0.5 pt-1.5">
            <button
              onClick={() => {
                setMode(PaneAddMode.DEFAULT);
                setIsExpanded(false);
              }}
              className="rounded-md bg-gray-200 px-2 py-1 text-sm font-bold text-gray-800"
            >
              &lt; Cancel
            </button>
          </div>
        </div>
      )}
      {mode === PaneAddMode.NEW || (!hasPanes && first && !reset) ? (
        <AddPaneNewPanel
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          ctx={nodesCtx}
          isStoryFragment={isStoryFragment}
          isContextPane={isContextPane}
          isSandboxMode={isSandboxMode}
        />
      ) : mode === PaneAddMode.BREAK && !isContextPane ? (
        <AddPaneBreakPanel
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          ctx={nodesCtx}
          isStoryFragment={isStoryFragment}
        />
      ) : mode === PaneAddMode.REUSE && !isContextPane ? (
        <AddPaneReUsePanel nodeId={nodeId} first={first} setMode={setMode} />
      ) : mode === PaneAddMode.CODEHOOK ? (
        <AddPaneCodeHookPanel
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          isStoryFragment={isStoryFragment}
          isContextPane={isContextPane}
        />
      ) : mode === PaneAddMode.PASTE ? (
        <AddPanePanel_paste
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          ctx={nodesCtx}
          isStoryFragment={isStoryFragment}
          isContextPane={isContextPane}
        />
      ) : isExpanded ? (
        <div className="border-mylightgrey border-t border-dotted">
          <div className="group flex w-full flex-wrap items-center gap-2 px-1.5 pb-0.5 pt-1.5">
            <div className={`flex flex-wrap gap-1 transition-opacity`}>
              <button
                onClick={() => setMode(PaneAddMode.NEW)}
                className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white"
              >
                + Design New
              </button>
              {!isContextPane && (
                <>
                  <button
                    onClick={() => setMode(PaneAddMode.BREAK)}
                    className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white"
                  >
                    + Visual Break
                  </button>
                  {!isTemplate && (
                    <button
                      onClick={() => setMode(PaneAddMode.REUSE)}
                      className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white"
                    >
                      + Re-use Pane
                    </button>
                  )}
                </>
              )}
              {!isTemplate && (
                <button
                  onClick={() => setMode(PaneAddMode.CODEHOOK)}
                  className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white"
                >
                  + Code Hook
                </button>
              )}
              <button
                onClick={() => setMode(PaneAddMode.PASTE)}
                className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white"
              >
                + Paste Pane
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-mylightgrey flex border-t border-dotted p-0.5">
          <button
            onClick={() => setIsExpanded(true)}
            title="Insert Pane here"
            className="group w-full text-gray-500"
          >
            <div className="text-mydarkgrey hover:bg-myoffwhite rounded-md transition-colors duration-150 ease-in-out hover:bg-opacity-50 hover:mix-blend-difference">
              <PlusCircleIcon className="mx-auto h-8 w-8" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default AddPanePanel;
