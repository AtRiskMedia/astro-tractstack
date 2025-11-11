import { useState } from 'react';
import { getCtx, type NodesContext } from '@/stores/nodes';
import { PaneAddMode, type StoragePane } from '@/types/compositorTypes';
import {
  remapPaneIds,
  convertStorageToLiveTemplate,
} from '@/utils/compositor/designLibraryHelper';

interface AddPanePanelPasteProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode, reset?: boolean) => void;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
}

const AddPanePanel_paste = ({
  nodeId,
  first,
  setMode,
  ctx: providedCtx,
  isStoryFragment,
  isContextPane,
}: AddPanePanelPasteProps) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ctx = providedCtx || getCtx();

  const handleCreate = () => {
    setError(null);
    if (!jsonInput.trim()) {
      setError('Paste content cannot be empty.');
      return;
    }

    try {
      const parsedPane = JSON.parse(jsonInput) as StoragePane;
      if (parsedPane.nodeType !== 'Pane') {
        throw new Error('Pasted content is not a valid Pane object.');
      }

      const remappedPane = remapPaneIds(parsedPane);
      const liveTemplate = convertStorageToLiveTemplate(remappedPane);

      const ownerId =
        isStoryFragment || isContextPane
          ? nodeId
          : ctx.getClosestNodeTypeFromId(nodeId, 'StoryFragment');

      ctx.addTemplatePane(
        ownerId,
        liveTemplate,
        nodeId,
        first ? 'before' : 'after'
      );
      ctx.notifyNode('root');
      setMode(PaneAddMode.DEFAULT, true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unknown error occurred during parsing.';
      setError(`Invalid Pane JSON: ${message}`);
    }
  };

  return (
    <div className="p-2 shadow-inner">
      <div className="rounded-md border bg-gray-50 p-4">
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(PaneAddMode.DEFAULT)}
              className="w-fit rounded bg-gray-200 px-3 py-1 text-sm text-gray-800 transition-colors hover:bg-gray-300"
            >
              ← Go Back
            </button>
            <h3 className="font-action text-sm font-bold text-cyan-700">
              Paste Pane
            </h3>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Paste the JSON content of a copied pane into the text area below.
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste pane JSON here..."
            className="h-48 w-full rounded-md border border-gray-300 bg-white p-2 font-mono text-xs focus:border-cyan-500 focus:ring-cyan-500"
            spellCheck={false}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!jsonInput.trim()}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Create Pane from Paste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPanePanel_paste;
