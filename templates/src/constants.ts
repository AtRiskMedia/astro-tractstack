import type { GotoTargets } from './types/tractstack';
import type { WidgetMeta } from './types/compositorTypes';
import type { ToolAddMode } from './types/compositorTypes';

export const IMPRESSIONS_DELAY = 5000;
export const THRESHOLD_GLOSSED = 7000; // 7 seconds in ms
export const THRESHOLD_READ = 42000; // 42 seconds in ms
export const MAX_ANALYTICS_HOURS = 672;

export const reservedSlugs = [
  `api`,
  `collections`,
  `create`,
  `edit`,
  `concierge`,
  `context`,
  `products`,
  `storykeep`,
  `cart`,
  `404`,
  `transcribe`,
  `sitemap`,
  `robots`,
  `llm`,
];

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

export const collections = ['kCz'];

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

export const isTemplateToolAddModes = [
  'p',
  'h2',
  'h3',
  'h4',
  'img',
  'bunny',
  'yt',
] as const;

export const toolAddModes = [
  'p',
  'h2',
  'h3',
  'h4',
  'img',
  'signup',
  'yt',
  'bunny',
  'belief',
  'identify',
  'toggle',
  //"aside",
] as const;

export const toolAddModeTitles: Record<ToolAddMode, string> = {
  p: 'Paragraph',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  img: 'Image',
  signup: 'Email Sign-up Widget',
  yt: 'YouTube Video',
  bunny: 'Bunny Video',
  belief: 'Belief Select',
  identify: 'Identity As',
  toggle: 'Toggle Belief',
  //aside: "Aside Text",
};

export const toolAddModeInsertDefault: Record<ToolAddMode, string> = {
  p: '...',
  h2: '## title',
  h3: '### subtitle',
  h4: '#### section title',
  img: '![Descriptive title](filename)', // on initial insert must wrap in ul
  signup: '* `signup(Major Updates Only|Keep in touch!|false)`',
  yt: '* `youtube(tag|title)`',
  bunny: '* `bunny(id|title)`',
  belief: '* `belief(BeliefTag|likert|prompt)`',
  identify: '* `identifyAs(BeliefTag|TARGET_VALUE|prompt)`',
  toggle: '* `toggle(BeliefTag|prompt)`',
  //aside: "...", // on initial insert must wrap in ol
};

export const toolAddModesIcons: Record<ToolAddMode, string> = {
  p: 'text.svg',
  h2: 'h2.svg',
  h3: 'h3.svg',
  h4: 'h4.svg',
  img: 'image.svg',
  yt: '',
  bunny: '',
  signup: '',
  identify: '',
  toggle: '',
  belief: '',
  //aside: "",
};

export const widgetMeta: WidgetMeta = {
  belief: {
    title: `Belief Widget`,
    parameters: [
      {
        label: 'Belief Tag',
        defaultValue: 'BELIEF',
        type: 'string',
        isBeliefTag: true,
      },
      { label: 'Scale', defaultValue: 'yn', type: 'scale' },
      { label: 'Question Prompt', defaultValue: 'Prompt', type: 'string' },
    ],
    isBelief: true,
  },
  identifyAs: {
    title: `Identify As Widget`,
    parameters: [
      {
        label: 'Belief Tag',
        defaultValue: 'BELIEF',
        type: 'string',
        isBeliefTag: true,
      },
      {
        label: 'Belief Matching Value(s)',
        defaultValue: '*',
        type: 'multi-string',
      },
      { label: 'Question Prompt', defaultValue: 'Prompt', type: 'string' },
    ],
    isBelief: true,
  },
  toggle: {
    title: `Toggle Belief Widget`,
    parameters: [
      {
        label: 'Belief Tag',
        defaultValue: 'BELIEF',
        type: 'string',
        isBeliefTag: true,
      },
      { label: 'Question Prompt', defaultValue: 'Prompt', type: 'string' },
    ],
    isBelief: true,
  },
  youtube: {
    title: `YouTube Video Embed`,
    parameters: [
      { label: 'Embed Code', defaultValue: '*', type: 'string' },
      { label: 'Title', defaultValue: 'Descriptive Title', type: 'string' },
    ],
  },
  bunny: {
    title: `BunnyCDN Video Embed`,
    parameters: [
      { label: 'Embed URL', defaultValue: '*', type: 'string' },
      { label: 'Title', defaultValue: 'Descriptive Title', type: 'string' },
    ],
  },
  resource: {
    title: `Not yet implemented`,
    parameters: [
      { label: 'Type', defaultValue: '?', type: 'string' },
      { label: 'Variation', defaultValue: '?', type: 'string' },
    ],
  },
  signup: {
    title: `Email Sign Up Widget`,
    parameters: [
      {
        label: 'Contact Persona',
        defaultValue: 'Major Updates Only',
        type: 'string',
      },
      { label: 'Prompt Text', defaultValue: 'Keep in touch!', type: 'string' },
      { label: 'Clarify Consent', defaultValue: 'false', type: 'boolean' },
    ],
  },
};

export const contactPersona = [
  {
    id: 'major',
    title: 'Major Updates Only',
    description: 'Will only send major updates and do so infrequently.',
    disabled: false,
  },
  {
    id: 'all',
    title: 'All Updates',
    description: 'Be fully in the know!',
    disabled: false,
  },
  {
    id: 'open',
    title: 'DMs open',
    description: "Leave your contact details and we'll get in touch!",
    disabled: false,
  },
  {
    id: 'none',
    title: 'None',
    description: 'Disables all communications from us.',
    disabled: false,
  },
];
