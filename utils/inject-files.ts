import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'child_process';
import type { AstroIntegrationLogger } from 'astro';

export async function injectTemplateFiles(
  resolve: (...paths: string[]) => string,
  logger: AstroIntegrationLogger,
  config?: any
): Promise<void> {
  logger.info('TractStack: injectTemplateFiles called');

  const templateFiles = [
    // Core files
    {
      src: resolve('templates/src/constants.ts'),
      dest: 'src/constants.ts',
    },
    {
      src: resolve('templates/src/types/tractstack.ts'),
      dest: 'src/types/tractstack.ts',
    },
    {
      src: resolve('templates/.gitignore'),
      dest: '.gitignore',
    },
    {
      src: resolve('templates/tailwind.config.cjs'),
      dest: 'tailwind.config.cjs',
    },

    // Stores
    {
      src: resolve('templates/src/stores/brand.ts'),
      dest: 'src/stores/brand.ts',
    },
    {
      src: resolve('templates/src/stores/analytics.ts'),
      dest: 'src/stores/analytics.ts',
    },

    // Utils
    {
      src: resolve('templates/src/utils/actions.ts'),
      dest: 'src/utils/actions.ts',
    },
    {
      src: resolve('templates/src/utils/backend.ts'),
      dest: 'src/utils/backend.ts',
    },
    {
      src: resolve('templates/src/utils/api.ts'),
      dest: 'src/utils/api.ts',
    },
    {
      src: resolve('templates/src/utils/api/brandConfig.ts'),
      dest: 'src/utils/api/brandConfig.ts',
    },
    {
      src: resolve('templates/src/utils/sessionSync.ts'),
      dest: 'src/utils/sessionSync.ts',
    },
    {
      src: resolve('templates/src/utils/auth.ts'),
      dest: 'src/utils/auth.ts',
    },
    {
      src: resolve('templates/src/utils/core/auth.ts'),
      dest: 'src/utils/core/auth.ts',
    },
    {
      src: resolve('templates/src/utils/helpers.ts'),
      dest: 'src/utils/helpers.ts',
    },
    {
      src: resolve('templates/src/utils/profileStorage.ts'),
      dest: 'src/utils/profileStorage.ts',
    },
    {
      src: resolve('templates/src/utils/fileHelpers.ts'),
      dest: 'src/utils/fileHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/brandHelpers.ts'),
      dest: 'src/utils/brandHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/advancedConfig.ts'),
      dest: 'src/utils/api/advancedConfig.ts',
    },
    {
      src: resolve('templates/src/utils/advancedHelpers.ts'),
      dest: 'src/utils/advancedHelpers.ts',
    },
    // Layouts
    {
      src: resolve('templates/src/layouts/Layout.astro'),
      dest: 'src/layouts/Layout.astro',
    },

    // Pages
    {
      src: resolve('templates/src/pages/[...slug].astro'),
      dest: 'src/pages/[...slug].astro',
    },
    {
      src: resolve('templates/src/pages/storykeep.astro'),
      dest: 'src/pages/storykeep.astro',
    },
    {
      src: resolve('templates/src/pages/maint.astro'),
      dest: 'src/pages/maint.astro',
    },

    // Auth pages
    {
      src: resolve('templates/src/pages/storykeep/login.astro'),
      dest: 'src/pages/storykeep/login.astro',
    },
    {
      src: resolve('templates/src/pages/storykeep/logout.astro'),
      dest: 'src/pages/storykeep/logout.astro',
    },
    {
      src: resolve('templates/src/pages/storykeep/profile.astro'),
      dest: 'src/pages/storykeep/profile.astro',
    },

    // API routes
    {
      src: resolve('templates/src/pages/api/auth/visit.ts'),
      dest: 'src/pages/api/auth/visit.ts',
    },
    {
      src: resolve('templates/src/pages/api/auth/profile.ts'),
      dest: 'src/pages/api/auth/profile.ts',
    },
    {
      src: resolve('templates/src/pages/api/auth/decode.ts'),
      dest: 'src/pages/api/auth/decode.ts',
    },
    {
      src: resolve('templates/src/pages/api/auth/login.ts'),
      dest: 'src/pages/api/auth/login.ts',
    },
    {
      src: resolve('templates/src/pages/api/auth/logout.ts'),
      dest: 'src/pages/api/auth/logout.ts',
    },

    // Base components
    {
      src: resolve('templates/src/components/Header.astro'),
      dest: 'src/components/Header.astro',
    },
    {
      src: resolve('templates/src/components/Footer.astro'),
      dest: 'src/components/Footer.astro',
    },
    {
      src: resolve('templates/src/components/Menu.tsx'),
      dest: 'src/components/Menu.tsx',
    },
    {
      src: resolve('templates/src/components/Fragment.astro'),
      dest: 'src/components/Fragment.astro',
    },

    // Auth components
    {
      src: resolve('templates/src/components/auth/SessionInit.astro'),
      dest: 'src/components/auth/SessionInit.astro',
    },

    // Profile components
    {
      src: resolve('templates/src/components/profile/ProfileConsent.tsx'),
      dest: 'src/components/profile/ProfileConsent.tsx',
    },
    {
      src: resolve('templates/src/components/profile/ProfileSwitch.tsx'),
      dest: 'src/components/profile/ProfileSwitch.tsx',
    },
    {
      src: resolve('templates/src/components/profile/ProfileCreate.tsx'),
      dest: 'src/components/profile/ProfileCreate.tsx',
    },
    {
      src: resolve('templates/src/components/profile/ProfileEdit.tsx'),
      dest: 'src/components/profile/ProfileEdit.tsx',
    },
    {
      src: resolve('templates/src/components/profile/ProfileUnlock.tsx'),
      dest: 'src/components/profile/ProfileUnlock.tsx',
    },

    // Form system
    {
      src: resolve('templates/src/hooks/useFormState.ts'),
      dest: 'src/hooks/useFormState.ts',
    },
    {
      src: resolve('templates/src/constants/brandThemes.ts'),
      dest: 'src/constants/brandThemes.ts',
    },
    {
      src: resolve('templates/src/types/formTypes.ts'),
      dest: 'src/types/formTypes.ts',
    },

    // Atomic form components
    {
      src: resolve('templates/src/components/storykeep/form/StringInput.tsx'),
      dest: 'src/components/storykeep/form/StringInput.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/StringArrayInput.tsx'
      ),
      dest: 'src/components/storykeep/form/StringArrayInput.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/form/BooleanToggle.tsx'),
      dest: 'src/components/storykeep/form/BooleanToggle.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/form/EnumSelect.tsx'),
      dest: 'src/components/storykeep/form/EnumSelect.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/form/ColorPicker.tsx'),
      dest: 'src/components/storykeep/form/ColorPicker.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/form/FileUpload.tsx'),
      dest: 'src/components/storykeep/form/FileUpload.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/form/NumberInput.tsx'),
      dest: 'src/components/storykeep/form/NumberInput.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/form/DateTimeInput.tsx'),
      dest: 'src/components/storykeep/form/DateTimeInput.tsx',
    },
    // Advanced Configuration Components
    {
      src: resolve(
        'templates/src/components/storykeep/StoryKeepDashboard_Advanced.tsx'
      ),
      dest: 'src/components/storykeep/StoryKeepDashboard_Advanced.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/advanced/AuthConfigSection.tsx'
      ),
      dest: 'src/components/storykeep/form/advanced/AuthConfigSection.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/advanced/APIConfigSection.tsx'
      ),
      dest: 'src/components/storykeep/form/advanced/APIConfigSection.tsx',
    },
    // Brand form components
    {
      src: resolve(
        'templates/src/components/storykeep/form/UnsavedChangesBar.tsx'
      ),
      dest: 'src/components/storykeep/form/UnsavedChangesBar.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/brand/BrandColorsSection.tsx'
      ),
      dest: 'src/components/storykeep/form/brand/BrandColorsSection.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/brand/BrandAssetsSection.tsx'
      ),
      dest: 'src/components/storykeep/form/brand/BrandAssetsSection.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/brand/SiteConfigSection.tsx'
      ),
      dest: 'src/components/storykeep/form/brand/SiteConfigSection.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/brand/SocialLinksSection.tsx'
      ),
      dest: 'src/components/storykeep/form/brand/SocialLinksSection.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/brand/SEOSection.tsx'
      ),
      dest: 'src/components/storykeep/form/brand/SEOSection.tsx',
    },
    // Manage Content
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/ManageContent.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/ManageContent.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/ContentSummary.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/ContentSummary.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/StoryFragmentTable.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/StoryFragmentTable.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/ContentBrowser.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/ContentBrowser.tsx',
    },
    // StoryKeep dashboard components
    {
      src: resolve('templates/src/components/storykeep/StoryKeepDashboard.tsx'),
      dest: 'src/components/storykeep/StoryKeepDashboard.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/StoryKeepDashboard_Analytics.tsx'
      ),
      dest: 'src/components/storykeep/StoryKeepDashboard_Analytics.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/StoryKeepDashboard_Branding.tsx'
      ),
      dest: 'src/components/storykeep/StoryKeepDashboard_Branding.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/StoryKeepDashboard_Content.tsx'
      ),
      dest: 'src/components/storykeep/StoryKeepDashboard_Content.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/DashboardActivity.tsx'),
      dest: 'src/components/storykeep/DashboardActivity.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/ResponsiveLine.tsx'),
      dest: 'src/components/storykeep/ResponsiveLine.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/PullDashboardAnalytics.tsx'
      ),
      dest: 'src/components/storykeep/PullDashboardAnalytics.tsx',
    },
    // Menu Management Components
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/MenuTable.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/MenuTable.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/MenuForm.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/MenuForm.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/ActionBuilderField.tsx'
      ),
      dest: 'src/components/storykeep/form/ActionBuilderField.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/ActionBuilderSlugSelector.tsx'
      ),
      dest: 'src/components/storykeep/form/ActionBuilderSlugSelector.tsx',
    },
    // Resource Management Components
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/ResourceForm.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/ResourceForm.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/ResourceTable.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/ResourceTable.tsx',
    },
    // Resource utilities
    {
      src: resolve('templates/src/utils/api/resourceConfig.ts'),
      dest: 'src/utils/api/resourceConfig.ts',
    },
    {
      src: resolve('templates/src/utils/resourceHelpers.ts'),
      dest: 'src/utils/resourceHelpers.ts',
    },
    // resources
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/KnownResourceTable.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/KnownResourceTable.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/KnownResourceForm.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/KnownResourceForm.tsx',
    },
    {
      src: resolve('templates/src/utils/resourceHelpers.ts'),
      dest: 'src/utils/resourceHelpers.ts',
    },
    // Menu Utilities
    {
      src: resolve('templates/src/utils/menuHelpers.ts'),
      dest: 'src/utils/menuHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/menuConfig.ts'),
      dest: 'src/utils/api/menuConfig.ts',
    },
    {
      src: resolve('templates/src/utils/api/resourceConfig.ts'),
      dest: 'src/utils/api/resourceConfig.ts',
    },
    // Orphan analysis system
    {
      src: resolve('templates/src/stores/orphanAnalysis.ts'),
      dest: 'src/stores/orphanAnalysis.ts',
    },
    {
      src: resolve('templates/src/pages/api/orphan-analysis.ts'),
      dest: 'src/pages/api/orphan-analysis.ts',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/form/content/ContentSummary.tsx'
      ),
      dest: 'src/components/storykeep/form/content/ContentSummary.tsx',
    },
    //
    {
      src: resolve('templates/src/components/storykeep/controls/UsageCell.tsx'),
      dest: 'src/components/storykeep/controls/UsageCell.tsx',
    },
    // Belief Management Components
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/BeliefTable.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/BeliefTable.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/BeliefForm.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/BeliefForm.tsx',
    },
    // Belief Utilities
    {
      src: resolve('templates/src/utils/beliefHelpers.ts'),
      dest: 'src/utils/beliefHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/beliefConfig.ts'),
      dest: 'src/utils/api/beliefConfig.ts',
    },
    // Navigation system files
    {
      src: resolve('templates/src/stores/navigation.ts'),
      dest: 'src/stores/navigation.ts',
    },
    {
      src: resolve('templates/src/utils/navigationHelpers.ts'),
      dest: 'src/utils/navigationHelpers.ts',
    },
    // CodeHooks components
    {
      src: resolve('templates/src/components/codehooks/EpinetWrapper.tsx'),
      dest: 'src/components/codehooks/EpinetWrapper.tsx',
    },
    {
      src: resolve(
        'templates/src/components/codehooks/EpinetDurationSelector.tsx'
      ),
      dest: 'src/components/codehooks/EpinetDurationSelector.tsx',
    },
    {
      src: resolve('templates/src/components/codehooks/EpinetTableView.tsx'),
      dest: 'src/components/codehooks/EpinetTableView.tsx',
    },
    {
      src: resolve('templates/src/components/codehooks/SankeyDiagram.tsx'),
      dest: 'src/components/codehooks/SankeyDiagram.tsx',
    },
    {
      src: resolve('templates/src/components/codehooks/FeaturedContent.astro'),
      dest: 'src/components/codehooks/FeaturedContent.astro',
    },
    {
      src: resolve('templates/src/components/codehooks/ListContent.astro'),
      dest: 'src/components/codehooks/ListContent.astro',
    },
    {
      src: resolve(
        'templates/src/components/codehooks/BunnyVideoWrapper.astro'
      ),
      dest: 'src/components/codehooks/BunnyVideoWrapper.astro',
    },

    // Widget components
    {
      src: resolve('templates/src/components/widgets/BunnyVideo.astro'),
      dest: 'src/components/widgets/BunnyVideo.astro',
    },

    // Client scripts
    {
      src: resolve('templates/src/client/belief-events.ts'),
      dest: 'src/client/belief-events.ts',
    },
    {
      src: resolve('templates/src/client/analytics-events.ts'),
      dest: 'src/client/analytics-events.ts',
    },

    // Styles
    {
      src: resolve('templates/css/custom.css'),
      dest: 'public/styles/custom.css',
    },
    {
      src: resolve('templates/css/frontend.css'),
      dest: 'public/styles/frontend.css',
    },
    {
      src: resolve('templates/css/storykeep.css'),
      dest: 'public/styles/storykeep.css',
    },

    // Fonts
    {
      src: resolve('templates/fonts/Inter-Black.woff2'),
      dest: 'public/fonts/Inter-Black.woff2',
    },
    {
      src: resolve('templates/fonts/Inter-Bold.woff2'),
      dest: 'public/fonts/Inter-Bold.woff2',
    },
    {
      src: resolve('templates/fonts/Inter-Regular.woff2'),
      dest: 'public/fonts/Inter-Regular.woff2',
    },

    // Brand assets
    {
      src: resolve('templates/brand/static.jpg'),
      dest: 'public/static.jpg',
    },
    {
      src: resolve('templates/brand/favicon.ico'),
      dest: 'public/brand/favicon.ico',
    },
    {
      src: resolve('templates/brand/logo.svg'),
      dest: 'public/brand/logo.svg',
    },
    {
      src: resolve('templates/brand/wordmark.svg'),
      dest: 'public/brand/wordmark.svg',
    },

    // Social icons
    {
      src: resolve('templates/socials/codepen.svg'),
      dest: 'public/socials/codepen.svg',
    },
    {
      src: resolve('templates/socials/discord.svg'),
      dest: 'public/socials/discord.svg',
    },
    {
      src: resolve('templates/socials/facebook.svg'),
      dest: 'public/socials/facebook.svg',
    },
    {
      src: resolve('templates/socials/github.svg'),
      dest: 'public/socials/github.svg',
    },
    {
      src: resolve('templates/socials/instagram.svg'),
      dest: 'public/socials/instagram.svg',
    },
    {
      src: resolve('templates/socials/linkedin.svg'),
      dest: 'public/socials/linkedin.svg',
    },
    {
      src: resolve('templates/socials/mail.svg'),
      dest: 'public/socials/mail.svg',
    },
    {
      src: resolve('templates/socials/rumble.svg'),
      dest: 'public/socials/rumble.svg',
    },
    {
      src: resolve('templates/socials/tiktok.svg'),
      dest: 'public/socials/tiktok.svg',
    },
    {
      src: resolve('templates/socials/twitch.svg'),
      dest: 'public/socials/twitch.svg',
    },
    {
      src: resolve('templates/socials/twitter.svg'),
      dest: 'public/socials/twitter.svg',
    },
    {
      src: resolve('templates/socials/x.svg'),
      dest: 'public/socials/x.svg',
    },
    {
      src: resolve('templates/socials/youtube.svg'),
      dest: 'public/socials/youtube.svg',
    },

    // Custom components (conditional)
    {
      src: resolve(
        config?.includeExamples
          ? 'templates/custom/with-examples/CodeHook.astro'
          : 'templates/custom/minimal/CodeHook.astro'
      ),
      dest: 'src/custom/CodeHook.astro',
      protected: true,
    },
    {
      src: resolve(
        config?.includeExamples
          ? 'templates/custom/with-examples/CustomRoutes.astro'
          : 'templates/custom/minimal/CustomRoutes.astro'
      ),
      dest: 'src/custom/CustomRoutes.astro',
      protected: true,
    },

    // Example components (only with examples)
    ...(config?.includeExamples
      ? [
        {
          src: resolve('templates/custom/with-examples/CustomHero.astro'),
          dest: 'src/custom/CustomHero.astro',
          protected: true,
        },
        {
          src: resolve(
            'templates/custom/with-examples/pages/Collections.astro'
          ),
          dest: 'src/custom/pages/Collections.astro',
          protected: true,
        },
        {
          src: resolve('templates/src/pages/collections/[param1].astro'),
          dest: 'src/pages/collections/[param1].astro',
          protected: true,
        },
      ]
      : []),
  ];

  for (const file of templateFiles) {
    try {
      const destDir = dirname(file.dest);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      const shouldOverwrite =
        !file.protected &&
        (file.dest === 'tailwind.config.cjs' ||
          file.dest.startsWith('src/components/codehooks/') ||
          file.dest.startsWith('src/components/widgets/') ||
          file.dest.startsWith('src/') ||
          file.dest === '.gitignore');

      if (!existsSync(file.dest) || shouldOverwrite) {
        if (existsSync(file.src)) {
          copyFileSync(file.src, file.dest);
          logger.info(`Updated ${file.dest}`);
        } else {
          const placeholder = createPlaceholder(file.dest);
          writeFileSync(file.dest, placeholder);
          logger.info(`Created placeholder ${file.dest}`);
        }
      } else if (file.protected) {
        logger.info(`Protected: ${file.dest} (won't overwrite)`);
      } else {
        logger.info(`Skipped existing ${file.dest}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create ${file.dest}: ${message}`);
    }
  }
}

function createPlaceholder(filePath: string): string {
  if (filePath.endsWith('.astro')) {
    return `---
// TractStack placeholder component
---
<div>TractStack placeholder: ${filePath}</div>`;
  }

  if (filePath.endsWith('.tsx')) {
    return `// TractStack placeholder component
import React from 'react';
export default function Placeholder() {
  return <div>TractStack placeholder: ${filePath}</div>;
}`;
  }

  if (filePath.endsWith('.ts')) {
    return `// TractStack placeholder utility
export const placeholder = "${filePath}";`;
  }

  if (filePath.endsWith('.cjs')) {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};`;
  }

  return `# TractStack placeholder: ${filePath}`;
}
