import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AstroIntegrationLogger } from 'astro';

interface InjectFilesConfig {
  includeExamples?: boolean;
  enableMultiTenant?: boolean;
}

/**
 * Injects template files into the project directory, organizing them into functional groups.
 * Skips or overwrites files based on configuration and protection status.
 * @param resolve - Function to resolve template file paths
 * @param logger - Astro integration logger for logging operations
 * @param config - Configuration options for including examples and enabling multi-tenant features
 */
export async function injectTemplateFiles(
  resolve: (path: string) => string,
  logger: AstroIntegrationLogger,
  config?: InjectFilesConfig
): Promise<void> {
  logger.info('TractStack: Injecting template files');

  // File groupings organized by functionality
  const templateFiles = [
    // Core Configuration
    {
      src: resolve('templates/env.example'),
      dest: 'env.example',
    },
    {
      src: resolve('templates/.gitignore'),
      dest: '.gitignore',
    },
    {
      src: resolve('templates/tailwind.config.cjs'),
      dest: 'tailwind.config.cjs',
    },
    {
      src: resolve('templates/src/constants.ts'),
      dest: 'src/constants.ts',
    },
    {
      src: resolve('templates/src/types/tractstack.ts'),
      dest: 'src/types/tractstack.ts',
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
    {
      src: resolve('templates/src/stores/orphanAnalysis.ts'),
      dest: 'src/stores/orphanAnalysis.ts',
    },
    {
      src: resolve('templates/src/stores/navigation.ts'),
      dest: 'src/stores/navigation.ts',
    },

    // Utilities
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
      src: resolve('templates/src/utils/api/fileHelpers.ts'),
      dest: 'src/utils/api/fileHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/brandHelpers.ts'),
      dest: 'src/utils/api/brandHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/advancedConfig.ts'),
      dest: 'src/utils/api/advancedConfig.ts',
    },
    {
      src: resolve('templates/src/utils/api/advancedHelpers.ts'),
      dest: 'src/utils/api/advancedHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/resourceConfig.ts'),
      dest: 'src/utils/api/resourceConfig.ts',
    },
    {
      src: resolve('templates/src/utils/api/resourceHelpers.ts'),
      dest: 'src/utils/api/resourceHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/menuHelpers.ts'),
      dest: 'src/utils/api/menuHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/menuConfig.ts'),
      dest: 'src/utils/api/menuConfig.ts',
    },
    {
      src: resolve('templates/src/utils/api/beliefHelpers.ts'),
      dest: 'src/utils/api/beliefHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/api/beliefConfig.ts'),
      dest: 'src/utils/api/beliefConfig.ts',
    },
    {
      src: resolve('templates/src/utils/navigationHelpers.ts'),
      dest: 'src/utils/navigationHelpers.ts',
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
      src: resolve('templates/src/pages/storykeep/content.astro'),
      dest: 'src/pages/storykeep/content.astro',
    },
    {
      src: resolve('templates/src/pages/storykeep/branding.astro'),
      dest: 'src/pages/storykeep/branding.astro',
    },
    {
      src: resolve('templates/src/pages/storykeep/advanced.astro'),
      dest: 'src/pages/storykeep/advanced.astro',
    },
    {
      src: resolve('templates/src/pages/maint.astro'),
      dest: 'src/pages/maint.astro',
    },

    // Authentication Pages
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

    // API Routes
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
    {
      src: resolve('templates/src/pages/api/orphan-analysis.ts'),
      dest: 'src/pages/api/orphan-analysis.ts',
    },

    // Base Components
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

    // Profile Components
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

    // Form System
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
    {
      src: resolve('templates/src/components/form/ParagraphArrayInput.tsx'),
      dest: 'src/components/form/ParagraphArrayInput.tsx',
    },
    {
      src: resolve('templates/src/components/form/StringInput.tsx'),
      dest: 'src/components/form/StringInput.tsx',
    },
    {
      src: resolve('templates/src/components/form/StringArrayInput.tsx'),
      dest: 'src/components/form/StringArrayInput.tsx',
    },
    {
      src: resolve('templates/src/components/form/BooleanToggle.tsx'),
      dest: 'src/components/form/BooleanToggle.tsx',
    },
    {
      src: resolve('templates/src/components/form/EnumSelect.tsx'),
      dest: 'src/components/form/EnumSelect.tsx',
    },
    {
      src: resolve('templates/src/components/form/ColorPicker.tsx'),
      dest: 'src/components/form/ColorPicker.tsx',
    },
    {
      src: resolve('templates/src/components/form/FileUpload.tsx'),
      dest: 'src/components/form/FileUpload.tsx',
    },
    {
      src: resolve('templates/src/components/form/NumberInput.tsx'),
      dest: 'src/components/form/NumberInput.tsx',
    },
    {
      src: resolve('templates/src/components/form/DateTimeInput.tsx'),
      dest: 'src/components/form/DateTimeInput.tsx',
    },
    {
      src: resolve('templates/src/components/form/UnsavedChangesBar.tsx'),
      dest: 'src/components/form/UnsavedChangesBar.tsx',
    },
    {
      src: resolve('templates/src/components/form/ActionBuilderField.tsx'),
      dest: 'src/components/form/ActionBuilderField.tsx',
    },
    {
      src: resolve(
        'templates/src/components/form/ActionBuilderSlugSelector.tsx'
      ),
      dest: 'src/components/form/ActionBuilderSlugSelector.tsx',
    },

    // Brand Form Components
    {
      src: resolve(
        'templates/src/components/form/brand/BrandColorsSection.tsx'
      ),
      dest: 'src/components/form/brand/BrandColorsSection.tsx',
    },
    {
      src: resolve(
        'templates/src/components/form/brand/BrandAssetsSection.tsx'
      ),
      dest: 'src/components/form/brand/BrandAssetsSection.tsx',
    },
    {
      src: resolve('templates/src/components/form/brand/SiteConfigSection.tsx'),
      dest: 'src/components/form/brand/SiteConfigSection.tsx',
    },
    {
      src: resolve(
        'templates/src/components/form/brand/SocialLinksSection.tsx'
      ),
      dest: 'src/components/form/brand/SocialLinksSection.tsx',
    },
    {
      src: resolve('templates/src/components/form/brand/SEOSection.tsx'),
      dest: 'src/components/form/brand/SEOSection.tsx',
    },

    // Advanced Configuration Components
    {
      src: resolve(
        'templates/src/components/form/advanced/AuthConfigSection.tsx'
      ),
      dest: 'src/components/form/advanced/AuthConfigSection.tsx',
    },
    {
      src: resolve(
        'templates/src/components/form/advanced/APIConfigSection.tsx'
      ),
      dest: 'src/components/form/advanced/APIConfigSection.tsx',
    },

    // StoryKeep Dashboard Components
    {
      src: resolve('templates/src/components/storykeep/Dashboard.tsx'),
      dest: 'src/components/storykeep/Dashboard.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/FetchAnalytics.tsx'),
      dest: 'src/components/storykeep/FetchAnalytics.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/Dashboard_Wizard.tsx'),
      dest: 'src/components/storykeep/Dashboard_Wizard.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/Dashboard_Advanced.tsx'),
      dest: 'src/components/storykeep/Dashboard_Advanced.tsx',
    },
    {
      src: resolve(
        'templates/src/components/storykeep/Dashboard_Analytics.tsx'
      ),
      dest: 'src/components/storykeep/Dashboard_Analytics.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/Dashboard_Branding.tsx'),
      dest: 'src/components/storykeep/Dashboard_Branding.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/Dashboard_Content.tsx'),
      dest: 'src/components/storykeep/Dashboard_Content.tsx',
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

    // Content Management Components
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
    {
      src: resolve('templates/src/components/form/content/ContentSummary.tsx'),
      dest: 'src/components/form/content/ContentSummary.tsx',
    },
    {
      src: resolve('templates/src/components/storykeep/controls/UsageCell.tsx'),
      dest: 'src/components/storykeep/controls/UsageCell.tsx',
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

    // Resource Management Components
    {
      src: resolve(
        'templates/src/components/storykeep/controls/content/ResourceBulkIngest.tsx'
      ),
      dest: 'src/components/storykeep/controls/content/ResourceBulkIngest.tsx',
    },
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

    // CodeHook Components
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

    // Widget Components
    {
      src: resolve('templates/src/components/widgets/BunnyVideo.astro'),
      dest: 'src/components/widgets/BunnyVideo.astro',
    },

    // Client Scripts
    {
      src: resolve('templates/src/client/sse.ts'),
      dest: 'src/client/sse.ts',
    },
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

    // Brand Assets
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

    // Social Icons
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

    // Multi-Tenant Features (Conditional)
    ...(config?.enableMultiTenant
      ? [
          // Middleware
          {
            src: resolve('templates/src/middleware.ts'),
            dest: 'src/middleware.ts',
          },
          // API Utilities
          {
            src: resolve('templates/src/utils/api/tenantConfig.ts'),
            dest: 'src/utils/api/tenantConfig.ts',
          },
          {
            src: resolve('templates/src/utils/api/tenantHelpers.ts'),
            dest: 'src/utils/api/tenantHelpers.ts',
          },
          // Components
          {
            src: resolve(
              'templates/src/components/tenant/RegistrationForm.tsx'
            ),
            dest: 'src/components/tenant/RegistrationForm.tsx',
          },
          // Pages
          {
            src: resolve('templates/src/pages/sandbox/register.astro'),
            dest: 'src/pages/sandbox/register.astro',
          },
          {
            src: resolve('templates/src/pages/sandbox/activate.astro'),
            dest: 'src/pages/sandbox/activate.astro',
          },
          {
            src: resolve('templates/src/pages/sandbox/success.astro'),
            dest: 'src/pages/sandbox/success.astro',
          },
        ]
      : []),
    // Multi-Tenant Types (Always included due to plan reference)
    {
      src: resolve('templates/src/types/multiTenant.ts'),
      dest: 'src/types/multiTenant.ts',
    },

    // Custom Components (Conditional)
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

    // Example Components (Conditional)
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

  // Process each file: create directories, copy or create placeholders, and log results
  for (const file of templateFiles) {
    try {
      const destDir = dirname(file.dest);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Determine if file should be overwritten
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
        logger.info(`Protected: ${file.dest} (skipped overwrite)`);
      } else {
        logger.info(`Skipped existing ${file.dest}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create ${file.dest}: ${message}`);
    }
  }
}

/**
 * Creates a placeholder file content based on the file extension.
 * @param filePath - Destination path of the file
 * @returns Placeholder content for the file
 */
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
