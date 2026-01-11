import { useState } from 'react';
import { ProfileStorage } from '@/utils/profileStorage';
import type { FormEvent } from 'react';

interface SandboxRegisterFormProps {
  onSuccess: () => void;
}

async function createProfile(payload: {
  firstname: string;
  email: string;
  codeword: string;
  persona: 'major' | 'none';
}) {
  try {
    const sessionData = ProfileStorage.prepareHandshakeData();
    const currentConsent = payload.persona === 'major' ? '1' : '0';

    const response = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstname: payload.firstname,
        email: payload.email,
        codeword: payload.codeword,
        contactPersona: payload.persona,
        shortBio: '',
        sessionId: sessionData.sessionId,
        consent: currentConsent,
        isUpdate: false,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Profile creation failed',
      };
    }

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

    return { success: true };
  } catch (e) {
    console.error('Sandbox profile creation error:', e);
    return { success: false, error: 'A network error occurred.' };
  }
}

export default function SandboxRegisterForm({
  onSuccess,
}: SandboxRegisterFormProps) {
  const [firstname, setFirstname] = useState('');
  const [email, setEmail] = useState('');
  const [codeword, setCodeword] = useState('');
  const [consent, setConsent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !codeword || !firstname) {
      setError('Please fill out all required fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const persona = consent ? 'major' : 'none';

    const result = await createProfile({
      firstname,
      email,
      codeword,
      persona,
    });

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'An unknown error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-white p-6 shadow-sm"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="firstname" className="block text-sm text-gray-700">
            First Name
          </label>
          <input
            type="text"
            name="firstname"
            id="firstname"
            autoComplete="given-name"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 md:text-sm"
            required
          />
        </div>

        <div>
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
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 md:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="codeword" className="block text-sm text-gray-700">
            Create a Codeword (to unlock your account)
          </label>
          <input
            type="password"
            name="codeword"
            id="codeword"
            autoComplete="new-password"
            value={codeword}
            onChange={(e) => setCodeword(e.target.value)}
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 md:text-sm"
            required
          />
        </div>

        <div className="flex items-start">
          <div className="flex h-5 items-center">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="consent" className="text-gray-700">
              Keep me in touch with major updates
            </label>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? 'Creating...' : 'Start Crafting'}
          </button>
        </div>
      </div>
    </form>
  );
}
