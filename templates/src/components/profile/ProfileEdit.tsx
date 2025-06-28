import { useEffect, useState, useMemo } from 'react';
import { Select } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronRightIcon from '@heroicons/react/20/solid/ChevronRightIcon';
import ChevronDownIcon from '@heroicons/react/20/solid/ChevronDownIcon';
import ArrowPathRoundedSquareIcon from '@heroicons/react/24/outline/ArrowPathRoundedSquareIcon';
import BellSlashIcon from '@heroicons/react/24/outline/BellSlashIcon';
import BoltIcon from '@heroicons/react/24/outline/BoltIcon';
import ChatBubbleBottomCenterIcon from '@heroicons/react/24/outline/ChatBubbleBottomCenterIcon';
import { ProfileStorage } from '../../utils/profileStorage';
import type { FormEvent } from 'react';

// Contact persona options - matches Go backend expectations
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
  {
    id: 'none',
    title: 'None',
    description: 'Disables all communications from us.',
    disabled: true,
  },
];

interface ProfileEditProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

async function updateProfile(payload: {
  firstname: string;
  email: string;
  codeword: string;
  persona: string;
  bio: string;
}) {
  try {
    const sessionData = ProfileStorage.prepareHandshakeData();

    const response = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstname: payload.firstname,
        email: payload.email,
        codeword: payload.codeword,
        contactPersona: payload.persona,
        shortBio: payload.bio,
        sessionId: sessionData.sessionId,
        isUpdate: true, // This is an update operation
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.error || 'Profile update failed' };
    }

    // Store updated profile data and tokens
    if (result.profile) {
      ProfileStorage.setProfileData({
        firstname: result.profile.Firstname, // Capital F
        contactPersona: result.profile.ContactPersona, // Capital C
        email: result.profile.Email, // Capital E
        shortBio: result.profile.ShortBio, // Capital S
      });
    }

    if (result.token) {
      ProfileStorage.storeProfileToken(result.token);
    }

    if (result.encryptedEmail && result.encryptedCode) {
      ProfileStorage.storeEncryptedCredentials(
        result.encryptedEmail,
        result.encryptedCode
      );
    }

    return { success: true, data: result };
  } catch (e) {
    console.error('Profile update error:', e);
    return { success: false, error: 'Network error occurred' };
  }
}

