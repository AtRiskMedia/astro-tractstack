import { useEffect, useState } from 'react';
import { ProfileStorage } from '@/utils/profileStorage';
import type { FormEvent } from 'react';

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
        email: payload.email,
        codeword: payload.codeword,
        sessionId: sessionData.sessionId,
        isUpdate: true,
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
        firstname: result.profile.Firstname,
        contactPersona: result.profile.ContactPersona,
        email: result.profile.Email,
        shortBio: result.profile.ShortBio,
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
        onError?.(result.error || 'Invalid credentials');
      }
    } else {
      console.error('Missing required fields:', { email, codeword });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (badLogin) {
      const timeout = setTimeout(() => setBadLogin(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [badLogin]);

  // Try to get last used email
  useEffect(() => {
    if (!email) {
      const lastEmail = ProfileStorage.getLastEmail();
      if (lastEmail) {
        setEmail(lastEmail);
      }
    }
  }, [email]);

  return (
    <>
      <h3 className="font-action py-6 text-xl text-blue-600">
        Welcome back! Please unlock your profile
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4">
          <div className="px-4 pt-6">
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
                submitted && email === `` ? `border-red-500` : `border-gray-300`
              )}
            />
            {submitted && email === `` && (
              <span className="px-4 text-xs text-red-500">Required field.</span>
            )}
          </div>

          <div className="px-4 pt-6">
            <label htmlFor="codeword" className="block text-sm text-gray-600">
              Secret code word
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
              <span className="px-4 text-xs text-red-500">Required field.</span>
            )}
          </div>

          {badLogin ? (
            <div className="align-center font-action col-span-1 flex justify-center py-6 text-red-500">
              Invalid credentials. Please try again.
            </div>
          ) : null}

          <div className="align-center col-span-1 flex justify-center py-12">
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
              {isLoading ? 'Unlocking...' : 'Unlock Profile'}
            </button>
          </div>

          <div className="align-center col-span-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                // Clear any stored data and reload to show create form
                ProfileStorage.clearProfile();
                window.location.reload();
              }}
              className="text-sm text-blue-600 underline hover:text-black"
            >
              Create new profile instead
            </button>
          </div>
        </div>
      </form>
    </>
  );
};
