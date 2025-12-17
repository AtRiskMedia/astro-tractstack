import { Select } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/20/solid/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/20/solid/CheckIcon';

export interface SignupProps {
  persona: string;
  prompt: string;
  clarifyConsent: boolean;
  id: string;
}

// Static contact persona data
const contactPersona = [
  {
    id: 'major',
    title: 'Major Updates Only',
    description: 'Will only send major updates and do so infrequently.',
  },
  {
    id: 'all',
    title: 'All Updates',
    description: 'Be fully in the know!',
  },
  {
    id: 'open',
    title: 'DMs open',
    description: "Leave your contact details and we'll get in touch!",
  },
];

export const SignUp = ({
  persona,
  prompt,
  clarifyConsent,
  id,
}: SignupProps) => {
  // Static values for visual representation
  const personaSelected =
    contactPersona.find((p) => p.id === persona) || contactPersona[0];

  // Create collection for Ark UI Select
  const personaCollection = createListCollection({
    items: contactPersona,
    itemToValue: (item) => item.id,
    itemToString: (item) => item.title,
  });

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-inner">
      <h3 className="mb-4 text-lg font-bold text-gray-900">{prompt}</h3>

      <form className="space-y-4">
        <div>
          <label
            htmlFor={`${id}-firstname`}
            className="mb-1 block text-sm font-bold text-gray-700"
          >
            First Name
          </label>
          <input
            type="text"
            id={`${id}-firstname`}
            name="firstname"
            placeholder="First name"
            autoComplete="given-name"
            disabled
            className="w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 opacity-50 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600"
          />
        </div>

        <div>
          <label
            htmlFor={`${id}-email`}
            className="mb-1 block text-sm font-bold text-gray-700"
          >
            Email Address
          </label>
          <input
            type="email"
            id={`${id}-email`}
            name="email"
            placeholder="Email address"
            autoComplete="email"
            disabled
            className="w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 opacity-50 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600"
          />
        </div>

        <div>
          <label
            htmlFor={`${id}-codeword`}
            className="mb-1 block text-sm font-bold text-gray-700"
          >
            Code Word
          </label>
          <input
            type="password"
            id={`${id}-codeword`}
            name="codeword"
            placeholder="Choose a code word"
            autoComplete="new-password"
            disabled
            className="w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 opacity-50 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            Remember this code word to manage your preferences later.
          </p>
        </div>

        {clarifyConsent && (
          <div>
            <Select.Root
              collection={personaCollection}
              value={[personaSelected.id]}
              positioning={{ sameWidth: true }}
              disabled
            >
              <div className="mb-1 block text-sm font-bold text-gray-700">
                Contact Preferences
              </div>
              <Select.Control className="relative">
                <Select.Trigger className="relative w-full cursor-not-allowed rounded-md bg-white py-2 pl-3 pr-10 text-left opacity-50 shadow-md focus:outline-none">
                  <Select.ValueText className="block truncate">
                    {personaSelected.title}
                  </Select.ValueText>
                  <Select.Indicator className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content className="sm:text-sm z-50 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
                    {personaCollection.items.map((option) => (
                      <Select.Item
                        key={option.id}
                        item={option}
                        className="relative cursor-default select-none py-2 pl-10 pr-4 text-black"
                      >
                        <div className="flex flex-col">
                          <Select.ItemText className="block truncate font-bold">
                            {option.title}
                          </Select.ItemText>
                          <span className="text-xs text-black">
                            {option.description}
                          </span>
                        </div>
                        <Select.ItemIndicator className="absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </div>
        )}

        <div>
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-md bg-cyan-700 px-4 py-2 text-sm font-bold text-white opacity-50 shadow-sm"
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignUp;
