import { useState } from 'react';
import StoryKeepDashboard from '../Dashboard';
import StoryKeepDashboard_Branding from '../Dashboard_Branding';
import HydrateWizard from '../widgets/HydrateWizard';
import type { FullContentMapItem, BrandConfig } from '@/types/tractstack';
import type { LoadData } from '@/types/compositorTypes';

interface BrandingPageWrapperProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
  role: string | null;
  initializing: boolean;
  initialBrandConfig: BrandConfig;
  initialSuitcase?: LoadData | null;
}

export default function BrandingPageWrapper({
  fullContentMap,
  homeSlug,
  role,
  initializing,
  initialBrandConfig,
  initialSuitcase,
}: BrandingPageWrapperProps) {
  const [brandConfig, setBrandConfig] =
    useState<BrandConfig>(initialBrandConfig);

  if (initialBrandConfig.HAS_HYDRATION_TOKEN && initialSuitcase) {
    return (
      <HydrateWizard
        initialSuitcase={initialSuitcase}
        fullContentMap={fullContentMap}
      />
    );
  }

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
