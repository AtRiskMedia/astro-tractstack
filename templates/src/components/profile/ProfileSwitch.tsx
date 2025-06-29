import { useEffect, useState } from 'react';
import { ProfileCreate } from './ProfileCreate';
import { ProfileEdit } from './ProfileEdit';
import { ProfileUnlock } from './ProfileUnlock';
import { ProfileStorage } from '../../utils/profileStorage';

// Define profile restoration function for v2 thin client
async function restoreProfileFromToken(): Promise<boolean> {
  try {
    // Check if we have a profile token from the handshake
    const token = localStorage.getItem('profile_token');
    if (!token) {
      return false;
    }

    // Call the backend to decode the profile token
    const response = await fetch('/api/auth/decode', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-TractStack-Tenant':
          (window as any).TRACTSTACK_CONFIG?.tenantId || '',
      },
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    if (result.profile) {
      // Store the profile data locally
      ProfileStorage.setProfileData({
        firstname: result.profile.firstname,
        contactPersona: result.profile.contactPersona,
        email: result.profile.email,
        shortBio: result.profile.shortBio,
      });

      // Mark profile as unlocked
      ProfileStorage.storeProfileToken(token);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to restore profile from token:', error);
    return false;
  }
}

// Fast pass auto-unlock using encrypted credentials
async function tryFastPassUnlock(): Promise<boolean> {
  try {
    const sessionData = ProfileStorage.prepareHandshakeData();

    if (!sessionData.encryptedEmail || !sessionData.encryptedCode) {
      return false;
    }

    const response = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        encryptedEmail: sessionData.encryptedEmail,
        encryptedCode: sessionData.encryptedCode,
        sessionId: sessionData.sessionId,
        isUpdate: true,
      }),
    });

    const result = await response.json();

    if (result.success && result.profile) {
      // Fast pass successful - store profile data
      ProfileStorage.setProfileData({
        firstname: result.profile.Firstname,
        contactPersona: result.profile.ContactPersona,
        email: result.profile.Email,
        shortBio: result.profile.ShortBio,
      });

      if (result.token) {
        ProfileStorage.storeProfileToken(result.token);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.log('Fast pass error:', error);
    return false;
  }
}

export const ProfileSwitch = () => {
  const [mode, setMode] = useState<'unset' | 'create' | 'unlock' | 'edit'>(
    'unset'
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initProfileMode = async () => {
      setIsLoading(true);

      // Check if we've been directed to show the unlock form
      if (ProfileStorage.shouldShowUnlock()) {
        setMode('unlock');
        ProfileStorage.setShowUnlock(false); // Clear the flag after using it
        setIsLoading(false);
        return;
      }

      const profileData = ProfileStorage.getProfileData();
      const hasProfile = ProfileStorage.hasProfile();
      const isUnlocked = ProfileStorage.isProfileUnlocked();
      const consent = ProfileStorage.getConsent();
      const hasToken = !!localStorage.getItem('profile_token');
      const session = ProfileStorage.getCurrentSession();

      // Try fast pass auto-unlock if we have consent and encrypted credentials but no profile data
      if (
        consent === '1' &&
        session.encryptedEmail &&
        session.encryptedCode &&
        !hasToken
      ) {
        const fastPassSuccess = await tryFastPassUnlock();
        if (fastPassSuccess) {
          setMode('edit');
          setIsLoading(false);
          return;
        }
        // Fast pass failed, continue with normal flow
      }

      // If we have a token but no local profile data, restore from token
      if (hasToken && !profileData.firstname) {
        const restored = await restoreProfileFromToken();
        if (restored) {
          setMode('edit');
          setIsLoading(false);
          return;
        }
      }

      // If we have encrypted credentials but no profile token, show unlock
      if (
        (session.encryptedCode && session.encryptedEmail && !hasToken) ||
        (hasProfile && !isUnlocked)
      ) {
        setMode('unlock');
      }
      // If we have consent but no profile, show create
      else if (consent === '1' && !hasProfile && !hasToken) {
        setMode('create');
      }
      // If we have profile data and are unlocked, show edit
      else if ((isUnlocked || hasToken) && profileData.firstname) {
        setMode('edit');
      }
      // Default case - when everything is cleared
      else {
        setMode('unset');
      }

      setIsLoading(false);
    };

    initProfileMode();
  }, []);

  // Add effect to listen for profile navigation events
  useEffect(() => {
    const handleShowUnlock = () => {
      setMode('unlock');
      ProfileStorage.setShowUnlock(false);
    };

    const handleShowCreate = () => {
      setMode('create');
    };

    // Listen for custom events
    window.addEventListener('tractstack:show-unlock', handleShowUnlock);
    window.addEventListener('tractstack:show-create', handleShowCreate);

    return () => {
      window.removeEventListener('tractstack:show-unlock', handleShowUnlock);
      window.removeEventListener('tractstack:show-create', handleShowCreate);
    };
  }, []);

  const handleProfileSuccess = () => {
    // Refresh the mode after successful operation
    const profileData = ProfileStorage.getProfileData();
    if (profileData.firstname) {
      setMode('edit');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="py-12">
        <div className="bg-mywhite border-myblue/20 border border-dashed">
          <div className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-mydarkgrey">Loading profile...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if mode is unset
  if (mode === 'unset') {
    return <div />;
  }

  // Don't render edit mode if we don't have profile data
  if (mode === 'edit' && !ProfileStorage.getProfileData().firstname) {
    return <div />;
  }

  return (
    <div className="py-12">
      <div className="bg-mywhite border-myblue/20 border border-dashed">
        <div className="p-6">
          {mode === 'create' && (
            <ProfileCreate onSuccess={handleProfileSuccess} />
          )}
          {mode === 'unlock' && (
            <ProfileUnlock
              initialEmail={ProfileStorage.getLastEmail() || undefined}
              onSuccess={handleProfileSuccess}
            />
          )}
          {mode === 'edit' && <ProfileEdit onSuccess={handleProfileSuccess} />}
        </div>
      </div>
    </div>
  );
};
