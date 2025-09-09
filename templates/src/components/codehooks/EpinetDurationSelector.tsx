import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { createListCollection } from '@ark-ui/react/collection';
import { Select } from '@ark-ui/react/select';
import { RadioGroup } from '@ark-ui/react/radio-group';
import { Portal } from '@ark-ui/react/portal';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import { epinetCustomFilters } from '@/stores/analytics';
import EpinetTableView from './EpinetTableView';
import { MAX_ANALYTICS_HOURS } from '@/constants';

const getHourOptions = () => {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: `${i.toString().padStart(2, '0')}:00`,
    sortOrder: i,
  }));
  hours.push({ value: '24', label: '23:59', sortOrder: 24 });
  hours.sort((a, b) => a.sortOrder - b.sortOrder);
  return hours.map(({ value, label }) => ({ value, label }));
};

const getEndHourOptions = () => {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: `${i.toString().padStart(2, '0')}:59`, // Always show :59 for end hours
    sortOrder: i,
  }));
  hours.push({ value: '24', label: '23:59', sortOrder: 24 });
  hours.sort((a, b) => a.sortOrder - b.sortOrder);
  return hours.map(({ value, label }) => ({ value, label }));
};

const hourOptions = getHourOptions();
const endHourOptions = getEndHourOptions();

interface ContentMapItem {
  id: string;
  title: string;
  type: string;
}

interface EpinetDurationSelectorProps {
  fullContentMap?: ContentMapItem[];
  isLoading?: boolean;
}

