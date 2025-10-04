import { useState, useEffect, useMemo } from 'react';
import { TractStackAPI } from '@/utils/api';
import { fullContentMapStore } from '@/stores/storykeep';
import { heldBeliefsScales } from '@/constants/beliefs';
import { biIcons } from '@/constants';
import type { BrandConfig } from '@/types/tractstack';
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

interface DisclosureItem {
  id: string;
  beliefValue: string;
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
  config: BrandConfig;
}

const generateId = (): string => Math.random().toString(36).substring(2, 9);

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

  const iconSelectorStyles = `
    .icon-item .icon-indicator { display: none; }
    .icon-item[data-state="checked"] .icon-indicator { display: flex; }
  `;

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
          />
          <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
            <i className={`bi bi-${value} mr-2 text-lg`}></i>
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
          </Combobox.Trigger>
        </Combobox.Control>
        <Portal>
          <Combobox.Positioner style={{ zIndex: 9010 }}>
            <Combobox.Content className="max-h-60 w-[--reference-width] overflow-y-auto rounded-md bg-white shadow-lg">
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
  config,
}: {
  item: DisclosureItem;
  onUpdate: (updates: Partial<DisclosureItem>) => void;
  onToggle: () => void;
  config: BrandConfig;
}) => {
  return (
    <div
      className={`space-y-4 rounded-lg border bg-white p-4 shadow-sm transition-opacity ${item.isDisabled ? 'border-gray-100 opacity-40' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-800">
          {item.title}{' '}
          <span className="text-xs font-normal text-gray-500">
            (for value: {item.beliefValue})
          </span>
        </h4>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded p-1 hover:bg-gray-100 ${item.isDisabled ? 'text-blue-600' : 'text-red-600'}`}
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
        <IconSelector
          value={item.icon}
          onChange={(value) => onUpdate({ icon: value })}
        />
        <div className="relative rounded-md border p-3">
          <ActionBuilderField
            value={item.actionLisp}
            onChange={(value) => onUpdate({ actionLisp: value })}
            contentMap={fullContentMapStore.get()}
          />
        </div>
      </fieldset>
    </div>
  );
};

export default function InteractiveDisclosureWidget({
  node,
  onUpdate,
  config,
}: InteractiveDisclosureWidgetProps) {
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [selectedBeliefTag, setSelectedBeliefTag] = useState<string>('');
  const [disclosures, setDisclosures] = useState<DisclosureItem[]>([]);
  const [widgetStyles, setWidgetStyles] = useState<WidgetStyles>({
    textColor: '',
    bgColor: '',
    bgOpacity: 100,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedBelief = beliefs.find((b) => b.slug === selectedBeliefTag);
  const hasRealSelection = !!selectedBelief;

  useEffect(() => {
    const beliefTag = String(node.codeHookParams?.[0] || '');
    const payloadJson = String(node.codeHookParams?.[1] || '');
    setSelectedBeliefTag(beliefTag && beliefTag !== 'BELIEF' ? beliefTag : '');

    const currentBelief = beliefs.find((b) => b.slug === beliefTag);

    if (payloadJson && currentBelief) {
      try {
        const parsed = JSON.parse(payloadJson);
        setWidgetStyles(
          parsed.styles || { textColor: '', bgColor: '', bgOpacity: 100 }
        );
        const loadedDisclosures = parsed.disclosures || {};

        const possibleKeys =
          currentBelief.scale === 'custom'
            ? (currentBelief.customValues || []).map((v) => ({
                slug: v,
                name: v,
              }))
            : heldBeliefsScales[
                currentBelief.scale as keyof typeof heldBeliefsScales
              ] || [];

        const allDisclosures = possibleKeys.map(({ slug, name }) => {
          if (loadedDisclosures[slug]) {
            return {
              ...(loadedDisclosures[slug] as StoredDisclosureItem),
              id: generateId(),
              beliefValue: slug,
              isDisabled: false,
            };
          }
          return {
            id: generateId(),
            beliefValue: slug,
            title: name,
            description: '',
            icon: 'app',
            actionLisp: '',
            isDisabled: true,
          };
        });
        setDisclosures(allDisclosures);
      } catch (e) {
        setDisclosures([]);
        setWidgetStyles({ textColor: '', bgColor: '', bgOpacity: 100 });
      }
    } else {
      setDisclosures([]);
      setWidgetStyles({ textColor: '', bgColor: '', bgOpacity: 100 });
    }
  }, [node, beliefs]);

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
        console.error('Error fetching beliefs:', error);
      }
    };
    fetchData();
  }, []);

  const handleUpdate = () => {
    const disclosuresToStore: Record<
      string,
      Omit<StoredDisclosureItem, 'beliefValue'>
    > = {};
    disclosures
      .filter((d) => !d.isDisabled)
      .forEach(({ id, beliefValue, isDisabled, ...rest }) => {
        if (beliefValue) {
          disclosuresToStore[beliefValue] = rest;
        }
      });
    const payload = { styles: widgetStyles, disclosures: disclosuresToStore };
    onUpdate([selectedBeliefTag, JSON.stringify(payload)]);
  };

  const handleBeliefChange = (tag: string) => {
    setSelectedBeliefTag(tag);
    const belief = beliefs.find((b) => b.slug === tag);
    let newDisclosures: DisclosureItem[] = [];
    if (belief) {
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
        icon: 'app',
        actionLisp: '',
        isDisabled: false,
      }));
    }
    setDisclosures(newDisclosures);
  };

  const updateDisclosure = (id: string, updates: Partial<DisclosureItem>) =>
    setDisclosures(
      disclosures.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  const updateWidgetStyles = (updates: Partial<WidgetStyles>) =>
    setWidgetStyles((prev) => ({ ...prev, ...updates }));
  const toggleDisclosure = (id: string) =>
    setDisclosures(
      disclosures.map((d) =>
        d.id === id ? { ...d, isDisabled: !d.isDisabled } : d
      )
    );

  return (
    <div className="space-y-4">
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

      {hasRealSelection && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex w-full items-center justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            <ChevronDownIcon className="mr-2 h-5 w-5" />
            Configure {disclosures.filter((d) => !d.isDisabled).length} of{' '}
            {disclosures.length} Disclosure(s) & Styles
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
                    Disclosure Configuration: {selectedBelief?.title}
                  </Dialog.Title>
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto p-4">
                  <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="font-bold text-gray-800">Widget Styles</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <ColorPickerCombo
                          title="Background Color"
                          defaultColor={widgetStyles.bgColor}
                          onColorChange={(hex) =>
                            updateWidgetStyles({ bgColor: hex })
                          }
                          config={config}
                          allowNull={true}
                        />
                      </div>
                      <div>
                        <ColorPickerCombo
                          title="Text Color"
                          defaultColor={widgetStyles.textColor}
                          onColorChange={(hex) =>
                            updateWidgetStyles({ textColor: hex })
                          }
                          config={config}
                          allowNull={true}
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
                  {disclosures.map((item) => (
                    <DisclosureItemEditor
                      key={item.id}
                      item={item}
                      onUpdate={(updates) => updateDisclosure(item.id, updates)}
                      onToggle={() => toggleDisclosure(item.id)}
                      config={config}
                    />
                  ))}
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
