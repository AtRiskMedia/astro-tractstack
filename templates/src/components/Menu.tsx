import { useState } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import ChevronDownIcon from '@heroicons/react/20/solid/ChevronDownIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { lispLexer } from '@/utils/actions/lispLexer';
import { preParseAction } from '@/utils/actions/preParse_Action';
import type { LispToken } from '@/types/compositorTypes';

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
  const [mobileOpen, setMobileOpen] = useState(false);

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
          className="block text-2xl font-bold leading-6 text-mydarkgrey hover:text-black hover:underline hover:decoration-dashed hover:decoration-4 hover:underline-offset-4 focus:text-black focus:outline-none focus:ring-2 focus:ring-myblue"
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
          className="block text-2xl font-bold leading-6 text-mydarkgrey hover:text-black hover:underline hover:decoration-dashed hover:decoration-4 hover:underline-offset-4 focus:text-black focus:outline-none focus:ring-2 focus:ring-myblue"
          title={item.description}
          aria-label={`${item.name} - ${item.description}`}
        >
          {item.name}
        </a>
      );
    }

    return (
      <span
        className="block text-2xl font-bold leading-6 text-mydarkgrey opacity-50"
        title={item.description}
        aria-label={`${item.name} - ${item.description}`}
      >
        {item.name}
      </span>
    );
  };

  const MobileMenuItem = ({ item }: { item: ProcessedMenuLinkDatum }) => {
    if (item.renderAs === 'button') {
      return (
        <button
          type="button"
          className="block w-full rounded-xl p-4 text-left hover:bg-mygreen/20 focus:outline-none focus:ring-2 focus:ring-myblue"
          aria-label={`${item.name} - ${item.description}`}
          hx-post="/api/v1/state"
          hx-swap="none"
          hx-vals={item.htmxVals}
          onClick={() => setMobileOpen(false)}
        >
          <p className="text-xl font-bold leading-7 text-myblack">{item.name}</p>
          <p className="mt-1 text-base leading-6 text-mydarkgrey">
            {item.description}
          </p>
        </button>
      );
    }

    if (item.renderAs === 'a') {
      return (
        <a
          href={item.href}
          className="block w-full rounded-xl p-4 text-left hover:bg-mygreen/20 focus:outline-none focus:ring-2 focus:ring-myblue"
          aria-label={`${item.name} - ${item.description}`}
          onClick={() => setMobileOpen(false)}
        >
          <p className="text-xl font-bold leading-7 text-myblack">{item.name}</p>
          <p className="mt-1 text-base leading-6 text-mydarkgrey">
            {item.description}
          </p>
        </a>
      );
    }

    return (
      <span
        className="block w-full rounded-xl p-4 text-left opacity-60"
        aria-label={`${item.name} - ${item.description}`}
      >
        <p className="text-xl font-bold leading-7 text-myblack">{item.name}</p>
        <p className="mt-1 text-base leading-6 text-mydarkgrey">
          {item.description}
        </p>
      </span>
    );
  };

  const MobileCompactItem = ({ item }: { item: ProcessedMenuLinkDatum }) => {
    if (item.renderAs === 'button') {
      return (
        <button
          type="button"
          className="block w-full rounded-lg p-3 text-left hover:bg-mygreen/20 focus:outline-none focus:ring-2 focus:ring-myblue"
          title={item.description}
          aria-label={`${item.name} - ${item.description}`}
          hx-post="/api/v1/state"
          hx-swap="none"
          hx-vals={item.htmxVals}
          onClick={() => setMobileOpen(false)}
        >
          <span className="block text-base font-bold leading-6 text-mydarkgrey">
            {item.name}
          </span>
        </button>
      );
    }

    if (item.renderAs === 'a') {
      return (
        <a
          href={item.href}
          className="block w-full rounded-lg p-3 text-left hover:bg-mygreen/20 focus:outline-none focus:ring-2 focus:ring-myblue"
          title={item.description}
          aria-label={`${item.name} - ${item.description}`}
          onClick={() => setMobileOpen(false)}
        >
          <span className="block text-base font-bold leading-6 text-mydarkgrey">
            {item.name}
          </span>
        </a>
      );
    }

    return (
      <span
        className="block w-full rounded-lg p-3 text-left opacity-60"
        title={item.description}
        aria-label={`${item.name} - ${item.description}`}
      >
        <span className="block text-base font-bold leading-6 text-mydarkgrey">
          {item.name}
        </span>
      </span>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="ml-6 hidden min-w-0 max-w-full flex-wrap items-center justify-end space-x-3 font-action md:flex md:space-x-6">
        {featuredLinks.map((item: ProcessedMenuLinkDatum) => (
          <div key={item.name} className="relative py-1.5">
            <InteractiveMenuItem item={item} />
          </div>
        ))}
      </nav>

      {/* Mobile Navigation Menu */}
      <div className="font-action md:hidden">
        <Dialog.Root open={mobileOpen} onOpenChange={(details) => setMobileOpen(details.open)}>
          <Dialog.Trigger
            className="inline-flex rounded-md px-3 py-2 text-xl font-bold text-myblue hover:text-black focus:outline-none focus:ring-2 focus:ring-myblue"
            aria-label="Open navigation menu"
          >
            <span>MENU</span>
            <ChevronDownIcon className="ml-1 h-5 w-5" aria-hidden="true" />
          </Dialog.Trigger>

          <Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-black/40" style={{ zIndex: 10050 }} />
            <Dialog.Positioner className="fixed inset-0" style={{ zIndex: 10051 }}>
              <Dialog.Content className="h-full w-full overflow-hidden bg-white">
                <div className="flex h-full flex-col overflow-hidden">
                  <div className="border-b border-mylightgrey px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Dialog.Title className="text-lg font-bold text-myblack">
                        Navigation Menu
                      </Dialog.Title>
                      <Dialog.CloseTrigger
                        className="rounded-full p-2 text-mydarkgrey hover:bg-mylightgrey focus:outline-none focus:ring-2 focus:ring-myblue"
                        aria-label="Close navigation menu"
                      >
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </Dialog.CloseTrigger>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
                    <ul role="list" className="space-y-3">
                      {featuredLinks.map((item: ProcessedMenuLinkDatum) => (
                        <li key={item.name} className="min-w-0">
                          <MobileMenuItem item={item} />
                        </li>
                      ))}
                    </ul>

                    {additionalLinks.length > 0 && (
                      <section className="mt-6 rounded-xl bg-slate-50 p-4">
                        <h3
                          className="text-sm font-bold leading-6 text-myblue"
                          id="additional-links-heading"
                        >
                          Additional Links
                        </h3>
                        <ul
                          role="list"
                          className="mt-3 space-y-2"
                          aria-labelledby="additional-links-heading"
                        >
                          {additionalLinks.map((item: ProcessedMenuLinkDatum) => (
                            <li key={item.name} className="min-w-0">
                              <MobileCompactItem item={item} />
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </div>
    </>
  );
};

export default MenuComponent;
