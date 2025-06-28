import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import ChevronRightIcon from '@heroicons/react/20/solid/ChevronRightIcon';
import { ProfileStorage } from '../../utils/profileStorage';

interface ProfileUnlockProps {
  initialEmail?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

async function unlockProfile(payload: { email: string; codeword: string }) {
  try {
    const sessionData = ProfileStorage.prepareHandshakeData();

    const response = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstname: 'Friend', // Default for unlock
        email: payload.email,
        codeword: payload.codeword,
        contactPersona: 'major', // Default for unlock
        shortBio: '',
        sessionId: sessionData.sessionId,
        isUpdate: true, // This is an unlock/authentication operation - use existing profile
      }),
    });

    const result = await response.json();

    if (!result.success) {
      ProfileStorage.clearProfile();
      return {
        success: false,
        error: result.error || 'Invalid credentials',
      };
    }

    // Store profile data and tokens
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

    if (result.consent) {
      ProfileStorage.storeConsent(result.consent);
    }

    // Note: In v1, this also handled heldBeliefs and set KnownLead belief
    // In v2, beliefs will be handled separately if needed

    return { success: true, data: result };
  } catch (e) {
    console.error('Profile unlock error:', e);
    ProfileStorage.clearProfile();
    return { success: false, error: 'Network error occurred' };
  }
}

const classNames = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const ProfileUnlock = ({
  initialEmail,
  onSuccess,
  onError,
}: ProfileUnlockProps) => {
  const [submitted, setSubmitted] = useState<boolean | undefined>(undefined);
  const [email, setEmail] = useState(initialEmail || '');
  const [badLogin, setBadLogin] = useState(false);
  const [codeword, setCodeword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBadLogin(false);
    setSubmitted(true);
    setIsLoading(true);

    if (codeword && email) {
      const result = await unlockProfile({
        email,
        codeword,
      });

      if (result.success) {
        ProfileStorage.storeLastEmail(email);
        onSuccess?.();
      } else {
        setBadLogin(true);
        onError?.(result.error || 'Login failed');
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (badLogin) {
      const timeout = setTimeout(() => setBadLogin(false), 7000);
      return () => clearTimeout(timeout);
    }
  }, [badLogin]);

  return (
    <>
      <h3 className="font-action py-6 text-xl text-blue-600">
        Welcome Back. Unlock your profile &gt;
      </h3>
      <p className="text-md pb-6">
        Don't have a profile?
        <button
          className="ml-3 text-blue-600 underline hover:text-black"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('tractstack:show-create'));
          }}
        >
          Create one
        </button>
        .
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 px-4 pt-6">
            <label htmlFor="email" className="block text-sm text-gray-600">
              Email address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              autoComplete="new-password"
              aria-autocomplete="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={classNames(
                `text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-orange-500 focus:ring-orange-500`,
                submitted && email === `` ? `border-red-500` : `border-gray-300`
              )}
            />
            {submitted && email === `` && (
              <span className="px-4 text-xs text-red-500">Required field.</span>
            )}
          </div>

          <div className="col-span-3 px-4 pt-6">
            <label htmlFor="codeword" className="block text-sm text-gray-600">
              Enter your secret code word to unlock your account:
            </label>
            <input
              type="password"
              name="codeword"
              id="codeword"
              autoComplete="new-password"
              aria-autocomplete="none"
              value={codeword}
              onChange={(e) => setCodeword(e.target.value)}
              disabled={isLoading}
              className={classNames(
                `text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-orange-500 focus:ring-orange-500`,
                submitted && codeword === ``
                  ? `border-red-500`
                  : `border-gray-300`
              )}
            />
            {submitted && codeword === `` && (
              <span className="px-4 text-xs text-red-500">Required field.</span>
            )}
          </div>

          {badLogin ? (
            <div className="align-center col-span-3 flex justify-center py-12">
              <div className="w-full max-w-md rounded-md border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                <p className="text-sm font-bold">Login Failed</p>
                <p className="text-sm">
                  The email or code word you entered is incorrect. Please try
                  again.
                </p>
              </div>
            </div>
          ) : null}

          {codeword !== `` ? (
            <div className="align-center col-span-3 flex justify-center py-12">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex rounded-md bg-orange-500/10 px-3.5 py-1.5 text-base leading-7 text-black shadow-sm hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="pr-4">
                  {isLoading ? 'Unlocking...' : 'Unlock Profile'}
                </span>
                <ChevronRightIcon className="mr-3 h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </form>
    </>
  );
};
