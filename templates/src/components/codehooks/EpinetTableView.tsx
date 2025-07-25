import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '@/stores/analytics';
import { Accordion } from '@ark-ui/react';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import NewspaperIcon from '@heroicons/react/24/outline/NewspaperIcon';
import DocumentCheckIcon from '@heroicons/react/24/outline/DocumentCheckIcon';
import DocumentPlusIcon from '@heroicons/react/24/outline/DocumentPlusIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';

interface ContentEvent {
  verb: string;
  count: number;
}

interface ContentItem {
  contentId: string;
  title: string;
  contentType: string;
  events: ContentEvent[];
  visitorIds: string[];
}

interface ActiveHourData {
  type: 'active';
  hourKey: string;
  hourNum: number;
  hourDisplay: string;
  humanReadableTime: string;
  contentItems: ContentItem[];
  hourlyTotal: number;
  hourlyVisitors: number;
  relativeToMax: number;
}

interface EmptyHourRange {
  type: 'empty';
  startHour: number;
  endHour: number;
  display: string;
  humanReadableDisplay: string;
  isFuture: boolean;
}

type HourData = ActiveHourData | EmptyHourRange;

interface ContentMapItem {
  id: string;
  title: string;
  type: string;
}

const EpinetTableView = ({
  fullContentMap,
  isLoading = false,
}: {
  fullContentMap: ContentMapItem[];
  isLoading?: boolean;
}) => {
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const [currentDay, setCurrentDay] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const getContentInfo = (
    contentId: string
  ): { title: string; type: string } => {
    const content = fullContentMap.find((item) => item.id === contentId);
    if (content) {
      return {
        title: content.title,
        type: content.type,
      };
    }
    return {
      title: contentId.substring(0, 8) + '...',
      type: 'Unknown',
    };
  };

  const getHumanReadableTime = (hour: number): string => {
    if (hour === 0) return 'midnight';
    if (hour === 12) return 'noon';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  const getHumanReadableTimeRange = (
    startHour: number,
    endHour: number
  ): string => {
    if (startHour === endHour) {
      return getHumanReadableTime(startHour);
    }
    const startTime = getHumanReadableTime(startHour);
    // If end hour is 23 (11pm), show "end of day"
    if (endHour === 23) {
      return `${startTime} - end of day`;
    }
    // Show endHour:59 format
    if (endHour === 0) {
      return `${startTime} - 12:59am`;
    } else if (endHour < 12) {
      return `${startTime} - ${endHour}:59am`;
    } else if (endHour === 12) {
      return `${startTime} - 12:59pm`;
    } else {
      return `${startTime} - ${endHour - 12}:59pm`;
    }
  };

  // Parse UTC hourKey and convert to local timezone for display
  const getLocalDisplayTime = (
    hourKey: string
  ): {
    localDay: string;
    localHour: number;
    localHourDisplay: string;
    humanReadableTime: string;
  } => {
    try {
      const [year, month, day, hour] = hourKey.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, hour));

      // Convert UTC to local timezone for display
      const localDate = new Date(utcDate.toLocaleString());

      const localDay = `${localDate.getFullYear()}-${String(
        localDate.getMonth() + 1
      ).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

      const localHour = localDate.getHours();
      const localHourDisplay = `${localHour.toString().padStart(2, '0')}:00`;
      const humanReadableTime = getHumanReadableTime(localHour);

      return { localDay, localHour, localHourDisplay, humanReadableTime };
    } catch (e) {
      console.warn(`Failed to parse hourKey: ${hourKey}`, e);
      // Fallback to treating as already local
      const [year, month, day] = hourKey.split('-').slice(0, 3).map(Number);
      const localDay = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const localHour = Number(hourKey.split('-')[3]) || 0;
      const localHourDisplay = `${localHour.toString().padStart(2, '0')}:00`;
      const humanReadableTime = getHumanReadableTime(localHour);
      return { localDay, localHour, localHourDisplay, humanReadableTime };
    }
  };

  // Convert hourKey (UTC) to exact UTC time range for focusing
  const focusOnThisHour = (hourKey: string) => {
    try {
      const [year, month, day, hour] = hourKey.split('-').map(Number);

      // Create exact UTC hour boundaries
      const startTimeUTC = new Date(
        Date.UTC(year, month - 1, day, hour, 0, 0, 0)
      );
      const endTimeUTC = new Date(
        Date.UTC(year, month - 1, day, hour, 59, 59, 999)
      );

      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        ...$epinetCustomFilters,
        startTimeUTC: startTimeUTC.toISOString(),
        endTimeUTC: endTimeUTC.toISOString(),
      });
    } catch (e) {
      console.warn(`Failed to focus on hour: ${hourKey}`, e);
      // Fallback - do nothing rather than use legacy system
    }
  };

  useEffect(() => {
    const hourlyActivity = $epinetCustomFilters.hourlyNodeActivity || {};
    const hourKeys = Object.keys(hourlyActivity);

    if (hourKeys.length === 0) {
      setAvailableDays([]);
      setCurrentDay(null);
      return;
    }

    const days = Array.from(
      new Set(hourKeys.map((key) => getLocalDisplayTime(key).localDay))
    )
      .sort()
      .reverse();

    setAvailableDays(days);
    setCurrentDay(days[0] || null);
    setCurrentDayIndex(0);
  }, [$epinetCustomFilters.hourlyNodeActivity]);

  const navigateDay = (direction: 'prev' | 'next') => {
    const newIndex =
      direction === 'prev'
        ? Math.min(currentDayIndex + 1, availableDays.length - 1)
        : Math.max(currentDayIndex - 1, 0);

    setCurrentDayIndex(newIndex);
    setCurrentDay(availableDays[newIndex]);
  };

  const getCurrentDayData = (): {
    data: HourData[];
    dailyTotal: number;
    dailyVisitors: number;
    maxHourlyTotal: number;
  } => {
    if (!currentDay)
      return { data: [], dailyTotal: 0, dailyVisitors: 0, maxHourlyTotal: 0 };

    const hourlyActivity = $epinetCustomFilters.hourlyNodeActivity || {};
    const result: HourData[] = [];
    let emptyRangeStart: number | null = null;
    let dailyTotal = 0;
    let maxHourlyTotal = 0;

    const dailyUniqueVisitors = new Set<string>();

    // Get current local time for "future" detection
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const isToday = currentDay === today;
    const currentLocalHour = now.getHours();

    type ProcessedHourData = {
      hourKey: string;
      data: Record<string, ContentItem>;
      hourlyTotal: number;
      hourlyVisitors: number;
      localHour: number;
      localHourDisplay: string;
    };

    const activityByLocalHour: Record<number, ProcessedHourData> = {};

    Object.entries(hourlyActivity).forEach(([hourKey, contentItems]) => {
      const { localDay, localHour, localHourDisplay } =
        getLocalDisplayTime(hourKey);
      if (localDay === currentDay) {
        let hourlyTotal = 0;
        const hourlyUniqueVisitors = new Set<string>();
        const processedData: Record<string, ContentItem> = {};

        Object.entries(contentItems as Record<string, any>).forEach(
          ([contentId, data]) => {
            const contentInfo = getContentInfo(contentId);
            const events: ContentEvent[] = [];

            Object.entries(data.events as Record<string, number>).forEach(
              ([verb, count]) => {
                events.push({ verb, count: count as number });
                hourlyTotal += count as number;
              }
            );
            processedData[contentId] = {
              contentId,
              title: contentInfo.title,
              contentType: contentInfo.type,
              events,
              visitorIds: (data.visitorIds as string[]) || [],
            };
            (data.visitorIds as string[])?.forEach((visitorId: string) => {
              hourlyUniqueVisitors.add(visitorId);
              dailyUniqueVisitors.add(visitorId);
            });
          }
        );

        dailyTotal += hourlyTotal;
        maxHourlyTotal = Math.max(maxHourlyTotal, hourlyTotal);

        activityByLocalHour[localHour] = {
          hourKey,
          data: processedData,
          hourlyTotal,
          hourlyVisitors: hourlyUniqueVisitors.size,
          localHour,
          localHourDisplay,
        };
      }
    });

    for (let localHour = 0; localHour < 24; localHour++) {
      const activity = activityByLocalHour[localHour];
      const hasActivity = activity && Object.keys(activity.data).length > 0;

      if (hasActivity) {
        if (emptyRangeStart !== null) {
          const localEmptyEnd = localHour - 1;
          const isFuture = isToday && emptyRangeStart > currentLocalHour;
          result.push({
            type: 'empty',
            startHour: emptyRangeStart,
            endHour: localEmptyEnd,
            display:
              emptyRangeStart === localEmptyEnd
                ? `${emptyRangeStart.toString().padStart(2, '0')}:00`
                : `${emptyRangeStart.toString().padStart(2, '0')}:00 - ${localEmptyEnd.toString().padStart(2, '0')}:59`,
            humanReadableDisplay: getHumanReadableTimeRange(
              emptyRangeStart,
              localEmptyEnd
            ),
            isFuture,
          });
          emptyRangeStart = null;
        }

        const contentItems = Object.values(activity.data).sort((a, b) =>
          a.title.localeCompare(b.title)
        );

        const relativeToMax =
          maxHourlyTotal > 0 ? activity.hourlyTotal / maxHourlyTotal : 0;

        result.push({
          type: 'active',
          hourKey: activity.hourKey,
          hourNum: localHour,
          hourDisplay: activity.localHourDisplay,
          humanReadableTime: getHumanReadableTime(localHour),
          contentItems,
          hourlyTotal: activity.hourlyTotal,
          hourlyVisitors: activity.hourlyVisitors,
          relativeToMax,
        });
      } else {
        if (emptyRangeStart === null) {
          emptyRangeStart = localHour;
        }
      }
    }

    if (emptyRangeStart !== null) {
      const localEmptyEnd = 23;
      const isFuture = isToday && emptyRangeStart > currentLocalHour;
      result.push({
        type: 'empty',
        startHour: emptyRangeStart,
        endHour: localEmptyEnd,
        display:
          emptyRangeStart === localEmptyEnd
            ? `${emptyRangeStart.toString().padStart(2, '0')}:00`
            : `${emptyRangeStart.toString().padStart(2, '0')}:00 - ${localEmptyEnd.toString().padStart(2, '0')}:59`,
        humanReadableDisplay: getHumanReadableTimeRange(
          emptyRangeStart,
          localEmptyEnd
        ),
        isFuture,
      });
    }

    return {
      data: result.sort((a, b) => {
        if (a.type === 'active' && b.type === 'active') {
          return a.hourNum - b.hourNum;
        } else if (a.type === 'active' && b.type === 'empty') {
          return a.hourNum - b.startHour;
        } else if (a.type === 'empty' && b.type === 'active') {
          return a.startHour - b.hourNum;
        } else if (a.type === 'empty' && b.type === 'empty') {
          return a.startHour - b.startHour;
        }
        return 0;
      }),
      dailyTotal,
      dailyVisitors: dailyUniqueVisitors.size,
      maxHourlyTotal,
    };
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'StoryFragment':
        return <NewspaperIcon className="mr-1 h-4 w-4" />;
      case 'Pane':
        return <DocumentCheckIcon className="mr-1 h-4 w-4" />;
      default:
        return <DocumentPlusIcon className="mr-1 h-4 w-4" />;
    }
  };

  const { data: dayData, dailyTotal, dailyVisitors } = getCurrentDayData();
  const hasData = availableDays.length > 0;

  const formatDate = (dateStr: string): string => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getTimezoneName = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return 'Local Time';
    }
  };

  const classNames = (...classes: (string | boolean | undefined)[]): string => {
    return classes.filter(Boolean).join(' ');
  };

  if (!hasData) return null;

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-black bg-opacity-80">
          <div className="flex items-center space-x-2 text-white">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <span className="text-sm font-bold">Loading table data...</span>
          </div>
        </div>
      )}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <h3 className="text-sm font-bold text-gray-800">
            Hourly Activity ({getTimezoneName()}) - {dailyTotal} Total Events /{' '}
            {dailyVisitors} Unique Visitors
          </h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => navigateDay('prev')}
                disabled={currentDayIndex >= availableDays.length - 1}
                className={classNames(
                  'rounded-full p-1',
                  currentDayIndex >= availableDays.length - 1
                    ? 'cursor-not-allowed text-gray-300'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                title="Previous day (older)"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600">
                {currentDay ? formatDate(currentDay) : ''}
              </span>
              <button
                onClick={() => navigateDay('next')}
                disabled={currentDayIndex === 0}
                className={classNames(
                  'rounded-full p-1',
                  currentDayIndex === 0
                    ? 'cursor-not-allowed text-gray-300'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                title="Next day (newer)"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <Accordion.Root multiple className="w-full">
          {dayData.map((item, index) => (
            <Accordion.Item
              key={item.type === 'active' ? item.hourKey : `empty-${index}`}
              value={item.type === 'active' ? item.hourKey : `empty-${index}`}
              className="border-b border-gray-100 last:border-b-0"
            >
              <Accordion.ItemTrigger className="flex w-full items-center justify-between p-3 text-left transition-colors duration-200 hover:bg-gray-50">
                {item.type === 'active' ? (
                  <div className="flex flex-grow items-center space-x-3">
                    <span className="text-sm font-bold text-gray-700">
                      {item.humanReadableTime}
                    </span>
                    <span className="text-xs text-gray-600">
                      {item.hourlyTotal} event
                      {item.hourlyTotal !== 1 ? 's' : ''} /{' '}
                      {item.hourlyVisitors} visitor
                      {item.hourlyVisitors !== 1 ? 's' : ''}
                    </span>
                    <div className="relative h-2 w-full max-w-48 rounded bg-gray-200">
                      <div
                        className="absolute left-0 top-0 h-2 rounded bg-cyan-600"
                        style={{
                          width: `${Math.max(item.relativeToMax * 100, 5)}%`,
                        }}
                        title={`${item.hourlyTotal} events (${(item.relativeToMax * 100).toFixed(1)}% of busiest hour)`}
                      />
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent accordion toggle
                        focusOnThisHour(item.hourKey);
                      }}
                      className="flex cursor-pointer items-center rounded-md bg-orange-100 px-2 py-1 text-xs font-bold text-orange-800 transition-colors duration-200 hover:bg-orange-200"
                      title="Focus analytics dashboard on this hour's user journeys"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          focusOnThisHour(item.hourKey);
                        }
                      }}
                    >
                      <MagnifyingGlassIcon className="mr-1 h-3 w-3" />
                      Journeys this Hour
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-grow items-center">
                    <span className="text-sm text-gray-700">
                      {item.humanReadableDisplay}
                    </span>
                    <span className="ml-2 text-xs italic text-gray-500">
                      {item.isFuture ? 'The future awaits!' : 'No activity'}
                    </span>
                  </div>
                )}
                <Accordion.ItemIndicator>
                  <ChevronDownIcon
                    className={classNames(
                      'h-5 w-5 text-gray-500 transition-transform duration-200',
                      'data-[state=open]:rotate-180'
                    )}
                  />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>

              <Accordion.ItemContent className="pt-2">
                {item.type === 'active' && (
                  <div className="space-y-4">
                    {item.contentItems.map((content) => (
                      <div
                        key={`${item.hourKey}-${content.contentId}`}
                        className="mb-3"
                      >
                        <div className="mb-1 flex items-center justify-between text-sm font-bold text-gray-700">
                          <div className="flex items-center">
                            {getContentIcon(content.contentType)}
                            {content.title}
                          </div>
                          {content.visitorIds.length > 0 && (
                            <div
                              className="flex items-center text-xs text-gray-600"
                              title={content.visitorIds.join(', ')}
                            >
                              <UserGroupIcon className="mr-1 h-3 w-3" />
                              {content.visitorIds.length} unique visitor
                              {content.visitorIds.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {content.events.map((event, eventIdx) => (
                            <div
                              key={`${item.hourKey}-${content.contentId}-${event.verb}-${eventIdx}`}
                              className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800"
                            >
                              {event.verb} [{event.count}]
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}

          {dayData.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">
              No activity data available for this day
            </div>
          )}
        </Accordion.Root>
      </div>
    </div>
  );
};

export default EpinetTableView;
