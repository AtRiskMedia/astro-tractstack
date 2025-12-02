import { useState, useEffect, useMemo } from 'react';
import { TractStackAPI } from '@/utils/api';
import { fullContentMapStore } from '@/stores/storykeep';
import { heldBeliefsScales } from '@/constants/beliefs';
import { biIcons } from '@/constants';
import type { FlatNode, BeliefNode } from '@/types/compositorTypes';
import SingleParam from '@/components/fields/SingleParam';
import ColorPickerCombo from '@/components/fields/ColorPickerCombo';
import ActionBuilderField from '@/components/form/ActionBuilderField';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { Combobox } from '@ark-ui/react/combobox';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import ArrowUturnLeftIcon from '@heroicons/react/24/outline/ArrowUturnLeftIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import ArrowUpIcon from '@heroicons/react/24/outline/ArrowUpIcon';
import ArrowDownIcon from '@heroicons/react/24/outline/ArrowDownIcon';

interface DisclosureItem {
  id: string;
  beliefValue: string;
  isCustom: boolean;
  title: string;
  description?: string;
  icon: string;
  actionLisp: string;
  isDisabled?: boolean;
}

interface WidgetStyles {
  textColor: string;
  bgColor: string;
  bgOpacity: number;
}
type StoredDisclosureItem = Omit<DisclosureItem, 'id' | 'isDisabled'>;
interface InteractiveDisclosureWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

const generateId = (): string => Math.random().toString(36).substring(2, 9);

const quoteIfNecessary = (command: string, value: string): string => {
  if (command === 'identifyAs' && value.includes(' ')) {
    return `"${value}"`;
  }
  return value;
};

const IconSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [query, setQuery] = useState('');
  const filteredIcons = useMemo(
    () =>
      biIcons.filter((icon) =>
        icon.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );
  const collection = useMemo(
    () => createListCollection({ items: filteredIcons }),
    [filteredIcons]
  );
  const iconSelectorStyles = `.icon-item .icon-indicator { display: none; } .icon-item[data-state="checked"] .icon-indicator { display: flex; }`;
  return (
    <div>
      <style>{iconSelectorStyles}</style>
      <label className="block text-xs font-bold text-gray-600">Icon</label>
      <Combobox.Root
        collection={collection}
        value={[value]}
        onValueChange={(details) => onChange(details.value[0] || '')}
        onInputValueChange={(details) => setQuery(details.inputValue)}
      >
        <Combobox.Control className="relative mt-1">
          <Combobox.Input
            className="w-full rounded-md border-gray-300 py-1.5 pl-3 pr-10 shadow-sm"
            placeholder="Search icons..."
            autoFocus
          />
          <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
            <i className={`bi bi-${value} mr-2 text-lg`}></i>
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
          </Combobox.Trigger>
        </Combobox.Control>
        <Portal>
          <Combobox.Positioner style={{ zIndex: 9010, minWidth: '250px' }}>
            <Combobox.Content className="max-h-60 w-full overflow-y-auto rounded-md bg-white shadow-lg">
              {filteredIcons.map((icon) => (
                <Combobox.Item
                  key={icon}
                  item={icon}
                  className="icon-item relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                >
                  <Combobox.ItemText>
                    <i className={`bi bi-${icon} mr-2 text-lg`}></i> {icon}
                  </Combobox.ItemText>
                  <Combobox.ItemIndicator className="icon-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600 data-[highlighted]:text-white">
                    <CheckIcon className="h-5 w-5" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              ))}
            </Combobox.Content>
          </Combobox.Positioner>
        </Portal>
      </Combobox.Root>
    </div>
  );
};

