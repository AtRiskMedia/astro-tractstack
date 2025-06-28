import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ProfileStorage, type ProfileData } from '../../utils/profileStorage';

// Contact persona options - matches v1.0 structure
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

export async function updateProfile(payload: {
  firstname: string;
  email: string;
  codeword: string;
  persona: string;
  bio: string;
}) {
  try {
    const sessionData = ProfileStorage.prepareHandshakeData();

    const response = await fetch('/api/profile', {
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
        firstname: result.profile.firstname,
        contactPersona: result.profile.contactPersona,
        email: result.profile.email,
        shortBio: result.profile.shortBio,
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

export const ProfileEdit = ({ onSuccess, onError }: ProfileEditProps) => {
  const [submitted, setSubmitted] = useState<boolean | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [bio, setBio] = useState('');
  const [codeword, setCodeword] = useState('');
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [personaSelected, setPersonaSelected] = useState(contactPersona[0]);

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

  useEffect(() => {
    if (saved) {
      const timeout = setTimeout(() => setSaved(false), 7000);
      return () => clearTimeout(timeout);
    }
  }, [saved]);

  const classNames = (...classes: (string | undefined | false)[]): string => {
    return classes.filter(Boolean).join(' ');
  };

  // Icon and styling logic for persona selection
  const getPersonaIcon = (title: string) => {
    switch (title) {
      case 'DMs open':
        return '💬';
      case 'Major Updates Only':
        return '🔄';
      case 'All Updates':
        return '⚡';
      default:
        return '🔕';
    }
  };

  const getPersonaStyles = (title: string) => {
    switch (title) {
      case 'DMs open':
        return {
          iconClass: 'text-black',
          barClass: 'bg-green-400',
          barWidth: '100%',
        };
      case 'All Updates':
        return {
          iconClass: 'text-orange-500',
          barClass: 'bg-orange-400',
          barWidth: '100%',
        };
      case 'Major Updates Only':
        return {
          iconClass: 'text-gray-600',
          barClass: 'bg-orange-300',
          barWidth: '50%',
        };
      default:
        return {
          iconClass: 'text-gray-600',
          barClass: 'bg-gray-100',
          barWidth: '2%',
        };
    }
  };

  const styles = getPersonaStyles(personaSelected.title);

  return (
    <>
      <h3 className="py-6 text-xl font-bold text-blue-600">
        Welcome to Tract Stack
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          {!personaSelected?.disabled && (
            <>
              <div className="col-span-3 px-4 pt-6 md:col-span-1">
                <label
                  htmlFor="firstname"
                  className="block text-sm text-gray-700"
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
                  className={classNames(
                    'text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-cyan-600 focus:ring-cyan-600',
                    submitted && firstname === ''
                      ? 'border-red-500'
                      : 'border-gray-300'
                  )}
                />
                {submitted && firstname === '' && (
                  <span className="px-4 text-xs text-red-500">
                    Required field.
                  </span>
                )}
              </div>

              <div className="col-span-3 px-4 pt-6 md:col-span-2">
                <label htmlFor="email" className="block text-sm text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={classNames(
                    'text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-cyan-600 focus:ring-cyan-600',
                    submitted && email === ''
                      ? 'border-red-500'
                      : 'border-gray-300'
                  )}
                />
                {submitted && email === '' && (
                  <span className="px-4 text-xs text-red-500">
                    Required field.
                  </span>
                )}
              </div>
            </>
          )}

          <div className="col-span-3 px-4 pt-6">
            <div className="flex items-center text-sm">
              <div className="pr-8 text-sm text-black">
                <label className="mb-2 block text-sm text-gray-700">
                  Choose your level of consent:
                </label>

                <div className="relative mt-2">
                  <select
                    value={personaSelected.id}
                    onChange={(e) => {
                      const selected = contactPersona.find(
                        (item) => item.id === e.target.value
                      );
                      if (selected) setPersonaSelected(selected);
                    }}
                    className="text-md relative w-full cursor-default rounded-md bg-white py-3 pl-3 pr-10 text-left text-black shadow-sm ring-1 ring-inset ring-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  >
                    {contactPersona.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-1 items-center">
                <div className="ml-1 flex flex-1 items-center">
                  <span
                    className={classNames(
                      'flex-shrink-0 text-lg',
                      styles.iconClass
                    )}
                  >
                    {getPersonaIcon(personaSelected.title)}
                  </span>
                  <div className="relative ml-3 flex-1">
                    <div className="h-7 rounded-full border border-gray-200" />
                    <div
                      className={classNames(
                        'absolute inset-y-0 rounded-full',
                        styles.barClass
                      )}
                      style={{ width: styles.barWidth }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-right text-sm text-gray-600">
              {personaSelected.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-3 px-4 pt-6">
            <label htmlFor="bio" className="block text-sm text-gray-700">
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
              />
            </div>
          </div>

          <div className="col-span-1 px-4 pt-6">
            <label htmlFor="codeword" className="block text-sm text-gray-700">
              Re-Enter your secret code word to save any changes:
            </label>
            <input
              type="password"
              name="codeword"
              id="codeword"
              autoComplete="current-password"
              value={codeword}
              onChange={(e) => setCodeword(e.target.value)}
              className={classNames(
                'text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-cyan-600 focus:ring-cyan-600',
                submitted && codeword === ''
                  ? 'border-red-500'
                  : 'border-gray-300'
              )}
            />
            {submitted && codeword === '' && (
              <span className="px-4 text-xs text-red-500">Required field.</span>
            )}
          </div>

          {saved && (
            <div className="align-center col-span-3 flex justify-center py-12 font-bold text-green-500">
              Profile Saved
            </div>
          )}

          {codeword !== '' && (
            <div className="align-center col-span-3 flex justify-center py-12">
              {!personaSelected?.disabled ? (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex rounded-md bg-cyan-100 px-3.5 py-1.5 text-base leading-7 text-black shadow-sm hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:opacity-50"
                >
                  <span className="pr-4">
                    {isLoading ? 'Saving...' : 'Save Profile'}
                  </span>
                  {!isLoading && (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>
              ) : (
                <span className="text-gray-600">
                  Profile disabled. (Privacy mode enabled)
                </span>
              )}
            </div>
          )}
        </div>
      </form>
    </>
  );
};