const EpinetDurationSelector = ({
  fullContentMap,
  isLoading,
}: EpinetDurationSelectorProps = {}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentUserPage, setCurrentUserPage] = useState(0);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const usersPerPage = 50;

  const $epinetCustomFilters = useStore(epinetCustomFilters);

  const [localFilters, setLocalFilters] = useState({
    visitorType: $epinetCustomFilters.visitorType || 'all',
    selectedUserId: $epinetCustomFilters.selectedUserId || null,
    startHour: '00',
    endHour: '23:59',
  });

  useEffect(() => {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7); // Default to one week

    setStartDate(startDate);
    setEndDate(endDate);
    const currentHour = now.getHours().toString().padStart(2, '0');
    setLocalFilters((prev) => ({
      ...prev,
      startHour: currentHour,
      endHour: currentHour,
    }));
  }, []);

  // MODIFIED: Enhanced sync from store
  useEffect(() => {
    if ($epinetCustomFilters.startTimeUTC && $epinetCustomFilters.endTimeUTC) {
      const startUTC = new Date($epinetCustomFilters.startTimeUTC);
      const endUTC = new Date($epinetCustomFilters.endTimeUTC);

      // Update local dates and hours to match store
      setStartDate(
        new Date(
          startUTC.getFullYear(),
          startUTC.getMonth(),
          startUTC.getDate()
        )
      );
      setEndDate(
        new Date(endUTC.getFullYear(), endUTC.getMonth(), endUTC.getDate())
      );

      setLocalFilters((prev) => ({
        ...prev,
        startHour: startUTC.getHours().toString().padStart(2, '0'),
        endHour: endUTC.getHours().toString().padStart(2, '0'),
        visitorType: $epinetCustomFilters.visitorType || 'all',
        selectedUserId: $epinetCustomFilters.selectedUserId,
      }));

      setHasLocalChanges(false);
    } else {
      setLocalFilters((prev) => ({
        ...prev,
        visitorType: $epinetCustomFilters.visitorType || 'all',
        selectedUserId: $epinetCustomFilters.selectedUserId,
      }));
    }
  }, [$epinetCustomFilters]);

  useEffect(() => {
    setCurrentUserPage(0);
  }, [localFilters.visitorType]);

  // Handle UnsavedChangesBar-style visibility animations
  useEffect(() => {
    if (hasLocalChanges && !isVisible) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10); // Trigger entrance animation
    } else if (!hasLocalChanges && isVisible && !isApplying) {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300); // Brief delay before hiding
    }
  }, [hasLocalChanges, isVisible, isApplying]);

  const visitorTypes = [
    { id: 'all', title: 'All Traffic', description: 'All visitors' },
    { id: 'anonymous', title: 'Anonymous', description: 'Anonymous visitors' },
    { id: 'known', title: 'Known Leads', description: 'Known visitors' },
  ] as const;

  const updateVisitorType = (type: 'all' | 'anonymous' | 'known') => {
    setLocalFilters((prev) => ({
      ...prev,
      visitorType: type,
      selectedUserId: null,
    }));
    setHasLocalChanges(true);
  };

  const updateSelectedUser = (userId: string | null) => {
    setLocalFilters((prev) => ({ ...prev, selectedUserId: userId }));
    setHasLocalChanges(true);
  };

  const updateHour = (type: 'startHour' | 'endHour', hour: string) => {
    setLocalFilters((prev) => ({ ...prev, [type]: hour }));
    setHasLocalChanges(true);
    setErrorMessage(null);
  };

  // Create UTC datetime from local date and hour selection
  const createUTCDateTime = (date: Date, hourStr: string): Date => {
    const localDateTime = new Date(date);
    const hour = hourStr === '24' ? 23 : parseInt(hourStr);
    const minute = hourStr === '24' ? 59 : 0;
    localDateTime.setHours(hour, minute, 0, 0);

    // Convert to UTC by creating new Date with UTC values
    return new Date(localDateTime.getTime());
  };

  const updateDateRange = async () => {
    if (!startDate || !endDate) {
      setErrorMessage('Please select both start and end dates.');
      return;
    }

    const startUTCTime = createUTCDateTime(startDate, localFilters.startHour);
    const endUTCTime = createUTCDateTime(endDate, localFilters.endHour);

    if (endUTCTime < startUTCTime) {
      setErrorMessage('End time must be after start time.');
      return;
    }

    const nowUTC = new Date();
    const maxPastTime = new Date(
      nowUTC.getTime() - MAX_ANALYTICS_HOURS * 60 * 60 * 1000
    );

    if (startUTCTime < maxPastTime) {
      setErrorMessage(
        `Start time cannot be more than ${MAX_ANALYTICS_HOURS} hours in the past.`
      );
      return;
    }

    if (endUTCTime > nowUTC) {
      setErrorMessage('End time cannot be in the future.');
      return;
    }

    setIsApplying(true);

    try {
      // Update with UTC timestamps
      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        ...$epinetCustomFilters,
        visitorType: localFilters.visitorType,
        selectedUserId: localFilters.selectedUserId,
        startTimeUTC: startUTCTime.toISOString(),
        endTimeUTC: endUTCTime.toISOString(),
      });

      setHasLocalChanges(false);
      setErrorMessage(null);

      // Brief delay to show success state
      setTimeout(() => {
        setIsApplying(false);
      }, 1000);
    } catch (error) {
      setIsApplying(false);
      setErrorMessage('Failed to apply filters. Please try again.');
    }
  };

  const handleDateChange = (
    type: 'start' | 'end',
    dateValue: string | null
  ) => {
    if (!dateValue) {
      setErrorMessage('Please select a valid date.');
      return;
    }

    const newDate = new Date(
      parseInt(dateValue.split('-')[0]),
      parseInt(dateValue.split('-')[1]) - 1,
      parseInt(dateValue.split('-')[2])
    );

    const nowUTC = new Date();
    const maxPastTime = new Date(
      nowUTC.getTime() - MAX_ANALYTICS_HOURS * 60 * 60 * 1000
    );

    if (newDate < maxPastTime) {
      setErrorMessage(
        `Date cannot be more than ${MAX_ANALYTICS_HOURS} hours in the past.`
      );
      return;
    }

    if (type === 'start') {
      setStartDate(newDate);
    } else {
      setEndDate(newDate);
    }

    setHasLocalChanges(true);
    setErrorMessage(null);
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateHourDisplay = (
    date: Date,
    hourStr: string,
    isEndTime = false
  ) => {
    if (!date) return '';

    const localDateTime = new Date(date);
    const hour = hourStr === '24' ? 23 : parseInt(hourStr);
    // For end times, always show :59 to represent the full hour
    const minute = isEndTime ? 59 : hourStr === '24' ? 59 : 0;
    localDateTime.setHours(hour, minute, 0, 0);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
      localDateTime.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone,
      }) + ` (${timeZone})`
    );
  };

  // Display current UTC range in local timezone with proper end time formatting
  const formatCurrentUTCRange = () => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;
    if (!startTimeUTC || !endTimeUTC) return '';

    const startLocal = new Date(startTimeUTC);
    const endLocal = new Date(endTimeUTC);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const formatTime = (date: Date, isEndTime = false) => {
      // For end times, always show :59 for presentation
      const displayDate = isEndTime ? new Date(date.getTime()) : date;
      if (isEndTime) {
        displayDate.setMinutes(59);
      }

      return displayDate.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone,
      });
    };

    return `${formatTime(startLocal, false)} to ${formatTime(endLocal, true)} (${timeZone})`;
  };

  const paginatedUserCounts = ($epinetCustomFilters.userCounts || []).slice(
    currentUserPage * usersPerPage,
    (currentUserPage + 1) * usersPerPage
  );

  const totalUserPages = Math.ceil(
    (($epinetCustomFilters.userCounts || []).length || 0) / usersPerPage
  );

  const nextUserPage = () => {
    if (currentUserPage < totalUserPages - 1)
      setCurrentUserPage(currentUserPage + 1);
  };

  const prevUserPage = () => {
    if (currentUserPage > 0) setCurrentUserPage(currentUserPage - 1);
  };

  const maxDate = new Date();
  const minDate = new Date();
  minDate.setHours(minDate.getHours() - MAX_ANALYTICS_HOURS);

  const setPresetDateRange = (period: string) => {
    const nowUTC = new Date();
    let hoursBack: number;

    if (period === '24h') {
      hoursBack = 24;
    } else if (period === '7d') {
      hoursBack = 168;
    } else if (period === '28d') {
      hoursBack = 672;
    } else {
      return;
    }

    const startTimeUTC = new Date(
      nowUTC.getTime() - hoursBack * 60 * 60 * 1000
    );

    // Convert to local dates and set local state
    const startLocal = new Date(startTimeUTC);
    const endLocal = new Date(nowUTC);

    setStartDate(
      new Date(
        startLocal.getFullYear(),
        startLocal.getMonth(),
        startLocal.getDate()
      )
    );
    setEndDate(
      new Date(endLocal.getFullYear(), endLocal.getMonth(), endLocal.getDate())
    );

    setLocalFilters((prev) => ({
      ...prev,
      startHour: startLocal.getHours().toString().padStart(2, '0'),
      endHour: endLocal.getHours().toString().padStart(2, '0'),
    }));

    setHasLocalChanges(true);
    setIsDatePickerOpen(false);
    setErrorMessage(null);
  };

  const cancelChanges = () => {
    const now = new Date();
    setLocalFilters({
      visitorType: $epinetCustomFilters.visitorType || 'all',
      selectedUserId: $epinetCustomFilters.selectedUserId || null,
      startHour: now.getHours().toString().padStart(2, '0'),
      endHour: now.getHours().toString().padStart(2, '0'),
    });

    const endDate = new Date(now);
    let startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    setStartDate(startDate);
    setEndDate(endDate);
    setIsDatePickerOpen(false);
    setHasLocalChanges(false);
    setErrorMessage(null);
  };

  const radioGroupStyles = `
    .radio-control[data-state="unchecked"] .radio-dot { background-color: #d1d5db; }
    .radio-control[data-state="checked"] .radio-dot { background-color: #0891b2; }
    .radio-control[data-state="checked"] { border-color: #0891b2; }
    .radio-item { border: 1px solid #d1d5db; }
    .radio-item[data-state="checked"] { border-color: #0891b2; }
    .radio-item:hover { background-color: #f3f4f6; }
    @media (max-width: 640px) { .radio-item { flex: 1 1 100%; } }
    @media (min-width: 641px) { .radio-item { flex: 1 1 calc(33.333% - 0.5rem); } }
  `;

  const getFilterStatusMessage = () => {
    const needsApply = hasLocalChanges;
    const prefix = needsApply ? 'Press Apply Filters to load' : 'Showing';

    let baseMessage: string;
    if (needsApply && startDate && endDate) {
      baseMessage = `${prefix} from ${formatDateHourDisplay(startDate, localFilters.startHour, false)} to ${formatDateHourDisplay(endDate, localFilters.endHour, true)}`;
    } else if (
      !needsApply &&
      $epinetCustomFilters.startTimeUTC &&
      $epinetCustomFilters.endTimeUTC
    ) {
      baseMessage = `${prefix} ${formatCurrentUTCRange()}`;
    } else {
      baseMessage = `${prefix} from last 7 days`;
    }

    const userInfo = needsApply
      ? localFilters.selectedUserId
        ? ` for individual user ${localFilters.selectedUserId}`
        : ` for ${
            localFilters.visitorType === 'all'
              ? 'all visitors'
              : localFilters.visitorType === 'anonymous'
                ? 'anonymous visitors'
                : 'known leads'
          }`
      : $epinetCustomFilters.selectedUserId
        ? ` for individual user ${$epinetCustomFilters.selectedUserId}`
        : ` for ${
            $epinetCustomFilters.visitorType === 'all'
              ? 'all visitors'
              : $epinetCustomFilters.visitorType === 'anonymous'
                ? 'anonymous visitors'
                : 'known leads'
          }`;

    return baseMessage + userInfo;
  };

  // Get bar styling based on current state
  const getBarStyling = () => {
    if (isApplying) {
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-800',
        icon: (
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ),
      };
    } else if (errorMessage) {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        textColor: 'text-red-800',
        icon: (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        ),
      };
    } else {
      return {
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        iconColor: 'text-amber-600',
        textColor: 'text-amber-800',
        icon: (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        ),
      };
    }
  };

  const styling = getBarStyling();

  // Get message based on current state
  const getMessage = () => {
    if (isApplying) {
      return 'Applying filters...';
    } else if (errorMessage) {
      return errorMessage;
    } else {
      return getFilterStatusMessage();
    }
  };

  return (
    <>
      <div className="space-y-4 overflow-visible">
        {$epinetCustomFilters.enabled && (
          <div
            className={`space-y-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4`}
          >
            <div
              className="flex flex-col space-y-4 md:flex-row md:gap-4 md:space-y-0"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <style>{`
                @media (min-width: 768px) {
                  .duration-selector-container {
                    display: grid;
                    grid-template-columns: 200px 1fr;
                    gap: 1rem;
                  }
                }
              `}</style>

              <div className="duration-selector-container flex flex-col space-y-4 md:space-y-0">
                {/* Left column: Narrow visitor types stacked */}
                <div className="space-y-2">
                  <style>{radioGroupStyles}</style>
                  <RadioGroup.Root
                    value={localFilters.visitorType}
                    onValueChange={({ value }) =>
                      updateVisitorType(value as 'all' | 'anonymous' | 'known')
                    }
                    aria-label="Select visitor type"
                  >
                    <RadioGroup.Label className="sr-only">
                      Visitor Type
                    </RadioGroup.Label>
                    <div className="flex flex-wrap gap-2 md:flex-col md:gap-2">
                      {visitorTypes.map((type) => (
                        <RadioGroup.Item
                          key={type.id}
                          value={type.id}
                          className="radio-item relative flex cursor-pointer rounded-lg bg-white px-3 py-2 focus:outline-none"
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center">
                              <RadioGroup.ItemControl className="radio-control mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-gray-300">
                                <div className="radio-dot h-2 w-2 rounded-full" />
                              </RadioGroup.ItemControl>
                              <RadioGroup.ItemText>
                                <div className="text-sm">
                                  <p className="font-bold text-gray-800">
                                    {type.title}
                                  </p>
                                  <span className="inline text-gray-600">
                                    {type.description}
                                  </span>
                                </div>
                              </RadioGroup.ItemText>
                            </div>
                            <div className="hidden shrink-0 text-cyan-600 data-[state=checked]:block">
                              <CheckCircleIcon className="h-5 w-5" />
                            </div>
                          </div>
                          <RadioGroup.ItemHiddenInput />
                        </RadioGroup.Item>
                      ))}
                    </div>
                  </RadioGroup.Root>
                </div>

                {/* Right column: Date/time controls and user select in 2 rows */}
                <div className="space-y-4">
                  {/* Row 1: Date Range | Start Hour | End Hour */}
                  <div className="date-time-row grid grid-cols-1 gap-4">
                    <style>{`
.date-time-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
}

@media (max-width: 767px) {
  .date-time-grid {
    grid-template-columns: 1fr !important;
  }
  .date-time-row {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
  }
  .date-time-row > div:nth-child(3) {
    grid-column: 2;
    grid-row: 2;
  }
}
`}</style>
                    <div className="date-time-grid space-y-1">
                      <div className="block text-sm font-bold text-gray-700">
                        Date Range (Local Time)
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                          className="w-fit min-w-48 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm"
                          aria-label="Toggle date range picker"
                        >
                          {startDate && endDate
                            ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
                            : 'Select date range'}
                        </button>

                        {isDatePickerOpen && (
                          <div className="absolute z-10 mt-1 w-full rounded-md bg-white p-2 shadow-lg sm:w-auto">
                            <div className="mb-2 flex flex-wrap justify-between gap-2">
                              <button
                                className="rounded-md p-1 text-sm hover:bg-gray-100"
                                onClick={() => setPresetDateRange('24h')}
                              >
                                Last 24 hours
                              </button>
                              <button
                                className="rounded-md p-1 text-sm hover:bg-gray-100"
                                onClick={() => setPresetDateRange('7d')}
                              >
                                Last 7 days
                              </button>
                              <button
                                className="rounded-md p-1 text-sm hover:bg-gray-100"
                                onClick={() => setPresetDateRange('28d')}
                              >
                                Last 28 days
                              </button>
                              <button
                                className="rounded-md p-1 text-sm hover:bg-gray-100"
                                onClick={() => setIsDatePickerOpen(false)}
                              >
                                Close
                              </button>
                            </div>

                            <div className="mb-2">
                              <p className="text-sm font-bold">
                                Start date: {formatDateDisplay(startDate)}
                              </p>
                              <p className="text-sm font-bold">
                                End date: {formatDateDisplay(endDate)}
                              </p>
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row">
                              <div className="flex-1">
                                <label
                                  htmlFor="start-date"
                                  className="block text-sm font-bold"
                                >
                                  Start
                                </label>
                                <input
                                  id="start-date"
                                  type="date"
                                  className="w-full rounded border px-2 py-1"
                                  onChange={(e) =>
                                    handleDateChange('start', e.target.value)
                                  }
                                  value={
                                    startDate
                                      ? startDate.toISOString().split('T')[0]
                                      : ''
                                  }
                                  min={minDate.toISOString().split('T')[0]}
                                  max={maxDate.toISOString().split('T')[0]}
                                />
                              </div>
                              <div className="flex-1">
                                <label
                                  htmlFor="end-date"
                                  className="block text-sm font-bold"
                                >
                                  End
                                </label>
                                <input
                                  id="end-date"
                                  type="date"
                                  className="w-full rounded border px-2 py-1"
                                  onChange={(e) =>
                                    handleDateChange('end', e.target.value)
                                  }
                                  value={
                                    endDate
                                      ? endDate.toISOString().split('T')[0]
                                      : ''
                                  }
                                  min={
                                    startDate
                                      ? startDate.toISOString().split('T')[0]
                                      : minDate.toISOString().split('T')[0]
                                  }
                                  max={maxDate.toISOString().split('T')[0]}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1" style={{ minWidth: '120px' }}>
                      <div className="block text-sm font-bold text-gray-700">
                        Start Hour
                      </div>
                      <select
                        id="start-hour"
                        value={localFilters.startHour}
                        onChange={(e) =>
                          updateHour('startHour', e.target.value)
                        }
                        className="w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-8 text-left text-sm text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      >
                        {hourOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1" style={{ minWidth: '120px' }}>
                      <div className="block text-sm font-bold text-gray-700">
                        End Hour
                      </div>
                      <select
                        id="end-hour"
                        value={localFilters.endHour}
                        onChange={(e) => updateHour('endHour', e.target.value)}
                        className="w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-8 text-left text-sm text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      >
                        {endHourOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: User select (spans full width) */}
                  {paginatedUserCounts.length > 0 && (
                    <div
                      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                      style={{ maxWidth: '500px' }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-700">
                          View Individual User Journey
                        </h3>
                        {totalUserPages > 1 && (
                          <div className="flex items-center space-x-2 text-sm">
                            <button
                              onClick={prevUserPage}
                              disabled={currentUserPage === 0}
                              className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                              aria-label="Previous page"
                            >
                              <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            <span>
                              Page {currentUserPage + 1} of {totalUserPages}
                            </span>
                            <button
                              onClick={nextUserPage}
                              disabled={currentUserPage >= totalUserPages - 1}
                              className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                              aria-label="Next page"
                            >
                              <ChevronRightIcon className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <Select.Root
                          collection={createListCollection({
                            items: [
                              { value: '', label: 'Select user' },
                              ...paginatedUserCounts.map((user) => ({
                                value: user.id,
                                label: `${user.id} (${user.count} events)`,
                              })),
                            ],
                          })}
                          value={
                            localFilters.selectedUserId
                              ? [localFilters.selectedUserId]
                              : ['']
                          }
                          onValueChange={({ value }) =>
                            updateSelectedUser(value[0] || null)
                          }
                        >
                          <Select.Label className="sr-only">
                            Select user
                          </Select.Label>
                          <Select.Control>
                            <Select.Trigger
                              className="relative w-fit min-w-64 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-sm text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                              aria-label="Select individual user"
                            >
                              <Select.ValueText placeholder="Select user">
                                {localFilters.selectedUserId
                                  ? localFilters.selectedUserId
                                  : 'Select user'}
                              </Select.ValueText>
                              <Select.Indicator className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <span className="h-5 w-5 text-gray-500">▼</span>
                              </Select.Indicator>
                            </Select.Trigger>
                          </Select.Control>
                          <Portal>
                            <Select.Positioner>
                              <Select.Content
                                className="z-10 mt-2 max-h-96 overflow-auto rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                style={{ width: 'var(--trigger-width)' }}
                              >
                                {paginatedUserCounts.length > 0 ? (
                                  [
                                    <Select.Item
                                      key="empty"
                                      item={{ value: '', label: 'Select user' }}
                                      className="cursor-pointer select-none p-2 text-sm text-gray-500 hover:bg-slate-100 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                                    >
                                      <Select.ItemText>
                                        Select user
                                      </Select.ItemText>
                                    </Select.Item>,
                                    ...paginatedUserCounts.map((user) => (
                                      <Select.Item
                                        key={user.id}
                                        item={{
                                          value: user.id,
                                          label: `${user.id} (${user.count} events)`,
                                        }}
                                        className="cursor-pointer select-none p-2 text-sm text-gray-700 hover:bg-slate-100 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                                      >
                                        <Select.ItemText>
                                          {user.id}{' '}
                                          <span className="text-xs text-gray-500">
                                            ({user.count} events)
                                          </span>
                                        </Select.ItemText>
                                      </Select.Item>
                                    )),
                                  ]
                                ) : (
                                  <div className="p-2 text-sm text-gray-500">
                                    No users available
                                  </div>
                                )}
                              </Select.Content>
                            </Select.Positioner>
                          </Portal>
                        </Select.Root>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current status display - only show when no changes pending */}
            {!hasLocalChanges && $epinetCustomFilters.enabled && (
              <div className="flex items-center justify-between rounded-md bg-gray-100 p-2">
                <p className="text-sm font-bold text-gray-700">
                  {getFilterStatusMessage()}
                </p>
                <button
                  onClick={() => setShowTable(!showTable)}
                  className="rounded-md bg-cyan-600 px-3 py-1 text-sm text-white shadow-sm transition-colors duration-200 hover:bg-cyan-700"
                >
                  {showTable ? 'Hide' : 'Show'} Table View
                </button>
              </div>
            )}

            {showTable && (
              <EpinetTableView
                fullContentMap={fullContentMap || []}
                isLoading={isLoading}
              />
            )}
          </div>
        )}
      </div>

      {/* UnsavedChangesBar-style sticky bottom bar */}
      {isVisible && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 transform pr-12 transition-all duration-300 ease-in-out ${
            isAnimating
              ? 'translate-y-0 opacity-100'
              : 'translate-y-full opacity-0'
          }`}
        >
          {/* Backdrop blur overlay */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />

          {/* Main content bar */}
          <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div
              className={`flex items-center justify-between rounded-lg border px-6 py-4 shadow-lg ${styling.bgColor} ${styling.borderColor}`}
            >
              {/* Icon + message */}
              <div className="flex items-center space-x-3">
                <div className={`flex-shrink-0 ${styling.iconColor}`}>
                  {styling.icon}
                </div>
                <div>
                  <p className={`text-sm font-bold ${styling.textColor}`}>
                    {getMessage()}
                  </p>
                  {errorMessage && !isApplying && (
                    <p className="mt-1 text-xs text-red-600">
                      Click Apply Filters to try again
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-3">
                {/* Cancel button - only show when not applying */}
                {!isApplying && (
                  <button
                    type="button"
                    onClick={cancelChanges}
                    className={`rounded-md border px-3 py-2 text-sm font-bold shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      errorMessage
                        ? 'border-red-300 bg-white text-red-800 hover:bg-red-50 focus:ring-red-500'
                        : 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50 focus:ring-amber-500'
                    }`}
                  >
                    Cancel
                  </button>
                )}

                {/* Apply Filters button - only show when changes exist and not already applied */}
                {hasLocalChanges && (
                  <button
                    type="button"
                    onClick={updateDateRange}
                    disabled={!startDate || !endDate || isApplying}
                    className={`rounded-md border border-transparent px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed ${
                      isApplying
                        ? 'bg-blue-500 opacity-75'
                        : errorMessage
                          ? startDate && endDate
                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                            : 'bg-red-400 opacity-50'
                          : startDate && endDate
                            ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                            : 'bg-amber-400 opacity-50'
                    }`}
                  >
                    {isApplying ? 'Applying...' : 'Apply Filters'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EpinetDurationSelector;
