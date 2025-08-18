import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AstroIntegrationLogger } from '@/types/astro';

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
      src: resolve('templates/src/constants/stopWords.ts'),
      dest: 'src/constants/stopWords.ts',
    },

    // Types
    {
      src: resolve('templates/src/types/astro.ts'),
      dest: 'src/types/astro.ts',
    },
    {
      src: resolve('astro.d.ts'),
      dest: 'astro.d.ts',
    },
    {
      src: resolve('templates/src/types/tractstack.ts'),
      dest: 'src/types/tractstack.ts',
    },

    // Compositor types
    {
      src: resolve('templates/src/types/compositorTypes.ts'),
      dest: 'src/types/compositorTypes.ts',
    },
    {
      src: resolve('templates/src/types/nodeProps.ts'),
      dest: 'src/types/nodeProps.ts',
    },
    // Compositor components
    {
      src: resolve('templates/src/components/compositor/Compositor.tsx'),
      dest: 'src/components/compositor/Compositor.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/PanelVisibilityWrapper.tsx'
      ),
      dest: 'src/components/compositor/PanelVisibilityWrapper.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/Node.tsx'),
      dest: 'src/components/compositor/Node.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/NodeWithGuid.tsx'),
      dest: 'src/components/compositor/NodeWithGuid.tsx',
    },
    {
      src: resolve('templates/src/components/edit/panelVisibilityWrapper.tsx'),
      dest: 'src/components/edit/panelVisibilityWrapper.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/RenderChildren.tsx'
      ),
      dest: 'src/components/compositor/nodes/RenderChildren.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/GhostInsertBlock.tsx'
      ),
      dest: 'src/components/compositor/nodes/GhostInsertBlock.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/StoryFragment.tsx'
      ),
      dest: 'src/components/compositor/nodes/StoryFragment.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/nodes/Pane.tsx'),
      dest: 'src/components/compositor/nodes/Pane.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/nodes/Pane_eraser.tsx'),
      dest: 'src/components/compositor/nodes/Pane_eraser.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/nodes/Pane_layout.tsx'),
      dest: 'src/components/compositor/nodes/Pane_layout.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/nodes/Markdown.tsx'),
      dest: 'src/components/compositor/nodes/Markdown.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/BgPaneWrapper.tsx'
      ),
      dest: 'src/components/compositor/nodes/BgPaneWrapper.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/nodes/Widget.tsx'),
      dest: 'src/components/compositor/nodes/Widget.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/nodes/TagElement.tsx'),
      dest: 'src/components/compositor/nodes/TagElement.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/TabIndicator.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/TabIndicator.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeBasicTag.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeBasicTag.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeBasicTag_insert.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeBasicTag_insert.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeBasicTag_eraser.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeBasicTag_eraser.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeBasicTag_settings.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeBasicTag_settings.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeText.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeText.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeAnchorComponent.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeAnchorComponent.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeA.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeA.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeA.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeA.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeA_eraser.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeA_eraser.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeButton.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeButton.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeButton_eraser.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeButton_eraser.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/nodes/tagElements/NodeImg.tsx'
      ),
      dest: 'src/components/compositor/nodes/tagElements/NodeImg.tsx',
    },
    // Edit widgets
    {
      src: resolve('templates/src/components/edit/widgets/BeliefWidget.tsx'),
      dest: 'src/components/edit/widgets/BeliefWidget.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/widgets/IdentifyAsWidget.tsx'
      ),
      dest: 'src/components/edit/widgets/IdentifyAsWidget.tsx',
    },
    {
      src: resolve('templates/src/components/edit/widgets/ToggleWidget.tsx'),
      dest: 'src/components/edit/widgets/ToggleWidget.tsx',
    },
    {
      src: resolve('templates/src/components/edit/widgets/BunnyWidget.tsx'),
      dest: 'src/components/edit/widgets/BunnyWidget.tsx',
    },
    {
      src: resolve('templates/src/components/edit/widgets/SignupWidget.tsx'),
      dest: 'src/components/edit/widgets/SignupWidget.tsx',
    },
    {
      src: resolve('templates/src/components/edit/widgets/YouTubeWidget.tsx'),
      dest: 'src/components/edit/widgets/YouTubeWidget.tsx',
    },
    // Compositor fields
    {
      src: resolve('templates/src/components/fields/SingleParam.tsx'),
      dest: 'src/components/fields/SingleParam.tsx',
    },
    {
      src: resolve('templates/src/components/fields/BooleanParam.tsx'),
      dest: 'src/components/fields/BooleanParam.tsx',
    },
    {
      src: resolve('templates/src/components/fields/MultiParam.tsx'),
      dest: 'src/components/fields/MultiParam.tsx',
    },
    {
      src: resolve('templates/src/components/fields/ImageUpload.tsx'),
      dest: 'src/components/fields/ImageUpload.tsx',
    },
    {
      src: resolve('templates/src/components/fields/ArtpackImage.tsx'),
      dest: 'src/components/fields/ArtpackImage.tsx',
    },
    {
      src: resolve('templates/src/components/fields/BackgroundImage.tsx'),
      dest: 'src/components/fields/BackgroundImage.tsx',
    },
    {
      src: resolve(
        'templates/src/components/fields/BackgroundImageWrapper.tsx'
      ),
      dest: 'src/components/fields/BackgroundImageWrapper.tsx',
    },
    {
      src: resolve('templates/src/components/fields/ColorPickerCombo.tsx'),
      dest: 'src/components/fields/ColorPickerCombo.tsx',
    },
    {
      src: resolve(
        'templates/src/components/fields/PaneBreakCollectionSelector.tsx'
      ),
      dest: 'src/components/fields/PaneBreakCollectionSelector.tsx',
    },
    {
      src: resolve(
        'templates/src/components/fields/PaneBreakShapeSelector.tsx'
      ),
      dest: 'src/components/fields/PaneBreakShapeSelector.tsx',
    },
    {
      src: resolve('templates/src/components/fields/SelectedTailwindClass.tsx'),
      dest: 'src/components/fields/SelectedTailwindClass.tsx',
    },
    {
      src: resolve('templates/src/components/fields/ViewportComboBox.tsx'),
      dest: 'src/components/fields/ViewportComboBox.tsx',
    },
    {
      src: resolve('templates/src/components/fields/BunnyMomentSelector.tsx'),
      dest: 'src/components/fields/BunnyMomentSelector.tsx',
    },
    {
      src: resolve(
        'templates/src/components/fields/ActionBuilderTimeSelector.tsx'
      ),
      dest: 'src/components/fields/ActionBuilderTimeSelector.tsx',
    },
    // Compositor elements
    {
      src: resolve('templates/src/components/compositor/elements/Belief.tsx'),
      dest: 'src/components/compositor/elements/Belief.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/elements/ToggleBelief.tsx'
      ),
      dest: 'src/components/compositor/elements/ToggleBelief.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/elements/IdentifyAs.tsx'
      ),
      dest: 'src/components/compositor/elements/IdentifyAs.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/elements/SignUp.tsx'),
      dest: 'src/components/compositor/elements/SignUp.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/elements/BunnyVideo.tsx'
      ),
      dest: 'src/components/compositor/elements/BunnyVideo.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/elements/YouTubeWrapper.tsx'
      ),
      dest: 'src/components/compositor/elements/YouTubeWrapper.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/elements/BgVisualBreak.tsx'
      ),
      dest: 'src/components/compositor/elements/BgVisualBreak.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/elements/BgImage.tsx'),
      dest: 'src/components/compositor/elements/BgImage.tsx',
    },
    {
      src: resolve('templates/src/components/compositor/elements/Svg.tsx'),
      dest: 'src/components/compositor/elements/Svg.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/elements/PlayButton.tsx'
      ),
      dest: 'src/components/compositor/elements/PlayButton.tsx',
    },
    // Compositor panels
    {
      src: resolve(
        'templates/src/components/edit/storyfragment/StoryFragmentConfigPanel.tsx'
      ),
      dest: 'src/components/edit/storyfragment/StoryFragmentConfigPanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/storyfragment/StoryFragmentPanel_title.tsx'
      ),
      dest: 'src/components/edit/storyfragment/StoryFragmentPanel_title.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/storyfragment/StoryFragmentPanel_slug.tsx'
      ),
      dest: 'src/components/edit/storyfragment/StoryFragmentPanel_slug.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/storyfragment/StoryFragmentPanel_menu.tsx'
      ),
      dest: 'src/components/edit/storyfragment/StoryFragmentPanel_menu.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/storyfragment/StoryFragmentPanel_og.tsx'
      ),
      dest: 'src/components/edit/storyfragment/StoryFragmentPanel_og.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/AddPanePanel.tsx'),
      dest: 'src/components/edit/pane/AddPanePanel.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/AddPanePanel_break.tsx'),
      dest: 'src/components/edit/pane/AddPanePanel_break.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/pane/AddPanePanel_codehook.tsx'
      ),
      dest: 'src/components/edit/pane/AddPanePanel_codehook.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/pane/AddPanePanel_newAICopy_modal.tsx'
      ),
      dest: 'src/components/edit/pane/AddPanePanel_newAICopy_modal.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/pane/AddPanePanel_newAICopy.tsx'
      ),
      dest: 'src/components/edit/pane/AddPanePanel_newAICopy.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/pane/AddPanePanel_newCopyMode.tsx'
      ),
      dest: 'src/components/edit/pane/AddPanePanel_newCopyMode.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/pane/AddPanePanel_newCustomCopy.tsx'
      ),
      dest: 'src/components/edit/pane/AddPanePanel_newCustomCopy.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/AddPanePanel_new.tsx'),
      dest: 'src/components/edit/pane/AddPanePanel_new.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/AddPanePanel_reuse.tsx'),
      dest: 'src/components/edit/pane/AddPanePanel_reuse.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/ConfigPanePanel.tsx'),
      dest: 'src/components/edit/pane/ConfigPanePanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/pane/PanePanel_impression.tsx'
      ),
      dest: 'src/components/edit/pane/PanePanel_impression.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/PanePanel_path.tsx'),
      dest: 'src/components/edit/pane/PanePanel_path.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/PanePanel_slug.tsx'),
      dest: 'src/components/edit/pane/PanePanel_slug.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/PanePanel_title.tsx'),
      dest: 'src/components/edit/pane/PanePanel_title.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/context/ContextPaneConfig.tsx'
      ),
      dest: 'src/components/edit/context/ContextPaneConfig.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/context/ContextPaneConfig_title.tsx'
      ),
      dest: 'src/components/edit/context/ContextPaneConfig_title.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/context/ContextPaneConfig_slug.tsx'
      ),
      dest: 'src/components/edit/context/ContextPaneConfig_slug.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/PageGenSelector.tsx'),
      dest: 'src/components/edit/pane/PageGenSelector.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/PageGenSpecial.tsx'),
      dest: 'src/components/edit/pane/PageGenSpecial.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/PageGen.tsx'),
      dest: 'src/components/edit/pane/PageGen.tsx',
    },
    {
      src: resolve('templates/src/components/edit/pane/PageGen_preview.tsx'),
      dest: 'src/components/edit/pane/PageGen_preview.tsx',
    },
    // Compositor previews
    {
      src: resolve(
        'templates/src/components/compositor/preview/PanesPreviewGenerator.tsx'
      ),
      dest: 'src/components/compositor/preview/PanesPreviewGenerator.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/preview/PaneSnapshotGenerator.tsx'
      ),
      dest: 'src/components/compositor/preview/PaneSnapshotGenerator.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/preview/NodesSnapshotRenderer.tsx'
      ),
      dest: 'src/components/compositor/preview/NodesSnapshotRenderer.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/preview/OgImagePreview.tsx'
      ),
      dest: 'src/components/compositor/preview/OgImagePreview.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/preview/VisualBreakPreview.tsx'
      ),
      dest: 'src/components/compositor/preview/VisualBreakPreview.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/preview/ListContentPreview.tsx'
      ),
      dest: 'src/components/compositor/preview/ListContentPreview.tsx',
    },
    {
      src: resolve(
        'templates/src/components/compositor/preview/FeaturedContentPreview.tsx'
      ),
      dest: 'src/components/compositor/preview/FeaturedContentPreview.tsx',
    },

    // Compositor stores
    {
      src: resolve('templates/src/stores/nodes.ts'),
      dest: 'src/stores/nodes.ts',
    },
    {
      src: resolve('templates/src/stores/notificationSystem.ts'),
      dest: 'src/stores/notificationSystem.ts',
    },
    {
      src: resolve('templates/src/stores/nodesHistory.ts'),
      dest: 'src/stores/nodesHistory.ts',
    },

    // AAI utils
    {
      src: resolve('templates/src/utils/aai/getTitleSlug.ts'),
      dest: 'src/utils/aai/getTitleSlug.ts',
    },

    // Compositor utils - etl
    {
      src: resolve('templates/src/utils/etl/index.ts'),
      dest: 'src/utils/etl/index.ts',
    },
    {
      src: resolve('templates/src/utils/etl/extractor.ts'),
      dest: 'src/utils/etl/extractor.ts',
    },
    {
      src: resolve('templates/src/utils/etl/transformer.ts'),
      dest: 'src/utils/etl/transformer.ts',
    },
    {
      src: resolve('templates/src/utils/etl/loader.ts'),
      dest: 'src/utils/etl/loader.ts',
    },
    // Compositor utils
    {
      src: resolve('templates/src/utils/compositor/processMarkdown.ts'),
      dest: 'src/utils/compositor/processMarkdown.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/templateMarkdownStyles.ts'),
      dest: 'src/utils/compositor/templateMarkdownStyles.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/nodesMarkdownGenerator.ts'),
      dest: 'src/utils/compositor/nodesMarkdownGenerator.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/nodesHelper.ts'),
      dest: 'src/utils/compositor/nodesHelper.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/allowInsert.ts'),
      dest: 'src/utils/compositor/allowInsert.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/typeGuards.ts'),
      dest: 'src/utils/compositor/typeGuards.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/domHelpers.ts'),
      dest: 'src/utils/compositor/domHelpers.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/actionButton.ts'),
      dest: 'src/utils/compositor/actionButton.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/handleClickEvent.ts'),
      dest: 'src/utils/compositor/handleClickEvent.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/reduceNodesClassNames.ts'),
      dest: 'src/utils/compositor/reduceNodesClassNames.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/tailwindClasses.ts'),
      dest: 'src/utils/compositor/tailwindClasses.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/tailwindColors.ts'),
      dest: 'src/utils/compositor/tailwindColors.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/TemplateNodes.ts'),
      dest: 'src/utils/compositor/TemplateNodes.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/TemplatePanes.ts'),
      dest: 'src/utils/compositor/TemplatePanes.ts',
    },
    {
      src: resolve('templates/src/utils/compositor/TemplateMarkdowns.ts'),
      dest: 'src/utils/compositor/TemplateMarkdowns.ts',
    },
    {
      src: resolve('templates/src/constants/tailwindColors.json'),
      dest: 'src/constants/tailwindColors.json',
    },
    {
      src: resolve('templates/src/constants/shapes.ts'),
      dest: 'src/constants/shapes.ts',
    },
    {
      src: resolve('templates/src/constants/beliefs.ts'),
      dest: 'src/constants/beliefs.ts',
    },
    {
      src: resolve('templates/src/constants/prompts.json'),
      dest: 'src/constants/prompts.json',
    },

    // Stores
    {
      src: resolve('templates/src/stores/storykeep.ts'),
      dest: 'src/stores/storykeep.ts',
    },
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

    // Action utilities
    {
      src: resolve('templates/src/utils/actions/lispLexer.ts'),
      dest: 'src/utils/actions/lispLexer.ts',
    },
    {
      src: resolve('templates/src/utils/actions/preParse_Action.ts'),
      dest: 'src/utils/actions/preParse_Action.ts',
    },
    {
      src: resolve('templates/src/utils/actions/preParse_Clicked.ts'),
      dest: 'src/utils/actions/preParse_Clicked.ts',
    },
    {
      src: resolve('templates/src/utils/actions/preParse_Impression.ts'),
      dest: 'src/utils/actions/preParse_Impression.ts',
    },
    {
      src: resolve('templates/src/utils/actions/preParse_Bunny.ts'),
      dest: 'src/utils/actions/preParse_Bunny.ts',
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
      src: resolve('templates/src/utils/useInterval.ts'),
      dest: 'src/utils/useInterval.ts',
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
      src: resolve('templates/src/pages/context/[...contextSlug].astro'),
      dest: 'src/pages/context/[...contextSlug].astro',
    },
    {
      src: resolve('templates/src/pages/context/[...contextSlug]/edit.astro'),
      dest: 'src/pages/context/[...contextSlug]/edit.astro',
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
    {
      src: resolve('templates/src/pages/404.astro'),
      dest: 'src/pages/404.astro',
    },
    {
      src: resolve('templates/src/pages/llms.txt.ts'),
      dest: 'src/pages/llms.txt.ts',
    },
    {
      src: resolve('templates/src/pages/robots.txt.ts'),
      dest: 'src/pages/robots.txt.ts',
    },
    {
      src: resolve('templates/src/pages/sitemap.xml.ts'),
      dest: 'src/pages/sitemap.xml.ts',
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
      src: resolve('templates/src/components/form/MagicPathBuilder.tsx'),
      dest: 'src/components/form/MagicPathBuilder.tsx',
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
      src: resolve('templates/src/components/storykeep/Dashboard_Activity.tsx'),
      dest: 'src/components/storykeep/Dashboard_Activity.tsx',
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
      src: resolve(
        'templates/src/components/codehooks/FeaturedContentSetup.tsx'
      ),
      dest: 'src/components/codehooks/FeaturedContentSetup.tsx',
    },
    {
      src: resolve('templates/src/components/codehooks/ListContent.astro'),
      dest: 'src/components/codehooks/ListContent.astro',
    },
    {
      src: resolve('templates/src/components/codehooks/ListContentSetup.tsx'),
      dest: 'src/components/codehooks/ListContentSetup.tsx',
    },
    {
      src: resolve(
        'templates/src/components/codehooks/BunnyVideoWrapper.astro'
      ),
      dest: 'src/components/codehooks/BunnyVideoWrapper.astro',
    },
    {
      src: resolve('templates/src/components/codehooks/BunnyVideoSetup.tsx'),
      dest: 'src/components/codehooks/BunnyVideoSetup.tsx',
    },

    // Widget Components
    {
      src: resolve('templates/src/components/widgets/Impression.tsx'),
      dest: 'src/components/widgets/Impression.tsx',
    },
    {
      src: resolve('templates/src/components/widgets/ImpressionWrapper.tsx'),
      dest: 'src/components/widgets/ImpressionWrapper.tsx',
    },
    {
      src: resolve('templates/src/components/widgets/BunnyVideoHero.astro'),
      dest: 'src/components/widgets/BunnyVideoHero.astro',
    },

    // Server Scripts
    {
      src: resolve('templates/src/lib/storyData.ts'),
      dest: 'src/lib/storyData.ts',
    },
    {
      src: resolve('templates/src/lib/session.ts'),
      dest: 'src/lib/session.ts',
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

    // StoryKeep Editor (add new section)
    {
      src: resolve('templates/src/pages/[...slug]/edit.astro'),
      dest: 'src/pages/[...slug]/edit.astro',
    },
    {
      src: resolve('templates/src/utils/layout.ts'),
      dest: 'src/utils/layout.ts',
    },

    // StoryKeep Components (add new section)
    {
      src: resolve('templates/src/components/edit/Header.tsx'),
      dest: 'src/components/edit/Header.tsx',
    },
    {
      src: resolve('templates/src/components/edit/ToolMode.tsx'),
      dest: 'src/components/edit/ToolMode.tsx',
    },
    {
      src: resolve('templates/src/components/edit/ToolBar.tsx'),
      dest: 'src/components/edit/ToolBar.tsx',
    },
    {
      src: resolve('templates/src/components/edit/SettingsPanel.tsx'),
      dest: 'src/components/edit/SettingsPanel.tsx',
    },
    {
      src: resolve('templates/src/components/edit/PanelSwitch.tsx'),
      dest: 'src/components/edit/PanelSwitch.tsx',
    },
    {
      src: resolve('templates/src/components/edit/state/StylesMemory.tsx'),
      dest: 'src/components/edit/state/StylesMemory.tsx',
    },
    {
      src: resolve('templates/src/components/edit/panels/StyleBreakPanel.tsx'),
      dest: 'src/components/edit/panels/StyleBreakPanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleCodeHookPanel.tsx'
      ),
      dest: 'src/components/edit/panels/StyleCodeHookPanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleElementPanel_add.tsx'
      ),
      dest: 'src/components/edit/panels/StyleElementPanel_add.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleElementPanel_remove.tsx'
      ),
      dest: 'src/components/edit/panels/StyleElementPanel_remove.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleElementPanel.tsx'
      ),
      dest: 'src/components/edit/panels/StyleElementPanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleElementPanel_update.tsx'
      ),
      dest: 'src/components/edit/panels/StyleElementPanel_update.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleImagePanel_add.tsx'
      ),
      dest: 'src/components/edit/panels/StyleImagePanel_add.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleImagePanel_remove.tsx'
      ),
      dest: 'src/components/edit/panels/StyleImagePanel_remove.tsx',
    },
    {
      src: resolve('templates/src/components/edit/panels/StyleImagePanel.tsx'),
      dest: 'src/components/edit/panels/StyleImagePanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleImagePanel_update.tsx'
      ),
      dest: 'src/components/edit/panels/StyleImagePanel_update.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleLiElementPanel_add.tsx'
      ),
      dest: 'src/components/edit/panels/StyleLiElementPanel_add.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleLiElementPanel_remove.tsx'
      ),
      dest: 'src/components/edit/panels/StyleLiElementPanel_remove.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleLiElementPanel.tsx'
      ),
      dest: 'src/components/edit/panels/StyleLiElementPanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleLiElementPanel_update.tsx'
      ),
      dest: 'src/components/edit/panels/StyleLiElementPanel_update.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleLinkPanel_add.tsx'
      ),
      dest: 'src/components/edit/panels/StyleLinkPanel_add.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleLinkPanel_config.tsx'
      ),
      dest: 'src/components/edit/panels/StyleLinkPanel_config.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleLinkPanel_remove.tsx'
      ),
      dest: 'src/components/edit/panels/StyleLinkPanel_remove.tsx',
    },
    {
      src: resolve('templates/src/components/edit/panels/StyleLinkPanel.tsx'),
      dest: 'src/components/edit/panels/StyleLinkPanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleLinkPanel_update.tsx'
      ),
      dest: 'src/components/edit/panels/StyleLinkPanel_update.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleParentPanel_add.tsx'
      ),
      dest: 'src/components/edit/panels/StyleParentPanel_add.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleParentPanel_deleteLayer.tsx'
      ),
      dest: 'src/components/edit/panels/StyleParentPanel_deleteLayer.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleParentPanel_remove.tsx'
      ),
      dest: 'src/components/edit/panels/StyleParentPanel_remove.tsx',
    },
    {
      src: resolve('templates/src/components/edit/panels/StyleParentPanel.tsx'),
      dest: 'src/components/edit/panels/StyleParentPanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleParentPanel_update.tsx'
      ),
      dest: 'src/components/edit/panels/StyleParentPanel_update.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleWidgetPanel_add.tsx'
      ),
      dest: 'src/components/edit/panels/StyleWidgetPanel_add.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleWidgetPanel_config.tsx'
      ),
      dest: 'src/components/edit/panels/StyleWidgetPanel_config.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleWidgetPanel_remove.tsx'
      ),
      dest: 'src/components/edit/panels/StyleWidgetPanel_remove.tsx',
    },
    {
      src: resolve('templates/src/components/edit/panels/StyleWidgetPanel.tsx'),
      dest: 'src/components/edit/panels/StyleWidgetPanel.tsx',
    },
    {
      src: resolve(
        'templates/src/components/edit/panels/StyleWidgetPanel_update.tsx'
      ),
      dest: 'src/components/edit/panels/StyleWidgetPanel_update.tsx',
    },
    {
      src: resolve('templates/src/components/edit/HudDisplay.tsx'),
      dest: 'src/components/edit/HudDisplay.tsx',
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

    // Add Mode icons
    {
      src: resolve('templates/icons/h2.svg'),
      dest: 'public/icons/h2.svg',
    },
    {
      src: resolve('templates/icons/h3.svg'),
      dest: 'public/icons/h3.svg',
    },
    {
      src: resolve('templates/icons/h4.svg'),
      dest: 'public/icons/h4.svg',
    },
    {
      src: resolve('templates/icons/h5.svg'),
      dest: 'public/icons/h5.svg',
    },
    {
      src: resolve('templates/icons/image.svg'),
      dest: 'public/icons/image.svg',
    },
    {
      src: resolve('templates/icons/text.svg'),
      dest: 'public/icons/text.svg',
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
