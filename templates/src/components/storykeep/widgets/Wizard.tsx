import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { skipWizard } from '@/stores/navigation';
import { fullContentMapStore } from '@/stores/analytics';
import type { FullContentMapItem, BrandConfig } from '@/types/tractstack';

interface StoryKeepWizardProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
  brandConfig: BrandConfig;
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
    href: '/storykeep/content?create-menu',
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
    href: '/storykeep/branding#assets',
  },
  {
    key: 'hasWordmark',
    message: 'Add a wordmark for branding.',
    buttonText: 'Upload Wordmark',
    href: '/storykeep/branding#assets',
  },
  {
    key: 'hasOgTitle',
    message: 'Set a title for social media sharing previews.',
    buttonText: 'Add OG Title',
    href: '/storykeep/branding#seo',
  },
  {
    key: 'hasOgAuthor',
    message: 'Add an author name for social media attribution.',
    buttonText: 'Add OG Author',
    href: '/storykeep/branding#seo',
  },
  {
    key: 'hasOgDesc',
    message: 'Write a description for social media previews.',
    buttonText: 'Add OG Description',
    href: '/storykeep/branding#seo',
  },
  {
    key: 'hasOg',
    message: 'Upload an image for social media sharing previews.',
    buttonText: 'Upload OG Image',
    href: '/storykeep/branding#seo',
  },
  {
    key: 'hasOgLogo',
    message: 'Add a logo for social media previews.',
    buttonText: 'Upload OG Logo',
    href: '/storykeep/branding#assets',
  },
  {
    key: 'hasFavicon',
    message: 'Upload a favicon to appear in browser tabs.',
    buttonText: 'Upload Favicon',
    href: '/storykeep/branding#assets',
  },
  {
    key: 'hasSocials',
    message: 'Connect your social media accounts.',
    buttonText: 'Add Social Links',
    href: '/storykeep/branding#socials',
  },
];

export default function Wizard({
  fullContentMap,
  homeSlug,
  brandConfig,
}: StoryKeepWizardProps) {
  const [wizardData, setWizardData] = useState<WizardData | null>(null);
  const [loading, setLoading] = useState(true);
  const $skipWizard = useStore(skipWizard);
  const $clientContentMap = useStore(fullContentMapStore);
  const activeContentMap =
    $clientContentMap?.data?.length > 0
      ? $clientContentMap.data
      : fullContentMap;

  useEffect(() => {
    const buildWizardData = async () => {
      try {
        const homePage = activeContentMap.find(
          (item) => item.slug === homeSlug
        );

        let homeData = null;
        if (homePage) {
          const goBackend =
            import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
          const response = await fetch(
            `${goBackend}/api/v1/nodes/storyfragments/home`,
            {
              headers: {
                'X-Tenant-ID': window.TRACTSTACK_CONFIG?.tenantId || 'default',
              },
            }
          );
          if (response.ok) {
            homeData = await response.json();
          }
        }

        const data: WizardData = {
          hasLogo: !!brandConfig.LOGO,
          hasWordmark: !!brandConfig.WORDMARK,
          hasOgTitle: !!brandConfig.OGTITLE,
          hasOgAuthor: !!brandConfig.OGAUTHOR,
          hasOgDesc: !!brandConfig.OGDESC,
          hasOg: !!brandConfig.OG,
          hasOgLogo: !!brandConfig.OGLOGO,
          hasFavicon: !!brandConfig.FAVICON,
          hasSocials: !!brandConfig.SOCIALS,
          hasTitle: !!homePage?.title?.trim(),
          hasPanes: !!homePage?.panes?.length,
          hasSeo: !!homePage?.description,
          hasMenu: !!homeData?.menuId,
          hasAnyMenu: activeContentMap.some((item) => item.type === 'Menu'),
        };

        setWizardData(data);
      } catch (error) {
        console.error('Error building wizard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (brandConfig) {
      buildWizardData();
    }
  }, [activeContentMap, homeSlug, brandConfig]);

  if (loading || !wizardData || !brandConfig || $skipWizard) {
    return null;
  }

  const currentStepIndex = wizardSteps.findIndex((step) => {
    const value = wizardData[step.key];
    return typeof value === 'boolean' && !value;
  });

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
              <span className="text-sm font-bold text-cyan-800">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <strong>Next step:</strong> {currentStep.message}
            </p>
            <div className="mt-3">
              <a
                href={currentStep.href}
                className="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
              >
                {currentStep.buttonText}
                <svg
                  className="ml-1.5 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
