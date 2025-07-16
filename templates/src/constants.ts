import type { GotoTargets } from './types/tractstack';

export const THRESHOLD_GLOSSED = 7000; // 7 seconds in ms
export const THRESHOLD_READ = 42000; // 42 seconds in ms
export const MAX_ANALYTICS_HOURS = 672;

export const colors = [
  '#61AFEF',
  '#98C379',
  '#C678DD',
  '#E06C75',
  '#56B6C2',
  '#D19A66',
  '#BE5046',
  '#98C379',
  '#E5C07B',
  '#528BFF',
  '#FF6B6B',
  '#4EC9B0',
];

export const GOTO_TARGETS: GotoTargets = {
  storykeep: {
    name: 'StoryKeep',
    subcommands: ['dashboard', 'settings', 'login', 'logout'],
    description: 'Navigate to StoryKeep sections',
  },
  home: {
    name: 'Home Page',
    description: 'Navigate to the home page',
  },
  concierge: {
    name: 'Concierge',
    subcommands: ['profile'],
    description: 'Navigate to concierge sections',
  },
  context: {
    name: 'Context',
    requiresParam: true,
    paramLabel: 'Context Slug',
    description: 'Navigate to a context page',
  },
  storyFragment: {
    name: 'Story Fragment',
    requiresParam: true,
    paramLabel: 'StoryFragment Slug',
    description: 'Navigate to a story fragment',
  },
  storyFragmentPane: {
    name: 'Story Fragment Pane',
    requiresParam: true,
    requiresSecondParam: true,
    paramLabel: 'StoryFragment Slug',
    param2Label: 'Pane Slug',
    description: 'Navigate to specific pane in a story fragment',
  },
  bunny: {
    name: 'Goto Bunny Video',
    requiresParam: true,
    requiresSecondParam: true,
    requiresThirdParam: true,
    paramLabel: 'StoryFragment Slug',
    param2Label: 'Time (seconds)',
    param3Label: 'Video ID',
    description: 'Play a Bunny video at specified time',
  },
  url: {
    name: 'External URL',
    requiresParam: true,
    paramLabel: 'URL',
    description: 'Navigate to external URL',
    placeholder: 'https://...',
  },
};
