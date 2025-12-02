import { useState, useEffect } from 'react';
import SingleParam from '@/components/fields/SingleParam';
import { widgetMeta } from '@/constants';
import type { FlatNode, BeliefNode } from '@/types/compositorTypes';

interface ToggleWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

export default function ToggleWidget({ node, onUpdate }: ToggleWidgetProps) {
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [selectedBeliefTag, setSelectedBeliefTag] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [currentScale, setCurrentScale] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const tenantId =
    window.TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  const widgetInfo = widgetMeta.toggle;

  const params = node.codeHookParams || [];
  const beliefTag = String(params[0] || '');
  const prompt = String(params[1] || '');
  const scale = String(params[2] || '');

  const isPlaceholder = beliefTag === 'BeliefTag';

  useEffect(() => {
    if (!isPlaceholder && beliefTag) {
      setSelectedBeliefTag(beliefTag);
    }
    setCurrentPrompt(prompt);
    setCurrentScale(scale);
    setIsInitialized(true);
  }, [beliefTag, prompt, scale, isPlaceholder]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

        const idsResponse = await fetch(`${goBackend}/api/v1/nodes/beliefs`, {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        });

        if (!idsResponse.ok) {
          throw new Error(
            `Failed to fetch belief IDs: ${idsResponse.statusText}`
          );
        }
        const { beliefIds } = await idsResponse.json();

        if (!beliefIds || beliefIds.length === 0) {
          setBeliefs([]);
          return;
        }

        const beliefsResponse = await fetch(
          `${goBackend}/api/v1/nodes/beliefs`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantId,
            },
            body: JSON.stringify({ beliefIds }),
          }
        );

        if (!beliefsResponse.ok) {
          throw new Error(
            `Failed to fetch beliefs: ${beliefsResponse.statusText}`
          );
        }

        const { beliefs } = await beliefsResponse.json();
        setBeliefs(beliefs || []);
      } catch (err) {
        console.error('Failed to fetch beliefs:', err);
      }
    };

    fetchData();
  }, []);

  const handleBeliefChange = (selectedValue: string) => {
    if (!isInitialized) return;
    setSelectedBeliefTag(selectedValue);
    const selectedBelief = beliefs.find((b) => b.slug === selectedValue);
    const newScale = selectedBelief ? selectedBelief.scale || '' : '';
    setCurrentScale(newScale);
    onUpdate([selectedValue, currentPrompt, newScale]);
  };

  const handlePromptChange = (value: string) => {
    if (!isInitialized) return;
    const sanitizedValue = value.replace(/[\n\r|]/g, '');
    setCurrentPrompt(sanitizedValue);
    const tagToUse = selectedBeliefTag || (isPlaceholder ? '' : beliefTag);
    onUpdate([tagToUse, sanitizedValue, currentScale]);
  };

  const filteredBeliefs = beliefs.filter(
    (b) => b.scale === 'yn' || b.scale === 'tf'
  );

  const selectedBelief = beliefs.find(
    (b) => b.slug === (selectedBeliefTag || (isPlaceholder ? '' : beliefTag))
  );

  const hasRealSelection = !!selectedBelief || (!isPlaceholder && !!beliefTag);

  const selectValue = selectedBeliefTag || (isPlaceholder ? '' : beliefTag);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={selectValue}
          onChange={(e) => handleBeliefChange(e.target.value)}
          className="flex-1 rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700"
          disabled={hasRealSelection && !isPlaceholder}
        >
          <option value="">Select a belief</option>
          {filteredBeliefs.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {(hasRealSelection || selectedBeliefTag) && (
        <SingleParam
          label={widgetInfo.parameters[1].label}
          value={currentPrompt}
          onChange={handlePromptChange}
        />
      )}
    </div>
  );
}
