import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';

interface Props {
  name: string;
  values: {
    mobile: string;
    tablet?: string;
    desktop?: string;
  };
  onRemove: (name: string) => void;
  onUpdate: (name: string) => void;
}

const SelectedTailwindClass = ({ name, values, onRemove, onUpdate }: Props) => {
  const entries = Object.entries(values).filter(([, value]) => value);

  const title =
    entries.length === 1 && entries[0][0] === 'mobile'
      ? entries[0][1]
      : entries
          .map(([viewport, value]) => `${viewport[0]}:${value}`)
          .join(', ');

  return (
    <div className="text-myblack hover:bg-mygreen/20 w-fit rounded border border-slate-200 p-2 text-sm">
      <div title={title} className="flex items-center gap-2 font-bold">
        <button onClick={() => onUpdate(name)}>
          {tailwindClasses[name]?.title || name}
        </button>
        <button
          onClick={() => onRemove(name)}
          className="rounded-full p-0.5 transition-colors hover:bg-slate-100"
          aria-label={`Remove ${name} class`}
          title={`Remove ${tailwindClasses[name]?.title || name} class`}
        >
          <XMarkIcon className="text-mydarkgrey h-4 w-4 hover:font-bold hover:text-black" />
        </button>
      </div>
    </div>
  );
};

export default SelectedTailwindClass;
