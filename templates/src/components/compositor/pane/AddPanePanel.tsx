import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { settingsPanelStore } from '@/stores/storykeep';
import AddPaneNewPanel from './AddPanePanel_new';
import AddPaneBreakPanel from './AddPanePanel_break';
import AddPaneReUsePanel from './AddPanePanel_reuse';
import AddPaneCodeHookPanel from './AddPanePanel_codehook';
import { NodesContext, ROOT_NODE_NAME } from '@/stores/nodes';
import { PaneAddMode } from '@/types/compositorTypes';

interface AddPanePanelProps {
  nodeId: string;
  first?: boolean;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
}

const AddPanePanel = ({
  nodeId,
  first = false,
  ctx,
  isStoryFragment = false,
  isContextPane = false,
}: AddPanePanelProps) => {
  const [reset, setReset] = useState(false);
  const lookup = first ? `${nodeId}-0` : nodeId;

  const nodesCtx = typeof ctx !== `undefined` ? ctx : null;
  const activePaneMode =
    typeof ctx !== `undefined` ? useStore(ctx.activePaneMode) : null;
  const hasPanes = typeof ctx !== `undefined` ? useStore(ctx.hasPanes) : false;
  const isActive =
    activePaneMode?.panel === 'add' && activePaneMode?.paneId === lookup;
  const isTemplate =
    typeof ctx !== `undefined` ? useStore(ctx.isTemplate) : false;

  const mode =
    isActive && activePaneMode?.mode
      ? (activePaneMode?.mode as PaneAddMode)
      : !hasPanes && first && !reset
        ? PaneAddMode.NEW
        : PaneAddMode.DEFAULT;

  const setMode = (newMode: PaneAddMode, reset?: boolean) => {
    setReset(true);
    nodesCtx?.setPanelMode(lookup, 'add', newMode);
    if (reset) nodesCtx?.notifyNode(ROOT_NODE_NAME);
    settingsPanelStore.set(null);
  };

  // Always render a stable container div for the intersection observer
  return (
    <div className="add-pane-panel-wrapper">
      {mode === PaneAddMode.NEW || (!hasPanes && first && !reset) ? (
        <AddPaneNewPanel
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          ctx={ctx}
          isStoryFragment={isStoryFragment}
          isContextPane={isContextPane}
        />
      ) : mode === PaneAddMode.BREAK && !isContextPane ? (
        <AddPaneBreakPanel
          nodeId={nodeId}
          first={first}
          setMode={setMode}
          ctx={ctx}
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
      ) : (
        <div className="border-mylightgrey border-t border-dotted">
          <div className="group flex w-full gap-1 px-1.5 pb-0.5 pt-1.5">
            <div className="rounded-md bg-gray-200 px-2 py-1 text-sm text-gray-800">
              Insert Pane Here
            </div>
            <div className={`flex gap-1 transition-opacity`}>
              <button
                onClick={() => setMode(PaneAddMode.NEW)}
                className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
              >
                + Design New
              </button>
              {!isContextPane && (
                <>
                  <button
                    onClick={() => setMode(PaneAddMode.BREAK)}
                    className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
                  >
                    + Visual Break
                  </button>
                  {!isTemplate && (
                    <button
                      onClick={() => setMode(PaneAddMode.REUSE)}
                      className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
                    >
                      + Re-use existing pane
                    </button>
                  )}
                </>
              )}
              {!isTemplate && (
                <button
                  onClick={() => setMode(PaneAddMode.CODEHOOK)}
                  className="rounded bg-white px-2 py-1 text-sm text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
                >
                  + Custom Code Hook
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPanePanel;
