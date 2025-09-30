import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Combobox } from '@ark-ui/react';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import {
  hexToTailwind,
  tailwindToHex,
  getTailwindColorOptions,
  findClosestTailwindColor,
  getComputedColor,
} from '@/utils/compositor/tailwindColors';
import { debounce, useDropdownDirection } from '@/utils/helpers';
import type { BrandConfig } from '@/types/tractstack';

export interface ColorPickerProps {
  title: string;
  config: BrandConfig;
  defaultColor: string;
  onColorChange: (color: string) => void;
  skipTailwind?: boolean;
  allowNull?: boolean;
}

const ColorPickerCombo = ({
  title,
  defaultColor,
  onColorChange,
  config,
  skipTailwind = false,
  allowNull = false,
}: ColorPickerProps) => {
  const [hexColor, setHexColor] = useState(defaultColor);
  const initialTailwindColor = skipTailwind
    ? ''
    : hexToTailwind(defaultColor, config.BRAND_COLOURS) || '';
  const [selectedTailwindColor, setSelectedTailwindColor] =
    useState(initialTailwindColor);
  const [query, setQuery] = useState('');
  const [initialRender, setInitialRender] = useState(true);

  // Add ref and useDropdownDirection hook
  const comboboxRef = useRef<HTMLDivElement>(null);
  const { openAbove } = useDropdownDirection(comboboxRef);

  // Get all available Tailwind color options
  const allTailwindColorOptions = useMemo(() => {
    return getTailwindColorOptions();
  }, []);

  // Filter colors based on search query
  const filteredColors = useMemo(() => {
    return query === ''
      ? allTailwindColorOptions
      : allTailwindColorOptions.filter((color) =>
          color.toLowerCase().includes(query.toLowerCase())
        );
  }, [allTailwindColorOptions, query]);

  // Create collection for combobox
  const collection = useMemo(() => {
    // Make sure all tailwind colors are included in the collection
    const items = [...allTailwindColorOptions];

    // Ensure the initial color is in the collection if it exists
    if (initialTailwindColor && !items.includes(initialTailwindColor)) {
      items.push(initialTailwindColor);
    }

    return createListCollection({
      items,
    });
  }, [allTailwindColorOptions, initialTailwindColor]);

  // Set default value during initial render
  useEffect(() => {
    if (initialRender && initialTailwindColor) {
      setInitialRender(false);
    }
  }, [initialRender, initialTailwindColor]);

  // Handle hex color picker changes
  const handleHexColorChange = useCallback(
    debounce((newHexColor: string) => {
      const computedColor = getComputedColor(newHexColor);
      setHexColor(computedColor);

      if (!skipTailwind) {
        const exactTailwindColor = hexToTailwind(
          computedColor,
          config.BRAND_COLOURS
        );
        if (exactTailwindColor) {
          setSelectedTailwindColor(exactTailwindColor);
          setQuery('');
        } else {
          const closestColor = findClosestTailwindColor(computedColor);
          if (closestColor) {
            const tailwindClass = `${closestColor.name}-${closestColor.shade}`;
            setSelectedTailwindColor(tailwindClass);
            setQuery('');
          } else {
            setSelectedTailwindColor('');
            setQuery('');
          }
        }
      }

      onColorChange(computedColor);
    }, 16),
    [onColorChange, skipTailwind, config.BRAND_COLOURS]
  );

  // Handle Tailwind color selection
  const handleTailwindColorChange = useCallback(
    (details: { value: string[] }) => {
      if (skipTailwind) return;

      const newTailwindColor = details.value[0] || '';
      setSelectedTailwindColor(newTailwindColor);
      setQuery(''); // Clear query after selection

      const newHexColor = getComputedColor(
        tailwindToHex(`bg-${newTailwindColor}`, config.BRAND_COLOURS || null)
      );
      setHexColor(newHexColor);
      onColorChange(newHexColor);
    },
    [onColorChange, config, skipTailwind]
  );

  // New function to handle color removal
  const handleRemoveColor = useCallback(() => {
    setHexColor('');
    setSelectedTailwindColor('');
    setQuery('');
    onColorChange('');
  }, [onColorChange]);

  const handleInputChange = useCallback(
    (details: Combobox.InputValueChangeDetails) => {
      setQuery(details.inputValue);
    },
    []
  );

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .color-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .color-item[data-highlighted] .color-indicator {
      color: white !important;
    }
    .color-item[data-state="checked"] .color-indicator {
      display: flex;
    }
    .color-item .color-indicator {
      display: none;
    }
    .color-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div>
      {title && (
        <span className="text-mydarkgrey block py-2 text-sm">{title}</span>
      )}
      <div className="flex items-center space-x-2">
        {allowNull && !hexColor ? (
          // Show empty state with angled stripes pattern when allowNull is true and no color is set
          <div className="border-mydarkgrey relative h-9 w-12 overflow-hidden rounded">
            {/* Angled stripes pattern to represent transparency */}
            <div
              className="absolute inset-0"
              style={{
                background: `repeating-linear-gradient(
            45deg,
            #f3f4f6 0px,
            #f3f4f6 4px,
            #e5e7eb 4px,
            #e5e7eb 8px
          )`,
              }}
            />
            {/* Hidden color input for when user clicks to set a color */}
            <input
              type="color"
              value="#ffffff"
              onChange={(e) => handleHexColorChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              title="Click to set a color"
            />
          </div>
        ) : (
          <input
            type="color"
            value={hexColor || '#ffffff'}
            onChange={(e) => handleHexColorChange(e.target.value)}
            className="border-mydarkgrey h-9 w-12 rounded"
          />
        )}
        {allowNull && (
          <button
            onClick={handleRemoveColor}
            className="border-mydarkgrey flex h-9 w-9 items-center justify-center rounded"
          >
            <XMarkIcon className="text-mydarkgrey h-5 w-5" aria-hidden="true" />
          </button>
        )}
        {!skipTailwind && (
          <div className="flex-grow">
            <style>{comboboxItemStyles}</style>
            {/* Drop down menu for tailwind colors */}
            <Combobox.Root
              collection={collection}
              defaultValue={initialTailwindColor ? [initialTailwindColor] : []}
              value={selectedTailwindColor ? [selectedTailwindColor] : []}
              onValueChange={handleTailwindColorChange}
              onInputValueChange={handleInputChange}
              selectionBehavior="replace"
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
              positioning={{
                placement: openAbove ? 'top' : 'bottom',
                gutter: 4,
                sameWidth: true,
              }}
            >
              <Combobox.Control ref={comboboxRef}>
                <div className="relative">
                  <Combobox.Input
                    className="border-mydarkgrey focus:border-myblue focus:ring-myblue xs:text-sm w-full max-w-xl rounded-md py-2 pl-3 pr-10 shadow-sm"
                    placeholder="Search Tailwind colors..."
                    autoComplete="off"
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="text-mydarkgrey h-5 w-5"
                      aria-hidden="true"
                    />
                  </Combobox.Trigger>
                </div>
              </Combobox.Control>

              <Portal>
                <Combobox.Positioner style={{ zIndex: 1002 }}>
                  <Combobox.Content className="xs:text-sm max-h-64 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {filteredColors.length === 0 ? (
                      <div className="relative cursor-default select-none py-2 pl-3 pr-4 text-black">
                        Nothing found.
                      </div>
                    ) : (
                      filteredColors.map((color) => (
                        <Combobox.Item
                          key={color}
                          item={color}
                          className="color-item relative cursor-default select-none py-2 pl-3 pr-4"
                        >
                          <div className="flex items-center">
                            <div
                              className="mr-3 h-6 w-6 flex-shrink-0 rounded"
                              style={{
                                backgroundColor: tailwindToHex(
                                  `bg-${color}`,
                                  config.BRAND_COLOURS || null
                                ),
                              }}
                            />
                            <span className="block truncate">{color}</span>
                            <span className="color-indicator absolute inset-y-0 right-0 flex items-center pr-3 text-cyan-600">
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          </div>
                        </Combobox.Item>
                      ))
                    )}
                  </Combobox.Content>
                </Combobox.Positioner>
              </Portal>
            </Combobox.Root>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPickerCombo;
