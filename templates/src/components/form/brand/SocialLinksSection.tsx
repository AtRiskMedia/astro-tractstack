import { useState, useCallback, useMemo, type KeyboardEvent } from 'react';
import { Combobox } from '@ark-ui/react';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import type { FormStateReturn } from '@/hooks/useFormState';
import type { BrandConfigState } from '@/types/tractstack';

// Available social platforms matching the icons in public/socials/
const SOCIAL_PLATFORMS = [
  'codepen',
  'discord',
  'facebook',
  'github',
  'instagram',
  'linkedin',
  'mail',
  'rumble',
  'tiktok',
  'twitch',
  'twitter',
  'x',
  'youtube',
];

interface SocialLinksSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

interface SocialLink {
  platform: string;
  url: string;
}

export default function SocialLinksSection({
  formState,
}: SocialLinksSectionProps) {
  const { state, updateField, errors } = formState;

  const [links, setLinks] = useState<SocialLink[]>(() => {
    if (!state.socials || state.socials.length === 0) return [];
    return state.socials.filter(Boolean).map((link) => {
      const [platform, url] = link.split('|');
      return { platform: platform || '', url: url || '' };
    });
  });

  const [isSelectingPlatform, setIsSelectingPlatform] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{
    platform: string;
    url: string;
  } | null>(null);

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    const filteredPlatforms =
      query === ''
        ? SOCIAL_PLATFORMS
        : SOCIAL_PLATFORMS.filter((platform) =>
            platform.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredPlatforms,
      itemToValue: (item) => item,
      itemToString: (item) => item,
    });
  }, [query]);

  // Update form state when links change
  const updateFormState = useCallback(
    (newLinks: SocialLink[]) => {
      // Filter out links with empty URLs before saving
      const validLinks = newLinks.filter(
        (link) => link.platform && link.url.trim()
      );
      const formattedLinks = validLinks.map(
        (link) => `${link.platform}|${link.url}`
      );
      updateField('socials', formattedLinks);
    },
    [updateField]
  );

  const handlePlatformSelect = useCallback((details: { value: string[] }) => {
    const platform = details.value[0];
    if (platform) {
      setPendingLink({ platform, url: '' });
      setIsSelectingPlatform(false);
      setSelectedPlatform(null);
      setQuery('');
    }
  }, []);

  const handlePendingUrlChange = useCallback(
    (url: string) => {
      if (!pendingLink || !url.trim()) return;
      const newLinks = [...links, { platform: pendingLink.platform, url }];
      setLinks(newLinks);
      updateFormState(newLinks);
      setPendingLink(null);
      setSelectedPlatform(null);
      setQuery('');
    },
    [links, updateFormState, pendingLink]
  );

  const updateLink = useCallback(
    (index: number, url: string) => {
      const newLinks = links.map((link, i) =>
        i === index ? { ...link, url } : link
      );
      setLinks(newLinks);
      updateFormState(newLinks);
    },
    [links, updateFormState]
  );

  const removeLink = useCallback(
    (index: number) => {
      const newLinks = links.filter((_, i) => i !== index);
      setLinks(newLinks);
      updateFormState(newLinks);
    },
    [links, updateFormState]
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      if (pendingLink) {
        handlePendingUrlChange(target.value);
      }
    }
  };

  const handleComboboxKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsSelectingPlatform(false);
      setSelectedPlatform(null);
      setQuery('');
    }
  };

  const handleUrlKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const cancelSelection = () => {
    setIsSelectingPlatform(false);
    setSelectedPlatform(null);
    setQuery('');
  };

  const baseInputClass =
    'block rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-600 text-sm w-full';

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .platform-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .platform-item[data-highlighted] .platform-indicator {
      color: white;
    }
    .platform-item[data-state="checked"] .platform-indicator {
      display: flex;
    }
    .platform-item .platform-indicator {
      display: none;
    }
    .platform-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 id="socials" className="mb-4 text-lg font-bold text-gray-900">
        Social Links
      </h3>

      <div className="space-y-4">
        <style>{comboboxItemStyles}</style>

        {links.map((link, index) => (
          <div
            key={index}
            className="flex items-center gap-3"
            role="group"
            aria-label={`${link.platform} social link`}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-md bg-cyan-600/10"
              aria-hidden="true"
            >
              <img
                src={`/socials/${link.platform}.svg`}
                alt=""
                width="24"
                height="24"
                className="h-6 w-6 scale-125"
              />
            </div>
            <label className="sr-only" htmlFor={`social-url-${index}`}>
              {link.platform} URL
            </label>
            <input
              id={`social-url-${index}`}
              type="url"
              value={link.url}
              autoComplete="off"
              onChange={(e) => updateLink(index, e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="https://"
              className={`${baseInputClass} flex-1`}
              aria-label={`${link.platform} profile URL`}
            />

            <button
              type="button"
              onClick={() => removeLink(index)}
              className="p-2 text-cyan-600 hover:text-gray-900"
              aria-label={`Remove ${link.platform} link`}
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ))}

        {pendingLink && (
          <div
            className="flex items-center gap-3"
            role="group"
            aria-label={`New ${pendingLink.platform} link`}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-md bg-cyan-600/10"
              aria-hidden="true"
            >
              <img
                src={`/socials/${pendingLink.platform}.svg`}
                alt=""
                width="24"
                height="24"
                className="h-6 w-6 scale-125"
              />
            </div>
            <label className="sr-only" htmlFor="pending-social-url">
              {pendingLink.platform} URL
            </label>
            <input
              id="pending-social-url"
              type="url"
              value={pendingLink.url}
              autoComplete="off"
              onChange={(e) =>
                setPendingLink({ ...pendingLink, url: e.target.value })
              }
              onBlur={(e) => handlePendingUrlChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://"
              className={`${baseInputClass} flex-1`}
              aria-label={`Enter ${pendingLink.platform} profile URL`}
              autoFocus
            />

            <button
              type="button"
              onClick={() => {
                setPendingLink(null);
                setSelectedPlatform(null);
                setQuery('');
              }}
              className="p-2 text-cyan-600 hover:text-gray-900"
              aria-label="Cancel adding new social link"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {isSelectingPlatform ? (
          <div className="relative" aria-label="Select social media platform">
            <Combobox.Root
              collection={collection}
              value={selectedPlatform ? [selectedPlatform] : []}
              onValueChange={handlePlatformSelect}
              onInputValueChange={(details) => setQuery(details.inputValue)}
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
              <Combobox.Control>
                <Combobox.Input
                  className={baseInputClass}
                  autoComplete="off"
                  placeholder="Search social platforms..."
                  onKeyDown={handleComboboxKeyDown}
                  aria-label="Search social platforms"
                />
                <Combobox.Trigger className="absolute right-0 top-2 flex items-center pr-2">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </Combobox.Trigger>
              </Combobox.Control>

              <Portal>
                <Combobox.Positioner>
                  <Combobox.Content
                    className="mt-1 w-fit min-w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5"
                    aria-label="Available social platforms"
                  >
                    {collection.items.length === 0 ? (
                      <div className="relative cursor-default select-none px-4 py-2 text-gray-400">
                        Nothing found.
                      </div>
                    ) : (
                      collection.items.map((platform) => (
                        <Combobox.Item
                          key={platform}
                          item={platform}
                          className="platform-item relative cursor-pointer select-none px-4 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={`/socials/${platform}.svg`}
                              alt=""
                              width="24"
                              height="24"
                              className="h-6 w-6"
                              aria-hidden="true"
                            />
                            <span className="text-gray-700">{platform}</span>
                            <span className="platform-indicator absolute inset-y-0 right-0 flex items-center pr-3 text-cyan-600">
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          </div>
                        </Combobox.Item>
                      ))
                    )}
                  </Combobox.Content>
                </Combobox.Positioner>
              </Portal>
            </Combobox.Root>

            <div className="mt-2">
              <button
                type="button"
                onClick={cancelSelection}
                className="text-sm text-gray-400 hover:text-cyan-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          !pendingLink && (
            <button
              type="button"
              onClick={() => setIsSelectingPlatform(true)}
              disabled={SOCIAL_PLATFORMS.length === 0}
              className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 disabled:text-gray-400"
              aria-label="Add new social media link"
            >
              <PlusIcon className="h-5 w-5" aria-hidden="true" />
              <span>Add Social Link</span>
            </button>
          )
        )}

        {errors.socials && (
          <p className="mt-2 text-sm text-red-600">{errors.socials}</p>
        )}
      </div>
    </div>
  );
}
