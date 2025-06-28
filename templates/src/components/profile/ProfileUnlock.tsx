import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { ProfileStorage } from '../../utils/profileStorage';

interface ProfileUnlockProps {
  initialEmail?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export async function unlockProfile(payload: {
  email: string;
  codeword: string;
}) {
  try {
    const sessionData = ProfileStorage.prepareHandshakeData();

    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        sessionId: sessionData.sessionId,
        isUpdate: false, // This is an unlock operation
      }),
    });

    const result = await response.json();

    if (!result.success) {
      ProfileStorage.clearProfile();
      return { success: false, error: result.error || 'Login failed' };
    }

    // Store profile data and tokens
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

    if (result.consent) {
      ProfileStorage.storeConsent(result.consent);
    }

    return { success: true, data: result };
  } catch (e) {
    console.error('Profile unlock error:', e);
    ProfileStorage.clearProfile();
    return { success: false, error: 'Network error occurred' };
  }
}

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

  const classNames = (...classes: (string | undefined | false)[]): string => {
    return classes.filter(Boolean).join(' ');
  };

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
            ProfileStorage.clearProfile();
            ProfileStorage.setShowUnlock(false);
            // Trigger parent component re-render by clearing profile state
            window.location.reload();
          }}
        >
          Create one
        </button>
        .
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 px-4 pt-6">
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
                'text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-orange-500 focus:ring-orange-500',
                submitted && email === '' ? 'border-red-500' : 'border-gray-300'
              )}
            />
            {submitted && email === '' && (
              <span className="px-4 text-xs text-red-500">Required field.</span>
            )}
          </div>

          <div className="col-span-3 px-4 pt-6">
            <label htmlFor="codeword" className="block text-sm text-gray-700">
              Enter your secret code word to unlock your account:
            </label>
            <input
              type="password"
              name="codeword"
              id="codeword"
              autoComplete="current-password"
              value={codeword}
              onChange={(e) => setCodeword(e.target.value)}
              className={classNames(
                'text-md mt-2 block w-full rounded-md bg-white p-3 shadow-sm focus:border-orange-500 focus:ring-orange-500',
                submitted && codeword === ''
                  ? 'border-red-500'
                  : 'border-gray-300'
              )}
            />
            {submitted && codeword === '' && (
              <span className="px-4 text-xs text-red-500">Required field.</span>
            )}
          </div>

          {badLogin && (
            <div className="align-center col-span-3 flex justify-center py-12">
              <div className="w-full max-w-md rounded-md border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                <p className="text-sm font-bold">Login Failed</p>
                <p className="text-sm">
                  The email or code word you entered is incorrect. Please try
                  again.
                </p>
              </div>
            </div>
          )}

          {codeword !== '' && (
            <div className="align-center col-span-3 flex justify-center py-12">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex rounded-md bg-orange-100 px-3.5 py-1.5 text-base leading-7 text-black shadow-sm hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-50"
              >
                <span className="pr-4">
                  {isLoading ? 'Unlocking...' : 'Unlock Profile'}
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
            </div>
          )}
        </div>
      </form>
    </>
  );
};
