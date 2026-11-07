export type GuideBlockId =
  | 'base'
  | 'codehook'
  | 'route'
  | 'header'
  | 'state'
  | 'files'
  | 'customCss'
  | 'publish';

export interface GuideBlock {
  id: GuideBlockId;
  title: string;
  summary: string[];
  context: string;
}

export const guideIntro: string[] = [
  'A TractStack site is extended through six building blocks: a codehook (pane), a collection route (pages), the custom header, state in the header, custom files at /custom/, and custom.css. Nothing else is extensible.',
  'Each block below carries the TractStack contract as agent context. Load the base context into your agent once per session, then the block you are building, then describe what you want. The agent writes code that fits; you paste it here.',
];

const base = `# TractStack Extend — base context

You are writing code for a TractStack site (Astro SSR + Go backend). The site owner pastes your output into the Storykeep Extend editor. Follow these contracts exactly; code outside them will not run or will be overwritten.

## The six building blocks (nothing else is extensible)
1. Codehook — custom Astro rendered inside one pane of a page.
2. Collection route — custom pages at /<route>/<slug> driven by resources of one category.
3. Custom header — src/custom/HeaderWidget.astro, rendered on every public page rendered through Layout (including collection route views).
4. State — data fetched in the header (server) or held by islands mounted from the header (client).
5. Custom files — static files uploaded to /custom/ (images, js, css, json…).
6. custom.css — the site stylesheet at /media/css/custom.css for CSS Tailwind cannot express.

## Where you may write
- src/custom/** — your components, helpers, islands, route views (src/custom/pages/<Name>.astro).
- src/pages/codehooks/<id>.astro — codehook blades created via Extend.
- src/pages/<route>/[param1].astro — route shells created via Extend (leave the generated shell as is).
- custom.css via the Extend custom.css editor.
- Static files via Extend Assets (served at /custom/).

## Never write
- .env*, node_modules, dist, releases, astro.config.mjs, package.json, pnpm-lock.yaml, tailwind.config.cjs
- src/layouts, src/lib, src/components, src/utils, src/stores
- src/pages/api, src/pages/context, src/pages/media, src/pages/custom, src/pages/[...slug]*, src/pages/storykeep*
- public/
- Core codehook blades: featured-article, list-content, search-widget, bunny-video, epinet, [...hookId]
You may import from @/lib, @/utils, @/stores, @/types and @/components; you may not edit them.

## Ids and names
Codehook ids and route names: /^[a-z][a-z0-9-]{1,62}$/ (lowercase, starts with a letter, 2–63 chars).

## Styling rule
Always adhere to TractStack Tailwind restrictions; only when that is not enough, add custom classes in custom.css.
- Tailwind classes must appear as complete literal strings. No string-built classes (\`bg-\${color}\`).
- Breakpoints are xs (0), md (801px), xl (1367px). There is no sm, lg or 2xl.
- The build does not scan your files. A Tailwind class not already used on the site is only generated after a rebuild and then a Storykeep page save. Say so when you introduce one.
- custom.css holds what Tailwind cannot do (keyframes, complex selectors, third-party widget overrides). Keep the existing :root brand variables and @font-face rules intact.

## Output contract
- Return complete files, each headed by its path (e.g. src/custom/Thing.astro). No diffs, no fragments.
- End with:
  Rebuild: yes/no
  New Tailwind classes: yes/no
  custom.css changed: yes/no
`;

