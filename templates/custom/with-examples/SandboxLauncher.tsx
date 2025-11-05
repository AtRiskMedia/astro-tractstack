import { useState, useEffect } from 'react';
import { ProfileStorage } from '@/utils/profileStorage';
import SandboxRegisterForm from '@/components/codehooks/SandboxRegisterForm';

export default function SandboxLauncher() {
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    // This check must run on the client to access localStorage
    setProfileExists(ProfileStorage.hasProfile());
  }, []);

  const handleRegistrationSuccess = () => {
    setProfileExists(true);
  };

  // Avoid a flash of the wrong state during server-side rendering
  if (profileExists === null) {
    return null;
  }

  return (
    <div className="mx-auto my-16 max-w-6xl px-4 md:my-24">
      <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
        {/* Column 1: The Pitch (Always Visible) */}
        <div className="px-6 text-right md:w-1/2">
          <h2 className="text-4xl font-bold text-gray-900 md:text-5xl">
            Press <span className="italic text-blue-600">your own</span> Tract
            Stack
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Create an interactive webpage in a sandbox! No credit card required.
          </p>
          {!profileExists && (
            <p className="mt-8 text-sm text-gray-500">
              Already connected?{' '}
              <a
                href="/storykeep/profile"
                className="font-bold text-blue-600 underline hover:text-blue-500"
              >
                Unlock your profile
              </a>
            </p>
          )}
        </div>

        {/* Column 2: The Action (Switches between Form and Button) */}
        <div className="w-full max-w-xl md:w-1/2">
          {!profileExists ? (
            <SandboxRegisterForm onSuccess={handleRegistrationSuccess} />
          ) : (
            <div className="flex justify-center md:justify-start">
              <div className="flex justify-center md:justify-start">
                <a
                  className="transform rounded-xl bg-blue-600 px-6 py-6 text-3xl font-bold text-white shadow-xl transition-transform hover:scale-105 md:text-5xl"
                  href="/sandbox"
                >
                  Get Crafting
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
