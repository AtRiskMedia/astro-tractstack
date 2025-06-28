import { useEffect, useState } from "react";
import { ProfileStorage } from "../../utils/profileStorage";
import { ProfileCreate } from "./ProfileCreate";
import { ProfileEdit } from "./ProfileEdit";
import { ProfileUnlock } from "./ProfileUnlock";

type ProfileMode = "unset" | "create" | "edit" | "unlock";

async function restoreProfile() {
  const session = ProfileStorage.getCurrentSession();

  if (session.encryptedEmail && session.encryptedCode) {
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          encryptedEmail: session.encryptedEmail,
          encryptedCode: session.encryptedCode,
          isUpdate: false, // This is a restore operation
        }),
      });

      const result = await response.json();

      if (result.success && result.profile) {
        ProfileStorage.setProfileData({
          firstname: result.profile.firstname,
          contactPersona: result.profile.contactPersona,
          email: result.profile.email,
          shortBio: result.profile.shortBio,
        });

        if (result.token) {
          ProfileStorage.storeProfileToken(result.token);
        }

        return true;
      }
    } catch (e) {
      console.error("Failed to restore profile:", e);
    }
  }
  return false;
}

export const ProfileSwitch = () => {
  const [mode, setMode] = useState<ProfileMode>("unset");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initProfileMode = async () => {
      setIsLoading(true);

      // Check if we've been directed to show the unlock form
      if (ProfileStorage.shouldShowUnlock()) {
        setMode("unlock");
        ProfileStorage.setShowUnlock(false); // Clear the flag after using it
        setIsLoading(false);
        return;
      }

      const session = ProfileStorage.getCurrentSession();
      const profileData = ProfileStorage.getProfileData();
      const hasProfile = ProfileStorage.hasProfile();
      const isUnlocked = ProfileStorage.isProfileUnlocked();
      const consent = ProfileStorage.getConsent();

      // If we have encrypted credentials but no profile data, try to restore
      if (session.encryptedCode && session.encryptedEmail && !profileData.firstname) {
        const restored = await restoreProfile();
        if (restored) {
          setMode("edit");
          setIsLoading(false);
          return;
        }
      }

      // Determine which mode to show based on current state
      if ((session.encryptedCode && session.encryptedEmail && !isUnlocked) ||
        (hasProfile && !isUnlocked)) {
        setMode("unlock");
      } else if (consent === "1" && !hasProfile) {
        setMode("create");
      } else if (isUnlocked && profileData.firstname) {
        setMode("edit");
      } else {
        setMode("unset");
      }

      setIsLoading(false);
    };

    initProfileMode();
  }, []);

  const handleProfileSuccess = () => {
    // Refresh the mode after successful operation
    const profileData = ProfileStorage.getProfileData();
    if (profileData.firstname) {
      setMode("edit");
    }
  };

  const handleProfileError = (error: string) => {
    console.error("Profile operation error:", error);
    // Could show a toast or other error UI here
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="bg-white border border-dashed border-blue-100">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "unset") {
    return <div />;
  }

  if (mode === "edit" && !ProfileStorage.getProfileData().firstname) {
    return <div />;
  }

  const lastEmail = ProfileStorage.getLastEmail();

  return (
    <div className="py-12">
      <div className="bg-white border border-dashed border-blue-100">
        <div className="p-6">
          {mode === "create" && (
            <ProfileCreate
              onSuccess={handleProfileSuccess}
              onError={handleProfileError}
            />
          )}

          {mode === "unlock" && (
            <ProfileUnlock
              initialEmail={lastEmail || undefined}
              onSuccess={handleProfileSuccess}
              onError={handleProfileError}
            />
          )}

          {mode === "edit" && (
            <ProfileEdit
              onSuccess={handleProfileSuccess}
              onError={handleProfileError}
            />
          )}
        </div>
      </div>
    </div>
  );
};
