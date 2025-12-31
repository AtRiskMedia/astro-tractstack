import type { BrandConfig } from './tractstack';

export type LispToken = string | number | LispToken[];

export type ViewportKey = 'mobile' | 'tablet' | 'desktop' | 'auto';
export type ViewportAuto = 'mobile' | 'tablet' | 'desktop';
export type ToolModeVal =
  | 'styles'
  | 'text'
  | 'insert'
  | 'eraser'
  | 'move'
  | 'layout'
  | 'designLibrary'
  | 'debug';

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
  'interactiveDisclosure',
  'identify',
  'toggle',
  //"aside",
] as const;
export type ToolAddMode = (typeof toolAddModes)[number];

export enum ContextPaneMode {
  DEFAULT = 'DEFAULT',
  TITLE = 'TITLE',
  SLUG = 'SLUG',
}

export enum PaneAddMode {
  DEFAULT = 'DEFAULT',
  NEW = 'NEW',
  BREAK = 'BREAK',
  REUSE = 'REUSE',
  CODEHOOK = 'CODEHOOK',
  PASTE = 'PASTE',
}

export enum PaneConfigMode {
  DEFAULT = 'DEFAULT',
  TITLE = 'TITLE',
  SLUG = 'SLUG',
  PATH = 'PATH',
  IMPRESSION = 'IMPRESSION',
  CODEHOOK = 'CODEHOOK',
}

export interface HtmlAstNode {
  tag: string;
  attrs?: Record<string, string>;
  children?: HtmlAstNode[];
  text?: string;
  id?: string;
}

export type CreativeButtonPayload = {
  callbackPayload: string;
  isExternalUrl?: boolean;
  bunnyPayload?: {
    t: string;
    videoId: string | null;
    slug?: string;
    isContext?: boolean;
  };
};

export interface EditableElementMetadata {
  astId: string;
  tagName: string;
  src?: string;
  srcSet?: string;
  fileId?: string;
  base64Data?: string;
  alt?: string;
  href?: string;
  buttonPayload?: CreativeButtonPayload;
  isCssBackground?: boolean;
}

export interface CreativePanePayload {
  css: string;
  viewportCss: {
    xs: string;
    md: string;
    xl: string;
  };
  tree: HtmlAstNode[];
  editableElements: Record<string, EditableElementMetadata>;
}

export enum StoryFragmentMode {
  DEFAULT = 'DEFAULT',
  SLUG = 'SLUG',
  MENU = 'MENU',
  OG = 'OG',
}

export interface PanelState {
  paneId: string;
  panel: string;
  mode: string;
}

export type SettingsPanelSignal = {
  action: string;
  nodeId: string;
  childId?: string;
  layer?: number;
  className?: string;
  minimized?: boolean;
  expanded?: boolean;
  editLock?: number;
  targetProperty?: 'parentClasses' | 'gridClasses';
};

export interface OgImageParams {
  textColor: string;
  bgColor: string;
  fontSize?: number;
}

export type ParentClassesPayload = Array<{
  mobile: Record<string, string>;
  tablet: Record<string, string>;
  desktop: Record<string, string>;
}>;

export interface BeliefDatum {
  [key: string]: string | string[];
}

export interface BeliefOptionDatum {
  id: number;
  slug: string;
  name: string;
  color: string;
}

export interface ClosestColor {
  name: string;
  shade: number;
}
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface VideoMoment {
  startTime: number; // in seconds
  endTime: number; // in seconds
  title: string;
  description?: string;
  linkedPaneId?: string;
}

export type TupleValue = string | number | boolean;
export type Tuple =
  | [TupleValue]
  | [TupleValue, TupleValue]
  | [TupleValue, TupleValue, TupleValue];

export type Tag =
  | 'modal'
  | 'parent'
  | 'p'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'img'
  | 'li'
  | 'ol'
  | 'ul'
  | 'signup'
  | 'yt'
  | 'bunny'
  | 'interactiveDisclosure'
  | 'belief'
  | 'identify'
  | 'toggle'
  | 'code';

