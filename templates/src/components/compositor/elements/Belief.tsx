import { useState, useEffect } from 'react';
import { Select } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import CheckIcon from '@heroicons/react/20/solid/CheckIcon';
import ChevronUpDownIcon from '@heroicons/react/20/solid/ChevronUpDownIcon';
import { heldBeliefsScales, heldBeliefsTitles } from '@/constants/beliefs';
import { classNames } from '@/utils/helpers';
import type { BeliefOptionDatum } from '@/types/compositorTypes';

export const Belief = ({
  value,
}: {
  value: { slug: string; scale: string; extra: string };
}) => {
  const thisScaleLookup = value.scale as keyof typeof heldBeliefsScales;
  const extra = value && typeof value.extra === `string` ? value.extra : null;
  const thisTitle = heldBeliefsTitles[thisScaleLookup];
  const thisScaleRaw = heldBeliefsScales[thisScaleLookup].sort(function (
    a: BeliefOptionDatum,
    b: BeliefOptionDatum
  ) {
    return b.id - a.id;
  });
  const start = {
    id: 0,
    slug: '0',
    name: thisTitle,
    color: `bg-myorange`,
  };
  const thisScale = [start, ...thisScaleRaw];
  const [selected, setSelected] = useState(start);

  // Create collection for Ark UI Select component
  const collection = createListCollection({
    items: thisScale,
    itemToValue: (item) => item.slug,
    itemToString: (item) => item.name,
  });

  // Always start with the default option since we're in readonly mode
  useEffect(() => {
    setSelected(start);
  }, []);

  // No-op handler since we're in readonly mode
  const handleClick = () => {
    // Do nothing - component is effectively readonly
    return false;
  };

  // CSS to properly style the select items with hover and selection
  const selectItemStyles = `
    .belief-item[data-highlighted] {
      background-color: #f1f5f9; /* bg-slate-200 */
      color: #0891b2; /* text-myblue */
    }
    .belief-item[data-highlighted] .belief-indicator {
      color: #0891b2; /* text-myblue */
    }
    .belief-item[data-state="checked"] .belief-indicator {
      display: flex;
    }
    .belief-item .belief-indicator {
      display: none;
    }
    .belief-item[data-state="checked"] {
      text-decoration: underline;
    }
  `;

  return (
    <>
      <style>{selectItemStyles}</style>
      {extra ? <span className="mr-2">{extra}</span> : null}
      <div className="mt-3 block w-fit">
        <Select.Root
          collection={collection}
          value={[selected.slug]}
          onValueChange={handleClick}
          defaultValue={[start.slug]}
          disabled={true}
        >
          <Select.Control
            className={classNames(
              selected?.color
                ? `border-${selected.color.substring(3)}`
                : `bg-slate-200`,
              `relative w-full cursor-default rounded-md border bg-white py-2 pl-3 pr-10 text-left text-black opacity-75 shadow-sm`
            )}
          >
            <Select.Trigger className="flex w-full items-center justify-between">
              <span className="flex items-center">
                <span
                  aria-label="Color swatch for belief"
                  className={classNames(
                    selected?.color ? selected.color : `bg-myorange`,
                    `inline-block h-2 w-2 flex-shrink-0 rounded-full`
                  )}
                />
                <span className="ml-3 block truncate">
                  {selected?.name || thisTitle}
                </span>
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="text-mylightgrey h-5 w-5"
                  aria-hidden="true"
                />
              </span>
            </Select.Trigger>
          </Select.Control>

          <Portal>
            <Select.Positioner>
              <Select.Content className="absolute z-50 mt-1 max-h-60 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {thisScale.map((factor) => (
                  <Select.Item
                    key={factor.id}
                    item={factor}
                    className="belief-item relative cursor-default select-none py-2 pl-3 pr-9 text-black"
                  >
                    <div className="flex items-center">
                      <span
                        className={classNames(
                          factor.color,
                          `inline-block h-2 w-2 flex-shrink-0 rounded-full`
                        )}
                        aria-hidden="true"
                      />
                      <Select.ItemText className="ml-3 block truncate">
                        {factor.name}
                      </Select.ItemText>
                    </div>

                    <Select.ItemIndicator className="belief-indicator absolute inset-y-0 right-0 flex items-center px-2 text-black">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
      </div>
    </>
  );
};
