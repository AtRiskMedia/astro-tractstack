import { ulid } from 'ulid';
import { NodesContext } from '@/stores/nodes';
import { fullContentMapStore } from '@/stores/storykeep';
import { findUniqueSlug } from '@/utils/helpers';
import type {
  PageDesign,
  PaneNode,
  StoryFragmentNode,
} from '@/types/compositorTypes';

interface ProcessedPage {
  sections: PageSection[];
}

type PageSectionType = 'intro' | 'content' | 'subcontent';

interface PageSection {
  type: PageSectionType;
  content: string;
  children?: PageSection[]; // Optional because only content sections can have children
}

interface TitleSlugResponse {
  title: string;
  slug: string;
}

/**
 * Generate title and slug using askLemur API
 */
async function getTitleSlug(
  markdownContent: string,
  existingSlugs: string[]
): Promise<TitleSlugResponse | null> {
  if (
    !markdownContent ||
    markdownContent.trim() === '...' ||
    markdownContent.trim().length === 0
  ) {
    return null;
  }

  try {
    const backendUrl =
      import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
    const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

    const response = await fetch(`${backendUrl}/api/v1/aai/askLemur`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      },
      credentials: 'include',
      body: JSON.stringify({
        prompt: `Generate a concise title (maximum 40-50 characters) and a URL-friendly slug (lowercase, only letters, numbers, and dashes, no spaces) that captures the essence of this markdown content. Return only a JSON object with "title" and "slug" keys. 

Example response format:
{
  "title": "Short Descriptive Title",
  "slug": "short-descriptive-title"
}`,
        input_text: markdownContent,
        final_model: 'anthropic/claude-3-5-sonnet',
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.response) {
        let titleData;
        try {
          if (typeof data.data.response === 'string') {
            titleData = JSON.parse(data.data.response);
          } else {
            titleData = data.data.response;
          }

          if (titleData.title && titleData.slug) {
            return {
              title: findUniqueSlug(titleData.title, existingSlugs),
              slug: findUniqueSlug(titleData.slug, existingSlugs),
            };
          }
        } catch (parseError) {
          console.error('Error parsing title data:', parseError);
        }
      }
    }
  } catch (error) {
    console.error('Error generating title:', error);
  }

  return null;
}

