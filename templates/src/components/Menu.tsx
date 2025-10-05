import { Menu } from '@ark-ui/react';
import { Portal } from '@ark-ui/react/portal';
import ChevronDownIcon from '@heroicons/react/20/solid/ChevronDownIcon';
import { lispLexer } from '@/utils/actions/lispLexer';
import { preParseAction } from '@/utils/actions/preParse_Action';
import type { LispToken } from '@/types/compositorTypes';

// CSS to style the menu items with hover and selection states
const menuStyles = `
  .menu-content {
    transition-property: opacity, transform;
    transition-duration: 200ms;
    z-index: 10050;
  }

  .menu-content[data-state="open"] {
    opacity: 1;
    transform: translateY(0);
  }

  .menu-content[data-state="closed"] {
    opacity: 0;
    transform: translateY(1px);
  }

  .menu-item[data-highlighted] {
    background-color: #f3f4f6;
  }

  .menu-item:focus {
    outline: 2px solid #0891b2;
    outline-offset: -2px;
  }
`;

interface MenuLink {
  name: string;
  description: string;
  featured: boolean;
  actionLisp: string;
}

interface MenuDatum {
  id: string;
  title: string;
  theme: string;
  optionsPayload: MenuLink[];
}

interface ProcessedMenuLinkDatum extends MenuLink {
  renderAs: 'a' | 'button' | 'span';
  href?: string;
  htmxVals?: string;
}

interface MenuProps {
  payload: MenuDatum;
  slug: string;
  isContext: boolean;
  brandConfig: any;
}

