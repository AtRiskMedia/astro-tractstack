/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { ProfileStorage } from '@/utils/profileStorage';
import type { FormEvent } from 'react';

// Contact persona options - matches Go backend expectations
const contactPersona = [
  {
    id: 'major',
    title: 'Major Updates Only',
    description: 'Will only send major updates and do so infrequently.',
    disabled: false,
  },
  {
    id: 'all',
    title: 'All Updates',
    description: 'Be fully in the know!',
    disabled: false,
  },
  {
    id: 'open',
    title: 'DMs open',
    description: "Leave your contact details and we'll get in touch!",
    disabled: false,
  },
  {
    id: 'none',
    title: 'None',
    description: 'Disables all communications from us.',
    disabled: false, // Changed from true to false to allow selection
  },
];

interface ProfileCreateProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

async function createProfile(payload: {
  firstname: string;
  email: string;
  codeword: string;
  persona: string;
  bio: string;
}) {
  try {
    const sessionData = ProfileStorage.prepareHandshakeData();
    const currentConsent = ProfileStorage.getConsent() || '1'; // default to true

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
        consent: currentConsent, // Include actual consent value
        isUpdate: false, // This is a create operation
      }),
    });

    const result = await response.json();

    console.log('Profile creation response:', {
      success: result.success,
      hasProfile: result.profile ? 'yes' : 'no',
      consent: result.consent,
      error: result.error,
    });

    if (!result.success) {
      ProfileStorage.clearProfile();
      return {
        success: false,
        error: result.error || 'Profile creation failed',
      };
    }

    // Store profile data and tokens - use lowercase field names consistently
    if (result.profile) {
      ProfileStorage.setProfileData({
        firstname: result.profile.firstname || result.profile.Firstname, // handle both cases
        contactPersona:
          result.profile.contactPersona || result.profile.ContactPersona,
        email: result.profile.email || result.profile.Email,
        shortBio: result.profile.shortBio || result.profile.ShortBio,
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

    if (result.consent) {
      ProfileStorage.storeConsent(result.consent);
    }

    return { success: true, data: result };
  } catch (e) {
    console.error('Profile creation error:', e);
    ProfileStorage.clearProfile();
    return { success: false, error: 'Network error occurred' };
  }
}

const classNames = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const ProfileCreate = ({ onSuccess, onError }: ProfileCreateProps) => {
  const [submitted, setSubmitted] = useState<boolean | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [bio, setBio] = useState('');
  const [codeword, setCodeword] = useState('');
  const [badSave, setBadSave] = useState(false);
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
      ? `text-green-500`
      : personaSelected.title === `Major Updates Only`
        ? `text-gray-600`
        : personaSelected.title === `All Updates`
          ? `text-orange-500`
          : `text-gray-600`;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setIsLoading(true);
    setBadSave(false);

    console.log('Form submission data:', {
      firstname,
      email,
      bio,
      persona: personaSelected.id,
      codeword: codeword ? '[REDACTED]' : 'empty',
    });

    if (firstname && codeword && email && personaSelected.id) {
      const result = await createProfile({
        firstname,
        email,
        codeword,
        bio: bio || '', // Ensure bio is string, not undefined
        persona: personaSelected.id,
      });

      if (result.success) {
        onSuccess?.();
      } else {
        setBadSave(true);
        onError?.(result.error || 'Profile creation failed');
        // Reset form on error
        setFirstname('');
        setEmail('');
        setBio('');
        setCodeword('');
        setPersonaSelected(contactPersona[0]);
      }
    } else {
      // Don't submit if required fields are missing
      console.error('Missing required fields:', {
        firstname,
        email,
        codeword,
        persona: personaSelected.id,
      });
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
    if (badSave) {
      const timeout = setTimeout(() => setBadSave(false), 7000);
      return () => clearTimeout(timeout);
    }
  }, [badSave]);

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
        Feel free to introduce yourself
      </h3>
      <p className="text-md pb-6">
        Already connected?
        <button
          className="ml-3 text-blue-600 underline hover:text-black"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('tractstack:show-unlock'));
          }}
        >
          Unlock your profile
        </button>
        .
      </p>

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
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </Select.Indicator>
                    </Select.Trigger>
                  </Select.Control>

                  <Portal>
                    <Select.Positioner>
                      <Select.Content className="relative z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {contactPersona.map((item) => (
                          <Select.Item
                            key={item.id}
                            item={item}
                            className="persona-item relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-cyan-600 hover:text-white"
                          >
                            <Select.ItemText className="block truncate font-normal">
                              {item.title}
                            </Select.ItemText>
                            <Select.ItemIndicator className="persona-indicator absolute inset-y-0 right-0 hidden items-center pr-4 text-cyan-600">
                              <ChevronRightIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </div>
              <div className="ml-4 flex items-center">
                <Icon
                  className={classNames(iconClass, `mr-2 h-5 w-5`)}
                  aria-hidden="true"
                />
                <span className="text-sm text-gray-600">
                  {personaSelected.description}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {firstname && !personaSelected?.disabled ? (
            <>
              <div className="col-span-3 px-4 pt-6">
                <label htmlFor="bio" className="block text-sm text-gray-600">
                  {firstname ? (
                    <>
                      Hello {firstname}. Is there anything else you would like
                      to share?
                    </>
                  ) : (
                    <>
                      Would you like to share anything else? (Contact
                      preferences; company bio; phone number)
                    </>
                  )}
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
                <label
                  htmlFor="codeword"
                  className="block text-sm text-gray-600"
                >
                  Enter your secret code word to protect your account:
                </label>
                <input
                  type="password"
                  name="codeword"
                  id="codeword"
                  autoComplete="off"
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
                  <span className="px-4 text-xs text-red-500">
                    Required field.
                  </span>
                )}
              </div>
            </>
          ) : (
            <></>
          )}

          {badSave ? (
            <div className="align-center font-action col-span-3 flex justify-center py-12 text-red-500">
              Profile could not be saved. Email already registered.
            </div>
          ) : null}

          <div className="align-center col-span-3 flex justify-center py-12">
            {!personaSelected?.disabled && !badSave ? (
              <button
                type="submit"
                disabled={isLoading}
                className={classNames(
                  `font-action rounded-lg px-3.5 py-2.5 text-white transition-all duration-200 hover:rotate-1`,
                  isLoading
                    ? `cursor-not-allowed bg-gray-400`
                    : `bg-black hover:bg-orange-500`
                )}
              >
                {isLoading ? 'Saving...' : 'Create Profile'}
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </>
  );
};
