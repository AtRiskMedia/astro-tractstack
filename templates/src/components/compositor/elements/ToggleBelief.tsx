import { Switch } from '@ark-ui/react';
import { classNames } from '@/utils/helpers';

export const ToggleBelief = ({ prompt }: { prompt: string }) => {
  return (
    <div className={classNames(`mt-6 flex items-center`)}>
      <Switch.Root
        checked={false}
        disabled={true}
        className="inline-flex items-center"
      >
        <Switch.Control
          className={classNames(
            `bg-myblue`,
            `relative inline-flex h-6 w-11 flex-shrink-0`,
            `cursor-not-allowed opacity-50`,
            `rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2`
          )}
        >
          <Switch.Thumb
            className={classNames(
              `translate-x-0 motion-safe:animate-wig`,
              `pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out`
            )}
          />
        </Switch.Control>
        <Switch.HiddenInput />
        <div className="ml-3 flex h-6 items-center">
          <Switch.Label className="cursor-default">
            <span>{prompt}</span>
          </Switch.Label>
        </div>
      </Switch.Root>
    </div>
  );
};