const classNames = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const ProfileEdit = ({ onSuccess, onError }: ProfileEditProps) => {
  const [submitted, setSubmitted] = useState<boolean | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [bio, setBio] = useState('');
  const [codeword, setCodeword] = useState('');
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [personaSelected, setPersonaSelected] = useState(contactPersona[0]);

  // Create collection for Ark UI Select
  const personaCollection = useMemo(() => {
    return createListCollection({
      items: contactPersona,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.title,
    });
  }, []);

  const Icon =
    personaSelected.title === `DMs open`
      ? ChatBubbleBottomCenterIcon
      : personaSelected.title === `Major Updates Only`
        ? ArrowPathRoundedSquareIcon
        : personaSelected.title === `All Updates`
          ? BoltIcon
          : BellSlashIcon;

  const iconClass =
    personaSelected.title === `DMs open`
      ? `text-black`
      : personaSelected.title === `Major Updates Only`
        ? `text-gray-600`
        : personaSelected.title === `All Updates`
          ? `text-orange-500`
          : `text-gray-600`;

  const barClass =
    personaSelected.title === `DMs open`
      ? `bg-green-400/80`
      : personaSelected.title === `All Updates`
        ? `bg-orange-400/80`
        : personaSelected.title === `Major Updates Only`
          ? `bg-orange-400/50`
          : `bg-gray-100/5`;

  const barWidth =
    personaSelected.title === `DMs open`
      ? `100%`
      : personaSelected.title === `All Updates`
        ? `100%`
        : personaSelected.title === `Major Updates Only`
          ? `50%`
          : `2%`;

  // Initialize form with current profile data
  useEffect(() => {
    const profileData = ProfileStorage.getProfileData();

    if (profileData.firstname) setFirstname(profileData.firstname);
    if (profileData.email) setEmail(profileData.email);
    if (profileData.shortBio) setBio(profileData.shortBio);
    if (profileData.contactPersona) {
      const pref = contactPersona.find(
        (p) => p.id === profileData.contactPersona
      );
      if (pref) setPersonaSelected(pref);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setIsLoading(true);
    setSaved(false);

    if (firstname && codeword && email && personaSelected.id) {
      const result = await updateProfile({
        firstname,
        email,
        codeword,
        bio,
        persona: personaSelected.id,
      });

      if (result.success) {
        setSaved(true);
        onSuccess?.();
      } else {
        onError?.(result.error || 'Profile update failed');
      }
    }

    setIsLoading(false);
  };

  const handlePersonaChange = (details: { value: string[] }) => {
    const selectedId = details.value[0];
    if (selectedId) {
      const selected = contactPersona.find((item) => item.id === selectedId);
      if (selected) {
        setPersonaSelected(selected);
      }
    }
  };

  useEffect(() => {
    if (saved) {
      const timeout = setTimeout(() => setSaved(false), 7000);
      return () => clearTimeout(timeout);
    }
  }, [saved]);

  // CSS to properly style the select items with hover and selection
  const selectItemStyles = `
    .persona-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .persona-item[data-highlighted] .persona-indicator {
      color: white;
    }
    .persona-item[data-state="checked"] .persona-indicator {
      display: flex;
    }
    .persona-item .persona-indicator {
      display: none;
    }
    .persona-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <>
      <style>{selectItemStyles}</style>
      <h3 className="font-action py-6 text-xl text-blue-600">
        Welcome to Tract Stack
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          {!personaSelected?.disabled ? (
            <>
              <div className="col-span-3 px-4 pt-6 md:col-span-1">
                <label
                  htmlFor="firstname"
                  className="block text-sm text-gray-600"
                >
                  First name
                </label>
                <input
                  type="text"
                  name="firstname"
                  id="firstname"
                  autoComplete="given-name"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  disabled={isLoading}
                  className={classNames(
                    `text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-cyan-600 focus:ring-cyan-600`,
                    submitted && firstname === ``
                      ? `border-red-500`
                      : `border-gray-300`
                  )}
                />
                {submitted && firstname === `` && (
                  <span className="px-4 text-xs text-red-500">
                    Required field.
                  </span>
                )}
              </div>

              <div className="col-span-3 px-4 pt-6 md:col-span-2">
                <label htmlFor="email" className="block text-sm text-gray-600">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className={classNames(
                    `text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-cyan-600 focus:ring-cyan-600`,
                    submitted && email === ``
                      ? `border-red-500`
                      : `border-gray-300`
                  )}
                />
                {submitted && email === `` && (
                  <span className="px-4 text-xs text-red-500">
                    Required field.
                  </span>
                )}
              </div>
            </>
          ) : null}

          <div className="col-span-3 px-4 pt-6">
            <div className="flex items-center text-sm">
              <div className="pr-8 text-sm text-black">
                <Select.Root
                  collection={personaCollection}
                  defaultValue={[personaSelected.id]}
                  onValueChange={handlePersonaChange}
                  disabled={isLoading}
                >
                  <Select.Label className="mb-2 block text-sm text-gray-600">
                    Choose your level of consent:
                  </Select.Label>

                  <Select.Control className="relative mt-2">
                    <Select.Trigger className="text-md relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left leading-6 text-black shadow-sm ring-1 ring-inset ring-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600">
                      <Select.ValueText className="block truncate p-2">
                        {personaSelected.title}
                      </Select.ValueText>
                      <Select.Indicator className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDownIcon
                          className="h-5 w-5 text-gray-600"
                          aria-hidden="true"
                        />
                      </Select.Indicator>
                    </Select.Trigger>
                  </Select.Control>

                  <Portal>
                    <Select.Positioner>
                      <Select.Content className="z-10 mt-2 w-full overflow-auto rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {personaCollection.items.map((option) => (
                          <Select.Item
                            key={option.id}
                            item={option}
                            className="persona-item cursor-default select-none p-2 text-sm text-black hover:bg-slate-100"
                          >
                            <Select.ItemText className="block truncate">
                              {option.title}
                            </Select.ItemText>
                            <Select.ItemIndicator className="persona-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                              {/* CheckIcon would go here if needed */}
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </div>
              <div className="flex flex-1 items-center">
                <div
                  aria-hidden="true"
                  className="ml-1 flex flex-1 items-center"
                >
                  <Icon
                    className={classNames(iconClass, `h-5 w-5 flex-shrink-0`)}
                    aria-hidden="true"
                  />
                  <div className="relative ml-3 flex-1">
                    <div className="h-7 rounded-full border border-gray-300/20" />
                    <div
                      className={classNames(
                        `absolute inset-y-0 rounded-full border-gray-300/20`,
                        barClass
                      )}
                      style={{ width: barWidth }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-right text-sm text-gray-600">
              {personaSelected.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-3 px-4 pt-6">
            <label htmlFor="bio" className="block text-sm text-gray-600">
              Hello {firstname}. Is there anything else you would like to share?
            </label>
            <div className="mt-2">
              <textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={280}
                className="text-md block w-full rounded-md border-gray-300 bg-white p-3 shadow-sm focus:border-cyan-600 focus:ring-cyan-600"
                placeholder="Your one-liner bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="col-span-1 px-4 pt-6">
            <label htmlFor="codeword" className="block text-sm text-gray-600">
              Re-Enter your secret code word to save any changes:
            </label>
            <input
              type="password"
              name="codeword"
              id="codeword"
              autoComplete="current-password"
              value={codeword}
              onChange={(e) => setCodeword(e.target.value)}
              disabled={isLoading}
              className={classNames(
                `text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-cyan-600 focus:ring-cyan-600`,
                submitted && codeword === ``
                  ? `border-red-500`
                  : `border-gray-300`
              )}
            />
            {submitted && codeword === `` && (
              <span className="px-4 text-xs text-red-500">Required field.</span>
            )}
          </div>

          {saved ? (
            <div className="align-center font-action col-span-3 flex justify-center py-12 text-green-500">
              Profile Saved
            </div>
          ) : null}

          {codeword !== `` ? (
            <div className="align-center col-span-3 flex justify-center py-12">
              {!personaSelected?.disabled ? (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex rounded-md bg-cyan-600/10 px-3.5 py-1.5 text-base leading-7 text-black shadow-sm hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="pr-4">
                    {isLoading ? 'Saving...' : 'Save Profile'}
                  </span>
                  <ChevronRightIcon
                    className="mr-3 h-5 w-5"
                    aria-hidden="true"
                  />
                </button>
              ) : (
                `Profile disabled. (Privacy mode enabled)`
              )}
            </div>
          ) : null}
        </div>
      </form>
    </>
  );
};
