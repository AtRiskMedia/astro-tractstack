import { useState, useEffect } from 'react';
import SingleParam from '@/components/fields/SingleParam';
import { widgetMeta } from '@/constants';
import type { FlatNode, BeliefNode } from '@/types/compositorTypes';

interface BeliefWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

export default function BeliefWidget({ node, onUpdate }: BeliefWidgetProps) {
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [selectedBeliefTag, setSelectedBeliefTag] = useState<string>('');
  const [currentScaleType, setCurrentScaleType] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Get parameter metadata from the widgetMeta constant
  const widgetInfo = widgetMeta.belief;

  // Ensure params are always strings
  const params = node.codeHookParams || [];
  const beliefTag = String(params[0] || '');
  const scaleType = String(params[1] || '');
  const prompt = String(params[2] || '');

  // Check if beliefTag is the placeholder value
  const isPlaceholder = beliefTag === 'BeliefTag';

  // Update local state when props change
  useEffect(() => {
    if (!isPlaceholder && beliefTag) {
      setSelectedBeliefTag(beliefTag);
    }
    setCurrentScaleType(scaleType);
    setCurrentPrompt(prompt);
    setIsInitialized(true);
  }, [beliefTag, scaleType, prompt, isPlaceholder]);

  // Fetch beliefs using new Go backend 2.0 pattern
  useEffect(() => {
    const fetchData = async () => {
      try {
        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
        const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

        // Step 1: Get all belief IDs
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

        // Step 2: Get belief data by IDs
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
    if (selectedBelief) {
      setCurrentScaleType(selectedBelief.scale || '');
      onUpdate([selectedValue, selectedBelief.scale || '', currentPrompt]);
    } else {
      onUpdate([selectedValue, '', currentPrompt]);
    }
  };

  const handlePromptChange = (value: string) => {
    if (!isInitialized) return;
    // Sanitize the input value (remove newlines and pipe characters)
    const sanitizedValue = value.replace(/[\n\r|]/g, '');
    setCurrentPrompt(sanitizedValue);

    // Use the actual selected tag (from state) or the original belief tag as fallback
    const tagToUse = selectedBeliefTag || (isPlaceholder ? '' : beliefTag);
    onUpdate([tagToUse, currentScaleType, sanitizedValue]);
  };

  // Filter beliefs to only show supported scale types (exclude custom)
  const filteredBeliefs = beliefs.filter(
    (b) =>
      b.scale &&
      ['likert', 'agreement', 'interest', 'yn', 'tf'].includes(b.scale)
  );

  // Find the selected belief (if any)
  const selectedBelief = filteredBeliefs.find(
    (b) => b.slug === (selectedBeliefTag || (isPlaceholder ? '' : beliefTag))
  );

  // Determine if we have a real selection - either from state or props
  const hasRealSelection = !!selectedBelief || (!isPlaceholder && !!beliefTag);

  // Calculate the current value to show in the select dropdown
  const selectValue = selectedBeliefTag || (isPlaceholder ? '' : beliefTag);

  // Get scale type display names
  const scaleTypeNames: Record<string, string> = {
    yn: 'Yes/No',
    likert: 'Likert Scale (5-point)',
    agreement: 'Agreement (2-point)',
    interest: 'Interest (2-point)',
    tf: 'True/False',
    custom: 'Custom Values',
  };

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

      {selectedBelief && (
        <div className="rounded-md bg-blue-50 p-3">
          <p className="text-sm text-blue-700">
            <strong>Scale:</strong>{' '}
            {scaleTypeNames[selectedBelief.scale] || selectedBelief.scale}
          </p>
        </div>
      )}

      {(hasRealSelection || selectedBeliefTag) && (
        <SingleParam
          label={widgetInfo.parameters[2].label}
          value={currentPrompt}
          onChange={handlePromptChange}
        />
      )}
    </div>
  );
}