export const tagTitles: Record<Tag, string> = {
  p: 'Paragraph',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  img: 'Image',
  code: 'Widget',
  li: `List Item`,
  ol: 'Outer Container',
  ul: 'Outer Container',
  parent: 'Pane Styles',
  modal: 'Modal Styles',
  signup: 'Email Signup Widget',
  yt: 'YouTube Widget',
  bunny: 'Bunny Video Widget',
  interactiveDisclosure: 'Interactive Disclosure',
  belief: 'Belief Select Widget',
  toggle: 'Belief Toggle Widget',
  identify: 'Identify As Widget',
};

export type NodeType =
  | 'Root'
  | 'Pane'
  | 'StoryFragment'
  | 'BgPane'
  | 'GridLayoutNode'
  | 'Markdown'
  | 'TagElement'
  | 'TractStack'
  | 'Menu'
  | 'Impression'
  | 'File'
  | 'Belief'
  | 'Resource';

export interface BaseNode {
  id: string;
  parentId: string | null;
  nodeType: NodeType;
  isChanged?: boolean;
}

export interface MenuLink {
  name: string;
  description: string;
  featured: boolean;
  actionLisp: string;
}
export interface MenuNode extends BaseNode {
  title: string;
  theme: string;
  optionsPayload: MenuLink[];
  nodeType: `Menu`;
}

export interface ImpressionNode extends BaseNode {
  nodeType: 'Impression';
  tagName: 'impression';
  title: string;
  body: string;
  buttonText: string;
  actionsLisp: string;
}

export interface PaneNode extends BaseNode {
  title: string;
  slug: string;
  isDecorative: boolean;
  created?: Date;
  changed?: Date;
  bgColour?: string;
  isContextPane?: boolean;
  heightOffsetDesktop?: number;
  heightOffsetMobile?: number;
  heightOffsetTablet?: number;
  heightRatioDesktop?: string;
  heightRatioMobile?: string;
  heightRatioTablet?: string;
  codeHookTarget?: string;
  codeHookPayload?: {
    [key: string]: string;
  };
  htmlAst?: CreativePanePayload;
  heldBeliefs?: BeliefDatum;
  withheldBeliefs?: BeliefDatum;
}

export interface StoryFragmentNode extends BaseNode {
  title: string;
  slug: string;
  tractStackId: string;
  paneIds: string[];
  menuId?: string;
  tailwindBgColour?: string;
  socialImagePath?: string | null;
  created?: Date;
  changed?: Date;
  impressions?: ImpressionNode[];
}

export interface TractStackNode extends BaseNode {
  title: string;
  slug: string;
  socialImagePath?: string;
}

export interface PaneFragmentNode extends BaseNode {
  type:
    | 'markdown'
    | 'visual-break'
    | 'background-image'
    | 'artpack-image'
    | 'grid-layout';
  hiddenViewportMobile?: boolean;
  hiddenViewportTablet?: boolean;
  hiddenViewportDesktop?: boolean;
}

export interface MarkdownPaneFragmentNode extends PaneFragmentNode {
  type: 'markdown';
  markdownId: string;
  defaultClasses?: Record<
    string,
    {
      mobile: Record<string, string>;
      tablet: Record<string, string>;
      desktop: Record<string, string>;
    }
  >;
  parentClasses?: ParentClassesPayload;
  parentCss?: string[];
  gridClasses?: DefaultClassValue;
  gridCss?: string;
}

export interface GridLayoutNode extends PaneFragmentNode {
  nodeType: 'GridLayoutNode';
  type: 'grid-layout';
  parentClasses?: ParentClassesPayload;
  parentCss?: string;
  gridCss?: string;
  defaultClasses?: Record<
    string,
    {
      mobile: Record<string, string>;
      tablet: Record<string, string>;
      desktop: Record<string, string>;
    }
  >;
  gridColumns: { mobile: number; tablet: number; desktop: number };
}

