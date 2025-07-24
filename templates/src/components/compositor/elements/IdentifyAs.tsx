import { classNames } from '@/utils/helpers';

const SingleIdentifyAs = ({
  value,
  target,
  noprompt,
}: {
  value: { slug: string; target: string; extra: string };
  target: string;
  noprompt: boolean;
}) => {
  const thisTitle = noprompt ? `Tell me more!` : value.target;

  return (
    <div className="mt-3 block w-fit">
      <button
        type="button"
        className={classNames(
          `bg-gray-100 ring-orange-500 hover:bg-orange-200`,
          `rounded-md px-3 py-2 text-lg text-black shadow-sm ring-1 ring-inset`
        )}
        disabled
      >
        <div className="flex items-center">
          <span
            aria-label="Color swatch for belief"
            className={classNames(
              `motion-safe:animate-pulse`,
              `bg-orange-500`,
              `inline-block h-2 w-2 flex-shrink-0 rounded-full`
            )}
          />
          <span className="ml-3 block w-fit whitespace-normal text-left">
            {thisTitle}
          </span>
        </div>
      </button>
    </div>
  );
};

export const IdentifyAs = ({
  value,
  classNames = '',
}: {
  value: { slug: string; target: string; extra: string };
  classNames: string;
}) => {
  const targets =
    typeof value.target === `string`
      ? value.target.split(',').map((t) => t.trim())
      : value.target;
  const extra = value && typeof value.extra === `string` ? value.extra : null;
  const noprompt = extra === ``;

  return (
    <>
      {extra ? <span className={classNames}>{extra}</span> : null}
      <div className="flex flex-wrap gap-2">
        {targets.map((target, index) => (
          <SingleIdentifyAs
            key={`${value.slug}-${index}`}
            value={{ ...value, target }}
            target={target}
            noprompt={noprompt}
          />
        ))}
      </div>
    </>
  );
};
