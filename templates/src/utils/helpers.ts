import { useState, useEffect, useCallback } from 'react';
import { stopWords } from '@/constants/stopWords';
import type { RefObject } from 'react';
import type { MenuNode } from '@/types/tractstack';

let progressInterval: NodeJS.Timeout | null = null;

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(` `);
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// UTC date helpers for analytics
export function formatUTCHourKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
}

export function parseHourKeyToUTCDate(hourKey: string): Date {
  const [year, month, day, hour] = hourKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour));
}

export function getUTCHourKeysForTimeRange(hours: number): string[] {
  const keys = [];
  const now = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      new Date().getUTCHours()
    )
  );
  const MAX_ANALYTICS_HOURS = 672;
  const hoursToGet = Math.min(hours, MAX_ANALYTICS_HOURS);
  for (let i = 0; i < hoursToGet; i++) {
    const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
    const key = formatUTCHourKey(hourDate);
    keys.push(key);
  }
  return keys;
}

export function createStoryKeepMenu(params: {
  isAuthenticated: boolean;
  isAdmin: boolean;
}): MenuNode {
  const { isAuthenticated, isAdmin } = params;

  const links = [];

  // Add Login link for unauthenticated users
  if (!isAuthenticated) {
    links.unshift({
      name: 'Login',
      description: 'Enter your Story Keep',
      featured: true,
      actionLisp: '(goto (storykeep login))',
    });
  }

  // Add Logout link for authenticated users
  if (isAuthenticated) {
    links.unshift({
      name: 'Logout',
      description: 'Close this session',
      featured: true,
      actionLisp: '(goto (storykeep logout))',
    });
  }

  return {
    id: `storykeep`,
    title: 'Story Keep Menu',
    theme: 'default',
    optionsPayload: links,
  };
}

export function joinUrlPaths(base: string, path: string): string {
  // Trim trailing slash from base
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  // Trim leading slash from path
  const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
  // Join with a single slash
  return `${trimmedBase}/${trimmedPath}`;
}

export function startLoadingAnimation() {
  const loadingIndicator = document.getElementById(
    'loading-indicator'
  ) as HTMLElement;
  const content = document.getElementById('content') as HTMLElement;

  if (
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches &&
    loadingIndicator
  ) {
    loadingIndicator.style.transform = 'scaleX(0)';
    loadingIndicator.style.display = 'block';
    content.style.opacity = '0.5';

    let progress = 0;
    progressInterval = setInterval(() => {
      progress += 2;
      if (progress > 90) {
        if (progressInterval !== null) {
          clearInterval(progressInterval);
        }
      }
      loadingIndicator.style.transform = `scaleX(${progress / 100})`;
    }, 20);
  }
}

export function stopLoadingAnimation() {
  const loadingIndicator = document.getElementById(
    'loading-indicator'
  ) as HTMLElement;
  const content = document.getElementById('content') as HTMLElement;

  if (
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches &&
    loadingIndicator
  ) {
    if (progressInterval !== null) {
      clearInterval(progressInterval);
    }
    loadingIndicator.style.transform = 'scaleX(1)';
    content.style.opacity = '1';

    setTimeout(() => {
      loadingIndicator.style.display = 'none';
      loadingIndicator.style.transform = 'scaleX(0)';
    }, 300);
  }
}

export function isDeepEqual(obj1: any, obj2: any, excludeKeys: string[] = []) {
  // Check if both are the same type and are objects
  if (
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object' ||
    obj1 === null ||
    obj2 === null
  ) {
    return obj1 === obj2;
  }
  // Get the keys of both objects
  const keys1 = Object.keys(obj1).filter((key) => !excludeKeys.includes(key));
  const keys2 = Object.keys(obj2).filter((key) => !excludeKeys.includes(key));
  // Check if the number of keys is the same
  if (keys1.length !== keys2.length) {
    return false;
  }
  // Check if all keys and their values are equal
  for (const key of keys1) {
    if (
      !keys2.includes(key) ||
      !isDeepEqual(obj1[key], obj2[key], excludeKeys)
    ) {
      return false;
    }
  }
  return true;
}

export function cleanString(s: string): string {
  if (!s) return s;
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9\s-_]/g, '');
  s = s.replace(/\s+/g, '-');
  const words = s.split(/[-_]/);
  if (words.length > 1) {
    s = words.filter((word) => !stopWords.has(word)).join('-');
  }
  s = s.replace(/^[^a-z]+/, '');
  s = s.replace(/[-_]{2,}/g, '-');
  s = s.replace(/^[-_]+|[-_]+$/g, '');
  if (!s.match(/^[a-z][a-z0-9-_]*[a-z0-9]$/)) {
    s = s.replace(/[^a-z0-9]/g, '');
  }
  return s;
}

export function titleToSlug(title: string, maxLength: number = 50): string {
  const slug = cleanString(title);
  if (slug.length <= maxLength) {
    return slug;
  }
  const words = slug.split('-');
  let result = '';
  for (const word of words) {
    if ((result + (result ? '-' : '') + word).length > maxLength) {
      break;
    }
    result += (result ? '-' : '') + word;
  }
  if (!result) {
    result = slug.slice(0, maxLength);
  }
  return result.replace(/-+$/, '');
}

export function findUniqueSlug(slug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(slug)) {
    return slug;
  }
  let counter = 1;
  let newSlug = `${slug}-${counter}`;
  while (existingSlugs.includes(newSlug)) {
    counter++;
    newSlug = `${slug}-${counter}`;
  }
  return newSlug;
}

export const timestampNodeId = (id: string): string => `${id}-${Date.now()}`;

interface DropdownDirection {
  openAbove: boolean;
  maxHeight: number;
}

export function useDropdownDirection(
  triggerRef: RefObject<HTMLElement | null>
): DropdownDirection {
  const [state, setState] = useState<DropdownDirection>({
    openAbove: false,
    maxHeight: 300,
  });

  const updateDirection = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const newOpenAbove = spaceBelow < 300 && spaceAbove > spaceBelow;
      const newMaxHeight = newOpenAbove
        ? Math.min(spaceAbove - 10, 300)
        : Math.min(spaceBelow - 10, 300);
      setState({ openAbove: newOpenAbove, maxHeight: newMaxHeight });
    }
  }, [triggerRef]);

  useEffect(() => {
    updateDirection();

    const handleResize = () => {
      // Only update if the width changes, to avoid keyboard triggers
      if (window.innerWidth !== window.visualViewport?.width) {
        updateDirection();
      }
    };

    window.addEventListener('resize', handleResize);

    // Use ResizeObserver to watch for changes in the trigger element's size or position
    const resizeObserver = new ResizeObserver(updateDirection);
    if (triggerRef.current) {
      resizeObserver.observe(triggerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [updateDirection, triggerRef]);

  return state;
}
