import { type CSSProperties, useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import ArchiveBoxArrowDownIcon from '@heroicons/react/24/outline/ArchiveBoxArrowDownIcon';
import ArrowPathRoundedSquareIcon from '@heroicons/react/24/outline/ArrowPathRoundedSquareIcon';
import { viewportKeyStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { RenderChildren } from './RenderChildren';
import { CodeHookContainer } from './Pane';
import type { NodeProps } from '@/types/nodeProps';
import { SaveToLibraryModal } from '@/components/edit/state/SaveToLibraryModal';
import { RestylePaneModal } from '@/components/edit/pane/RestylePaneModal';
import { selectionStore } from '@/stores/selection';

export const Pane_DesignLibrary = (props: NodeProps) => {
  const ctx = getCtx(props);

  const { isRestyleModalOpen } = useStore(selectionStore, {
    keys: ['isRestyleModalOpen'],
  });

  const wrapperClasses = `grid ${ctx.getNodeClasses(
    props.nodeId,
    viewportKeyStore.get().value
  )}`;
  const contentClasses = 'relative w-full h-auto justify-self-start';
  const contentStyles: CSSProperties = {
    ...ctx.getNodeCSSPropertiesStyles(props.nodeId),
    gridArea: '1/1/1/1',
  };
  const codeHookPayload = ctx.getNodeCodeHookPayload(props.nodeId);
  const [children, setChildren] = useState<string[]>([
    ...ctx.getChildNodeIDs(props.nodeId),
  ]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const getPaneId = (): string => `pane-${props.nodeId}`;

  useEffect(() => {
    const unsubscribe = ctx.notifications.subscribe(props.nodeId, () => {
      setChildren([...ctx.getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, [props.nodeId, ctx.notifications]);

  const handleRestyleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectionStore.setKey('paneToRestyleId', props.nodeId);
    selectionStore.setKey('isRestyleModalOpen', true);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaveModalOpen(true);
  };

  if (!props.config || !props.config.TENANT_ID) {
    return <></>;
  }

  return (
    <div id={getPaneId()} className="pane min-h-16">
      <div id={ctx.getNodeSlug(props.nodeId)} className={wrapperClasses}>
        <div
          className={contentClasses}
          style={contentStyles}
          onClick={(e) => {
            ctx.setClickedNodeId(props.nodeId);
            e.stopPropagation();
          }}
        >
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-y-2">
            {props.isSandboxMode && (
              <button
                title="Save Pane to Design Library"
                onClick={handleSaveClick}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 p-1.5 shadow-lg hover:bg-cyan-700"
              >
                <ArchiveBoxArrowDownIcon className="h-7 w-7 text-white" />
              </button>
            )}
            <button
              title="Restyle Pane from Design Library"
              onClick={handleRestyleClick}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 p-1.5 shadow-lg hover:bg-blue-700"
            >
              <ArrowPathRoundedSquareIcon className="h-7 w-7 text-white" />
            </button>
          </div>
          {codeHookPayload ? (
            <CodeHookContainer payload={codeHookPayload} />
          ) : (
            <RenderChildren children={children} nodeProps={props} />
          )}
        </div>
      </div>
      {isSaveModalOpen && (
        <SaveToLibraryModal
          paneId={props.nodeId}
          config={props.config}
          tenantId={props.config.TENANT_ID}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}

      {isRestyleModalOpen && <RestylePaneModal config={props.config} />}
    </div>
  );
};
