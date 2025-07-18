import type { MenuNode } from '@/types/tractstack';

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
