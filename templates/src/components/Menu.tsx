import { Menu } from '@ark-ui/react';
import { Portal } from '@ark-ui/react/portal';
import ChevronDownIcon from '@heroicons/react/20/solid/ChevronDownIcon';
import { lispLexer } from '@/utils/actions';
import { preParseAction } from '@/utils/compositor/preParse_Action';

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

interface MenuLinkDatum extends MenuLink {
  to: string;
  internal: boolean;
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

  // Process featured and additional links
  const featuredLinks = thisPayload
    .filter((e: MenuLink) => e.featured)
    .map(processMenuLink);
  const additionalLinks = thisPayload
    .filter((e: MenuLink) => !e.featured)
    .map(processMenuLink);

  // Helper function to process menu links
  function processMenuLink(e: MenuLink): MenuLinkDatum {
    const item = { ...e } as MenuLinkDatum;
    const thisPayload = lispLexer(e.actionLisp);
    const to = preParseAction(thisPayload, slug, isContext, brandConfig);
    if (typeof to === `string`) {
      item.to = to;
      item.internal = true;
    } else if (typeof to === `object`) {
      item.to = to[0];
    }
    return item;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: menuStyles }} />

      {/* Desktop Navigation */}
      <nav className="font-action ml-6 hidden flex-wrap items-center justify-end space-x-3 md:flex md:space-x-6">
        {featuredLinks.map((item: MenuLinkDatum) => (
          <div key={item.name} className="relative py-1.5">
            <a
              href={item.to}
              className="text-mydarkgrey focus:ring-myblue block text-2xl font-bold leading-6 hover:text-black hover:underline hover:decoration-dashed hover:decoration-4 hover:underline-offset-4 focus:text-black focus:outline-none focus:ring-2"
              title={item.description}
              aria-label={`${item.name} - ${item.description}`}
            >
              {item.name}
            </a>
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
                      {featuredLinks.map((item: MenuLinkDatum) => (
                        <Menu.Item
                          key={item.name}
                          value={item.name}
                          className="menu-item hover:bg-mygreen/20 group relative flex gap-x-6 rounded-lg p-4"
                        >
                          <div>
                            <a
                              href={item.to}
                              className="font-action text-myblack text-xl hover:text-black focus:text-black focus:outline-none"
                              aria-label={`${item.name} - ${item.description}`}
                            >
                              {item.name}
                              <span className="absolute inset-0" />
                            </a>
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
                          {additionalLinks.map((item: MenuLinkDatum) => (
                            <li key={item.name} className="relative">
                              <Menu.Item
                                value={item.name}
                                className="menu-item block w-full text-left"
                              >
                                <a
                                  href={item.to}
                                  className="text-mydarkgrey block truncate rounded p-2 text-sm font-bold leading-6 hover:text-black focus:text-black focus:underline focus:outline-none"
                                  title={item.description}
                                  aria-label={`${item.name} - ${item.description}`}
                                >
                                  {item.name}
                                  <span className="absolute inset-0" />
                                </a>
                              </Menu.Item>
                            </li>
                          ))}
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
