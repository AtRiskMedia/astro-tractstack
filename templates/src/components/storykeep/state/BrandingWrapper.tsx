import { useState } from 'react';
import StoryKeepDashboard from '../Dashboard';
import StoryKeepDashboard_Branding from '../Dashboard_Branding';
import type { FullContentMapItem, BrandConfig } from '@/types/tractstack';

interface BrandingPageWrapperProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
  role: string | null;
  initializing: boolean;
  initialBrandConfig: BrandConfig;
}

export default function BrandingPageWrapper({
  fullContentMap,
  homeSlug,
  role,
  initializing,
  initialBrandConfig,
}: BrandingPageWrapperProps) {
  // Manage shared brandConfig state at this level
  const [brandConfig, setBrandConfig] =
    useState<BrandConfig>(initialBrandConfig);

  return (
    <>
      <StoryKeepDashboard
        fullContentMap={fullContentMap}
        homeSlug={homeSlug}
        activeTab="branding"
        role={role}
        initializing={initializing}
        brandConfig={brandConfig}
        onBrandConfigUpdate={setBrandConfig}
      />
      <StoryKeepDashboard_Branding
        brandConfig={brandConfig}
        onBrandConfigUpdate={setBrandConfig}
      />
    </>
  );
}
