import { useState, useEffect } from 'react';
import SingleParam from '@/components/fields/SingleParam';
import { widgetMeta } from '@/constants';
import type { FlatNode, BeliefNode } from '@/types/compositorTypes';

interface IdentifyAsWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

export default function IdentifyAsWidget({
  node,
  onUpdate,
}: IdentifyAsWidgetProps) {
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [selectedBeliefTag, setSelectedBeliefTag] = useState<string>('');
  const [targetValues, setTargetValues] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');

  // Sync state with node.codeHookParams
  useEffect(() => {
    const params = node.codeHookParams || [];
    const beliefTag = String(params[0] || 'BeliefTag');
    const matchingValues = params[1] || 'TARGET_VALUE';
    const prompt = String(params[2] || '');

    // Set selected belief tag
    if (beliefTag !== 'BeliefTag') {
      setSelectedBeliefTag(beliefTag);
    } else {
      setSelectedBeliefTag('');
    }

    // Parse target values only if we have a real belief selected and real values
    if (beliefTag !== 'BeliefTag' && matchingValues !== 'TARGET_VALUE') {
      if (Array.isArray(matchingValues)) {
        setTargetValues(matchingValues.map(String));
      } else if (typeof matchingValues === 'string') {
        setTargetValues(
          matchingValues
            .split(',')
            .map((val) => val.trim())
            .filter(Boolean)
        );
      }
    } else {
      setTargetValues([]);
    }

    setCurrentPrompt(prompt);
  }, [node]);

  // Fetch beliefs using new Go backend pattern
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
    setSelectedBeliefTag(selectedValue);

    // When a belief is selected, initialize target values with ALL customValues from that belief
    if (selectedValue) {
      const selectedBelief = beliefs.find((b) => b.slug === selectedValue);
      if (selectedBelief && selectedBelief.customValues) {
        setTargetValues(selectedBelief.customValues);
        // Update with all custom values selected by default
        onUpdate([
          selectedValue,
          selectedBelief.customValues.join(','),
          currentPrompt,
        ]);
      } else {
        setTargetValues([]);
        onUpdate([selectedValue, '', currentPrompt]);
      }
    } else {
      setTargetValues([]);
      onUpdate(['BeliefTag', 'TARGET_VALUE', currentPrompt]);
    }
  };

  const handleTargetValueToggle = (value: string) => {
    const newTargetValues = targetValues.includes(value)
      ? targetValues.filter((v) => v !== value)
      : [...targetValues, value];

    setTargetValues(newTargetValues);
    const beliefTagToUse = selectedBeliefTag || 'BeliefTag';
    const targetParam =
      newTargetValues.length > 0 ? newTargetValues.join(',') : 'TARGET_VALUE';
    onUpdate([beliefTagToUse, targetParam, currentPrompt]);
  };

  const handlePromptChange = (value: string) => {
    const sanitizedValue = value.replace(/[\n\r|]/g, '');
    setCurrentPrompt(sanitizedValue);
    const beliefTagToUse = selectedBeliefTag || 'BeliefTag';
    const targetParam =
      targetValues.length > 0 ? targetValues.join(',') : 'TARGET_VALUE';
    onUpdate([beliefTagToUse, targetParam, sanitizedValue]);
  };

  const filteredBeliefs = beliefs.filter((b) => b.scale === 'custom');
  const selectedBelief = beliefs.find((b) => b.slug === selectedBeliefTag);
  const hasRealSelection = !!selectedBelief;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={selectedBeliefTag}
          onChange={(e) => handleBeliefChange(e.target.value)}
          className="flex-1 rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700"
          disabled={hasRealSelection}
        >
          <option value="">Select a belief</option>
          {filteredBeliefs.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {hasRealSelection && selectedBelief && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">
              Target Values (select which options to include)
            </label>
            <div className="space-y-2">
              {selectedBelief.customValues?.map((value) => (
                <label key={value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={targetValues.includes(value)}
                    onChange={() => handleTargetValueToggle(value)}
                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">{value}</span>
                </label>
              )) || (
                <div className="text-sm italic text-gray-500">
                  This belief has no custom values defined.
                </div>
              )}
            </div>
          </div>

          <SingleParam
            label="Prompt"
            value={currentPrompt}
            onChange={handlePromptChange}
          />
        </>
      )}
    </div>
  );
}