const DisclosureItemEditor = ({
  item,
  onUpdate,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: DisclosureItem;
  onUpdate: (updates: Partial<DisclosureItem>) => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [isEditingIcon, setIsEditingIcon] = useState(false);

  const handleIconChange = (newIcon: string) => {
    onUpdate({ icon: newIcon });
    setIsEditingIcon(false);
  };

  return (
    <div
      className={`space-y-4 rounded-lg border bg-white p-4 shadow-sm transition-opacity ${
        item.isDisabled ? 'border-gray-100 opacity-40' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="rounded p-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-25"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="rounded p-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-25"
            >
              <ArrowDownIcon className="h-4 w-4" />
            </button>
          </div>
          <h4 className="font-bold text-gray-800">
            {item.title}{' '}
            {!item.isCustom && (
              <span className="text-xs font-normal text-gray-500">
                (Key: {item.beliefValue})
              </span>
            )}
          </h4>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded p-1 hover:bg-gray-100 ${
            item.isDisabled ? 'text-blue-600' : 'text-red-600'
          }`}
        >
          {item.isDisabled ? (
            <ArrowUturnLeftIcon className="h-4 w-4" />
          ) : (
            <TrashIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      <fieldset disabled={item.isDisabled} className="space-y-4">
        <SingleParam
          label="Display Title"
          value={item.title}
          onChange={(value) => onUpdate({ title: value })}
        />
        <SingleParam
          label="Description (Optional)"
          value={item.description || ''}
          onChange={(value) => onUpdate({ description: value })}
        />

        {isEditingIcon ? (
          <IconSelector value={item.icon} onChange={handleIconChange} />
        ) : (
          <div>
            <label className="block text-xs font-bold text-gray-600">
              Icon
            </label>
            <div className="mt-1 flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1.5 shadow-sm">
              <div className="flex items-center gap-2">
                <i className={`bi bi-${item.icon} text-lg`}></i>
                <span className="text-sm">{item.icon}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingIcon(true)}
                className="text-sm font-bold text-cyan-600 hover:text-cyan-800"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {item.isCustom ? (
          <div className="relative rounded-md border p-3">
            <ActionBuilderField
              value={item.actionLisp}
              onChange={(value) => onUpdate({ actionLisp: value })}
              contentMap={fullContentMapStore.get()}
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-gray-600">
              Action (Locked)
            </label>
            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-500">
              {item.actionLisp}
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
};

export default function InteractiveDisclosureWidget({
  node,
  onUpdate,
}: InteractiveDisclosureWidgetProps) {
  const tenantId =
    window.TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';
  const [mode, setMode] = useState<'belief' | 'open'>('belief');
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [selectedBeliefTag, setSelectedBeliefTag] = useState<string>('');
  const [disclosures, setDisclosures] = useState<DisclosureItem[]>([]);
  const [widgetStyles, setWidgetStyles] = useState<WidgetStyles>({
    textColor: '#000000',
    bgColor: '#ffffff',
    bgOpacity: 100,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const selectedBelief = beliefs.find((b) => b.slug === selectedBeliefTag);
  const hasRealSelection = !!selectedBelief;

  useEffect(() => {
    const beliefTag = String(node.codeHookParams?.[0] || '');
    const payloadJson = String(node.codeHookParams?.[1] || '');

    if (beliefTag && beliefTag !== 'BELIEF') {
      setMode('belief');
    } else {
      setMode('open');
    }

    setSelectedBeliefTag(beliefTag && beliefTag !== 'BELIEF' ? beliefTag : '');
    const currentBelief = beliefs.find((b) => b.slug === beliefTag);

    if (payloadJson) {
      try {
        const parsed = JSON.parse(payloadJson);
        setWidgetStyles(
          parsed.styles || {
            textColor: '#000000',
            bgColor: '#ffffff',
            bgOpacity: 100,
          }
        );
        const loadedDisclosures =
          (parsed.disclosures as StoredDisclosureItem[]) || [];

        if (currentBelief) {
          const scaleKeys =
            currentBelief.scale === 'custom'
              ? (currentBelief.customValues || []).map((v) => ({
                  slug: v,
                  name: v,
                }))
              : heldBeliefsScales[
                  currentBelief.scale as keyof typeof heldBeliefsScales
                ] || [];

          const actionCommand =
            currentBelief.scale === 'custom' ? 'identifyAs' : 'declare';
          const finalDisclosures: DisclosureItem[] = loadedDisclosures.map(
            (loadedItem) => {
              const isFromScale = scaleKeys.some(
                (sk) => sk.slug === loadedItem.beliefValue
              );

              return {
                ...loadedItem,
                id: generateId(),
                isCustom: !isFromScale,
                actionLisp: isFromScale
                  ? `(${actionCommand} ${beliefTag} ${quoteIfNecessary(actionCommand, loadedItem.beliefValue)})`
                  : loadedItem.actionLisp,
                isDisabled: false,
              };
            }
          );
          scaleKeys.forEach(({ slug, name }) => {
            if (!finalDisclosures.some((d) => d.beliefValue === slug)) {
              finalDisclosures.push({
                id: generateId(),
                beliefValue: slug,
                title: name,
                description: '',
                icon: 'chat-heart-fill',
                actionLisp: `(${actionCommand} ${beliefTag} ${quoteIfNecessary(actionCommand, slug)})`,
                isCustom: false,
                isDisabled: true,
              });
            }
          });
          setDisclosures(finalDisclosures);
        } else {
          const finalDisclosures: DisclosureItem[] = loadedDisclosures.map(
            (loadedItem) => ({
              ...loadedItem,
              id: generateId(),
              isCustom: true,
              isDisabled: false,
            })
          );
          setDisclosures(finalDisclosures);
        }
      } catch (e) {
        console.error('Error parsing disclosure payload:', e);
      }
    } else {
      setDisclosures([]);
      setWidgetStyles({
        textColor: '#000000',
        bgColor: '#ffffff',
        bgOpacity: 100,
      });
    }
    setIsDataLoaded(true);
  }, [node, beliefs]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const api = new TractStackAPI(tenantId);
        const {
          data: { beliefIds },
        } = await api.get('/api/v1/nodes/beliefs');
        if (!beliefIds?.length) {
          setBeliefs([]);
          return;
        }
        const {
          data: { beliefs },
        } = await api.post('/api/v1/nodes/beliefs', { beliefIds });
        setBeliefs(beliefs || []);
      } catch (error) {
        console.error('Error fetching beliefs:', error);
        setBeliefs([]);
      }
    };
    fetchData();
  }, [node]);

  const handleUpdate = () => {
    const disclosuresToStore: StoredDisclosureItem[] = disclosures
      .filter((d) => !d.isDisabled)
      .map(({ id, isDisabled, ...rest }) => rest);
    const payload = { styles: widgetStyles, disclosures: disclosuresToStore };
    onUpdate([selectedBeliefTag, JSON.stringify(payload)]);
  };

  const handleBeliefChange = (tag: string) => {
    setSelectedBeliefTag(tag);
    setWidgetStyles({
      textColor: '#000000',
      bgColor: '#ffffff',
      bgOpacity: 100,
    });
    const belief = beliefs.find((b) => b.slug === tag);
    let newDisclosures: DisclosureItem[] = [];
    if (belief) {
      const actionCommand =
        belief.scale === 'custom' ? 'identifyAs' : 'declare';
      const keys =
        belief.scale === 'custom'
          ? (belief.customValues || []).map((v) => ({ slug: v, name: v }))
          : heldBeliefsScales[belief.scale as keyof typeof heldBeliefsScales] ||
            [];

      newDisclosures = keys.map(({ slug, name }) => ({
        id: generateId(),
        beliefValue: slug,
        title: name,
        description: '',
        icon: 'chat-heart-fill',
        actionLisp: `(${actionCommand} ${tag} ${quoteIfNecessary(actionCommand, slug)})`,
        isCustom: false,
        isDisabled: false,
      }));
    }
    setDisclosures(newDisclosures);
  };

  const handleModeChange = (newMode: 'belief' | 'open') => {
    if (mode === newMode) return;

    setMode(newMode);
    setSelectedBeliefTag('');
    setDisclosures([]);
    setWidgetStyles({
      textColor: '#000000',
      bgColor: '#ffffff',
      bgOpacity: 100,
    });

    if (newMode === 'open') {
      onUpdate(['', '{}']);
    } else {
      onUpdate(['BELIEF', '{}']);
    }
  };

  const moveDisclosure = (id: string, direction: 'up' | 'down') => {
    const index = disclosures.findIndex((d) => d.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= disclosures.length) return;

    const newDisclosures = [...disclosures];
    const [movedItem] = newDisclosures.splice(index, 1);
    newDisclosures.splice(newIndex, 0, movedItem);
    setDisclosures(newDisclosures);
  };

  const addCustomDisclosure = () => {
    const newItem: DisclosureItem = {
      id: generateId(),
      beliefValue: `custom-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 6)}`,
      title: 'New Custom Item',
      description: '',
      icon: 'chat-heart-fill',
      actionLisp: '',
      isCustom: true,
      isDisabled: false,
    };
    setDisclosures([...disclosures, newItem]);
  };

  const updateDisclosure = (id: string, updates: Partial<DisclosureItem>) =>
    setDisclosures(
      disclosures.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );

  const updateWidgetStyles = (updates: Partial<WidgetStyles>) =>
    setWidgetStyles((prev) => ({ ...prev, ...updates }));

  const toggleDisclosure = (id: string) => {
    const itemToToggle = disclosures.find((d) => d.id === id);
    if (!itemToToggle) return;

    if (itemToToggle.isCustom) {
      setDisclosures(disclosures.filter((d) => d.id !== id));
    } else {
      setDisclosures(
        disclosures.map((d) =>
          d.id === id ? { ...d, isDisabled: !d.isDisabled } : d
        )
      );
    }
  };

  const handleColorChange = (
    key: 'textColor' | 'bgColor',
    hex: string | null
  ) => {
    updateWidgetStyles({ [key]: hex || '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-600">
          Configuration Mode
        </label>
        <div className="isolate mt-1 inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => handleModeChange('belief')}
            className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-bold ring-1 ring-inset ring-gray-300 focus:z-10 ${
              mode === 'belief'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            Belief-Driven
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('open')}
            className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-bold ring-1 ring-inset ring-gray-300 focus:z-10 ${
              mode === 'open'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            Open
          </button>
        </div>
      </div>
      {mode === 'belief' && (
        <div className="flex items-center gap-2">
          <select
            value={selectedBeliefTag}
            onChange={(e) => handleBeliefChange(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm"
            disabled={hasRealSelection}
          >
            <option value="">Select a Belief...</option>
            {beliefs.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.title} ({b.scale})
              </option>
            ))}
          </select>
          {hasRealSelection && (
            <button
              type="button"
              onClick={() => {
                setSelectedBeliefTag('');
                setDisclosures([]);
                onUpdate(['BELIEF', '{}']);
              }}
              className="rounded p-1 text-red-600 hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
      {(hasRealSelection || mode === 'open') && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex w-full items-center justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            <ChevronDownIcon className="mr-2 h-5 w-5" />
            Configure {disclosures.filter((d) => !d.isDisabled).length}{' '}
            Disclosure(s) & Styles
          </button>
        </div>
      )}

      <Dialog.Root
        open={isModalOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            handleUpdate();
            setIsModalOpen(false);
          }
        }}
        modal={true}
        preventScroll={true}
      >
        <Portal>
          <Dialog.Backdrop
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
            style={{ zIndex: 1001 }}
          />
          <Dialog.Positioner
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 1001 }}
          >
            <Dialog.Content
              className="w-full max-w-4xl overflow-hidden rounded-lg bg-slate-50 shadow-xl"
              style={{ height: '80vh' }}
            >
              <div className="flex h-full flex-col">
                <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3">
                  <Dialog.Title className="text-lg font-bold text-gray-900">
                    Disclosure Configuration
                    {selectedBelief && `: ${selectedBelief.title}`}
                  </Dialog.Title>
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto p-4">
                  {isDataLoaded ? (
                    <>
                      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <h3 className="font-bold text-gray-800">
                          Widget Styles
                        </h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <ColorPickerCombo
                              title="Background Color"
                              defaultColor={widgetStyles.bgColor}
                              onColorChange={(hex) =>
                                handleColorChange('bgColor', hex)
                              }
                              allowNull={true}
                              skipTailwind={false}
                            />
                          </div>
                          <div>
                            <ColorPickerCombo
                              title="Text Color"
                              defaultColor={widgetStyles.textColor}
                              onColorChange={(hex) =>
                                handleColorChange('textColor', hex)
                              }
                              allowNull={true}
                              skipTailwind={false}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600">
                              BG Opacity (%)
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={widgetStyles.bgOpacity}
                                onChange={(e) =>
                                  updateWidgetStyles({
                                    bgOpacity: parseInt(e.target.value),
                                  })
                                }
                                className="w-full"
                              />
                              <span className="w-12 text-center font-mono text-sm">
                                {widgetStyles.bgOpacity}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {disclosures.map((item, index) => (
                        <DisclosureItemEditor
                          key={item.id}
                          item={item}
                          onUpdate={(updates) =>
                            updateDisclosure(item.id, updates)
                          }
                          onToggle={() => toggleDisclosure(item.id)}
                          onMoveUp={() => moveDisclosure(item.id, 'up')}
                          onMoveDown={() => moveDisclosure(item.id, 'down')}
                          isFirst={index === 0}
                          isLast={index === disclosures.length - 1}
                        />
                      ))}

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={addCustomDisclosure}
                          className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-500 hover:border-cyan-600 hover:text-cyan-600"
                        >
                          <PlusIcon className="mr-2 h-5 w-5" />
                          Add Custom Disclosure
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center">
                      Loading configuration...
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 justify-end border-t border-gray-200 bg-white px-6 py-3">
                  <Dialog.CloseTrigger asChild>
                    <button className="rounded bg-gray-600 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">
                      Close
                    </button>
                  </Dialog.CloseTrigger>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
}
