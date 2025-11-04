import { useState, useEffect } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import XMarkIcon from '@heroicons/react/24/solid/XMarkIcon';
import { ProfileStorage } from '@/utils/profileStorage';
import SandboxRegisterForm from '@/components/codehooks/SandboxRegisterForm';

export default function SandboxAuthWrapper() {
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    setProfileExists(ProfileStorage.hasProfile());
  }, []);

  const handleRegistrationSuccess = () => {
    setProfileExists(true);
  };

  const handleClose = () => {
    window.location.href = '/';
  };

  if (profileExists === null || profileExists === true) {
    return null;
  }

  return (
    <Dialog.Root open={true} modal={true} trapFocus={false}>
      <Portal>
        <Dialog.Backdrop
          className="fixed inset-0 bg-black bg-opacity-75"
          style={{ zIndex: 9005 }}
        />
        <Dialog.Positioner
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9005 }}
        >
          <Dialog.Content className="relative grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-lg bg-white shadow-2xl md:grid-cols-2">
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-200"
              title="Close and exit Sandbox"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="flex flex-col justify-center bg-gray-50 p-8 text-right">
              <h2 className="text-4xl font-bold text-gray-900 md:text-5xl">
                Press <span className="italic text-blue-600">your own</span>{' '}
                Tract Stack
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Create an interactive webpage in a sandbox! No credit card
                required.
              </p>
              <p className="mt-8 text-sm text-gray-500">
                Already connected?{' '}
                <a
                  href="/storykeep/profile"
                  className="font-bold text-blue-600 underline hover:text-blue-500"
                >
                  Unlock your profile
                </a>
              </p>
            </div>

            <div className="flex flex-col justify-center p-8">
              <SandboxRegisterForm onSuccess={handleRegistrationSuccess} />
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
