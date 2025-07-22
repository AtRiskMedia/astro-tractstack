import { useState, useEffect } from 'react';
import { Switch } from '@ark-ui/react/switch';
import { ProfileStorage } from '@/utils/profileStorage';

export const ProfileConsent = () => {
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    // Initialize state from storage
    const currentConsent = ProfileStorage.getConsent();
    const initialState = currentConsent === '1';
    setIsChecked(initialState);
  }, []);

  const handleCheckedChange = (details: { checked: boolean }) => {
    // Update local state immediately
    setIsChecked(details.checked);

    if (details.checked) {
      ProfileStorage.storeConsent('1');
    } else {
      ProfileStorage.storeConsent('0');
      ProfileStorage.clearSession();
    }

    // Force page reload to refresh ProfileSwitch
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="flex items-center space-x-3">
      <Switch.Root
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        defaultChecked={isChecked}
      >
        <Switch.Control
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isChecked ? 'bg-cyan-600' : 'bg-gray-200'}`}
        >
          <Switch.Thumb
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isChecked ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </Switch.Control>
        <Switch.HiddenInput />
      </Switch.Root>
      <span className="text-sm text-gray-700">Remember my preferences</span>
    </div>
  );
};
