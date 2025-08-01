import { getColor } from './tailwindColors';
import type { TemplateMarkdown } from '@/types/compositorTypes';
import type { Theme } from '@/types/tractstack';

export const getTemplateSimpleMarkdown = (theme: Theme) => {
  return {
    nodeType: 'Markdown',
    id: '',
    parentId: '',
    type: 'markdown',
    markdownId: '01JD2RGG95PMZ7E6V5MBX9Q3FJ',
    defaultClasses: {
      h2: {
        mobile: {
          fontWEIGHT: 'bold',
          textCOLOR: getColor(
            {
              light: 'brand-7',
              'light-bw': 'brand-1',
              'light-bold': 'brand-5',
              dark: 'brand-4',
              'dark-bw': 'brand-8',
              'dark-bold': 'brand-3',
            },
            theme
          ),
          textSIZE: '4xl',
          fontFACE: 'action',
        },
        tablet: {
          textSIZE: '5xl',
        },
        desktop: {
          textSIZE: '6xl',
        },
      },
      h3: {
        mobile: {
          fontWEIGHT: 'bold',
          textCOLOR: 'brand-5',
          textSIZE: 'xl',
          fontFACE: 'action',
        },
        tablet: {
          textSIZE: '3xl',
        },
        desktop: {},
      },
      h4: {
        mobile: {
          textCOLOR: 'brand-5',
          textSIZE: 'xl',
          fontFACE: 'action',
        },
        tablet: {
          textSIZE: '2xl',
        },
        desktop: {},
      },
      p: {
        mobile: {
          textCOLOR: 'myoffwhite',
          textSIZE: 'lg',
          lineHEIGHT: 'snug',
          mt: '2.5',
        },
        tablet: {
          textSIZE: 'xl',
          mt: '3.5',
        },
        desktop: {},
      },
    },
    parentClasses: [
      {
        mobile: {
          mt: '10',
          mb: '5',
          mx: '5',
        },
        tablet: {
          mt: '20',
          mb: '10',
          mx: '10',
        },
        desktop: {},
      },
      {
        mobile: {
          maxW: 'none',
          mx: 'auto',
        },
        tablet: {
          maxW: 'screen-lg',
        },
        desktop: {
          maxW: 'screen-xl',
        },
      },
      {
        mobile: {
          px: '9',
          pt: '12',
          pb: '10',
          textALIGN: 'left',
          textWRAP: 'pretty',
          maxW: 'none',
        },
        tablet: {
          px: '14',
        },
        desktop: {
          px: '32',
        },
      },
    ],
  } as TemplateMarkdown;
};
