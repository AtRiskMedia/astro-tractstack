import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { brandConfigStore, getBrandConfig } from '@/stores/brand';
import { skipWizard } from '@/stores/navigation';
import type { FullContentMapItem } from '@/types/tractstack';

interface StoryKeepWizardProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
}

interface WizardData {
  hasTitle: boolean;
  hasPanes: boolean;
  hasAnyMenu: boolean;
  hasMenu: boolean;
  hasSeo: boolean;
  hasLogo: boolean;
  hasWordmark: boolean;
  hasOgTitle: boolean;
  hasOgAuthor: boolean;
  hasOgDesc: boolean;
  hasOg: boolean;
  hasOgLogo: boolean;
  hasFavicon: boolean;
  hasSocials: boolean;
}

type WizardStep = {
  key: keyof WizardData;
  message: string;
  buttonText: string;
  href: string;
};

const wizardSteps: WizardStep[] = [
  {
    key: 'hasTitle',
    message: 'Make your first page!',
    buttonText: 'Get Crafting',
    href: '/hello/edit',
  },
  {
    key: 'hasPanes',
    message: 'Your page needs some content!',
    buttonText: 'Edit Home Page',
    href: '/hello/edit',
  },
  {
    key: 'hasAnyMenu',
    message: "A menu helps visitors navigate. Let's create one now.",
    buttonText: 'Create a Menu',
    href: '/storykeep/content/menus/create',
  },
  {
    key: 'hasMenu',
    message: 'A menu helps visitors navigate. Link it to your Home Page.',
    buttonText: 'Add Menu to Home Page',
    href: '/hello/edit?menu',
  },
  {
    key: 'hasSeo',
    message: 'Each page can be customized for SEO rankings',
    buttonText: 'Describe Home Page',
    href: '/hello/edit?seo',
  },
  {
    key: 'hasLogo',
    message: 'Upload your logo to brand your website.',
    buttonText: 'Upload Logo',
    href: '/storykeep?branding',
  },
  {
    key: 'hasWordmark',
    message: 'Add a wordmark for branding.',
    buttonText: 'Upload Wordmark',
    href: '/storykeep?branding',
  },
  {
    key: 'hasOgTitle',
    message: 'Set a title for social media sharing previews.',
    buttonText: 'Add OG Title',
    href: '/storykeep?branding',
  },
  {
    key: 'hasOgAuthor',
    message: 'Add an author name for social media attribution.',
    buttonText: 'Add OG Author',
    href: '/storykeep?branding',
  },
  {
    key: 'hasOgDesc',
    message: 'Write a description for social media previews.',
    buttonText: 'Add OG Description',
    href: '/storykeep?branding',
  },
  {
    key: 'hasOg',
    message: 'Upload an image for social media sharing previews.',
    buttonText: 'Upload OG Image',
    href: '/storykeep?branding',
  },
  {
    key: 'hasOgLogo',
    message: 'Add a logo for social media previews.',
    buttonText: 'Upload OG Logo',
    href: '/storykeep?branding',
  },
  {
    key: 'hasFavicon',
    message: 'Upload a favicon to appear in browser tabs.',
    buttonText: 'Upload Favicon',
    href: '/storykeep?branding',
  },
  {
    key: 'hasSocials',
    message: 'Connect your social media accounts.',
    buttonText: 'Add Social Links',
    href: '/storykeep?branding',
  },
];

export default function StoryKeepDashboard_Wizard({
  fullContentMap,
  homeSlug,
}: StoryKeepWizardProps) {
  const [wizardData, setWizardData] = useState<WizardData | null>(null);
  const [loading, setLoading] = useState(true);
  const $brandConfig = useStore(brandConfigStore);
  const $skipWizard = useStore(skipWizard);

  useEffect(() => {
    const buildWizardData = async () => {
      try {
        // Ensure brand config is loaded
        let brandConfig = $brandConfig;
        if (!brandConfig) {
          await getBrandConfig();
          brandConfig = brandConfigStore.get();
        }

        if (!brandConfig) {
          setLoading(false);
          return;
        }

        // Find home page in content map using homeSlug
        const homePage = fullContentMap.find((item) => item.slug === homeSlug);

        // Get detailed home page data if we found one
        let homeData = null;
        if (homePage) {
          const goBackend =
            import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
          const response = await fetch(
            `${goBackend}/api/v1/nodes/storyfragments/home`,
            {
              headers: {
                'X-Tenant-ID': 'default', // TODO: Get from context
              },
            }
          );
          if (response.ok) {
            homeData = await response.json();
          }
        }

        const data: WizardData = {
          // Brand config checks
          hasLogo: !!brandConfig.LOGO,
          hasWordmark: !!brandConfig.WORDMARK,
          hasOgTitle: !!brandConfig.OGTITLE,
          hasOgAuthor: !!brandConfig.OGAUTHOR,
          hasOgDesc: !!brandConfig.OGDESC,
          hasOg: !!brandConfig.OG,
          hasOgLogo: !!brandConfig.OGLOGO,
          hasFavicon: !!brandConfig.FAVICON,
          hasSocials: !!brandConfig.SOCIALS,

          // Home page checks
          hasTitle: !!homeData?.title?.trim(),
          hasPanes: !!(homeData?.paneIds?.length > 0),
          hasSeo: !!homeData?.description,
          hasMenu: !!homeData?.menu,

          // Content map checks
          hasAnyMenu: fullContentMap.some((item) => item.type === 'Menu'),
        };

        setWizardData(data);
      } catch (error) {
        console.error('Error building wizard data:', error);
      } finally {
        setLoading(false);
      }
    };

    buildWizardData();
  }, [fullContentMap, homeSlug, $brandConfig]);

  if (loading || !wizardData || $skipWizard) {
    return null;
  }

  // Find first incomplete step
  const currentStepIndex = wizardSteps.findIndex((step) => {
    const value = wizardData[step.key];
    return typeof value === 'boolean' && !value;
  });

  // If all steps complete, don't show wizard
  if (currentStepIndex === -1) {
    return null;
  }

  const currentStep = wizardSteps[currentStepIndex];
  const completedSteps = wizardSteps.filter(
    (step) => wizardData[step.key]
  ).length;
  const totalSteps = wizardSteps.length;
  const progressPercent = (completedSteps / totalSteps) * 100;

  return (
    <div className="mb-8 rounded-lg border border-dotted border-gray-200 bg-gray-50 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="rounded-full bg-white p-2">
            <span className="text-2xl">⭐</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Setup Progress</h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-bold text-cyan-800">
                {completedSteps} of {totalSteps} complete
              </span>
              <button
                onClick={() => skipWizard.set(true)}
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                SKIP SETUP
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: '#06b6d4',
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-gray-600">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-3 text-gray-700">
              <span className="font-bold">Next step:</span>{' '}
              {currentStep.message}
            </p>
            <a
              href={currentStep.href}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
            >
              <span>{currentStep.buttonText}</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
