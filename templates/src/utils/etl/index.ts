import type { CreativePanePayload } from '@/types/compositorTypes';

export interface BackendSavePayload {
  id: string;
  title: string;
  slug: string;
  isDecorative: boolean;
  optionsPayload: OptionsPayload;
  created?: string;
  changed: string;
  isContextPane?: boolean;
}

export interface BackendPreviewPayload {
  id: string;
  title: string;
  optionsPayload: OptionsPayload;
}

export interface OptionsPayload {
  // Top-level pane properties
  bgColour?: string;
  isDecorative: boolean;
  codeHookTarget?: string;
  heldBeliefs?: any;
  withheldBeliefs?: any;
  codeHookPayload?: object;
  htmlAst?: CreativePanePayload;

  // Flattened nodes array - ALL child nodes in flat structure
  nodes: Array<{
    id: string;
    nodeType: string;
    parentId: string | null;

    // For TagElement nodes:
    tagName?: string | undefined;
    copy?: string | undefined;
    elementCss?: string | undefined;
    isPlaceholder?: boolean | undefined;
    src?: string | undefined;
    href?: string | undefined;
    alt?: string | undefined;
    fileId?: string | undefined;
    codeHookParams?: any[] | undefined;
    buttonPayload?: object | undefined;
    overrideClasses?: any | undefined;

    // For BgPane nodes:
    type?: string | undefined;
    breakDesktop?:
      | {
          collection: string;
          image: string;
          svgFill: string;
        }
      | undefined;
    breakMobile?: object | undefined;
    breakTablet?: object | undefined;
    collection?: string | undefined;
    image?: string | undefined;
    objectFit?: string | undefined;
    position?: string | undefined;
    size?: string | undefined;
    srcSet?: string | undefined;
    base64Data?: string | undefined;

    // For Markdown nodes:
    markdownId?: string | undefined;
    defaultClasses?:
      | {
          [tagName: string]: {
            desktop: Record<string, string>;
            mobile: Record<string, string>;
            tablet: Record<string, string>;
          };
        }
      | undefined;
    parentClasses?: any | undefined;
    parentCss?: string[] | undefined;
    gridCss?: string | undefined;
    hiddenViewportMobile?: boolean | undefined;
    hiddenViewportTablet?: boolean | undefined;
    hiddenViewportDesktop?: boolean | undefined;
  }>;
}

export {
  transformStoryFragmentForSave,
  transformLivePaneForSave,
  transformLivePaneForPreview,
} from './transformer';