export function parsePageMarkdown(markdown: string): ProcessedPage {
  const lines = markdown.split('\n');
  const sections: PageSection[] = [];
  let currentSection: PageSection | null = null;
  let currentParagraph = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const h2Match = line.match(/^## (.*)/);
    const h3Match = line.match(/^### (.*)/);
    const h4Match = line.match(/^#### (.*)/);

    if (h2Match && !currentSection) {
      currentSection = {
        type: 'intro',
        content: `## ${h2Match[1]}\n\n`,
        children: [],
      };
    } else if (h3Match) {
      if (currentSection) {
        if (currentParagraph) {
          currentSection.content += currentParagraph.trim() + '\n\n';
          currentParagraph = '';
        }
        sections.push(currentSection);
      }
      currentSection = {
        type: 'content',
        content: `### ${h3Match[1]}\n\n`,
        children: [],
      };
    } else if (h4Match && currentSection) {
      if (currentParagraph) {
        currentSection.content += currentParagraph.trim() + '\n\n';
        currentParagraph = '';
      }
      const subSection: PageSection = {
        type: 'subcontent',
        content: `#### ${h4Match[1]}\n\n`,
        children: [],
      };
      if (!currentSection.children) currentSection.children = [];
      currentSection.children.push(subSection);
      // Reset currentParagraph to start collecting content for the subSection
      currentParagraph = '';
    } else if (currentSection) {
      // This part handles content for both H3 and H4 sections
      if (currentParagraph === '') {
        currentParagraph = line;
      } else {
        currentParagraph += '\n' + line;
      }
      // If we're in a subSection, we need to update its content directly
      if (
        currentSection.children &&
        currentSection.children.length > 0 &&
        currentSection.type === 'content'
      ) {
        const lastChild =
          currentSection.children[currentSection.children.length - 1];
        if (lastChild.type === 'subcontent') {
          lastChild.content += line + '\n';
          currentParagraph = ''; // Reset since we've added it directly to subSection
        }
      }
    }
  }

  // Handle the last paragraph or section
  if (currentSection) {
    if (currentSection.type === 'intro' && currentParagraph) {
      currentSection.content += currentParagraph.trim() + '\n\n';
    } else if (currentParagraph) {
      if (
        currentSection.children &&
        currentSection.children.length > 0 &&
        currentSection.type === 'content'
      ) {
        const lastChild =
          currentSection.children[currentSection.children.length - 1];
        if (lastChild.type === 'subcontent') {
          lastChild.content += currentParagraph.trim() + '\n\n';
        } else {
          currentSection.content += currentParagraph.trim() + '\n\n';
        }
      } else {
        currentSection.content += currentParagraph.trim() + '\n\n';
      }
    }
    sections.push(currentSection);
  }

  return { sections };
}

/**
 * Creates panes for a processed page using the selected design
 */
export async function createPagePanes(
  processedPage: ProcessedPage,
  design: PageDesign,
  ctx: NodesContext,
  generateTitle: boolean,
  nodeId?: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const ownerId = nodeId || ctx.rootNodeId.get();
  const paneIds: string[] = [];
  let panesCreated = 0;

  // --- 1. Calculate the total number of panes for the progress bar ---
  const introSection = processedPage.sections.find((s) => s.type === 'intro');
  const contentSections = processedPage.sections.filter(
    (s) => s.type === 'content'
  );
  const subContentSections = contentSections.flatMap((s) => s.children || []);
  let totalPanes = 0;
  if (introSection) totalPanes++;
  totalPanes += contentSections.length;
  totalPanes += subContentSections.length;
  if (design.visualBreaks && contentSections.length > 0) {
    // A break is added between each content section
    totalPanes += contentSections.length - 1;
  }
  onProgress?.(0, totalPanes); // Report initial progress

  const existingSlugs = generateTitle
    ? fullContentMapStore
        .get()
        .filter((item: { type: string }) =>
          ['Pane', 'StoryFragment'].includes(item.type)
        )
        .map((item: { slug: string }) => item.slug)
    : [];

  // --- 2. Create Panes and Report Progress After Each Step ---
  if (introSection) {
    const introPane = design.introDesign();
    introPane.id = ulid();
    introPane.slug = '';
    introPane.title = '';
    introPane.markdown.markdownBody = introSection.content || '';

    if (generateTitle && introPane.markdown.markdownBody.trim().length > 0) {
      const titleSlugResult = await getTitleSlug(
        introPane.markdown.markdownBody,
        existingSlugs
      );
      if (titleSlugResult) {
        introPane.title = titleSlugResult.title;
        introPane.slug = titleSlugResult.slug;
        existingSlugs.push(titleSlugResult.slug);
      }
    }

    const paneId = ctx.addTemplatePane(ownerId, introPane);
    if (paneId) {
      paneIds.push(paneId);
      panesCreated++;
      onProgress?.(panesCreated, totalPanes); // Report progress
    }
  }

  for (let index = 0; index < contentSections.length; index++) {
    const section = contentSections[index];
    const useOdd = index % 2 === 0;

    if (design.visualBreaks && index > 0) {
      const isEven = (index - 1) % 2 === 0;
      const breakTemplate = isEven
        ? design.visualBreaks.even()
        : design.visualBreaks.odd();
      const lastPaneId = paneIds[paneIds.length - 1];

      if (lastPaneId) {
        const abovePane = ctx.allNodes.get().get(lastPaneId) as PaneNode;
        const aboveColor = abovePane?.bgColour || 'white';
        const nextContentPane = design.contentDesign(!useOdd);
        const belowColor = nextContentPane.bgColour;
        breakTemplate.bgColour = aboveColor;
        const svgFill = belowColor;
        if (breakTemplate.bgPane) {
          if (breakTemplate.bgPane.breakDesktop) {
            breakTemplate.bgPane.breakDesktop.svgFill = svgFill;
          }
          if (breakTemplate.bgPane.breakTablet) {
            breakTemplate.bgPane.breakTablet.svgFill = svgFill;
          }
          if (breakTemplate.bgPane.breakMobile) {
            breakTemplate.bgPane.breakMobile.svgFill = svgFill;
          }
        }
        const breakPaneId = ctx.addTemplatePane(
          ownerId,
          breakTemplate,
          lastPaneId,
          'after'
        );
        if (breakPaneId) {
          paneIds.push(breakPaneId);
          panesCreated++;
          onProgress?.(panesCreated, totalPanes); // Report progress
        }
      }
    }

    const contentPane = design.contentDesign(useOdd);
    contentPane.id = ulid();
    contentPane.slug = '';
    contentPane.title = '';
    contentPane.markdown.markdownBody = section.content || '';

    if (generateTitle && contentPane.markdown.markdownBody.trim().length > 0) {
      const titleSlugResult = await getTitleSlug(
        contentPane.markdown.markdownBody,
        existingSlugs
      );
      if (titleSlugResult) {
        contentPane.title = titleSlugResult.title;
        contentPane.slug = titleSlugResult.slug;
        existingSlugs.push(titleSlugResult.slug);
      }
    }

    const contentPaneId = ctx.addTemplatePane(ownerId, contentPane);
    if (contentPaneId) {
      paneIds.push(contentPaneId);
      panesCreated++;
      onProgress?.(panesCreated, totalPanes); // Report progress
    }

    if (section.children && section.children.length > 0) {
      for (const subSection of section.children) {
        const subContentPane = design.contentDesign(!useOdd);
        subContentPane.id = ulid();
        subContentPane.slug = '';
        subContentPane.title = '';
        subContentPane.markdown.markdownBody = subSection.content || '';

        if (
          generateTitle &&
          subContentPane.markdown.markdownBody.trim().length > 0
        ) {
          const titleSlugResult = await getTitleSlug(
            subContentPane.markdown.markdownBody,
            existingSlugs
          );
          if (titleSlugResult) {
            subContentPane.title = titleSlugResult.title;
            subContentPane.slug = titleSlugResult.slug;
            existingSlugs.push(titleSlugResult.slug);
          }
        }

        const subContentPaneId = ctx.addTemplatePane(ownerId, subContentPane);
        if (subContentPaneId) {
          paneIds.push(subContentPaneId);
          panesCreated++;
          onProgress?.(panesCreated, totalPanes); // Report progress
        }
      }
    }
  }

  return paneIds;
}

/**
 * Builds a complete page preview in the provided context
 */
export async function buildPagePreview(
  markdown: string,
  design: PageDesign,
  ctx: NodesContext
): Promise<void> {
  // Parse markdown into sections
  const processedPage = parsePageMarkdown(markdown);

  // Create story fragment node - add proper type assertion
  const pageNode = ctx.allNodes.get().get('tmp') as StoryFragmentNode;
  if (!pageNode) return;

  // Create all panes using design
  const paneIds = await createPagePanes(processedPage, design, ctx, false);

  // Update story fragment with panes
  pageNode.title = '';
  pageNode.slug = 'preview';
  pageNode.paneIds = paneIds;
}

/**
 * Validates markdown structure matches expected page format
 */
export function validatePageMarkdown(markdown: string): boolean {
  const { sections } = parsePageMarkdown(markdown);

  // Must have at least one section
  if (sections.length === 0) return false;

  // First section should be intro (H2)
  if (sections[0].type !== 'intro') return false;

  // Should have at least one content section
  if (!sections.some((s) => s.type === 'content')) return false;

  // All sections should have content
  if (!sections.every((s) => s.content.trim())) return false;

  return true;
}

/**
 * Creates preview text of how markdown will be split into panes
 */
export function getPagePreview(markdown: string): string {
  const { sections } = parsePageMarkdown(markdown);

  let preview = ``;

  sections.forEach((section, i) => {
    preview += `=== Pane ${i + 1} ===\n`;
    preview += `Type: ${section.type}\n`;
    preview += `Content Preview: ${section.content.substring(0, 100)}...\n`;
    if (section.children?.length) {
      preview += `Subsections: ${section.children.length}\n`;
    }
    preview += '\n';
  });

  return preview;
}