const codehook = `# Building block: codehook (pane)

A codehook renders your Astro code inside a single pane of a page. Use it for a feature that lives in one place on a page. It is not a whole page (use a collection route) and not every page (use the custom header).

## Files
- Blade (trunk): src/pages/codehooks/<id>.astro — created by Extend "Create hook". It starts with \`export const partial = true;\` — keep that line.
- Supporting code: src/custom/** imported via '@/custom/…'.
- Manifest: src/custom/codehooks.ts lists available ids; Extend maintains it.

## Inputs
The blade is fetched server-side as HTML with query params:
  ?paneId=<pane id>&tenantId=<tenant>&options=<JSON string>
Read them with Astro.url.searchParams.get('paneId' | 'tenantId' | 'options'). Parse options with JSON.parse inside try/catch; treat missing options as {}.

## Rendering
- Output HTML for the pane only — no <html>, <head>, Layout or global styles.
- Kind "astro" renders static Astro. Kind "astro+jsx" mounts a React island from src/custom with client:load or client:only="react".
- Pane visibility follows the pane's belief rules: a codehook pane stays hidden until its belief conditions show it.

## Publish
Blade and src/custom changes need a rebuild.
`;

const route = `# Building block: collection route (pages)

A collection route serves /<route>/<slug> for every resource whose category is <route>. Use it for a family of pages (events, products, team members) driven by resources managed in Storykeep.

## Files
- Shell: src/pages/<route>/[param1].astro — generated by Extend "Create route". Do not edit it.
- View: src/custom/pages/<Name>.astro — <Name> is the route name upper-camelled on '-' (sneaky-food → SneakyFood). This is your file.

## What the shell does
- Returns 404 only when no slug is present.
- POSTs /api/v1/nodes/resources { categories: [<route>] } and passes the result to the view.
- Renders the view directly; the view owns the document.

## View contract
  export interface Props { route: string; slug: string; resources: ResourceNode[] }
  (ResourceNode from '@/types/compositorTypes')
- Find the current resource yourself: resources.find(r => r.slug === slug). Render a not-found state or return a 404 Response when it is missing.
- Wrap the view in Layout from '@/layouts/Layout.astro' (required prop: title).
- Layout provides custom.css, the Tailwind bundle, the header widget, the header, the footer and session wiring.
- Pass menu, ogImage, brandConfig, sessionId and storyfragmentId when you have them.
- One URL segment after the route only (/<route>/<slug>).

## Publish
Needs a rebuild.
`;

const header = `# Building block: custom header

src/custom/HeaderWidget.astro renders on every public page rendered through Layout (including collection route views), above the main header. It is not rendered in Storykeep or the editor. Use it for site-wide banners, alerts, and for mounting site-wide client islands.

## Contract
  export interface Props { tenantId: string }
  const { tenantId } = Astro.props;
- The default file ships fully commented out; replace it with a complete working file.
- Keep it light: it runs on every page request.
- Import supporting components from '@/custom/…'.

## Publish
Needs a rebuild.
`;

const state = `# Building block: state (in the custom header)

State lives in the custom header, on the server or in the client.

## Server state — same for every visitor
  import { getHeaderResources } from '@/lib/resources';
  import { RESOURCE_TTL_MS } from '@/custom/customHelpers';
  const resources = await getHeaderResources(tenantId, ['promotions'], RESOURCE_TTL_MS);
- Fetches resources by category from the backend.
- Cached in-process, keyed by tenant + categories + slugs. Default TTL is 5 minutes; pass RESOURCE_TTL_MS (or getCodeHookResources(..., { ttlMs })) to override per site. Empty results are cached. After TTL, revalidates with the backend resources version (304 when unchanged).
- Use for content every visitor sees (banners, announcements, menus).

## Client state — per visitor
- Mount a React island from the header (client:load or client:only="react") from src/custom/**.
- Keep per-visitor data in the island (localStorage, nanostores in src/custom). Never put per-visitor data in server state; it would be shared across visitors.

## Choosing
Same for everyone → server. Different per visitor or changes without a page load → client.

## Publish
Needs a rebuild.
`;

const files = `# Building block: custom files (/custom/)

Extend → Assets uploads static files served at /custom/<path>. Use it for images, fonts, data files, standalone scripts and stylesheets referenced by your code.

## Rules
- Live on upload; no rebuild.
- Refused extensions: .astro .ts .tsx .jsx .mjs .cjs .php .sh — code goes in Source, not Assets.
- Path segments: letters, digits, '.', '_' and '-' only.
- Text files (.js .css .json .txt .md .html .svg .csv) are editable in Extend; zips can be expanded in place.
- Reference files by absolute URL: /custom/<path>.
- /custom/ is not Storykeep's /media/ library and not the build's public/ directory.
`;

