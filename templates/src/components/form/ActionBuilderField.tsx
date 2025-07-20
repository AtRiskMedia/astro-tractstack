import { useState, useEffect, useMemo } from 'react';
import { GOTO_TARGETS } from '@/constants';
import ActionBuilderSlugSelector from './ActionBuilderSlugSelector';
import type { FullContentMapItem } from '@/types/tractstack';

interface ActionBuilderFieldProps {
  value: string;
  onChange: (value: string) => void;
  contentMap: FullContentMapItem[];
  label?: string;
  error?: string;
}

export default function ActionBuilderField({
  value,
  onChange,
  contentMap,
  label = 'Navigation Action',
  error,
}: ActionBuilderFieldProps) {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedSubcommand, setSelectedSubcommand] = useState<string>('');
  const [param1, setParam1] = useState<string>('');
  const [param2, setParam2] = useState<string>('');
  const [param3, setParam3] = useState<string>('');

  // Parse existing value on mount/change
  useEffect(() => {
    if (value) {
      try {
        const match = value.match(/\(goto\s+\(([^)]+)\)/);
        if (match) {
          const parts = match[1].split(' ').filter(Boolean);
          if (parts.length > 0) {
            setSelectedTarget(parts[0]);
            if (GOTO_TARGETS[parts[0]]?.subcommands) {
              if (parts.length > 1) setSelectedSubcommand(parts[1]);
            } else {
              if (parts.length > 1) setParam1(parts[1]);
              if (parts.length > 2) setParam2(parts[2]);
              if (parts.length > 3) setParam3(parts[3]);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing action value:', e);
      }
    }
  }, [value]);

  const updateValue = (
    target: string,
    sub: string = '',
    p1: string = '',
    p2: string = '',
    p3: string = ''
  ) => {
    let newValue = `(goto (${target}`;
    if (GOTO_TARGETS[target]?.subcommands) {
      if (sub) newValue += ` ${sub}`;
    } else {
      if (p1) newValue += ` ${p1}`;
      if (p2) newValue += ` ${p2}`;
      if (p3) newValue += ` ${p3}`;
    }
    newValue += '))';
    onChange(newValue);
  };

  const targetOptions = useMemo(() => {
    return Object.entries(GOTO_TARGETS).map(([key, data]) => ({
      value: key,
      label: data.name,
    }));
  }, []);

  const subcommandOptions = useMemo(() => {
    if (!selectedTarget || !GOTO_TARGETS[selectedTarget]?.subcommands) {
      return [];
    }
    return GOTO_TARGETS[selectedTarget].subcommands!.map((cmd) => ({
      value: cmd,
      label: cmd,
    }));
  }, [selectedTarget]);

  const handleTargetChange = (newTarget: string) => {
    setSelectedTarget(newTarget);
    setSelectedSubcommand('');
    setParam1('');
    setParam2('');
    setParam3('');
    updateValue(newTarget);
  };

  const handleSubcommandChange = (newSubcommand: string) => {
    setSelectedSubcommand(newSubcommand);
    updateValue(selectedTarget, newSubcommand);
  };

  const renderParamInput = (paramType: 'param1' | 'param2') => {
    const isParam1 = paramType === 'param1';
    const currentValue = isParam1 ? param1 : param2;

    switch (selectedTarget) {
      case 'context':
        return (
          isParam1 && (
            <ActionBuilderSlugSelector
              type="context"
              value={currentValue}
              onSelect={(newValue) => {
                setParam1(newValue);
                updateValue(selectedTarget, '', newValue, param2);
              }}
              label="Select Context Pane"
              contentMap={contentMap}
            />
          )
        );

      case 'storyFragment':
        return (
          isParam1 && (
            <ActionBuilderSlugSelector
              type="storyFragment"
              value={currentValue}
              onSelect={(newValue) => {
                setParam1(newValue);
                updateValue(selectedTarget, '', newValue);
              }}
              label="Select Story Fragment"
              contentMap={contentMap}
            />
          )
        );

      case 'storyFragmentPane':
        if (isParam1) {
          return (
            <ActionBuilderSlugSelector
              type="storyFragment"
              value={currentValue}
              onSelect={(newValue) => {
                setParam1(newValue);
                setParam2(''); // Reset pane selection
                updateValue(selectedTarget, '', newValue, '');
              }}
              label="Select Story Fragment"
              contentMap={contentMap}
            />
          );
        }
        return (
          !isParam1 &&
          param1 && (
            <ActionBuilderSlugSelector
              type="pane"
              value={currentValue}
              onSelect={(newValue) => {
                setParam2(newValue);
                updateValue(selectedTarget, '', param1, newValue);
              }}
              label="Select Pane"
              contentMap={contentMap}
              parentSlug={param1}
            />
          )
        );

      case 'url':
        return (
          isParam1 && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                External URL
              </label>
              <input
                type="text"
                value={currentValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setParam1(newValue);
                  updateValue(selectedTarget, '', newValue);
                }}
                placeholder="https://..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
              />
            </div>
          )
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-bold text-gray-700">{label}</label>
      )}

      {/* Target Selection */}
      <div className="space-y-2">
        <label className="block text-sm text-gray-700">Navigation Target</label>
        <select
          value={selectedTarget}
          onChange={(e) => handleTargetChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
        >
          <option value="">Select a target...</option>
          {targetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {GOTO_TARGETS[selectedTarget] && (
          <p className="mt-1 text-sm text-gray-500">
            {GOTO_TARGETS[selectedTarget].description}
          </p>
        )}
      </div>

      {/* Subcommand Selection */}
      {selectedTarget && GOTO_TARGETS[selectedTarget]?.subcommands && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Section</label>
          <select
            value={selectedSubcommand}
            onChange={(e) => handleSubcommandChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
          >
            <option value="">Select a section...</option>
            {subcommandOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Parameter Inputs */}
      {selectedTarget &&
        GOTO_TARGETS[selectedTarget]?.requiresParam &&
        !GOTO_TARGETS[selectedTarget].subcommands &&
        renderParamInput('param1')}

      {selectedTarget &&
        GOTO_TARGETS[selectedTarget]?.requiresSecondParam &&
        param1 &&
        renderParamInput('param2')}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
