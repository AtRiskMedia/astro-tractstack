import { useState, useEffect, useMemo } from 'react';
import { TractStackAPI } from '@/utils/api';
import { GOTO_TARGETS, ACTION_COMMANDS, type ActionCommand } from '@/constants';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ActionBuilderSlugSelector from './ActionBuilderSlugSelector';
import ActionBuilderBeliefSelector from './ActionBuilderBeliefSelector';
import BunnyMomentSelector from '@/components/fields/BunnyMomentSelector';
import type { FullContentMapItem } from '@/types/tractstack';
import type { BeliefNode } from '@/types/compositorTypes';

interface ActionBuilderFieldProps {
  value: string;
  onChange: (value: string) => void;
  contentMap: FullContentMapItem[];
  label?: string;
  error?: string;
  slug?: string;
}

const parseActionLisp = (
  value: string
): { command: ActionCommand; params: string } => {
  try {
    const match = value.match(/^\s*\(([\w-]+)\s+(.*)\)\s*$/);
    if (match) {
      const cmd = match[1] as ActionCommand;
      const params = match[2];
      if (ACTION_COMMANDS[cmd]) {
        return { command: cmd, params };
      }
    }
  } catch (e) {
    console.error('Error parsing actionLisp value:', e);
  }
  return { command: 'goto', params: '' };
};