export interface ArtpackImageNode extends PaneFragmentNode {
  type: 'artpack-image';
  collection: string;
  image: string;
  src: string;
  srcSet?: string;
  alt?: string;
  objectFit: 'cover' | 'contain' | 'fill';
  position?: 'background' | 'left' | 'right' | 'leftBleed' | 'rightBleed';
  size?: 'equal' | 'narrow' | 'wide';
}

export interface BgImageNode extends PaneFragmentNode {
  type: 'background-image';
  fileId: string;
  src: string;
  srcSet?: string;
  alt?: string;
  base64Data?: string;
  objectFit: 'cover' | 'contain' | 'fill';
  position?: 'background' | 'left' | 'right' | 'leftBleed' | 'rightBleed';
  size?: 'equal' | 'narrow' | 'wide';
}

export interface VisualBreakData {
  collection: string;
  image: string;
  svgFill: string;
}
export interface VisualBreakNode extends PaneFragmentNode {
  type: 'visual-break';
  breakDesktop?: VisualBreakData;
  breakTablet?: VisualBreakData;
  breakMobile?: VisualBreakData;
  hiddenViewportDesktop?: boolean;
  hiddenViewportTablet?: boolean;
  hiddenViewportMobile?: boolean;
}

export interface ImageFileNode extends BaseNode {
  filename: string;
  altDescription: string;
  src: string;
  nodeType: `File`;
  srcSet?: string;
  position?: string;
  size?: string;
  base64Data?: string;
}

export interface ResourceNode extends BaseNode {
  title: string;
  slug: string;
  oneliner: string;
  optionsPayload: any;
  category?: string;
  categorySlug?: string;
  actionLisp?: string;
}

export interface BeliefNode extends BaseNode {
  title: string;
  slug: string;
  scale: string;
  customValues?: string[];
}

export type DefaultClassValue = {
  mobile: Record<string, string>;
  tablet: Record<string, string>;
  desktop: Record<string, string>;
};

export type DefaultClasses = Record<string, DefaultClassValue>;

export type ResponsiveClasses = {
  mobile?: Record<string, string>;
  tablet?: Record<string, string>;
  desktop?: Record<string, string>;
};

export interface FlatNode extends BaseNode {
  tagName: string;
  tagNameCustom?: string;
  copy?: string;
  src?: string;
  srcSet?: string;
  base64Data?: string;
  alt?: string;
  href?: string;
  text?: string;
  fileId?: string;
  isPlaceholder?: boolean;
  codeHookParams?: (string | string[])[];
  overrideClasses?: {
    mobile?: Record<string, string>;
    tablet?: Record<string, string>;
    desktop?: Record<string, string>;
  };
  elementCss?: string;
  buttonPayload?: ButtonPayload;
  wordCarouselPayload?: {
    words: string[];
    speed: number;
  };
}
export type ButtonPayload = {
  buttonClasses: Record<string, string[]>;
  buttonHoverClasses: Record<string, string[]>;
  callbackPayload: string;
  isExternalUrl?: boolean;
  bunnyPayload?: {
    t: string;
    videoId: string | null;
    slug?: string;
    isContext?: boolean;
  };
};

export type TemplateNode = FlatNode & {
  id?: string;
  parentId?: string;
  tagName?: string;
  nodes?: TemplateNode[];
};

export type TemplateMarkdown = MarkdownPaneFragmentNode & {
  nodes?: TemplateNode[];
  markdownBody?: string;
};

export type TemplateGridLayout = GridLayoutNode & {
  nodes?: TemplateMarkdown[];
};

export type TemplatePane = PaneNode & {
  id?: string;
  parentId?: string;
  markdown?: TemplateMarkdown;
  gridLayout?: TemplateGridLayout;
  bgPane?: VisualBreakNode | ArtpackImageNode | BgImageNode;
};

export type StorageArtpackImageNode = Omit<
  ArtpackImageNode,
  'id' | 'parentId' | 'isChanged'
