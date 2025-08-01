import {
  //TemplateAsideNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplatePNode,
} from './TemplateNodes';
import { getTemplateSimpleMarkdown } from './TemplateMarkdowns';
import { getColor, tailwindToHex } from './tailwindColors';
import type { TemplatePane } from '@/types/compositorTypes';
import type { Theme } from '@/types/tractstack';

export const getTemplateVisualBreakPane = (variant: string) => {
  // colour will be set on insert based on adjacent nodes
  const breakConfig = {
    collection: 'kCz',
    image: variant,
    svgFill: 'black',
  };
  return {
    nodeType: 'Pane',
    title: '',
    slug: '',
    isDecorative: true,
    bgColour: 'white',
    bgPane: {
      nodeType: 'BgPane',
      type: 'visual-break',
      breakDesktop: breakConfig,
      breakTablet: breakConfig,
      breakMobile: breakConfig,
    },
  } as TemplatePane;
};

export const getTemplateSimplePane = (
  theme: Theme,
  brand: string,
  useOdd: boolean = false
) => {
  return {
    nodeType: 'Pane',
    title: '',
    slug: '',
    bgColour: tailwindToHex(
      getColor(
        {
          light: !useOdd ? 'brand-2' : 'white',
          'light-bw': !useOdd ? 'white' : 'brand-2',
          'light-bold': !useOdd ? 'brand-2' : 'white',
          dark: !useOdd ? 'black' : 'brand-1',
          'dark-bw': !useOdd ? 'black' : 'brand-1',
          'dark-bold': !useOdd ? 'brand-1' : 'black',
        },
        theme
      ),
      brand
    ),
    markdown: {
      ...getTemplateSimpleMarkdown(theme),
      nodes: [
        { ...TemplateH2Node, copy: 'H2 node in simple pane' },
        { ...TemplatePNode, copy: 'P node in simple pane' },
        { ...TemplateH3Node, copy: 'H3 node in simple pane' },
        //{ ...TemplateAsideNode, copy: "Aside node in simple pane" },
      ],
    },
  } as TemplatePane;
};

export const getTemplateMarkdownPane = (
  theme: Theme,
  variant: string,
  brand: string,
  useOdd: boolean = false
) => {
  console.log(`variant: ${variant}`);
  return {
    nodeType: 'Pane',
    title: '',
    slug: '',
    bgColour: tailwindToHex(
      getColor(
        {
          light: !useOdd ? 'brand-2' : 'white',
          'light-bw': !useOdd ? 'white' : 'brand-2',
          'light-bold': !useOdd ? 'brand-2' : 'white',
          dark: !useOdd ? 'black' : 'brand-1',
          'dark-bw': !useOdd ? 'black' : 'brand-1',
          'dark-bold': !useOdd ? 'brand-1' : 'black',
        },
        theme
      ),
      brand
    ),
    markdown: {
      ...getTemplateSimpleMarkdown(theme),
      markdownBody: `## add a catchy title here\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n[Try it now!](try) &nbsp; [Learn more](learn)\n`,
    },
  } as TemplatePane;
};