export default function ActionBuilderField({
  value,
  onChange,
  contentMap,
  label = 'Action',
  error,
  slug,
}: ActionBuilderFieldProps) {
  const [command, setCommand] = useState<ActionCommand>('goto');
  const [params, setParams] = useState('');
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const api = new TractStackAPI();
        const {
          data: { beliefIds },
        } = await api.get('/api/v1/nodes/beliefs');
        if (!beliefIds?.length) return;
        const {
          data: { beliefs },
        } = await api.post('/api/v1/nodes/beliefs', { beliefIds });
        setBeliefs(beliefs || []);
      } catch (error) {
        console.error('Error fetching beliefs for ActionBuilder:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (value) {
      const { command: parsedCommand, params: parsedParams } =
        parseActionLisp(value);
      setCommand(parsedCommand);
      setParams(parsedParams);
    } else {
      setCommand('goto');
      setParams('');
    }
  }, [value]);

  const handleParamChange = (newParams: string) => {
    setParams(newParams);
    const trimmedParams = newParams.trim();

    if (!trimmedParams || trimmedParams === '()') {
      onChange('');
      return;
    }

    if (command === 'bunnyMoment') {
      onChange(trimmedParams);
    } else if (command === 'identifyAs') {
      const firstSpaceIndex = trimmedParams.indexOf(' ');
      if (firstSpaceIndex === -1) {
        onChange(`(${command} ${trimmedParams})`);
      } else {
        const beliefId = trimmedParams.substring(0, firstSpaceIndex);
        const value = trimmedParams.substring(firstSpaceIndex + 1);
        const finalValue = value.includes(' ') ? `"${value}"` : value;
        onChange(`(${command} ${beliefId} ${finalValue})`);
      }
    } else {
      onChange(`(${command} ${trimmedParams})`);
    }
  };

  const handleCommandChange = (newCommand: ActionCommand) => {
    setCommand(newCommand);
    setParams('');
  };

  const handleClearAction = () => {
    setCommand('goto');
    setParams('');
    onChange('');
  };

  const hasAction = value && value.trim() !== '';

  const renderBuilderForCommand = () => {
    switch (command) {
      case 'declare':
        return (
          <ActionBuilderBeliefSelector
            value={params}
            onChange={handleParamChange}
            beliefs={beliefs.filter((b) => b.scale !== 'custom')}
          />
        );
      case 'identifyAs':
        return (
          <ActionBuilderBeliefSelector
            value={params}
            onChange={handleParamChange}
            beliefs={beliefs.filter((b) => b.scale === 'custom')}
          />
        );
      case 'bunnyMoment':
        return (
          <BunnyMomentSelector value={params} onChange={handleParamChange} />
        );
      case 'goto':
      default:
        return (
          <GotoBuilder
            value={params}
            onChange={handleParamChange}
            contentMap={contentMap}
            slug={slug}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-gray-700">
            {label}
          </label>
          {hasAction && (
            <button
              type="button"
              onClick={handleClearAction}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
              title="Clear action"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm text-gray-700">Action Type</label>
        <select
          value={command}
          onChange={(e) => handleCommandChange(e.target.value as ActionCommand)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
        >
          {Object.entries(ACTION_COMMANDS).map(([key, data]) => (
            <option key={key} value={key}>
              {data.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          {ACTION_COMMANDS[command]?.description}
        </p>
      </div>

      <div className="mt-4 border-t border-gray-200 pt-4">
        {renderBuilderForCommand()}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function GotoBuilder({
  value,
  onChange,
  contentMap,
  slug,
}: Omit<ActionBuilderFieldProps, 'label' | 'error' | 'value' | 'onChange'> & {
  value: string;
  onChange: (v: string) => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedSubcommand, setSelectedSubcommand] = useState<string>('');
  const [param1, setParam1] = useState<string>('');
  const [param2, setParam2] = useState<string>('');

  useEffect(() => {
    try {
      const match = value.match(/\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(' ').filter(Boolean);
        if (parts.length > 0) {
          setSelectedTarget(parts[0]);
          if (GOTO_TARGETS[parts[0]]?.subcommands) {
            if (parts.length > 1) setSelectedSubcommand(parts[1]);
          } else {
            if (parts.length > 1) setParam1(parts[1]);
            if (parts.length > 2) setParam2(parts[2]);
          }
        }
      } else {
        setSelectedTarget('');
        setSelectedSubcommand('');
        setParam1('');
        setParam2('');
      }
    } catch (e) {
      console.error('Error parsing goto value:', e);
    }
  }, [value]);

  const updateValue = (target: string, sub = '', p1 = '', p2 = '') => {
    if (!target) {
      onChange('');
      return;
    }
    let newValue = `(${target}`;
    if (GOTO_TARGETS[target]?.subcommands) {
      if (sub) newValue += ` ${sub}`;
    } else {
      if (p1) newValue += ` ${p1}`;
      if (p2) newValue += ` ${p2}`;
    }
    newValue += ')';
    onChange(newValue);
  };

  const handleTargetChange = (newTarget: string) => {
    setSelectedTarget(newTarget);
    setSelectedSubcommand('');
    setParam1('');
    setParam2('');
    updateValue(newTarget);
  };

  const handleSubcommandChange = (newSubcommand: string) => {
    setSelectedSubcommand(newSubcommand);
    updateValue(selectedTarget, newSubcommand);
  };

  const handleClearParam = (param: 'param1' | 'param2') => {
    if (param === 'param1') {
      setParam1('');
      setParam2(''); // Cascade unset
      updateValue(selectedTarget, selectedSubcommand, '', '');
    } else {
      setParam2('');
      updateValue(selectedTarget, selectedSubcommand, param1, '');
    }
  };

  const targetOptions = useMemo(
    () =>
      Object.entries(GOTO_TARGETS).map(([key, data]) => ({
        value: key,
        label: data.name,
      })),
    []
  );

  const subcommandOptions = useMemo(() => {
    if (!selectedTarget || !GOTO_TARGETS[selectedTarget]?.subcommands) {
      return [];
    }
    return GOTO_TARGETS[selectedTarget].subcommands!.map((cmd) => ({
      value: cmd,
      label: cmd,
    }));
  }, [selectedTarget]);

  const renderParamInput = (paramType: 'param1' | 'param2') => {
    const isParam1 = paramType === 'param1';
    const currentValue = isParam1 ? param1 : param2;
    const hasValue = currentValue && currentValue.trim() !== '';

    const inputWithClear = (inputEl: JSX.Element) => (
      <div className="flex items-center gap-2">
        <div className="flex-grow">{inputEl}</div>
        {hasValue && (
          <button
            type="button"
            onClick={() => handleClearParam(paramType)}
            className="flex-shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            title="Clear selection"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );

    switch (selectedTarget) {
      case 'context':
        return (
          isParam1 &&
          inputWithClear(
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
          isParam1 &&
          inputWithClear(
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
          return inputWithClear(
            <ActionBuilderSlugSelector
              type="storyFragment"
              value={currentValue}
              onSelect={(newValue) => {
                setParam1(newValue);
                setParam2('');
                updateValue(selectedTarget, '', newValue, '');
              }}
              label="Select Story Fragment"
              contentMap={contentMap}
            />
          );
        }
        return (
          !isParam1 &&
          param1 &&
          inputWithClear(
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
      case 'bunny':
        if (isParam1 && slug) {
          if (!currentValue) setParam1(slug);
          return inputWithClear(
            <ActionBuilderSlugSelector
              type="storyFragment"
              value={currentValue || slug}
              onSelect={(newValue) => {
                setParam1(newValue);
                setParam2('');
                updateValue(selectedTarget, '', newValue, '');
              }}
              label="Select Story Fragment"
              contentMap={contentMap}
            />
          );
        }
        return null;
      case 'url':
        return (
          isParam1 && (
            <div className="flex items-center gap-2">
              <div className="flex-grow space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  External URL
                </label>
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setParam1(newValue);
                  }}
                  onBlur={(e) => {
                    updateValue(selectedTarget, '', e.target.value);
                  }}
                  placeholder="https://..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
                />
              </div>
              {hasValue && (
                <button
                  type="button"
                  onClick={() => handleClearParam('param1')}
                  className="mt-6 flex-shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  title="Clear URL"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        );
      default:
        return null;
    }
  };

  const commonSelectClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm text-gray-700">Navigation Target</label>
        <select
          value={selectedTarget}
          onChange={(e) => handleTargetChange(e.target.value)}
          className={commonSelectClass}
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

      {selectedTarget && GOTO_TARGETS[selectedTarget]?.subcommands && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Section</label>
          <select
            value={selectedSubcommand}
            onChange={(e) => handleSubcommandChange(e.target.value)}
            className={commonSelectClass}
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

      {selectedTarget &&
        GOTO_TARGETS[selectedTarget]?.requiresParam &&
        !GOTO_TARGETS[selectedTarget].subcommands &&
        renderParamInput('param1')}

      {selectedTarget &&
        GOTO_TARGETS[selectedTarget]?.requiresSecondParam &&
        param1 &&
        renderParamInput('param2')}
    </div>
  );
}