const MenuComponent = (props: MenuProps) => {
  const { payload, slug, isContext, brandConfig } = props;
  const thisPayload = payload.optionsPayload;

  function processMenuLink(e: MenuLink): ProcessedMenuLinkDatum {
    const item = { ...e } as ProcessedMenuLinkDatum;
    const actionLisp = item.actionLisp?.trim();

    if (!actionLisp) {
      item.renderAs = 'span';
      return item;
    }

    try {
      if (actionLisp.startsWith('(goto')) {
        const tokens = lispLexer(actionLisp);
        const to = preParseAction(tokens, slug, isContext, brandConfig);
        item.renderAs = 'a';
        item.href = to || '#';
        return item;
      }

      const [lispTokens] = lispLexer(actionLisp);

      if (lispTokens && lispTokens.length > 0) {
        // Deconstruct the nested structure: e.g., ['declare', ['HotLead', 'BELIEVES_YES']]
        const tokens = lispTokens[0] as LispToken[];

        if (
          (tokens[0] === 'declare' || tokens[0] === 'identifyAs') &&
          Array.isArray(tokens[1]) &&
          tokens[1].length >= 2
        ) {
          const command = tokens[0] as string;
          const params = tokens[1] as (string | number)[];
          const beliefId = params[0] as string;
          const value = params[1] as string;

          let hxValsMap: { [key: string]: string } = {};

          if (command === 'declare') {
            hxValsMap = {
              beliefId: beliefId,
              beliefType: 'Belief',
              beliefValue: value,
            };
          } else if (command === 'identifyAs') {
            hxValsMap = {
              beliefId: beliefId,
              beliefType: 'Belief',
              beliefVerb: 'IDENTIFY_AS',
              beliefObject: value,
            };
          }

          if (Object.keys(hxValsMap).length > 0) {
            item.renderAs = 'button';
            item.htmxVals = JSON.stringify(hxValsMap);
            return item;
          }
        }
      }
    } catch (error) {
      console.error(
        `Failed to process menu item for action: ${actionLisp}`,
        error
      );
    }

    item.renderAs = 'span';
    return item;
  }

  const featuredLinks = thisPayload
    .filter((e: MenuLink) => e.featured)
    .map(processMenuLink);
  const additionalLinks = thisPayload
    .filter((e: MenuLink) => !e.featured)
    .map(processMenuLink);

  const InteractiveMenuItem = ({ item }: { item: ProcessedMenuLinkDatum }) => {
    if (item.renderAs === 'button') {
      return (
        <button
          type="button"
          className="text-mydarkgrey focus:ring-myblue block text-2xl font-bold leading-6 hover:text-black hover:underline hover:decoration-dashed hover:decoration-4 hover:underline-offset-4 focus:text-black focus:outline-none focus:ring-2"
          title={item.description}
          aria-label={`${item.name} - ${item.description}`}
          hx-post="/api/v1/state"
          hx-swap="none"
          hx-vals={item.htmxVals}
        >
          {item.name}
        </button>
      );
    }

    if (item.renderAs === 'a') {
      return (
        <a
          href={item.href}
          className="text-mydarkgrey focus:ring-myblue block text-2xl font-bold leading-6 hover:text-black hover:underline hover:decoration-dashed hover:decoration-4 hover:underline-offset-4 focus:text-black focus:outline-none focus:ring-2"
          title={item.description}
          aria-label={`${item.name} - ${item.description}`}
        >
          {item.name}
        </a>
      );
    }

    return (
      <span
        className="text-mydarkgrey block text-2xl font-bold leading-6 opacity-50"
        title={item.description}
        aria-label={`${item.name} - ${item.description}`}
      >
        {item.name}
      </span>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: menuStyles }} />

      {/* Desktop Navigation */}
      <nav className="font-action ml-6 hidden flex-wrap items-center justify-end space-x-3 md:flex md:space-x-6">
        {featuredLinks.map((item: ProcessedMenuLinkDatum) => (
          <div key={item.name} className="relative py-1.5">
            <InteractiveMenuItem item={item} />
          </div>
        ))}
      </nav>

      {/* Mobile Navigation Menu */}
      <div className="font-action md:hidden">
        <Menu.Root>
          <Menu.Trigger
            className="text-myblue focus:ring-myblue inline-flex rounded-md px-3 py-2 text-xl font-bold hover:text-black focus:outline-none focus:ring-2"
            aria-label="Open navigation menu"
          >
            <span>MENU</span>
            <ChevronDownIcon className="ml-1 h-5 w-5" aria-hidden="true" />
          </Menu.Trigger>

          <Portal>
            <Menu.Positioner>
              <Menu.Content className="menu-content mt-5 flex">
                <div className="w-screen">
                  <div className="text-md ring-mydarkgrey/5 flex-auto overflow-hidden rounded-3xl bg-white p-4 leading-6 shadow-lg ring-1">
                    {/* Featured Links Section */}
                    <div className="px-8">
                      {featuredLinks.map((item: ProcessedMenuLinkDatum) => (
                        <Menu.Item
                          key={item.name}
                          value={item.name}
                          className="menu-item hover:bg-mygreen/20 group relative flex gap-x-6 rounded-lg p-4"
                        >
                          <div>
                            {item.renderAs === 'button' ? (
                              <button
                                type="button"
                                className="font-action text-myblack text-xl hover:text-black focus:text-black focus:outline-none"
                                aria-label={`${item.name} - ${item.description}`}
                                hx-post="/api/v1/state"
                                hx-swap="none"
                                hx-vals={item.htmxVals}
                              >
                                {item.name}
                                <span className="absolute inset-0" />
                              </button>
                            ) : item.renderAs === 'a' ? (
                              <a
                                href={item.href}
                                className="font-action text-myblack text-xl hover:text-black focus:text-black focus:outline-none"
                                aria-label={`${item.name} - ${item.description}`}
                              >
                                {item.name}
                                <span className="absolute inset-0" />
                              </a>
                            ) : (
                              <span
                                className="font-action text-myblack text-xl opacity-50"
                                aria-label={`${item.name} - ${item.description}`}
                              >
                                {item.name}
                              </span>
                            )}
                            <p className="text-mydarkgrey mt-1">
                              {item.description}
                            </p>
                          </div>
                        </Menu.Item>
                      ))}
                    </div>

                    {/* Additional Links Section */}
                    {additionalLinks.length > 0 && (
                      <div className="bg-slate-50 p-8">
                        <div className="flex justify-between">
                          <h3
                            className="text-myblue mt-4 text-sm leading-6"
                            id="additional-links-heading"
                          >
                            Additional Links
                          </h3>
                        </div>
                        <ul
                          role="list"
                          className="mt-6 space-y-6"
                          aria-labelledby="additional-links-heading"
                        >
                          {additionalLinks.map(
                            (item: ProcessedMenuLinkDatum) => (
                              <li key={item.name} className="relative">
                                <Menu.Item
                                  value={item.name}
                                  className="menu-item block w-full text-left"
                                >
                                  {item.renderAs === 'button' ? (
                                    <button
                                      type="button"
                                      className="text-mydarkgrey block truncate rounded p-2 text-sm font-bold leading-6 hover:text-black focus:text-black focus:underline focus:outline-none"
                                      title={item.description}
                                      aria-label={`${item.name} - ${item.description}`}
                                      hx-post="/api/v1/state"
                                      hx-swap="none"
                                      hx-vals={item.htmxVals}
                                    >
                                      {item.name}
                                      <span className="absolute inset-0" />
                                    </button>
                                  ) : item.renderAs === 'a' ? (
                                    <a
                                      href={item.href}
                                      className="text-mydarkgrey block truncate rounded p-2 text-sm font-bold leading-6 hover:text-black focus:text-black focus:underline focus:outline-none"
                                      title={item.description}
                                      aria-label={`${item.name} - ${item.description}`}
                                    >
                                      {item.name}
                                      <span className="absolute inset-0" />
                                    </a>
                                  ) : (
                                    <span
                                      className="text-mydarkgrey block truncate rounded p-2 text-sm font-bold leading-6 opacity-50"
                                      title={item.description}
                                      aria-label={`${item.name} - ${item.description}`}
                                    >
                                      {item.name}
                                    </span>
                                  )}
                                </Menu.Item>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </div>
    </>
  );
};

export default MenuComponent;