const customCss = `# Building block: custom.css

The site stylesheet: config/<tenant>/media/css/custom.css, served at /media/css/custom.css and loaded on every page before the Tailwind bundle.

## Rules
- Edit it in Extend → "Edit custom.css". Saving is live; no rebuild for CSS-only changes. Reload any editor tab that was open before the save.
- Use it only for what Tailwind restrictions cannot express: keyframes, complex selectors, pseudo-elements beyond Tailwind, third-party widget overrides.
- Keep the existing :root brand variables (--brand-1 … --brand-8, --font-main, --font-action, --scale) and @font-face rules. Brand color changes in Storykeep rewrite those variables.
- Prefix your classes to avoid collisions (e.g. .x-…).
- Return the complete file, existing content included.
`;

const publish = `# Publish and verify

## Badges
- saved — written to disk, not yet in the running build.
- live (built) — included in the current build.
- live (dev) — astro dev; HMR applies it.
- Assets are live on upload. custom.css is live on save.

## What needs what
- Source (codehooks, routes, header, src/custom) → Build → Rebuild site. Done when the build stamp matches the job.
- New Tailwind classes → rebuild, then save any page in Storykeep to regenerate the stylesheet.
- custom.css → save in Extend; the stylesheet URL version changes on save. Reload any editor tab that was open before the save.
- Assets → upload; nothing else.

## Symptoms
- Code change not visible → badge still "saved"; rebuild.
- Element unstyled → Tailwind class new to the site; rebuild, then save a page in Storykeep. Or a class built from a template string; use literals.
- custom.css change not visible → not saved via Extend, or the selector does not match.
- Codehook pane empty → blade not rebuilt, blade error, or the pane's belief rules hide it.
- Route 404 → no slug in the URL, or the view returns 404 for an unmatched slug.
- /custom/ file 404 → wrong path or refused extension.
`;

export const baseBlock: GuideBlock = {
  id: 'base',
  title: 'Base context',
  summary: [
    'The contracts every block shares: where code may live, what is off limits, ids, the styling rule and the output format.',
    'Copy into your agent once per session.',
  ],
  context: base,
};

export const buildingBlocks: GuideBlock[] = [
  {
    id: 'codehook',
    title: 'Codehook (pane)',
    summary: [
      'Custom Astro rendered inside one pane of a page.',
      'Source → Hooks. Needs a rebuild.',
    ],
    context: codehook,
  },
  {
    id: 'route',
    title: 'Collection route (pages)',
    summary: [
      'Pages at /<route>/<slug> for every resource in one category.',
      'Source → Routes. Needs a rebuild.',
    ],
    context: route,
  },
  {
    id: 'header',
    title: 'Custom header',
    summary: [
      'HeaderWidget.astro, rendered on every public page rendered through Layout (including collection route views).',
      'Source → Hooks → HeaderWidget.astro. Needs a rebuild.',
    ],
    context: header,
  },
  {
    id: 'state',
    title: 'State in the header',
    summary: [
      'Server state shared by every visitor, or client state per visitor, held in the custom header.',
      'Source → Files under src/custom. Needs a rebuild.',
    ],
    context: state,
  },
  {
    id: 'files',
    title: 'Custom files (/custom/)',
    summary: ['Static files served at /custom/.', 'Assets. Live on upload.'],
    context: files,
  },
  {
    id: 'customCss',
    title: 'custom.css',
    summary: [
      'Site CSS for what Tailwind restrictions cannot express.',
      'Edit custom.css. Live on save.',
    ],
    context: customCss,
  },
];

export const publishBlock: GuideBlock = {
  id: 'publish',
  title: 'Publish and verify',
  summary: [
    'What each change needs to go live, what the badges mean, and what common symptoms point to.',
  ],
  context: publish,
};
