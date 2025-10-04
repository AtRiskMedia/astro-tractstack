import { useState, useEffect, useMemo } from 'react';
import type { BeliefNode } from '@/types/compositorTypes';
import { heldBeliefsScales } from '@/constants/beliefs';

interface ActionBuilderBeliefSelectorProps {
  value: string;
  onChange: (value: string) => void;
  beliefs: BeliefNode[];
}

const parseValue = (value: string): [string, string] => {
  try {
    const match = value.match(/\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return [parts[0], parts.slice(1).join(' ')];
      }
      if (parts.length === 1) {
        return [parts[0], ''];
      }
    }
  } catch (e) {
    console.error('Error parsing belief selector value:', e);
  }
  return ['', ''];
};

export default function ActionBuilderBeliefSelector({
  value,
  onChange,
  beliefs,
}: ActionBuilderBeliefSelectorProps) {
  const [selectedBeliefSlug, setSelectedBeliefSlug] = useState('');
  const [selectedValue, setSelectedValue] = useState('');

  useEffect(() => {
    const [slug, val] = parseValue(value);
    setSelectedBeliefSlug(slug);
    setSelectedValue(val);
  }, [value]);

  useEffect(() => {
    if (selectedBeliefSlug && selectedValue) {
      const newValue = `(${selectedBeliefSlug} ${selectedValue})`;
      if (value !== newValue) {
        onChange(newValue);
      }
    }
  }, [selectedBeliefSlug, selectedValue, onChange, value]);

  const selectedBelief = useMemo(
    () => beliefs.find((b) => b.slug === selectedBeliefSlug),
    [selectedBeliefSlug, beliefs]
  );

  const valueOptions = useMemo(() => {
    if (!selectedBelief) return [];
    if (selectedBelief.scale === 'custom' && selectedBelief.customValues) {
      return selectedBelief.customValues.map((v) => ({ label: v, value: v }));
    }
    const scale =
      heldBeliefsScales[selectedBelief.scale as keyof typeof heldBeliefsScales];
    if (scale) {
      return scale.map(({ slug, name }) => ({ label: name, value: slug }));
    }
    return [];
  }, [selectedBelief]);

  const handleBeliefChange = (slug: string) => {
    setSelectedBeliefSlug(slug);
    setSelectedValue('');
    onChange(slug ? `(${slug} )` : '');
  };

  const commonSelectClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm text-gray-700">Belief</label>
        <select
          value={selectedBeliefSlug}
          onChange={(e) => handleBeliefChange(e.target.value)}
          className={commonSelectClass}
        >
          <option value="">Select a belief...</option>
          {beliefs.map((belief) => (
            <option key={belief.id} value={belief.slug}>
              {belief.title} ({belief.scale})
            </option>
          ))}
        </select>
      </div>

      {selectedBelief && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Value</label>
          <select
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            className={commonSelectClass}
            disabled={!selectedBelief || valueOptions.length === 0}
          >
            <option value="">Select a value...</option>
            {valueOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
