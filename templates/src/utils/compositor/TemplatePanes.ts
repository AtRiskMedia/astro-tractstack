import type { TemplatePane } from '@/types/compositorTypes';

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
