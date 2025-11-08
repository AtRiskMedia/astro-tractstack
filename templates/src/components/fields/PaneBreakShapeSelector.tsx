import { useState, useMemo } from 'react';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';
import DeviceTabletIcon from '@heroicons/react/24/outline/DeviceTabletIcon';
import ComputerDesktopIcon from '@heroicons/react/24/outline/ComputerDesktopIcon';
import { SvgBreaks } from '@/constants/shapes';

interface Props {
  viewport: 'mobile' | 'tablet' | 'desktop';
  selectedImage: string;
  onChange: (image: string) => void;
}

export default function PaneBreakShapeSelector({
  viewport,
  selectedImage,
  onChange,
}: Props) {
  const availableShapes = [
    'none',
    ...Object.keys(SvgBreaks).map((key) => key.replace('kCz', '')),
  ];
  const [query, setQuery] = useState('');

  const collection = useMemo(() => {
    return createListCollection({
      items: availableShapes,
      itemToValue: (item) => item,
      itemToString: (item) => item,
    });
  }, [availableShapes]);

  const Icon =
    viewport === 'mobile'
      ? DevicePhoneMobileIcon
      : viewport === 'tablet'
        ? DeviceTabletIcon
        : ComputerDesktopIcon;

  const renderShapePreview = (shape: string) => {
    if (shape === 'none') return null;

    const fullShapeName = `kCz${shape}`;
    if (!SvgBreaks[fullShapeName]) return null;

    const svgData = SvgBreaks[fullShapeName];
    return (
      <div className="flex w-56 items-center justify-center">
        <svg
          viewBox={`0 0 ${svgData.viewBox[0]} ${svgData.viewBox[1]}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d={svgData.path} fill="currentColor" />
        </svg>
      </div>
    );
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .shape-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .shape-item[data-highlighted] .shape-indicator {
      color: white;
    }
    .shape-item[data-state="checked"] .shape-indicator {
      display: flex;
    }
    .shape-item .shape-indicator {
      display: none;
    }
    .shape-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="relative flex items-center space-x-2">
      <style>{comboboxItemStyles}</style>
      <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />

      <Combobox.Root
        collection={collection}
        value={[selectedImage]}
        defaultValue={[selectedImage]}
        defaultInputValue={selectedImage}
        inputValue={query || selectedImage}
        onValueChange={(details) => onChange(details.value[0])}
        onInputValueChange={(details) => setQuery(details.inputValue)}
        loopFocus={true}
        openOnKeyPress={true}
        composite={true}
      >
        <div className="relative mt-1 flex-grow">
          <div className="border-mydarkgrey focus-within:border-myblue focus-within:ring-myblue flex w-full items-center rounded-md border shadow-sm">
            <Combobox.Input
              className="xs:text-sm w-full rounded-l-md border-0 py-2 pl-3 pr-0 focus:ring-0"
              autoComplete="off"
            />
            <div className="py-2 pr-8">{renderShapePreview(selectedImage)}</div>
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="text-mydarkgrey h-5 w-5"
                aria-hidden="true"
              />
            </Combobox.Trigger>
          </div>
        </div>

        <Combobox.Content className="xs:text-sm absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {collection.items.map((shape) => (
            <Combobox.Item
              key={shape}
              item={shape}
              className="shape-item relative flex cursor-default select-none items-center py-2 pl-10 pr-4"
            >
              <span className="mr-2 block truncate">{shape}</span>
              {renderShapePreview(shape)}
              <span className="shape-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                <CheckIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Root>
    </div>
  );
}