>;
export type StorageBgImageNode = Omit<
  BgImageNode,
  'id' | 'parentId' | 'isChanged' | 'base64Data'
>;
export type StorageVisualBreakNode = Omit<
  VisualBreakNode,
  'id' | 'parentId' | 'isChanged'
>;

export type StorageBgPane =
  | StorageArtpackImageNode
  | StorageBgImageNode
  | StorageVisualBreakNode;

export type StorageNode = Omit<
  FlatNode,
  'id' | 'parentId' | 'isChanged' | 'base64Data' | 'isPlaceholder'
> & {
  nodes?: StorageNode[];
};

export type StorageMarkdown = Omit<
  MarkdownPaneFragmentNode,
  'id' | 'parentId' | 'isChanged' | 'markdownId' | 'parentCss' | 'nodes'
> & {
  nodes?: StorageNode[];
};

export type StorageGridLayoutNode = {
  nodeType: string;
  type: string;
  defaultClasses?: Record<string, any>;
  parentClasses?: Record<string, any>[];
  gridColumns: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  nodes?: StorageMarkdown[];
};

export type StoragePane = Omit<
  PaneNode,
  | 'id'
  | 'parentId'
  | 'isChanged'
  | 'created'
  | 'changed'
  | 'heldBeliefs'
  | 'withheldBeliefs'
  | 'codeHookTarget'
  | 'codeHookPayload'
  | 'markdown'
> & {
  markdowns?: StorageMarkdown[];
  gridLayout?: StorageGridLayoutNode;
  bgPane?: StorageBgPane;
};

export interface LinkNode extends FlatNode {
  tagName: 'a' | 'button';
  buttonPayload?: {
    buttonClasses: Record<string, string[]>;
    buttonHoverClasses: Record<string, string[]>;
    callbackPayload: string;
    isExternalUrl?: boolean;
    bunnyPayload?: {
      t: string;
      videoId: string | null;
      slug?: string;
      isContext?: boolean;
    };
  };
}

export type LoadData = {
  fileNodes?: ImageFileNode[];
  menuNodes?: MenuNode[];
  resourceNodes?: ResourceNode[];
  storyfragmentNodes?: StoryFragmentNode[];
  paneNodes?: PaneNode[];
  tractstackNodes?: TractStackNode[];
  childNodes?: (BaseNode | FlatNode)[];
  paneFragmentNodes?: (PaneFragmentNode | GridLayoutNode)[];
  flatNodes?: FlatNode[];
  impressionNodes?: ImpressionNode[];
  beliefNodes?: BeliefNode[];
};

export type PageDesign = {
  id: string;
  title: string;
  introDesign: any; // Will be TemplatePane
  contentDesign: any; // Will be TemplatePane
  visualBreaks?: {
    odd: any; // Will be TemplatePane
    even: any; // Will be TemplatePane
  };
};

export interface BasePanelProps {
  node: FlatNode | null;
  config?: BrandConfig | null;
  parentNode?: FlatNode;
  containerNode?: FlatNode;
  outerContainerNode?: FlatNode;
  layer?: number;
  className?: string;
  childId?: string;
  availableCodeHooks?: string[];
  onTitleChange?: (title: string) => void;
}

export type ParentBasePanelProps = {
  node: MarkdownPaneFragmentNode | GridLayoutNode | null;
  parentNode?: FlatNode | PaneNode;
  config?: BrandConfig | null;
  layer?: number;
  className?: string;
  childId?: string;
  availableCodeHooks?: string[];
  onTitleChange?: (title: string) => void;
  targetProperty?: 'parentClasses' | 'gridClasses';
};

interface WidgetParameterDefinition {
  label: string;
  defaultValue: string;
  type: 'string' | 'boolean' | 'scale' | 'multi-string';
  isBeliefTag?: boolean;
}

export interface WidgetMeta {
  [key: string]: {
    title: string;
    parameters: WidgetParameterDefinition[];
    isBelief?: boolean;
  };
}
