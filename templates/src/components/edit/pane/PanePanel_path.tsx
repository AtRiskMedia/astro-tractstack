import {
  useState,
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import {
  PaneConfigMode,
  type PaneNode,
  type BeliefNode,
} from '@/types/compositorTypes';
import MagicPathBuilder from '@/components/form/MagicPathBuilder';

type PathsType = Record<string, string[]>;

interface PaneMagicPathPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneConfigMode>>;
}

const PaneMagicPathPanel = ({ nodeId, setMode }: PaneMagicPathPanelProps) => {
  const [heldPaths, setHeldPaths] = useState<PathsType>({});
  const [withheldPaths, setWithheldPaths] = useState<PathsType>({});
  const [availableBeliefs, setAvailableBeliefs] = useState<BeliefNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //const [isCreatingBelief, setIsCreatingBelief] = useState(false);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode | undefined;

  if (!paneNode) return null;

  // Initialize state from node data
  useEffect(() => {
    setHeldPaths((paneNode.heldBeliefs as PathsType) || {});
    setWithheldPaths((paneNode.withheldBeliefs as PathsType) || {});
  }, [paneNode.heldBeliefs, paneNode.withheldBeliefs]);

  const fetchBeliefs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/turso/getAllBeliefNodes', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch beliefs');

      const result = await response.json();
      if (result.success) {
        setAvailableBeliefs(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch beliefs');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available beliefs
  useEffect(() => {
    fetchBeliefs();
  }, []);

  // Handle updating store
  const updateStore = useCallback(
    (updatedHeldPaths: PathsType, updatedWithheldPaths: PathsType) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const updatedNode = cloneDeep(allNodes.get(nodeId)) as PaneNode;

      updatedNode.heldBeliefs = updatedHeldPaths;
      updatedNode.withheldBeliefs = updatedWithheldPaths;
      updatedNode.isChanged = true;

      const currentPanelState = ctx.activePaneMode.get();

      ctx.modifyNodes([updatedNode]);

      setTimeout(() => {
        // Only restore if it was a PATH mode
        if (
          currentPanelState.panel === 'settings' &&
          currentPanelState.mode === 'PATH'
        ) {
          ctx.setPanelMode(nodeId, 'settings', PaneConfigMode.PATH);
        }
      }, 0);
    },
    [nodeId]
  );

  // Handle updating held beliefs
  const handleHeldPathsChange = useCallback(
    (newPaths: PathsType) => {
      setHeldPaths(newPaths);
      updateStore(newPaths, withheldPaths);
    },
    [withheldPaths, updateStore]
  );

  // Handle updating withheld beliefs
  const handleWithheldPathsChange = useCallback(
    (newPaths: PathsType) => {
      setWithheldPaths(newPaths);
      updateStore(heldPaths, newPaths);
    },
    [heldPaths, updateStore]
  );

  // Handle saving custom values for a belief
  const handleSaveCustomValue = useCallback(
    async (beliefId: string, customValues: string[]) => {
      try {
        const belief = availableBeliefs.find((b) => b.id === beliefId);
        if (!belief) throw new Error('Belief not found');

        const updatedBelief = {
          ...belief,
          customValues,
        };

        const response = await fetch('/api/turso/upsertBeliefNode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedBelief),
        });

        if (!response.ok) throw new Error('Failed to save custom values');

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to save custom values');
        }

        // Update available beliefs with new custom values
        setAvailableBeliefs((prev) =>
          prev.map((b) => (b.id === beliefId ? { ...b, customValues } : b))
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    },
    [availableBeliefs]
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <p>Loading available beliefs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p>Error: {error}</p>
      </div>
    );
  }

  //if (isCreatingBelief) {
  //  const emptyBelief: BeliefNode = {
  //    id: ulid(),
  //    nodeType: "Belief",
  //    parentId: null,
  //    title: "",
  //    slug: "",
  //    scale: "",
  //  };

  //  return (
  //    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4 shadow-inner">
  //      <div className="px-3.5">
  //        <div className="flex justify-between mb-4">
  //          <h3 className="text-lg font-bold">Create New Belief</h3>
  //          <button
  //            onClick={() => setIsCreatingBelief(false)}
  //            className="text-cyan-700 hover:text-black"
  //          >
  //            ← Back to Magic Paths
  //          </button>
  //        </div>
  //        <BeliefEditor
  //          belief={emptyBelief}
  //          create={true}
  //          isEmbedded={true}
  //          onComplete={() => {
  //            setIsCreatingBelief(false);
  //            fetchBeliefs();
  //          }}
  //          onCancel={() => setIsCreatingBelief(false)}
  //        />
  //      </div>
  //    </div>
  //  );
  //}

  return (
    <div className="group mb-4 w-full rounded-b-md bg-white px-1.5 py-6 shadow-inner">
      <div className="px-3.5">
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-bold">Magic Paths</h3>
          <div className="space-x-2">
            <button
              onClick={() => setMode(PaneConfigMode.DEFAULT)}
              className="text-cyan-700 hover:text-black"
            >
              ← Go Back
            </button>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-8">
          <div className="min-w-[400px] flex-1">
            <MagicPathBuilder
              paths={heldPaths}
              setPaths={handleHeldPathsChange}
              availableBeliefs={availableBeliefs}
              isShowCondition={true}
              onSaveCustomValue={handleSaveCustomValue}
            />
          </div>

          <div className="min-w-[400px] flex-1">
            <MagicPathBuilder
              paths={withheldPaths}
              setPaths={handleWithheldPathsChange}
              availableBeliefs={availableBeliefs}
              isShowCondition={false}
              onSaveCustomValue={handleSaveCustomValue}
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>Conditions control content visibility based on visitor beliefs:</p>
          <ul className="ml-5 mt-2 list-disc">
            <li>
              Show Conditions display content when matching beliefs are held
            </li>
            <li>
              Hide Conditions prevent content display when matching beliefs are
              held
            </li>
            <li>Use Match Any Value (*) to match any value for a belief</li>
            <li>
              For custom beliefs, you can edit available values using the check
              icon
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaneMagicPathPanel;
